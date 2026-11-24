import JSZip from 'jszip';
import type { AiCleanLevel } from './types';
import { scanImageMetadata, type MetadataScan } from './metadata-reader';
import { cleaningProblem, removeAiMetadataFromBlob } from './metadata-cleaner';
import { imageFormat } from './metadata-writer';
import { generatorIn, packetHasAiLabel, textMentionsAi } from './ai-provenance';

/*
 * Cleans a ZIP archive of images and returns a new archive with the same folders and file names.
 *
 * Every image is scanned, cleaned at the chosen level, and scanned again; only verified results go into the new
 * archive. Images without AI metadata are copied byte for byte. Other files are kept unchanged, except operating-system
 * files and AI sidecar files (prompts, captions, workflows, XMP) when those options are on. Nested archives are cleaned
 * the same way. Everything runs in the browser.
 */

export interface ZipCleanOptions {
  level: AiCleanLevel;
  keepAttribution: boolean;
  /** When a marker survives the chosen level, remove all metadata from that image (losslessly) rather than leave it out. */
  escalate: boolean;
  /** Leave out __MACOSX folders, AppleDouble "._" files, .DS_Store, Thumbs.db and desktop.ini. */
  dropSystemFiles: boolean;
  /** Leave out prompt, caption, workflow and XMP files that belong to an image and carry AI metadata. */
  dropAiSidecars: boolean;
}
export type ZipBehaviour = Omit<ZipCleanOptions, 'level' | 'keepAttribution'>;
export const DEFAULT_ZIP_BEHAVIOUR: ZipBehaviour = { escalate: true, dropSystemFiles: true, dropAiSidecars: true };

export const ZIP_LIMITS = {
  /** Size of the archive itself. The source and the cleaned archive are both held in memory. */
  archiveBytes: 1024 * 1024 * 1024,
  /** Files across the archive and any nested archives. */
  entries: 10000,
  /** Uncompressed bytes across all files, which also stops decompression bombs. */
  totalBytes: 2 * 1024 * 1024 * 1024,
  imageBytes: 100 * 1024 * 1024,
  otherBytes: 512 * 1024 * 1024,
  /** Archives inside archives. */
  depth: 3
};
export type ZipLimits = typeof ZIP_LIMITS;

/**
 * cleaned: AI metadata removed and verified. stripped: all metadata removed after the chosen level left a marker behind.
 * clean: no AI metadata, copied byte for byte. kept: another file, copied unchanged. removed: left out on purpose
 * (system or AI sidecar file). failed: could not be cleaned, left out. archive: a nested archive, cleaned entry by entry.
 */
export type ZipOutcome = 'cleaned' | 'stripped' | 'clean' | 'kept' | 'removed' | 'failed' | 'archive';
export const ZIP_OUTCOMES: ZipOutcome[] = ['cleaned', 'stripped', 'clean', 'kept', 'removed', 'failed', 'archive'];
export const ZIP_OUTCOME_LABELS: Record<ZipOutcome, string> = {
  cleaned: 'Cleaned', stripped: 'Fully stripped', clean: 'Already clean', kept: 'Kept as is', removed: 'Removed', failed: 'Left out', archive: 'Nested ZIP'
};

export interface ZipEntryResult {
  /** Path in the source archive. Entries of nested archives are prefixed with the archive's path. */
  path: string;
  /** Path in the cleaned archive. Absent when the file was left out. */
  output?: string;
  outcome: ZipOutcome;
  /** AI markers found before cleaning. */
  markers: string[];
  generator?: string;
  before: number;
  after?: number;
  note?: string;
}
export interface ZipCleanReport {
  source: string;
  output: string;
  level: AiCleanLevel;
  entries: ZipEntryResult[];
  counts: Record<ZipOutcome, number>;
  images: number;
  /** Images that carried AI labels or AI metadata. */
  aiImages: number;
  /** The archive comment, which other tools can use to record how the files were made. Never copied. */
  archiveComment?: string;
  bytesBefore: number;
  bytesAfter: number;
}
export interface ZipCleanResult { blob: Blob; name: string; report: ZipCleanReport }
export interface ZipProgress { phase: 'cleaning' | 'packaging'; done: number; total: number; current: string; percent: number }
export interface ZipCleanCallbacks {
  signal?: AbortSignal;
  onProgress?: (progress: ZipProgress) => void;
  /** Lower limits, for tests. */
  limits?: Partial<ZipLimits>;
}

