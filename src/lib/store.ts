import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  MetaFile,
  SeoMetadata,
  AppView,
  MetadataPreset,
  BatchJob,
  ToastMessage,
  MetadataHistoryItem
} from './types';
import { parseDeepMetadata, seoFromRaw } from './metadata-reader';
import { stripGpsFromBlob, stripAllMetadataFromBlob, writeMetadataToBlob, isExifDateTag, normalizeExifDate, type NativeEdit } from './metadata-writer';
import { analyzePrivacyRisks } from './privacy-rules';
import { workspaceHref, workspaceView } from './navigation';
import { DEFAULT_GEMINI_MODEL, normalizeGeminiModel } from './ai-models';
import { buildMetadataCsv, metadataJson } from './catalog-export';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const DEFAULT_PRESETS: MetadataPreset[] = [
  {
    id: 'preset-seo-web',
    name: 'Website SEO & Discovery',
    category: 'SEO',
    description: 'Optimize for search crawlers while stripping physical GPS coordinates.',
    tags: {
      copyright: '© 2026 All Rights Reserved',
      credit: 'Web Publishing Media',
      keywords: ['seo', 'optimized', 'web-ready', 'digital-asset']
    },
    stripGps: true,
    stripSerials: false,
    filenameTemplate: '{title}-web'
  },
  {
    id: 'preset-photographer',
    name: 'Pro Photographer Attribution',
    category: 'Photography',
    description: 'Retains camera telemetry, stamps copyright and creator, scrubs exact GPS location.',
    tags: {
      artist: 'Lead Photographer',
      copyright: '© 2026 Professional Photography Studio',
      credit: 'Editorial Media'
    },
    stripGps: true,
    stripSerials: false,
    filenameTemplate: '{artist}-{title}'
  },
  {
    id: 'preset-ecommerce',
    name: 'E-Commerce Product Catalog',
    category: 'E-commerce',
    description: 'Strips camera serials and GPS, injects product catalog tags and alt descriptions.',
    tags: {
      copyright: '© 2026 Store Catalog',
      keywords: ['product', 'retail', 'e-commerce', 'catalog']
    },
    stripGps: true,
    stripSerials: true,
    filenameTemplate: 'prod-{counter}'
  },
  {
    id: 'preset-social-opsec',
    name: 'Social Media Privacy Shield',
    category: 'Privacy',
    description: 'Maximal sanitization: purges GPS, body serials, host OS names, and MakerNotes.',
    tags: {
      copyright: 'Public Domain / Anonymous'
    },
    stripGps: true,
    stripSerials: true,
    filenameTemplate: 'clean-{date}'
  }
];
export const BUILT_IN_PRESET_IDS = DEFAULT_PRESETS.map((preset) => preset.id);
/** Import limits, shown in the sidebar and enforced when adding files. */
export const QUEUE_LIMITS = { files: 500, bytes: 256 * 1024 * 1024 } as const;

interface FilterOptions {
  format: string;
  seoStatus: string;
  privacyStatus: string;
  aiStatus: string;
}

export interface MetaForgeState {
  // Navigation & Views
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Files
  files: MetaFile[];
  activeFileId: string | null;
  selectedFileIds: string[];
  compareFileIds: [string | null, string | null];

  // Presets & Jobs
  presets: MetadataPreset[];
  batchJobs: BatchJob[];
  clearCompletedJobs: () => void;
  cancelBatch: () => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;

  // Command Palette
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;

  // Filters & Search
  searchQuery: string;
  filterOptions: FilterOptions;
  setSearchQuery: (query: string) => void;
  setFilterOptions: (filters: Partial<FilterOptions>) => void;

  // Global Settings
  aiEnabled: boolean;
  geminiApiKey: string;
  selectedModel: string;
  isProcessing: boolean;
  processingMessage: string;
  activeTab: 'inspector' | 'privacy' | 'seo' | 'hex' | 'workflow';
  isAiSettingsOpen: boolean;

  // Actions
  setAiEnabled: (enabled: boolean) => void;
  toggleAI: () => void;
  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
  setActiveFile: (id: string | null) => void;
  setActiveTab: (tab: 'inspector' | 'privacy' | 'seo' | 'hex' | 'workflow') => void;
  setIsAiSettingsOpen: (open: boolean) => void;