/** Thrown when the user cancels. */
export class ZipCancelledError extends Error { constructor() { super('Cleaning was cancelled.'); this.name = 'ZipCancelledError'; } }
/** A limit for the whole archive was exceeded, so no result can be produced. */
class ZipLimitError extends Error {}

const IMAGE_NAME = /\.(?:jpe?g|jfif|png|apng|webp|avif|tiff?|heic|heif|gif)$/i;
const SIDECAR_NAME = /\.(?:txt|json|xmp|caption|yaml|yml|toml)$/i;
const TEXT_NAME = /\.(?:txt|json|xmp|caption|yaml|yml|toml|md|csv|xml|html?)$/i;
const SYSTEM_FILE = /(?:^|\/)(?:__MACOSX(?:\/|$)|\.DS_Store$|\._[^/]*$|Thumbs\.db$|ehthumbs\.db$|desktop\.ini$|\.Spotlight-V100(?:\/|$)|\.Trashes(?:\/|$)|\.fseventsd(?:\/|$))/i;
/** Formats that are stored, not deflated: they are compressed already, so deflating only costs time. */
const PRECOMPRESSED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic']);
const EXTENSION: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const utf8 = new TextDecoder();

export const isZipName = (name: string) => /\.zip$/i.test(name);
export const isZipFile = (file: { name: string; type: string }) => isZipName(file.name) || /^application\/(?:x-)?zip(?:-compressed)?$/i.test(file.type);
export const isSystemFile = (path: string) => SYSTEM_FILE.test(path);
const isZipData = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5) && (bytes[3] === 4 || bytes[3] === 6);
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unknown error.';
const megabytes = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;
const withoutExtension = (path: string) => path.replace(/\.[^./]+$/, '');
/** "photos.zip" → "photos-clean.zip". */
export const cleanedArchiveName = (name: string) => `${withoutExtension(name.split(/[\\/]/).pop() || 'archive') || 'archive'}-clean.zip`;

/** A relative path inside the archive: forward slashes, no drive letters, leading slashes, "." or ".." segments. */
export function safeEntryPath(name: string): string {
  return name.replace(/\\/g, '/').replace(/^[a-z]:/i, '').split('/')
    .map((segment) => segment.replace(/[\x00-\x1f]/g, '').trim())
    .filter((segment) => segment && segment !== '.' && segment !== '..').join('/');
}

const throwIfAborted = (signal?: AbortSignal) => { if (signal?.aborted) throw new ZipCancelledError(); };
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));
const declaredSize = (entry: JSZip.JSZipObject) => {
  const size = (entry as unknown as { _data?: { uncompressedSize?: unknown } })._data?.uncompressedSize;
  return typeof size === 'number' && size >= 0 ? size : undefined;
};

async function loadZip(data: Uint8Array, name: string): Promise<JSZip> {
  try { return await JSZip.loadAsync(data); }
  catch (error) {
    if (/encrypt/i.test(errorMessage(error))) throw new Error(`${name} is password-protected. Remove the password and try again.`);
    throw new Error(`${name} is not a ZIP archive or is damaged.`);
  }
}

interface Context {
  options: ZipCleanOptions;
  limits: ZipLimits;
  signal?: AbortSignal;
  onProgress?: (progress: ZipProgress) => void;
  entries: ZipEntryResult[];
  files: number;
  bytes: number;
  done: number;
}

/**
 * Decompresses one entry, counting the bytes as they arrive: the sizes in the archive's directory can be forged,
 * so a decompression bomb is stopped by what it produces rather than by what it claims.
 */
function readEntry(entry: JSZip.JSZipObject, limit: number, context: Context): Promise<Uint8Array> {
  const declared = declaredSize(entry);
  if (declared !== undefined && declared > limit) return Promise.reject(new Error(`Larger than ${megabytes(limit)}.`));
  return new Promise((resolve, reject) => {
    const parts: Uint8Array[] = [];
    let size = 0, settled = false;
    const stream = (entry as unknown as { internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array> }).internalStream('uint8array');
    const fail = (error: Error) => { if (settled) return; settled = true; stream.pause(); reject(error); };
    stream.on('data', (chunk) => {
      if (settled) return;
      size += chunk.length;
      context.bytes += chunk.length;
      if (context.bytes > context.limits.totalBytes) return fail(new ZipLimitError(`The archive expands to more than ${megabytes(context.limits.totalBytes)}. Split it into smaller archives.`));
      if (size > limit) return fail(new Error(`Larger than ${megabytes(limit)}.`));
      parts.push(chunk);
    }).on('error', (error) => fail(new Error(`The file is damaged (${error.message}).`))).on('end', () => {
      if (settled) return;
      settled = true;
      const out = new Uint8Array(size);
      let offset = 0;
      for (const part of parts) { out.set(part, offset); offset += part.length; }
      resolve(out);
    }).resume();
  });
}

interface CleanAttempt { blob: Blob; after?: MetadataScan; problem: string | null }
async function cleanOnce(source: Blob, scan: MetadataScan, level: AiCleanLevel, keepAttribution: boolean): Promise<CleanAttempt> {
  try {
    const blob = await removeAiMetadataFromBlob(source, scan.rawMetadata, { level, keepAttribution });
    // The written bytes are parsed again, so this checks exactly what goes into the archive.
    const after = await scanImageMetadata(blob);
    return { blob, after, problem: cleaningProblem(after, level) };
  } catch (error) { return { blob: source, problem: errorMessage(error) }; }
}

interface EntryOutput { data?: Uint8Array; output?: string; compress?: boolean; result: ZipEntryResult }

async function cleanImage(bytes: Uint8Array, format: string, path: string, label: string, context: Context): Promise<EntryOutput> {
  const source = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: format });
  let scan: MetadataScan;
  try { scan = await scanImageMetadata(source, bytes.buffer.byteLength === bytes.byteLength ? bytes.buffer as ArrayBuffer : undefined); }
  catch (error) { return { result: { path: label, outcome: 'failed', markers: [], before: bytes.length, note: `Could not be read: ${errorMessage(error)}` } }; }
  const report = scan.aiProvenance;
  const base = { path: label, markers: report.signals.map((signal) => signal.label), ...(report.generator ? { generator: report.generator } : {}), before: bytes.length };
  const { level, keepAttribution, escalate } = context.options;
  // Nothing to remove at this level: the original bytes go into the archive unchanged.
  if (level === 'ai' && report.status === 'CLEAN') return { data: bytes, output: path, compress: !PRECOMPRESSED.has(format), result: { ...base, outcome: 'clean', after: bytes.length } };
  let attempt = await cleanOnce(source, scan, level, keepAttribution), outcome: ZipOutcome = 'cleaned', note: string | undefined;
  if (attempt.problem && escalate && level !== 'all') {
    note = `${attempt.problem}, so all metadata was removed.`;
    // The lighter levels keep creator and copyright, so the fallback does too (unless they name an AI tool).
    attempt = await cleanOnce(source, scan, 'all', true);
    outcome = 'stripped';
  }
  if (attempt.problem) return { result: { ...base, outcome: 'failed', note: `${attempt.problem}. Left out of the cleaned archive.` } };
  const data = new Uint8Array(await attempt.blob.arrayBuffer());
  const converted = attempt.blob.type && attempt.blob.type !== format;
  // HEIC, AVIF and TIFF are converted to PNG; the file name follows the new format.
  const output = converted ? `${withoutExtension(path)}.${EXTENSION[attempt.blob.type] ?? 'png'}` : path;
  if (converted) note = [note, `Converted to ${(EXTENSION[attempt.blob.type] ?? 'png').toUpperCase()}.`].filter(Boolean).join(' ');
  return { data, output, compress: !PRECOMPRESSED.has(attempt.blob.type), result: { ...base, outcome, after: data.length, ...(note ? { note } : {}) } };
}