  // Selection
  toggleSelectFile: (id: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
  setCompareFile: (slot: 0 | 1, id: string | null) => void;

  // File mutations
  addFiles: (newFiles: File[]) => Promise<boolean>;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  // Metadata operations
  updateTag: (fileId: string, section: string, key: string, value: any) => Promise<boolean>;
  deleteTag: (fileId: string, section: string, key: string) => Promise<boolean>;
  stripGps: (fileId: string) => Promise<boolean>;
  stripAllGps: () => Promise<boolean>;
  stripAllMetadata: (fileId: string) => Promise<boolean>;
  stripAllMetadataBatch: () => Promise<boolean>;
  sanitizeForSocial: (fileId: string) => Promise<boolean>;
  batchSanitizeForSocial: () => Promise<boolean>;
  applyAiSeo: (fileId: string, seo: SeoMetadata, actor?: 'User' | 'AI') => void;
  writeSeoToMetadata: (fileId: string) => Promise<boolean>;
  batchGenerateSeo: (fileIds: string[], options?: { save?: boolean; skipComplete?: boolean }) => Promise<boolean>;

  // Presets & Batch
  applyPreset: (presetId: string, targetFileIds: string[]) => Promise<boolean>;
  createPreset: (preset: Omit<MetadataPreset, 'id'>) => boolean;
  deletePreset: (id: string) => void;
  batchBulkEdit: (fileIds: string[], updates: { copyright?: string; artist?: string; keywords?: string[]; keywordMode?: 'append' | 'replace' }) => Promise<boolean>;
  batchRename: (fileIds: string[], template: string) => Promise<boolean>;

  // History
  restoreHistory: (fileId: string, historyId: string) => Promise<boolean>;

  renameFile: (fileId: string, newName: string) => void;

  // Export
  exportSingle: (fileId: string) => void;
  exportAllZip: (fileIds?: string[]) => Promise<boolean>;
  exportMetadataJson: (fileId: string) => void;
  exportAllMetadataJson: () => void;
  exportMetadataCsv: () => void;
}

const uid = () => crypto.randomUUID();
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'An unexpected error occurred. Try again.';
const clone = <T,>(value: T): T => structuredClone(value);
const blobOf = (file: MetaFile) => file.modifiedBlob || file.originalBlob;
const extension: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/heic': 'heic', 'image/tiff': 'tiff', 'image/gif': 'gif' };
export function safeFilename(name: string, type: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 180) || 'image';
  const ext = extension[type] || 'bin';
  const base = cleaned.replace(/\.[^.]+$/, '') || 'image';
  return `${/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base) ? `image-${base}` : base}.${ext}`;
}
const TEMPLATE_TOKENS = ['title', 'artist', 'date', 'counter'] as const;
export function renameFromTemplate(file: Pick<MetaFile, 'name' | 'type' | 'seoData' | 'rawMetadata'>, template: string, index: number): string {
  if (!template.trim()) throw new Error('Enter a filename template.');
  const slug = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'image';
  const tokens: Record<string, string> = {
    title: slug(file.seoData.title || file.name.replace(/\.[^.]+$/, '')),
    artist: slug(String(file.rawMetadata.exif?.Artist || file.rawMetadata.iptc?.Byline || 'creator')),
    date: new Date().toISOString().slice(0, 10), counter: String(index + 1).padStart(3, '0')
  };
  if (/\{(?!title\}|artist\}|date\}|counter\})[^}]*\}/.test(template)) throw new Error('Unknown template token. Use {title}, {artist}, {date}, or {counter}.');
  return safeFilename(template.replace(new RegExp(`\\{(${TEMPLATE_TOKENS.join('|')})\\}`, 'g'), (_, key: string) => tokens[key]), file.type);
}
export function validatePreset(value: unknown): Omit<MetadataPreset, 'id'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Each preset must be an object.');
  const p = value as Record<string, any>;
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100) throw new Error('Preset names must contain 1–100 characters.');
  if (!['SEO', 'Photography', 'E-commerce', 'Stock', 'Privacy', 'Custom'].includes(p.category)) throw new Error('Invalid preset category.');
  if (typeof p.stripGps !== 'boolean' || typeof p.stripSerials !== 'boolean') throw new Error('Preset privacy rules must be true or false.');
  const tags: MetadataPreset['tags'] = {};
  for (const key of ['artist', 'copyright', 'credit', 'headline', 'caption'] as const) {
    if (p.tags?.[key] !== undefined) {
      if (typeof p.tags[key] !== 'string' || p.tags[key].length > 4000) throw new Error(`Invalid preset ${key}.`);
      tags[key] = p.tags[key];
    }
  }
  if (p.tags?.keywords !== undefined) {
    if (!Array.isArray(p.tags.keywords) || p.tags.keywords.length > 100 || p.tags.keywords.some((k: unknown) => typeof k !== 'string' || k.length > 200)) throw new Error('Preset keywords must be an array of up to 100 strings.');
    tags.keywords = [...new Set<string>(p.tags.keywords.map((k: string) => k.trim()).filter(Boolean))];
  }
  if (p.filenameTemplate !== undefined && (typeof p.filenameTemplate !== 'string' || p.filenameTemplate.length > 180 || /\{(?!title\}|artist\}|date\}|counter\})[^}]*\}/.test(p.filenameTemplate))) throw new Error('Invalid filename template. Use {title}, {artist}, {date}, or {counter}.');
  return { name: p.name.trim(), category: p.category, description: typeof p.description === 'string' ? p.description.slice(0, 1000) : '', tags, stripGps: p.stripGps, stripSerials: p.stripSerials, filenameTemplate: p.filenameTemplate };
}
function snapshot(file: MetaFile, action: string, actor: MetadataHistoryItem['actor'] = 'User'): MetadataHistoryItem {
  return { id: uid(), timestamp: Date.now(), actor, action, diffSummary: action, previousRaw: clone(file.rawMetadata), previousBlob: blobOf(file), previousSeo: clone(file.seoData), previousName: file.name };
}