/** Text files that sit next to an image ("photo.txt", "photo.json", "photo.png.xmp") describe that image. */
const isSidecarOf = (path: string, imageKeys: Set<string>) => SIDECAR_NAME.test(path) && imageKeys.has(withoutExtension(path).toLowerCase());
function textCarriesAi(bytes: Uint8Array, xmp: boolean): boolean {
  if (packetHasAiLabel(bytes, xmp ? 'xmp' : 'text')) return true;
  const text = utf8.decode(bytes);
  return textMentionsAi(text) || Boolean(generatorIn(text));
}

async function cleanEntry(entry: JSZip.JSZipObject, path: string, label: string, depth: number, imageKeys: Set<string>, context: Context): Promise<EntryOutput> {
  const { options, limits } = context;
  const declared = declaredSize(entry) ?? 0;
  if (options.dropSystemFiles && isSystemFile(path)) return { result: { path: label, outcome: 'removed', markers: [], before: declared, note: 'Operating-system file.' } };
  let bytes: Uint8Array;
  try { bytes = await readEntry(entry, IMAGE_NAME.test(path) ? limits.imageBytes : limits.otherBytes, context); }
  catch (error) {
    if (error instanceof ZipLimitError) throw error;
    return { result: { path: label, outcome: 'failed', markers: [], before: declared, note: errorMessage(error) } };
  }
  let format = '';
  try { if (bytes.length > limits.imageBytes) throw new Error('Too large to inspect.'); format = imageFormat(bytes); } catch { /* Not an image this tool can read. */ }
  if (format) return cleanImage(bytes, format, path, label, context);

  if (isZipData(bytes) || isZipName(path)) {
    if (depth + 1 > limits.depth) return { data: bytes, output: path, result: { path: label, outcome: 'kept', markers: [], before: bytes.length, after: bytes.length, note: 'Nested too deeply to inspect. Kept unchanged.' } };
    let nested: JSZip;
    try { nested = await cleanArchive(await loadZip(bytes, path.split('/').pop()!), `${label}/`, depth + 1, context); }
    catch (error) {
      if (error instanceof ZipLimitError || error instanceof ZipCancelledError) throw error;
      return { result: { path: label, outcome: 'failed', markers: [], before: bytes.length, note: errorMessage(error) } };
    }
    const data = await nested.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    return { data, output: path, result: { path: label, outcome: 'archive', markers: [], before: bytes.length, after: data.length } };
  }

  const kept: EntryOutput = { data: bytes, output: path, compress: true, result: { path: label, outcome: 'kept', markers: [], before: bytes.length, after: bytes.length } };
  if (!TEXT_NAME.test(path) || bytes.length > 8 * 1024 * 1024) return kept;
  const xmp = /\.xmp$/i.test(path), sidecar = isSidecarOf(path, imageKeys), ai = textCarriesAi(bytes, xmp);
  if (options.dropAiSidecars && sidecar && (ai || (xmp && options.level === 'all'))) {
    return { result: { path: label, outcome: 'removed', markers: ai ? ['AI text in a sidecar file'] : [], before: bytes.length, note: ai ? 'Sidecar file with AI metadata (prompt, caption, workflow or XMP).' : 'XMP sidecar file (Everything level).' } };
  }
  if (ai) kept.result.note = sidecar ? 'Sidecar file mentions AI. Kept because sidecar removal is off.' : 'Mentions AI. Kept because it is not an image sidecar file.';
  return kept;
}

async function cleanArchive(zip: JSZip, prefix: string, depth: number, context: Context): Promise<JSZip> {
  const out = new JSZip();
  const entries = Object.values(zip.files);
  const files = entries.filter((entry) => !entry.dir);
  context.files += files.length;
  if (context.files > context.limits.entries) throw new ZipLimitError(`The archive holds more than ${context.limits.entries.toLocaleString('en-US')} files. Split it into smaller archives.`);
  const paths = files.map((entry) => safeEntryPath(entry.name));
  const imageKeys = new Set(paths.filter((path) => IMAGE_NAME.test(path)).flatMap((path) => [path.toLowerCase(), withoutExtension(path).toLowerCase()]));
  // Original names keep priority; a converted file only takes a name nothing else uses.
  const used = new Set(paths.map((path) => path.toLowerCase()));
  const unique = (path: string, original: string) => {
    if (path === original) return path;
    let candidate = path, suffix = 2;
    while (used.has(candidate.toLowerCase())) candidate = path.replace(/(\.[^./]+)?$/, `-${suffix++}$1`);
    used.add(candidate.toLowerCase());
    return candidate;
  };
  for (const entry of entries) {
    throwIfAborted(context.signal);
    const path = safeEntryPath(entry.name);
    if (!path) continue;
    if (entry.dir) {
      // Empty folders are kept; folders of files are recreated with their files.
      if (!(context.options.dropSystemFiles && isSystemFile(`${path}/`))) out.folder(path);
      continue;
    }
    const label = prefix + path;
    context.onProgress?.({ phase: 'cleaning', done: context.done, total: context.files, current: label, percent: 0 });
    const { data, output, compress, result } = await cleanEntry(entry, path, label, depth, imageKeys, context);
    if (data && output) {
      const name = unique(output, path);
      out.file(name, data, { binary: true, date: entry.date, compression: compress ? 'DEFLATE' : 'STORE' });
      result.output = prefix + name;
    }
    context.entries.push(result);
    context.done++;
    // Long archives stay responsive: the browser gets a turn between files.
    await nextTick();
  }
  return out;
}

export async function cleanZipArchive(source: Blob, name: string, options: ZipCleanOptions, callbacks: ZipCleanCallbacks = {}): Promise<ZipCleanResult> {
  const limits: ZipLimits = { ...ZIP_LIMITS, ...callbacks.limits };
  if (!source.size) throw new Error(`${name} is empty.`);
  if (source.size > limits.archiveBytes) throw new Error(`${name} is larger than ${megabytes(limits.archiveBytes)}. Split it into smaller archives.`);
  const zip = await loadZip(new Uint8Array(await source.arrayBuffer()), name);
  const context: Context = { options, limits, signal: callbacks.signal, onProgress: callbacks.onProgress, entries: [], files: 0, bytes: 0, done: 0 };
  const cleaned = await cleanArchive(zip, '', 0, context);
  throwIfAborted(callbacks.signal);
  const output = cleanedArchiveName(name);
  const report = (current: string) => (metadata: { percent: number }) => callbacks.onProgress?.({ phase: 'packaging', done: context.done, total: context.files, current, percent: metadata.percent });
  report(output)({ percent: 0 });
  // No archive comment is written: the original one is reported instead of copied.
  const data = await cleaned.generateAsync({ type: 'uint8array', mimeType: 'application/zip', compression: 'STORE' }, report(output));
  throwIfAborted(callbacks.signal);
  const counts = Object.fromEntries(ZIP_OUTCOMES.map((outcome) => [outcome, 0])) as Record<ZipOutcome, number>;
  for (const entry of context.entries) counts[entry.outcome]++;
  const images = context.entries.filter((entry) => ['cleaned', 'stripped', 'clean'].includes(entry.outcome) || (entry.outcome === 'failed' && IMAGE_NAME.test(entry.path)));
  // JSZip sets the archive comment on load but does not declare it in its types.
  const comment = String((zip as unknown as { comment?: unknown }).comment ?? '').trim();
  return {
    blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
    name: output,
    report: {
      source: name, output, level: options.level, entries: context.entries, counts,
      images: images.length, aiImages: images.filter((entry) => entry.markers.length).length,
      ...(comment ? { archiveComment: comment } : {}),
      bytesBefore: source.size, bytesAfter: data.length
    }
  };
}