type RawMetadata = MetaFile['rawMetadata'];
/** Equivalent fields across EXIF, IPTC and Dublin Core. Writing one keeps the others consistent. */
const SYNCED_FIELDS = [
  [['iptc', 'Headline'], ['iptc', 'ObjectName'], ['xmp', 'title']],
  [['iptc', 'Caption'], ['xmp', 'description'], ['exif', 'ImageDescription']],
  [['exif', 'Artist'], ['iptc', 'Byline'], ['xmp', 'creator']],
  [['exif', 'Copyright'], ['iptc', 'CopyrightNotice'], ['xmp', 'rights']],
  [['iptc', 'Keywords'], ['xmp', 'subject']]
] as const;
const isEmptyValue = (value: unknown) => value === undefined || value === null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
/** Sets (or removes, for empty values) a field and its synced equivalents. Returns the native EXIF writes required. */
function setSynced(raw: RawMetadata, section: string, key: string, value: unknown, remove = isEmptyValue(value)): NativeEdit[] {
  const group = SYNCED_FIELDS.find((fields) => fields.some(([s, k]) => s === section && k.toLowerCase() === key.toLowerCase()));
  const edits: NativeEdit[] = [];
  for (const [s, k] of group ?? [[section, key] as const]) {
    raw[s] ||= {};
    if (remove) delete raw[s][k]; else raw[s][k] = value;
    if (s === 'exif' || s === 'gps') edits.push({ section: s, key: k, value, remove });
  }
  return edits;
}
const splitKeywords = (value: string) => [...new Set(value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean))];
/** Coerces editor input into the shape each tag expects. */
export function normalizeTagValue(section: string, key: string, value: unknown): unknown {
  if (section === 'exif' && isExifDateTag(key)) return normalizeExifDate(value);
  if (/^(Keywords|subject)$/i.test(key) && typeof value === 'string') return splitKeywords(value);
  return value;
}
function applySeoToRaw(raw: RawMetadata, seo: SeoMetadata): NativeEdit[] {
  const edits = [
    ...setSynced(raw, 'iptc', 'Headline', seo.title?.trim()),
    ...setSynced(raw, 'iptc', 'Caption', seo.caption?.trim()),
    ...setSynced(raw, 'iptc', 'Keywords', seo.keywords?.map((keyword) => keyword.trim()).filter(Boolean))
  ];
  setSynced(raw, 'xmp', 'altText', seo.altText?.trim());
  return edits;
}
const isFatalAiError = (error: unknown) => /Invalid Gemini API Key|rate limit|access denied|billing|model is unavailable|API Key is required/i.test(errorMessage(error));

const persistedStorage: PersistStorage<Partial<MetaForgeState>> = {
  getItem: (name) => {
    try { const value = localStorage.getItem(name); return value ? JSON.parse(value) : null; } catch { return null; }
  },
  setItem: (name, value) => { try { localStorage.setItem(name, JSON.stringify(value)); } catch { /* The current session still works when storage is unavailable. */ } },
  removeItem: (name) => { try { localStorage.removeItem(name); } catch { /* Storage may be disabled. */ } }
};
let operationQueue: Promise<unknown> = Promise.resolve();
let importGeneration = 0;
let activeBatch: { controller: AbortController; type: BatchJob['type'] } | null = null;
let cancelRequested = false;

export const useMetaForgeStore = create<MetaForgeState>()(persist((set, get) => {
  const notify = (title: string, error: unknown) => get().addToast({ type: 'error', title, description: errorMessage(error) });
  const run = (message: string, task: () => Promise<boolean>): Promise<boolean> => {
    const result = operationQueue.then(async () => {
      set({ isProcessing: true, processingMessage: message });
      try { return await task(); }
      catch (error) { notify('Operation Failed', error); return false; }
      finally { set({ isProcessing: false, processingMessage: '' }); }
    });
    operationQueue = result.catch(() => false);
    return result;
  };
  const commit = (before: MetaFile, after: MetaFile, action: string, actor: MetadataHistoryItem['actor'] = 'User') => {
    const current = get().files.find((f) => f.id === before.id);
    if (!current) { if (after.thumbnailUrl !== before.thumbnailUrl) URL.revokeObjectURL(after.thumbnailUrl); return false; }
    if (current.thumbnailUrl !== after.thumbnailUrl) URL.revokeObjectURL(current.thumbnailUrl);
    set((state) => ({ files: state.files.map((file) => {
      if (file.id !== before.id) return file;
      const draftChanges = Object.fromEntries(Object.entries(file.seoData || {}).filter(([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(before.seoData?.[key as keyof SeoMetadata])
      ));
      return {
        ...after, id: before.id, originalBlob: before.originalBlob, isDirty: true,
        name: file.name !== before.name ? safeFilename(file.name, after.type) : after.name,
        seoData: { ...after.seoData, ...draftChanges },
        history: [snapshot(file, action, actor), ...file.history].slice(0, 50)
      };
    }) }));
    return true;
  };
  const fromBlob = async (file: MetaFile, blob: Blob): Promise<MetaFile> => {
    const name = safeFilename(file.name, blob.type);
    const parsed = await parseDeepMetadata(new File([blob], name, { type: blob.type, lastModified: file.lastModified }));
    return { ...file, ...parsed, id: file.id, originalBlob: file.originalBlob, modifiedBlob: blob, history: file.history };
  };
  const mutate = (id: string, action: string, transform: (file: MetaFile) => Promise<MetaFile>) => run(action, async () => {
    const file = get().files.find((f) => f.id === id);
    if (!file) throw new Error('This image is no longer in the queue.');
    if (!commit(file, await transform(file), action)) throw new Error('The image was removed before the operation finished.');
    get().addToast({ type: 'success', title: action });
    return true;
  });
  const batch = (
    name: string, type: BatchJob['type'], ids: string[],
    transform: (file: MetaFile, index: number, signal: AbortSignal) => Promise<MetaFile>,
    actor: MetadataHistoryItem['actor'] = 'System', stopOn?: (error: unknown) => boolean
  ) => run(name, async () => {
    const targets = [...new Set(ids)].filter((id) => get().files.some((f) => f.id === id));
    if (!targets.length) throw new Error('Import or select images first.');
    const job: BatchJob = { id: uid(), name, type, status: 'RUNNING', total: targets.length, completed: 0, failed: 0, progress: 0, createdAt: Date.now(), errors: [] };
    set((state) => ({ batchJobs: [job, ...state.batchJobs].slice(0, 100) }));
    const controller = new AbortController();
    activeBatch = { controller, type }; cancelRequested = false;
    let stopped = '';
    try {
      for (const [index, id] of targets.entries()) {
        if (cancelRequested) break;
        const file = get().files.find((f) => f.id === id);
        try {
          if (!file) throw new Error('Image was removed from the queue.');
          if (!commit(file, await transform(file, index, controller.signal), name, actor)) throw new Error('Image was removed before processing finished.');
          job.completed++;
        } catch (error) {
          if (cancelRequested) break;
          job.failed++; job.errors.push(`${file?.name || id}: ${errorMessage(error)}`);
          // Credential and quota failures would repeat for every remaining image.
          if (stopOn?.(error)) { stopped = errorMessage(error); break; }
        }
        job.progress = Math.round(((index + 1) / targets.length) * 100);
        set((state) => ({ processingMessage: `${name}: ${index + 1}/${targets.length}`, batchJobs: state.batchJobs.map((j) => j.id === job.id ? { ...job, errors: [...job.errors] } : j) }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally { if (activeBatch?.controller === controller) activeBatch = null; }
    const cancelled = cancelRequested; cancelRequested = false;
    const skipped = targets.length - job.completed - job.failed;
    if (skipped > 0) job.errors.push(`${skipped} image(s) were not processed${cancelled ? ' because the job was cancelled' : ''}.`);
    job.status = cancelled ? 'CANCELLED' : job.failed ? 'FAILED' : 'COMPLETED';
    set((state) => ({ batchJobs: state.batchJobs.map((j) => j.id === job.id ? { ...job, errors: [...job.errors] } : j) }));
    if (cancelled) get().addToast({ type: 'warning', title: `${name} cancelled`, description: `${job.completed}/${job.total} images were processed before cancelling.` });
    else get().addToast({ type: job.failed ? 'warning' : 'success', title: job.failed ? `${name}: ${job.failed} failed` : name, description: `${job.completed}/${job.total} images processed.${stopped ? ` Stopped: ${stopped}` : job.errors[0] ? ` ${job.errors[0]}` : ''}` });
    return job.status === 'COMPLETED';
  });
  const social = async (file: MetaFile) => {
    const cleaned = await fromBlob(file, await stripAllMetadataFromBlob(blobOf(file)));
    const artist = file.rawMetadata.exif?.Artist || file.rawMetadata.iptc?.Byline;
    const copyright = file.rawMetadata.exif?.Copyright || file.rawMetadata.iptc?.CopyrightNotice;
    if (!artist && !copyright) return cleaned;
    try {
      const raw = { ...cleaned.rawMetadata, exif: { ...(artist ? { Artist: artist } : {}), ...(copyright ? { Copyright: copyright } : {}) } };
      return await fromBlob(file, await writeMetadataToBlob(blobOf(cleaned), raw));
    } finally { URL.revokeObjectURL(cleaned.thumbnailUrl); }
  };
  const removeGps = async (file: MetaFile) => {
    const cleaned = await fromBlob(file, await stripGpsFromBlob(blobOf(file)));
    if (!cleaned.privacyReport.hasGps) return cleaned;
    URL.revokeObjectURL(cleaned.thumbnailUrl);
    // Coordinates can also be embedded in free-form EXIF comments.
    return fromBlob(file, await stripAllMetadataFromBlob(blobOf(file)));
  };
  const removeSerials = async (file: MetaFile) => {
    const sensitive = (key: string) => /serialnumber|ownername|makernote|imageuniqueid/i.test(key.replace(/[^a-z]/gi, ''));
    const scrub = (value: any): any => {
      if (value instanceof Date || ArrayBuffer.isView(value)) return value;
      if (Array.isArray(value)) return value.map(scrub);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitive(key)).map(([key, item]) => [key, scrub(item)]));
      if (typeof value === 'string' && /^\s*[\[{]/.test(value)) { try { return JSON.stringify(scrub(JSON.parse(value))); } catch { /* Plain text. */ } }
      return value;
    };
    const raw = scrub(file.rawMetadata);
    delete raw.pngChunks;
    const keys = new Set([...Object.keys(file.rawMetadata.exif || {}).filter(sensitive), 'BodySerialNumber', 'LensSerialNumber', 'CameraSerialNumber', 'CameraOwnerName', 'MakerNote', 'ImageUniqueID']);
    const blob = await writeMetadataToBlob(blobOf(file), raw, [...keys].map((key) => ({ section: 'exif', key, remove: true })));
    const result = await fromBlob(file, blob);
    if (result.privacyReport.hasDeviceSerial || result.privacyReport.inspectionWarning) {
      URL.revokeObjectURL(result.thumbnailUrl);
      throw new Error('Some device identifiers could not be removed safely. Use full social sanitization for this image.');
    }
    return result;
  };
  const writeRaw = async (file: MetaFile, raw: RawMetadata, edits: NativeEdit[] = []) => fromBlob(file, await writeMetadataToBlob(blobOf(file), raw, edits));
  const editTag = (id: string, section: string, key: string, value: any, remove = false) => mutate(id, remove ? 'Tag Deleted' : 'Tag Saved', async (file) => {
    if (!['exif', 'iptc', 'xmp', 'gps'].includes(section) || !key.trim() || ['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid metadata section or tag name.');
    if (section === 'gps') throw new Error('Use Remove GPS to remove the complete location safely. Individual GPS edits are not supported.');
    const normalized = remove ? undefined : normalizeTagValue(section, key, value);
    const raw = clone(file.rawMetadata); raw[section] ||= {};
    if (remove) delete raw[section][key]; else raw[section][key] = normalized;
    const edits = setSynced(raw, section, key, normalized, remove);
    return writeRaw(file, raw, edits);
  });
  const exportFile = (content: string, type: string, name: string) => {
    try { saveAs(new Blob([content], { type }), name); }
    catch (error) { notify('Export Failed', error); }
  };
  const jsonRecord = (file: MetaFile) => ({ file: { name: file.name, size: file.size, type: file.type, width: file.width, height: file.height, lastModified: file.lastModified }, rawMetadata: file.rawMetadata, seoMetadata: file.seoData, privacyReport: file.privacyReport, aiWorkflow: file.aiWorkflow });
  const stopAiBatch = () => { if (activeBatch?.type === 'AI_SEO') get().cancelBatch(); };
  return {
    currentView: 'studio', setCurrentView: (view) => {
      const currentView = workspaceView(view);
      if (typeof window !== 'undefined' && window.location.pathname === '/') {
        const href = workspaceHref(currentView);
        if (window.location.pathname + window.location.search !== href) window.history.pushState(null, '', href);
      }
      set({ currentView });
    },
    files: [], activeFileId: null, selectedFileIds: [], compareFileIds: [null, null], presets: DEFAULT_PRESETS, batchJobs: [],
    clearCompletedJobs: () => set((state) => ({ batchJobs: state.batchJobs.filter((job) => job.status === 'RUNNING' || job.status === 'QUEUED') })),
    cancelBatch: () => { if (!activeBatch) return; cancelRequested = true; activeBatch.controller.abort(); },
    toasts: [],
    addToast: (toast) => {
      const id = uid();
      set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id, timestamp: Date.now() }] }));
      setTimeout(() => get().removeToast(id), toast.type === 'error' || toast.type === 'warning' ? 10000 : 4000);
    },
    removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    isCommandPaletteOpen: false, setIsCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
    searchQuery: '', filterOptions: { format: 'ALL', seoStatus: 'ALL', privacyStatus: 'ALL', aiStatus: 'ALL' },
    setSearchQuery: (query) => set({ searchQuery: query }), setFilterOptions: (filters) => set((state) => ({ filterOptions: { ...state.filterOptions, ...filters } })),
    aiEnabled: false, geminiApiKey: '', selectedModel: DEFAULT_GEMINI_MODEL, isProcessing: false, processingMessage: '', activeTab: 'inspector', isAiSettingsOpen: false,
    setAiEnabled: (enabled) => { if (!enabled) stopAiBatch(); set({ aiEnabled: enabled }); },
    toggleAI: () => { if (get().aiEnabled) stopAiBatch(); set((state) => ({ aiEnabled: !state.aiEnabled })); },
    setApiKey: (key) => { if (!key.trim()) stopAiBatch(); set({ geminiApiKey: key.trim() }); }, setSelectedModel: (model) => set({ selectedModel: normalizeGeminiModel(model) }),
    setActiveFile: (id) => set({ activeFileId: get().files.some((f) => f.id === id) ? id : get().files[0]?.id || null }),
    setActiveTab: (tab) => set({ activeTab: tab }), setIsAiSettingsOpen: (open) => set({ isAiSettingsOpen: open }),
    toggleSelectFile: (id) => set((state) => ({ selectedFileIds: !state.files.some((f) => f.id === id) ? state.selectedFileIds : state.selectedFileIds.includes(id) ? state.selectedFileIds.filter((value) => value !== id) : [...state.selectedFileIds, id] })),
    selectAllFiles: () => set((state) => ({ selectedFileIds: state.files.map((f) => f.id) })), clearSelection: () => set({ selectedFileIds: [] }),
    setCompareFile: (slot, id) => set((state) => { const next: [string | null, string | null] = [...state.compareFileIds]; next[slot] = state.files.some((f) => f.id === id) ? id : null; return { compareFileIds: next }; }),
    addFiles: (files) => {
      const generation = importGeneration;
      return run(`Importing ${files.length} images…`, async () => {
        if (!files.length) return false;
        let imported = 0; const errors: string[] = [];
        for (const file of files) {
          try {
            if (generation !== importGeneration) break;
            if (get().files.length >= QUEUE_LIMITS.files || get().files.reduce((size, item) => size + item.originalBlob.size, 0) + file.size > QUEUE_LIMITS.bytes) throw new Error('The queue is limited to 500 images and 256 MB. Export and clear some images before importing more.');
            const parsed = await parseDeepMetadata(file);
            if (generation !== importGeneration) { URL.revokeObjectURL(parsed.thumbnailUrl); continue; }
            parsed.name = safeFilename(parsed.name, parsed.type);
            set((state) => {
              const combined = [...state.files, parsed];
              const first = state.compareFileIds[0] || combined[0]?.id || null;
              const second = state.compareFileIds[1] || combined.find((item) => item.id !== first)?.id || null;
              return { files: combined, activeFileId: state.activeFileId || parsed.id, compareFileIds: [first, second] };
            });
            imported++;
          } catch (error) { errors.push(`${file.name}: ${errorMessage(error)}`); }
          set({ processingMessage: `Imported ${imported}/${files.length} images…` });
        }
        if (generation !== importGeneration) return false;
        get().addToast({ type: errors.length ? imported ? 'warning' : 'error' : 'success', title: errors.length ? 'Import Finished with Errors' : 'Files Imported', description: `${imported} image(s) imported.${errors[0] ? ` ${errors[0]}` : ''}` });
        return errors.length === 0;
      });
    },
    removeFile: (id) => {
      const file = get().files.find((f) => f.id === id); if (file) URL.revokeObjectURL(file.thumbnailUrl);
      set((state) => {
        const files = state.files.filter((f) => f.id !== id);
        const [left, right] = state.compareFileIds.map((value) => value === id ? null : value);
        const first = left ?? files.find((item) => item.id !== right)?.id ?? null;
        const compareFileIds: [string | null, string | null] = [first, right ?? files.find((item) => item.id !== first)?.id ?? null];
        return { files, activeFileId: state.activeFileId === id ? files[0]?.id || null : state.activeFileId, selectedFileIds: state.selectedFileIds.filter((value) => value !== id), compareFileIds };
      });
    },
    clearFiles: () => { importGeneration++; get().files.forEach((f) => URL.revokeObjectURL(f.thumbnailUrl)); set({ files: [], activeFileId: null, selectedFileIds: [], compareFileIds: [null, null], searchQuery: '' }); },
    updateTag: (id, section, key, value) => editTag(id, section, key, value), deleteTag: (id, section, key) => editTag(id, section, key, undefined, true),
    stripGps: (id) => mutate(id, 'GPS Removed', removeGps),
    stripAllGps: () => batch('Batch GPS Removal', 'STRIP_GPS', get().files.filter((f) => f.privacyReport.hasGps || f.privacyReport.inspectionWarning).map((f) => f.id), removeGps),
    stripAllMetadata: (id) => mutate(id, 'Metadata Removed', async (file) => fromBlob(file, await stripAllMetadataFromBlob(blobOf(file)))),
    stripAllMetadataBatch: () => batch('Batch Metadata Removal', 'SANITIZE_SOCIAL', get().files.map((f) => f.id), async (file) => fromBlob(file, await stripAllMetadataFromBlob(blobOf(file)))),
    sanitizeForSocial: (id) => mutate(id, 'Social Sanitization Complete', social),
    batchSanitizeForSocial: () => batch('Social Sanitization', 'SANITIZE_SOCIAL', get().files.map((f) => f.id), social),
    applyAiSeo: (id, seo, actor = 'User') => set((state) => ({ files: state.files.map((file) => file.id === id ? { ...file, seoData: { ...file.seoData, ...seo }, isDirty: true, history: actor === 'AI' ? [snapshot(file, 'Generated SEO draft', 'AI'), ...file.history].slice(0, 50) : file.history } : file) })),
    writeSeoToMetadata: (id) => mutate(id, 'SEO Saved to Image', async (file) => {
      const raw = clone(file.rawMetadata);
      return writeRaw(file, raw, applySeoToRaw(raw, file.seoData));
    }),
    batchGenerateSeo: (ids, options = {}) => {
      const { aiEnabled, geminiApiKey, selectedModel } = get();
      if (!aiEnabled || !geminiApiKey) {
        get().addToast({ type: 'error', title: 'AI Is Not Configured', description: 'Enable AI and add a Gemini API key in AI Settings first.' });
        return Promise.resolve(false);
      }
      const complete = (file: MetaFile) => Boolean(file.seoData.title && file.seoData.caption && file.seoData.altText && file.seoData.keywords?.length);
      const targets = options.skipComplete ? ids.filter((id) => { const file = get().files.find((item) => item.id === id); return file && !complete(file); }) : ids;
      if (!targets.length) {
        get().addToast({ type: 'info', title: 'Nothing to Generate', description: 'Every targeted image already has a title, caption, alt text, and keywords.' });
        return Promise.resolve(true);
      }
      return batch('AI SEO Generation', 'AI_SEO', targets, async (file, _index, signal) => {
        if (!get().aiEnabled) { cancelRequested = true; throw new Error('AI was disabled.'); }
        const { generateImageSeoMetadata } = await import('./ai-service');
        const result = await generateImageSeoMetadata(geminiApiKey, blobOf(file), selectedModel, signal);
        const seoData = { ...file.seoData, ...result };
        if (options.save === false) return { ...file, seoData };
        const raw = clone(file.rawMetadata);
        const written = await writeRaw(file, raw, applySeoToRaw(raw, seoData));
        return { ...written, seoData: { ...written.seoData, privacyFlags: result.privacyFlags } };
      }, 'AI', isFatalAiError);
    },
    applyPreset: (presetId, ids) => batch('Preset Applied', 'APPLY_PRESET', ids, async (file, index) => {
      const found = get().presets.find((p) => p.id === presetId); if (!found) throw new Error('Preset no longer exists.');
      const preset = validatePreset(found);
      let base = file;
      if (preset.category === 'Privacy' && preset.stripGps && preset.stripSerials) base = await social(file);
      else {
        if (preset.stripSerials) base = await removeSerials(file);
        if (preset.stripGps) {
          const previous = base;
          try { base = await removeGps(base); }
          finally { if (previous !== file) URL.revokeObjectURL(previous.thumbnailUrl); }
        }
      }
      try {
        const raw = clone(base.rawMetadata), edits: NativeEdit[] = [];
        if (preset.tags.artist !== undefined) edits.push(...setSynced(raw, 'exif', 'Artist', preset.tags.artist));
        if (preset.tags.copyright !== undefined) edits.push(...setSynced(raw, 'exif', 'Copyright', preset.tags.copyright));
        if (preset.tags.headline !== undefined) edits.push(...setSynced(raw, 'iptc', 'Headline', preset.tags.headline));
        if (preset.tags.caption !== undefined) edits.push(...setSynced(raw, 'iptc', 'Caption', preset.tags.caption));
        if (preset.tags.keywords !== undefined) edits.push(...setSynced(raw, 'iptc', 'Keywords', preset.tags.keywords));
        if (preset.tags.credit !== undefined) setSynced(raw, 'iptc', 'Credit', preset.tags.credit);
        const result = await writeRaw(base, raw, edits);
        if (preset.filenameTemplate) result.name = renameFromTemplate(result, preset.filenameTemplate, index);
        return result;
      } finally { if (base !== file) URL.revokeObjectURL(base.thumbnailUrl); }
    }, 'Preset'),
    createPreset: (preset) => {
      try { const validated = validatePreset(preset); set((state) => ({ presets: [...state.presets, { ...validated, id: uid() }] })); return true; }
      catch (error) { notify('Invalid Preset', error); return false; }
    },
    deletePreset: (id) => set((state) => ({ presets: state.presets.filter((p) => p.id !== id || BUILT_IN_PRESET_IDS.includes(p.id)) })),
    batchBulkEdit: (ids, updates) => {
      const keywords = updates.keywords?.map((keyword) => keyword.trim()).filter(Boolean);
      if (updates.artist === undefined && updates.copyright === undefined && keywords === undefined) {
        get().addToast({ type: 'warning', title: 'Nothing to Apply', description: 'Enter a copyright notice, an artist, or keywords first.' });
        return Promise.resolve(false);
      }
      return batch('Bulk Metadata Saved', 'APPLY_PRESET', ids, async (file) => {
        const raw = clone(file.rawMetadata), edits: NativeEdit[] = [];
        if (updates.artist !== undefined) edits.push(...setSynced(raw, 'exif', 'Artist', updates.artist));
        if (updates.copyright !== undefined) edits.push(...setSynced(raw, 'exif', 'Copyright', updates.copyright));
        if (keywords !== undefined) {
          const existing = updates.keywordMode === 'append' ? seoFromRaw(file.rawMetadata).keywords : [];
          edits.push(...setSynced(raw, 'iptc', 'Keywords', [...new Set([...existing, ...keywords])]));
        }
        return writeRaw(file, raw, edits);
      });
    },
    batchRename: (ids, template) => batch('Batch Rename', 'RENAME', ids, async (file, index) => ({ ...file, name: renameFromTemplate(file, template, index) })),
    restoreHistory: (id, historyId) => mutate(id, 'Version Restored', async (file) => {
      const record = file.history.find((h) => h.id === historyId);
      if (!record?.previousRaw || !record.previousBlob) throw new Error('This entry has no restorable snapshot.');
      const restored = await fromBlob(file, record.previousBlob);
      return { ...restored, rawMetadata: clone(record.previousRaw), seoData: clone(record.previousSeo || seoFromRaw(record.previousRaw)), name: record.previousName || file.name, privacyReport: analyzePrivacyRisks(record.previousRaw) };
    }),
    renameFile: (id, name) => {
      const file = get().files.find((f) => f.id === id); if (!file || !name.trim()) return;
      commit(file, { ...file, name: safeFilename(name, file.type) }, 'File Renamed');
    },
    exportSingle: (id) => { try { const file = get().files.find((f) => f.id === id); if (file) saveAs(blobOf(file), safeFilename(file.name, file.type)); } catch (error) { notify('Download Failed', error); } },
    exportAllZip: (ids) => run('Packaging ZIP archive…', async () => {
      const files = ids?.length ? get().files.filter((file) => ids.includes(file.id)) : [...get().files];
      if (!files.length) throw new Error('Import images before exporting.');
      const zip = new JSZip(), used = new Set<string>();
      for (const file of files) {
        const base = safeFilename(file.name, file.type); let name = base, suffix = 2;
        while (used.has(name.toLowerCase())) name = base.replace(/(\.[^.]+)$/, `-${suffix++}$1`);
        used.add(name.toLowerCase()); zip.file(`metaforge_export/${name}`, await blobOf(file).arrayBuffer());
      }
      const content = await zip.generateAsync({ type: 'blob' }, ({ percent }) => set({ processingMessage: `Packaging ZIP: ${Math.round(percent)}%` }));
      saveAs(content, `metaforge_export_${new Date().toISOString().slice(0, 10)}.zip`);
      get().addToast({ type: 'success', title: 'ZIP Export Complete', description: `${files.length} images packaged.` });
      return true;
    }),
    exportMetadataJson: (id) => { const file = get().files.find((f) => f.id === id); if (file) exportFile(metadataJson(jsonRecord(file)), 'application/json', `${file.name.replace(/\.[^.]+$/, '')}_metadata.json`); },
    exportAllMetadataJson: () => { if (get().files.length) exportFile(metadataJson(get().files.map(jsonRecord)), 'application/json', 'metaforge_catalog.json'); },
    exportMetadataCsv: () => {
      if (!get().files.length) { notify('Export Failed', new Error('Import images before exporting.')); return; }
      exportFile(buildMetadataCsv(get().files), 'text/csv;charset=utf-8', `metaforge_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    }
  };
}, {
  name: 'metaforge_storage_v2', storage: persistedStorage, skipHydration: true,
  partialize: (state) => ({ aiEnabled: state.aiEnabled, geminiApiKey: state.geminiApiKey, selectedModel: state.selectedModel, presets: state.presets }),
  merge: (persisted, current) => {
    const saved = persisted && typeof persisted === 'object' ? persisted as Partial<MetaForgeState> : {};
    const presets: MetadataPreset[] = [];
    for (const preset of Array.isArray(saved.presets) ? saved.presets : DEFAULT_PRESETS) {
      try { presets.push({ ...validatePreset(preset), id: typeof preset.id === 'string' ? preset.id : uid() }); } catch { /* Ignore invalid saved presets. */ }
    }
    const geminiApiKey = typeof saved.geminiApiKey === 'string' ? saved.geminiApiKey.trim() : '';
    const selectedModel = normalizeGeminiModel(saved.selectedModel);
    return { ...current, presets, aiEnabled: saved.aiEnabled === true, geminiApiKey, selectedModel: !geminiApiKey && selectedModel.startsWith('gemini-2.5-') ? DEFAULT_GEMINI_MODEL : selectedModel };
  }
}));

/** Subscribes to the named fields only, so unrelated updates (toasts, progress text) do not re-render the caller. */
export function useMetaForge<K extends keyof MetaForgeState>(...keys: K[]): Pick<MetaForgeState, K> {
  return useMetaForgeStore(useShallow((state: MetaForgeState) => {
    const picked = {} as Pick<MetaForgeState, K>;
    for (const key of keys) picked[key] = state[key];
    return picked;
  }));
}