/** Images inside an archive (and archives inside it), for importing into the image queue. System files are skipped. */
export async function extractZipImages(source: Blob, name: string, options: { maxFiles: number; signal?: AbortSignal; limits?: Partial<ZipLimits> }): Promise<{ files: File[]; skipped: number; notes: string[] }> {
  const limits: ZipLimits = { ...ZIP_LIMITS, ...options.limits };
  if (source.size > limits.archiveBytes) throw new Error(`${name} is larger than ${megabytes(limits.archiveBytes)}. Split it into smaller archives.`);
  const context: Context = { options: { level: 'ai', keepAttribution: true, ...DEFAULT_ZIP_BEHAVIOUR }, limits, signal: options.signal, entries: [], files: 0, bytes: 0, done: 0 };
  const files: File[] = [], notes: string[] = [];
  let skipped = 0;
  const walk = async (zip: JSZip, prefix: string, depth: number) => {
    const entries = Object.values(zip.files).filter((entry) => !entry.dir);
    context.files += entries.length;
    if (context.files > limits.entries) throw new Error(`The archive holds more than ${limits.entries.toLocaleString('en-US')} files.`);
    for (const entry of entries) {
      throwIfAborted(options.signal);
      const path = safeEntryPath(entry.name);
      if (!path || isSystemFile(path)) continue;
      if (files.length >= options.maxFiles) { skipped++; continue; }
      const nested = isZipName(path);
      if (!IMAGE_NAME.test(path) && !nested) { skipped++; continue; }
      try {
        const bytes = await readEntry(entry, nested ? limits.otherBytes : limits.imageBytes, context);
        if (nested && depth + 1 <= limits.depth) { await walk(await loadZip(bytes, path), `${prefix}${path}/`, depth + 1); continue; }
        const type = imageFormat(bytes);
        files.push(new File([bytes as Uint8Array<ArrayBuffer>], path.split('/').pop()!, { type, lastModified: entry.date?.getTime() || Date.now() }));
      } catch (error) {
        if (error instanceof ZipLimitError || error instanceof ZipCancelledError) throw error;
        skipped++;
        notes.push(`${prefix}${path}: ${errorMessage(error)}`);
      }
      await nextTick();
    }
  };
  await walk(await loadZip(new Uint8Array(await source.arrayBuffer()), name), '', 0);
  return { files, skipped, notes };
}

/** "12 cleaned · 40 already clean · 2 left out", in the order people care about. */
export function summarizeZipReport(report: ZipCleanReport): string {
  const { counts } = report;
  const parts = [
    counts.cleaned && `${counts.cleaned} cleaned`,
    counts.stripped && `${counts.stripped} fully stripped`,
    counts.clean && `${counts.clean} already clean`,
    counts.kept && `${counts.kept} other file${counts.kept === 1 ? '' : 's'} kept`,
    counts.archive && `${counts.archive} nested ZIP${counts.archive === 1 ? '' : 's'}`,
    counts.removed && `${counts.removed} removed`,
    counts.failed && `${counts.failed} left out`
  ].filter(Boolean);
  return parts.length ? `${parts.join(' · ')}.` : 'The archive was empty.';
}

const csvCell = (value: unknown) => {
  let text = Array.isArray(value) ? value.join('; ') : value === undefined || value === null ? '' : String(value);
  if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
/** A spreadsheet of what happened to every file. Cells that start with formula characters are neutralized. */
export function zipReportCsv(report: ZipCleanReport): string {
  const rows: unknown[][] = [['File', 'Result', 'In cleaned ZIP as', 'AI markers found', 'AI tool', 'Bytes before', 'Bytes after', 'Note'],
    ...report.entries.map((entry) => [entry.path, ZIP_OUTCOME_LABELS[entry.outcome], entry.output ?? '', entry.markers, entry.generator ?? '', entry.before, entry.after ?? '', entry.note ?? ''])];
  return `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
