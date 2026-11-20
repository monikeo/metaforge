import piexif from 'piexifjs';
import { encodeCanvas } from './canvas-encoder';

const encoder = new TextEncoder(), decoder = new TextDecoder();
const text = (bytes: Uint8Array) => decoder.decode(bytes);
// exifr translates several tags to names that differ from piexif's dictionary (or collide with another tag).
const nativeAliases: Record<string, string> = {
  ISO: 'ISOSpeedRatings', SerialNumber: 'BodySerialNumber', OwnerName: 'CameraOwnerName', LensInfo: 'LensSpecification',
  ModifyDate: 'DateTime', CreateDate: 'DateTimeDigitized', ExposureCompensation: 'ExposureBiasValue',
  FocalLengthIn35mmFormat: 'FocalLengthIn35mmFilm', ImageHeight: 'ImageLength', SubfileType: 'NewSubfileType',
  OldSubfileType: 'SubfileType', DNGLensInfo: 'LensInfo', PrintIM: 'PrintImageMatching', NumberofInks: 'NumberOfInks',
  'TIFF-EPStandardID': 'TIFFEPStandardID', Thresholding: 'Threshholding'
};
const nativeTagName = (key: string) => nativeAliases[key] || key;
const join = (parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};
export interface NativeEdit { section: string; key: string; value?: any; remove?: boolean }
export function imageFormat(bytes: Uint8Array): string {
  if (bytes[0] === 255 && bytes[1] === 216) return 'image/jpeg';
  if (bytes[0] === 137 && text(bytes.subarray(1, 8)) === 'PNG\r\n\x1a\n') return 'image/png';
  if (text(bytes.subarray(0, 4)) === 'RIFF' && text(bytes.subarray(8, 12)) === 'WEBP') return 'image/webp';
  if (text(bytes.subarray(4, 8)) === 'ftyp') {
    const brands = text(bytes.subarray(8, 40));
    if (/avif|avis/.test(brands)) return 'image/avif';
    if (/heic|heix|hevc|hevx|mif1|msf1/.test(brands)) return 'image/heic';
  }
  if ((bytes[0] === 73 && bytes[1] === 73 && bytes[2] === 42) || (bytes[0] === 77 && bytes[1] === 77 && bytes[3] === 42)) return 'image/tiff';
  if (/^GIF8[79]a/.test(text(bytes.subarray(0, 6)))) return 'image/gif';
  throw new Error('Unsupported or corrupt image header. Use JPEG, PNG, WebP, AVIF, HEIC, TIFF, or GIF.');
}
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  if (!data) throw new Error('Invalid image data.');
  return new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type: header.match(/:(.*?);/)?.[1] || 'image/jpeg' });
}
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image data.'));
    reader.onabort = () => reject(new Error('Image read was cancelled.'));
    reader.readAsDataURL(blob);
  });
}
export function ensureExifDicts(exif: piexif.IExifElement): piexif.IExifElement {
  for (const key of ['0th', 'Exif', 'GPS', 'Interop', '1st'] as const) exif[key] ||= {};
  return exif;
}
/**
 * EXIF ASCII tags are byte strings. ExifTool, exifr, and current OS viewers decode them as UTF-8,
 * so text is stored as UTF-8 bytes (one byte per character for piexif). Latin-1 bytes would read back as U+FFFD.
 */
export function toSafeExifString(value = ''): string {
  let binary = '';
  for (const byte of encoder.encode(value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, ''))) binary += String.fromCharCode(byte);
  return binary;
}

/** EXIF stores local wall-clock time as "YYYY:MM:DD HH:MM:SS". */
export function formatExifDate(date: Date): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  return `${pad(date.getFullYear(), 4)}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export const isExifDateTag = (key: string) => /^(DateTime(Original|Digitized)?|CreateDate|ModifyDate)$/i.test(key);
/** Accepts EXIF, ISO 8601 (with or without a zone), date-only input, and Date objects. */
export function normalizeExifDate(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Enter dates as YYYY:MM:DD HH:MM:SS.');
    return formatExifDate(value);
  }
  const input = String(value ?? '').trim().replace(/^"(.*)"$/, '$1').trim();
  if (/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(input)) return input;
  const match = input.match(/^(\d{4})[-:/](\d{2})[-:/](\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/i);
  if (!match) throw new Error('Enter dates as YYYY:MM:DD HH:MM:SS.');
  if (match[7]) {
    const instant = new Date(input);
    if (!Number.isNaN(instant.getTime())) return formatExifDate(instant);
  }
  return `${match[1]}:${match[2]}:${match[3]} ${match[4] || '00'}:${match[5] || '00'}:${match[6] || '00'}`;
}
/** Encodes text for the EXIF UserComment field, which requires an 8-byte character-code prefix. */
export function encodeUserComment(value: unknown): string {
  const input = String(value ?? '');
  if (/^(ASCII\0{3}|UNICODE\0|JIS\0{5}|\0{8})/.test(input)) return input;
  if (/^[\x00-\x7f]*$/.test(input)) return `ASCII\0\0\0${input}`;
  let encoded = 'UNICODE\0';
  // piexif always writes big-endian TIFF data, so the UTF-16 payload is big-endian too.
  for (let index = 0; index < input.length; index++) { const unit = input.charCodeAt(index); encoded += String.fromCharCode(unit >> 8, unit & 255); }
  return encoded;
}
const utf16leBytes = (value: string) => {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index++) { const unit = value.charCodeAt(index); bytes.push(unit & 255, unit >> 8); }
  return [...bytes, 0, 0];
};
function encodeNativeValue(section: string, tag: number, key: string, value: any): any {
  const kind = piexif.TAGS[section === '0th' ? 'Image' : section]?.[tag]?.type;
  if (kind === 'Ascii') return toSafeExifString(isExifDateTag(key) ? normalizeExifDate(value) : String(value ?? ''));
  if (kind === 'Undefined') {
    if (/^UserComment$/i.test(key)) return encodeUserComment(value);
    return ArrayBuffer.isView(value) ? String.fromCharCode(...new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) : value;
  }
  // Windows Explorer XP* tags store UTF-16LE text as BYTE arrays.
  if (kind === 'Byte' && /^XP/.test(key) && typeof value === 'string') return utf16leBytes(value);
  const number = typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : value;
  const rational = (item: unknown) => typeof item === 'number' ? [Math.round(item * 1000000), 1000000] : item;
  if (kind === 'Rational' || kind === 'SRational') {
    if (typeof number === 'number') return rational(number);
    if (Array.isArray(number) && number.every((item) => typeof item === 'number')) return number.map(rational);
  }
  if ((kind === 'Byte' || kind === 'Short' || kind === 'Long' || kind === 'SLong') && typeof number === 'number') return Math.round(number);
  return number;
}
/** Applies edits in place. Removals clear every IFD that defines the tag; updates target the IFD that holds it. */
function applyNativeEdits(exif: piexif.IExifElement, edits: NativeEdit[]): void {
  for (const edit of edits) {
    const name = nativeTagName(edit.key);
    const targets = (edit.section === 'gps' ? [['GPS', piexif.GPSIFD]] : [['Exif', piexif.ExifIFD], ['0th', piexif.ImageIFD]]) as ['GPS' | 'Exif' | '0th', Record<string, number>][];
    const candidates = targets.map(([section, tags]) => [section, tags[name]] as const).filter(([, tag]) => tag !== undefined);
    if (!candidates.length) continue;
    if (edit.remove) { for (const [section, tag] of candidates) delete exif[section]![tag]; continue; }
    const [section, tag] = candidates.find(([ifd, id]) => exif[ifd]?.[id] !== undefined) ?? candidates[0];
    try { exif[section]![tag] = encodeNativeValue(section, tag, edit.key, edit.value); }
    catch (error) { throw new Error(`${edit.key}: ${error instanceof Error ? error.message : 'Invalid value.'}`); }
  }
}
const dumpExif = (exif: piexif.IExifElement) => {
  try { return piexif.dump(exif); }
  catch { throw new Error('A tag value does not match its EXIF format. Check numbers, dates, and lists, then try again.'); }
};
const binaryString = (data: Uint8Array) => {
  let binary = '';
  for (let offset = 0; offset < data.length; offset += 8192) binary += String.fromCharCode(...data.subarray(offset, offset + 8192));
  return binary;
};
/** Parses an EXIF payload with or without the JPEG "Exif\0\0" prefix. */
const loadExifPacket = (data: Uint8Array) => {
  const binary = binaryString(data);
  return ensureExifDicts(piexif.load(binary.startsWith('Exif\0\0') ? binary : 'Exif\0\0' + binary));
};
// PNG eXIf and WebP EXIF chunks store bare TIFF data without the JPEG "Exif\0\0" prefix.
const tiffBytes = (exif: piexif.IExifElement) => Uint8Array.from(dumpExif(exif).slice(6), (character) => character.charCodeAt(0));

const isLeadingJpegSegment = (marker: number, data: Uint8Array) => marker === 224 || (marker === 225 && text(data.subarray(0, 6)) === 'Exif\0\0');
const isMpfSegment = (marker: number, data: Uint8Array) => marker === 226 && text(data.subarray(0, 4)) === 'MPF\0';
/**
 * Updates a Multi-Picture Format index (CIPA DC-007) after the primary image changed size. `out` holds the new
 * primary image followed by the original secondary images. Entry offsets are relative to the MPF TIFF header.
 * Returns false when the index cannot be read or an entry would no longer point at an image.
 */
function patchMpfIndex(out: Uint8Array, tiff: number, shift: number, primarySize: number): boolean {
  if (tiff + 8 > out.length) return false;
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  const littleEndian = out[tiff] === 0x49 && out[tiff + 1] === 0x49;
  if (!littleEndian && !(out[tiff] === 0x4d && out[tiff + 1] === 0x4d)) return false;
  const ifd = tiff + view.getUint32(tiff + 4, littleEndian);
  if (ifd + 2 > out.length) return false;
  for (let index = 0, count = view.getUint16(ifd, littleEndian); index < count; index++) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > out.length) return false;
    if (view.getUint16(entry, littleEndian) !== 0xb002) continue;
    const images = Math.floor(view.getUint32(entry + 4, littleEndian) / 16), table = tiff + view.getUint32(entry + 8, littleEndian);
    if (!images || table + images * 16 > out.length) return false;
    for (let image = 0; image < images; image++) {
      const record = table + image * 16, offset = view.getUint32(record + 8, littleEndian);
      // The primary image has offset 0; only its size changes.
      if (offset === 0) { view.setUint32(record + 4, primarySize, littleEndian); continue; }
      const moved = offset + shift, position = tiff + moved;
      if (moved <= 0 || position + 1 >= out.length || out[position] !== 0xff || out[position + 1] !== 0xd8) return false;
      view.setUint32(record + 8, moved, littleEndian);
    }
    return true;
  }
  return false;
}
/**
 * Rewrites container packets while preserving the compressed pixel stream.
 * Inserted packets follow the leading JFIF/EXIF segments, which some decoders expect first.
 *
 * Data after the primary image is dropped unless `secondaryImages` is set and a Multi-Picture Format index describes it
 * (Ultra HDR gain maps, camera preview images). Then the images are kept and the index is updated for the new primary size.
 * Privacy cleaning leaves it unset, because secondary images can carry their own metadata.
 */
export function jpegPackets(bytes: Uint8Array, keep: (marker: number, data: Uint8Array) => boolean, insert: Uint8Array[] = [], options: { secondaryImages?: boolean } = {}): Uint8Array {
  const parts = [bytes.subarray(0, 2)];
  let pending = insert.length ? insert : null;
  let mpf: { part: number; tiff: number } | null = null;
  const flush = () => { if (pending) { parts.push(...pending); pending = null; } };
  const finish = (primaryEnd: number) => {
    const primary = join(parts), trailing = bytes.subarray(primaryEnd);
    if (!mpf) return primary;
    const withoutIndex = () => join(parts.filter((_, index) => index !== mpf!.part));
    // Without the images it describes, the index would point past the end of the file.
    if (!trailing.length) return options.secondaryImages ? primary : withoutIndex();
    if (!options.secondaryImages) return withoutIndex();
    const tiff = parts.slice(0, mpf.part).reduce((size, part) => size + part.length, 0) + 8;
    const out = join([primary, trailing]);
    return patchMpfIndex(out, tiff, (primary.length - primaryEnd) - (tiff - mpf.tiff), primary.length) ? out : withoutIndex();
  };
  let offset = 2;
  while (offset + 1 < bytes.length) {
    const start = offset;
    if (bytes[offset++] !== 255) throw new Error('Corrupt JPEG marker.');
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 217) { flush(); parts.push(bytes.subarray(start, offset)); return finish(offset); }
    if (marker === 218) {
      flush();
      const headerLength = (bytes[offset] << 8) | bytes[offset + 1];
      for (let i = offset + headerLength; i + 1 < bytes.length; i++) {
        if (bytes[i] === 255 && bytes[i + 1] === 217) { parts.push(bytes.subarray(start, i + 2)); return finish(i + 2); }
      }
      throw new Error('JPEG end marker is missing.');
    }
    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) throw new Error('Truncated JPEG packet.');
    const data = bytes.subarray(offset + 2, offset + length);
    if (keep(marker, data) && !(isMpfSegment(marker, data) && mpf)) {
      if (!isLeadingJpegSegment(marker, data)) flush();
      // The MPF TIFF header starts after the marker, the length, and "MPF\0".
      if (isMpfSegment(marker, data)) mpf = { part: parts.length, tiff: offset + 2 + 4 };
      parts.push(bytes.subarray(start, offset + length));
    }
    offset += length;
  }
  throw new Error('Incomplete JPEG image.');
}
/** Reads header segments without copying the image. Stops at the first scan. */
export function* jpegSegments(bytes: Uint8Array): Generator<{ marker: number; data: Uint8Array }> {
  let offset = 2;
  while (offset + 3 < bytes.length && bytes[offset] === 255) {
    let cursor = offset + 1;
    while (bytes[cursor] === 255) cursor++;
    const marker = bytes[cursor++];
    if (marker === 217 || marker === 218) return;
    const length = (bytes[cursor] << 8) | bytes[cursor + 1];
    if (length < 2 || cursor + length > bytes.length) return;
    yield { marker, data: bytes.subarray(cursor + 2, cursor + length) };
    offset = cursor + length;
  }
}
function jpegPacket(data: Uint8Array): Uint8Array {
  if (data.length > 65533) throw new Error('Metadata exceeds the JPEG packet limit (64 KB). Shorten the tag content.');
  return join([new Uint8Array([255, 225, (data.length + 2) >> 8, (data.length + 2) & 255]), data]);
}
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(data.length + 12), view = new DataView(chunk.buffer);
  view.setUint32(0, data.length); chunk.set(encoder.encode(type), 4); chunk.set(data, 8);
  view.setUint32(data.length + 8, crc32(chunk.subarray(4, data.length + 8)));
  return chunk;
}
export function containerPackets(bytes: Uint8Array): { type: string; data: Uint8Array; packet: Uint8Array }[] {
  const format = imageFormat(bytes), packets = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (format === 'image/png') {
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset);
      if (offset + length + 12 > bytes.length) throw new Error('Truncated PNG chunk.');
      const type = text(bytes.subarray(offset + 4, offset + 8));
      packets.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length), packet: bytes.subarray(offset, offset + length + 12) });
      offset += length + 12;
      if (type === 'IEND') return packets;
    }
    throw new Error('Incomplete PNG image.');
  }
  if (format === 'image/webp') {
    const end = view.getUint32(4, true) + 8;
    if (end > bytes.length) throw new Error('Truncated WebP image.');
    let offset = 12;
    while (offset + 8 <= end) {
      const length = view.getUint32(offset + 4, true), next = offset + 8 + length + (length % 2);
      if (next > end) throw new Error('Truncated WebP chunk.');
      packets.push({ type: text(bytes.subarray(offset, offset + 4)), data: bytes.subarray(offset + 8, offset + 8 + length), packet: bytes.subarray(offset, next) });
      offset = next;
    }
  }
  return packets;
}
/** The native EXIF payload exactly as stored in the container, or null when there is none. */
function nativeExifData(bytes: Uint8Array): Uint8Array | null {
  const format = imageFormat(bytes);
  if (format === 'image/jpeg') {
    for (const { marker, data } of jpegSegments(bytes)) if (marker === 225 && text(data.subarray(0, 6)) === 'Exif\0\0') return data;
    return null;
  }
  if (format === 'image/png' || format === 'image/webp') return containerPackets(bytes).find((packet) => packet.type === (format === 'image/png' ? 'eXIf' : 'EXIF'))?.data ?? null;
  return null;
}
/**
 * Exact UserComment bytes (as a binary string) and the TIFF byte order. exifr decodes this field as UTF-8,
 * which destroys UTF-16 text, so UNICODE comments must be read from the native block.
 */
export function readNativeUserComment(bytes: Uint8Array): { binary: string; littleEndian: boolean } | null {
  try {
    const data = nativeExifData(bytes);
    if (!data) return null;
    const binary = binaryString(data);
    const tiff = binary.startsWith('Exif\0\0') ? binary : `Exif\0\0${binary}`;
    const comment = piexif.load(tiff).Exif?.[piexif.ExifIFD.UserComment];
    return typeof comment === 'string' ? { binary: comment, littleEndian: tiff.slice(6, 8) === 'II' } : null;
  } catch { return null; }
}
function webpChunk(type: string, data: Uint8Array): Uint8Array {
  const packet = new Uint8Array(8 + data.length + (data.length % 2));
  packet.set(encoder.encode(type)); new DataView(packet.buffer).setUint32(4, data.length, true); packet.set(data, 8);
  return packet;
}
function rewriteWebp(bytes: Uint8Array, xmp?: Uint8Array, nativeExif?: Uint8Array | null): Uint8Array {
  const chunks = containerPackets(bytes).filter((p) => ['VP8X', 'VP8 ', 'VP8L', 'ALPH', 'ANIM', 'ANMF', 'ICCP'].includes(p.type));
  let extended = chunks.find((p) => p.type === 'VP8X');
  if (!extended && (xmp || nativeExif)) {
    const frame = chunks.find((p) => p.type === 'VP8 ' || p.type === 'VP8L');
    if (!frame) throw new Error('WebP frame header unavailable.');
    const d = frame.data;
    const width = frame.type === 'VP8L' ? 1 + (((d[2] & 63) << 8) | d[1]) : ((d[7] << 8) | d[6]) & 0x3fff;
    const height = frame.type === 'VP8L' ? 1 + (((d[4] & 15) << 10) | (d[3] << 2) | (d[2] >> 6)) : ((d[9] << 8) | d[8]) & 0x3fff;
    const data = new Uint8Array(10); data[0] = frame.type === 'VP8L' && (d[4] & 16) ? 16 : 0;
    for (let i = 0; i < 3; i++) { data[4 + i] = ((width - 1) >>> (8 * i)) & 255; data[7 + i] = ((height - 1) >>> (8 * i)) & 255; }
    extended = { type: 'VP8X', data, packet: webpChunk('VP8X', data) }; chunks.unshift(extended);
  }
  if (extended) { const data = extended.data.slice(); data[0] = (data[0] & ~12) | (xmp ? 4 : 0) | (nativeExif ? 8 : 0); extended.packet = webpChunk('VP8X', data); }
  const body = join([...chunks.map((p) => p.packet), ...(nativeExif ? [webpChunk('EXIF', nativeExif)] : []), ...(xmp ? [webpChunk('XMP ', xmp)] : [])]), header = new Uint8Array(12);
  header.set(encoder.encode('RIFF')); new DataView(header.buffer).setUint32(4, body.length + 4, true); header.set(encoder.encode('WEBP'), 8);
  return join([header, body]);
}
/** Text from plain strings, numbers, XMP language alternatives ({ lang, value }), or lists of those. */
export function metadataText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : formatExifDate(value);
  if (Array.isArray(value)) {
    const preferred = value.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).lang === 'x-default');
    return preferred ? metadataText(preferred) : value.map(metadataText).filter(Boolean).join(', ');
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return metadataText(record.value ?? record['x-default'] ?? '');
  }
  return '';
}
/** The first candidate that holds non-blank text. */
export const firstText = (...candidates: unknown[]) => candidates.map((candidate) => metadataText(candidate).trim()).find(Boolean) ?? '';
export const textList = (value: unknown): string[] => (Array.isArray(value) ? value.map(metadataText) : [metadataText(value)]).map((item) => item.trim()).filter(Boolean);
const escapeXml = (value: unknown) => String(value ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
const unescapeXml = (value: string) => value.replace(/&(lt|gt|amp|quot|apos);/g, (_, key: string) => ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" })[key]!);
const SNAPSHOT_ELEMENT = /<mf:Metadata>[\s\S]*?<\/mf:Metadata>/;
const xmpFingerprint = (xml: string) => crc32(encoder.encode(xml.replace(SNAPSHOT_ELEMENT, '')));
/** Fields MetaForge mirrors between IPTC and Dublin Core. External XMP edits make the snapshot copies stale. */
export const MIRRORED_SNAPSHOT_FIELDS: Record<string, string[]> = {
  iptc: ['Headline', 'ObjectName', 'Caption', 'Keywords', 'Byline', 'CopyrightNotice'],
  xmp: ['title', 'description', 'rights', 'creator', 'subject', 'altText']
};
export interface EmbeddedSnapshot {
  metadata: Record<string, any>;
  /** null when the snapshot predates integrity checks. */
  exifChanged: boolean | null;
  xmpChanged: boolean | null;
}
export function readEmbeddedSnapshot(bytes: Uint8Array): EmbeddedSnapshot | null {
  const format = imageFormat(bytes);
  let packets: Uint8Array[] = [];
  if (format === 'image/jpeg') packets = Array.from(jpegSegments(bytes)).filter(({ marker }) => marker === 225).map(({ data }) => data);
  else if (['image/png', 'image/webp'].includes(format)) packets = containerPackets(bytes).filter((p) => ['iTXt', 'XMP '].includes(p.type)).map((p) => p.data);
  for (const packet of packets) {
    const xml = text(packet);
    const match = xml.match(/<mf:Metadata>([\s\S]*?)<\/mf:Metadata>/);
    if (!match) continue;
    try {
      const raw = JSON.parse(unescapeXml(match[1]));
      if (!raw || Array.isArray(raw) || typeof raw !== 'object') continue;
      const metadata = Object.fromEntries(['exif', 'gps', 'iptc', 'xmp', 'pngChunks'].filter((key) => raw[key] && typeof raw[key] === 'object' && !Array.isArray(raw[key])).map((key) => [key, raw[key]]));
      const integrity = raw.integrity && typeof raw.integrity === 'object' ? raw.integrity : null;
      const native = nativeExifData(bytes);
      const xmpMeta = xml.match(/<x:xmpmeta[\s\S]*<\/x:xmpmeta>/)?.[0];
      return {
        metadata,
        exifChanged: integrity && 'exif' in integrity ? (native ? crc32(native) : null) !== integrity.exif : null,
        xmpChanged: integrity && typeof integrity.xmp === 'number' && xmpMeta ? xmpFingerprint(xmpMeta) !== integrity.xmp : null
      };
    } catch { /* Invalid optional packets must not hide native metadata. */ }
  }
  return null;
}
export function readEmbeddedMetadata(bytes: Uint8Array): Record<string, any> | null {
  return readEmbeddedSnapshot(bytes)?.metadata ?? null;
}
const snapshotSection = (key: string, value: Record<string, any>) => key !== 'exif' ? value : Object.fromEntries(Object.entries(value)
  .filter(([name, item]) => name !== 'MakerNote' && !ArrayBuffer.isView(item) && !(item instanceof ArrayBuffer))
  .map(([name, item]) => [name, item instanceof Date && !Number.isNaN(item.getTime()) ? formatExifDate(item) : item]));
const ULTRA_HDR_NS = { container: 'http://ns.google.com/photos/1.0/container/', item: 'http://ns.google.com/photos/1.0/container/item/', hdrgm: 'http://ns.adobe.com/hdr-gain-map/1.0/' };
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
interface XmpCarryOver { declarations: string; attributes: string; content: string }
/**
 * Ultra HDR markers in the primary XMP: hdrgm:Version and the GContainer directory that lists the gain map.
 * MetaForge writes its own XMP packet, so these are carried over verbatim to keep the gain map recognisable.
 */
function ultraHdrXmp(bytes: Uint8Array): XmpCarryOver | null {
  const packet = Array.from(jpegSegments(bytes)).find(({ marker, data }) => marker === 225 && text(data.subarray(0, 29)) === 'http://ns.adobe.com/xap/1.0/\0');
  if (!packet) return null;
  const xml = text(packet.data), reserved = new Set(['x', 'rdf', 'xml', 'dc', 'Iptc4xmpCore', 'mf']);
  const prefixOf = (uri: string) => {
    const prefix = xml.match(new RegExp(`xmlns:([A-Za-z][\\w.-]*)="${escapeRegExp(uri)}"`))?.[1];
    return prefix && !reserved.has(prefix) ? prefix : undefined;
  };
  const container = prefixOf(ULTRA_HDR_NS.container), item = prefixOf(ULTRA_HDR_NS.item), hdrgm = prefixOf(ULTRA_HDR_NS.hdrgm);
  const version = hdrgm ? (xml.match(new RegExp(`\\s${escapeRegExp(hdrgm)}:Version="([^"<>&]*)"`)) ?? xml.match(new RegExp(`<${escapeRegExp(hdrgm)}:Version>([^<&]*)</`)))?.[1] : undefined;
  let directory = container ? xml.match(new RegExp(`<${escapeRegExp(container)}:Directory>[\\s\\S]*?</${escapeRegExp(container)}:Directory>`))?.[0] : undefined;
  // The directory is copied as it is, so it may only use prefixes that are declared again here.
  const allowed = new Set(['rdf', 'xml', container, item]);
  if (directory && [...directory.matchAll(/<\/?([\w.-]+):|\s([\w.-]+):[\w.-]+=/g)].some((match) => !allowed.has(match[1] ?? match[2]))) directory = undefined;
  if (!version && !directory) return null;
  return {
    declarations: [version && `xmlns:${hdrgm}="${ULTRA_HDR_NS.hdrgm}"`, directory && `xmlns:${container}="${ULTRA_HDR_NS.container}"`, directory && item && `xmlns:${item}="${ULTRA_HDR_NS.item}"`].filter(Boolean).join(' '),
    attributes: version ? `${hdrgm}:Version="${version}"` : '',
    content: directory ?? ''
  };
}
function xmpPacket(raw: Record<string, any>, nativeExif: Uint8Array | null, carry: XmpCarryOver | null = null): Uint8Array {
  const iptc = raw.iptc || {}, exif = raw.exif || {}, xmp = raw.xmp || {};
  // GPS stays in native EXIF only, so removing it with other tools cannot leave a copy behind in this packet.
  const snapshot = Object.fromEntries(['exif', 'iptc', 'xmp', 'pngChunks'].filter((key) => raw[key] && typeof raw[key] === 'object').map((key) => [key, snapshotSection(key, raw[key])]));
  // Empty elements are omitted: readers would otherwise report blank values (or the language tag) as content.
  const alt = (name: string, ...candidates: unknown[]) => { const value = firstText(...candidates); return value ? `<dc:${name}><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(value)}</rdf:li></rdf:Alt></dc:${name}>` : ''; };
  const list = (name: string, container: 'Seq' | 'Bag', ...candidates: unknown[]) => {
    const values = textList(candidates.find((candidate) => textList(candidate).length));
    return values.length ? `<dc:${name}><rdf:${container}>${values.map((value) => `<rdf:li>${escapeXml(value)}</rdf:li>`).join('')}</rdf:${container}></dc:${name}>` : '';
  };
  const altText = firstText(xmp.altText);
  const meta = (content: string) => `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/" xmlns:mf="https://metaforge.local/ns/1.0/"${carry?.declarations ? ` ${carry.declarations}` : ''}${carry?.attributes ? ` ${carry.attributes}` : ''}>${carry?.content ?? ''}${alt('title', iptc.Headline, iptc.ObjectName, xmp.title)}${alt('description', iptc.Caption, xmp.description, exif.ImageDescription)}${alt('rights', exif.Copyright, iptc.CopyrightNotice, xmp.rights)}${list('creator', 'Seq', exif.Artist, iptc.Byline, xmp.creator)}${list('subject', 'Bag', iptc.Keywords, xmp.subject)}${altText ? `<Iptc4xmpCore:AltTextAccessibility>${escapeXml(altText)}</Iptc4xmpCore:AltTextAccessibility>` : ''}<mf:Metadata>${content}</mf:Metadata></rdf:Description></rdf:RDF></x:xmpmeta>`;
  // Fingerprints let a later import detect whether another tool changed native EXIF or the visible XMP fields.
  const integrity = { exif: nativeExif ? crc32(nativeExif) : null, xmp: xmpFingerprint(meta('')) };
  return encoder.encode(`<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>${meta(escapeXml(JSON.stringify({ ...snapshot, integrity })))}<?xpacket end="w"?>`);
}
function editExifPacket(data: Uint8Array, edits: NativeEdit[]): Uint8Array {
  const exif = loadExifPacket(data);
  applyNativeEdits(exif, edits);
  return tiffBytes(exif);
}
/**
 * Rewrites the native EXIF block (JPEG APP1, PNG eXIf, WebP EXIF) in place. The compressed image is copied unchanged.
 * Files without native EXIF are returned as they are.
 */
export async function rewriteNativeExif(blob: Blob, transform: (exif: piexif.IExifElement) => void): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer()), format = imageFormat(bytes), current = nativeExifData(bytes);
  if (!current) return blob;
  const exif = loadExifPacket(current);
  transform(exif);
  const tiff = tiffBytes(exif);
  const output = format === 'image/jpeg'
    ? jpegPackets(bytes, (marker, data) => !(marker === 225 && text(data.subarray(0, 6)) === 'Exif\0\0'), [jpegPacket(join([encoder.encode('Exif\0\0'), tiff]))])
    : rewriteContainerChunks(bytes, (packet) => packet.type === 'eXIf' ? pngChunk('eXIf', tiff) : packet.type === 'EXIF' ? webpChunk('EXIF', tiff) : packet.packet);
  return new Blob([output as Uint8Array<ArrayBuffer>], { type: format });
}
/**
 * Rebuilds a PNG or WebP file from its chunks. `map` returns the bytes to write for each chunk, or null to drop it.
 * WebP feature flags are updated to match the chunks that remain.
 */
export function rewriteContainerChunks(bytes: Uint8Array, map: (packet: { type: string; data: Uint8Array; packet: Uint8Array }) => Uint8Array | null): Uint8Array {
  const format = imageFormat(bytes);
  const chunks = containerPackets(bytes).flatMap((packet) => { const out = map(packet); return out ? [{ type: packet.type, out }] : []; });
  if (format === 'image/png') return join([bytes.subarray(0, 8), ...chunks.map((chunk) => chunk.out)]);
  if (format !== 'image/webp') throw new Error('Chunk rewriting supports PNG and WebP.');
  const present = new Set(chunks.map((chunk) => chunk.type));
  const body = join(chunks.map(({ type, out }) => {
    if (type !== 'VP8X') return out;
    const data = out.slice(8, 18);
    data[0] = (data[0] & ~(0x20 | 0x08 | 0x04)) | (present.has('ICCP') ? 0x20 : 0) | (present.has('EXIF') ? 0x08 : 0) | (present.has('XMP ') ? 0x04 : 0);
    return webpChunk('VP8X', data);
  }));
  const header = new Uint8Array(12);
  header.set(encoder.encode('RIFF')); new DataView(header.buffer).setUint32(4, body.length + 4, true); header.set(encoder.encode('WEBP'), 8);
  return join([header, body]);
}
/**
 * Writes metadata into a copy of the image. JPEG secondary images (Ultra HDR gain maps, camera previews) are kept with
 * an updated index unless `keepSecondaryImages` is false, which privacy cleaning uses because they carry their own metadata.
 */
export async function writeMetadataToBlob(blob: Blob, raw: Record<string, any>, edits?: NativeEdit | NativeEdit[], options: { keepSecondaryImages?: boolean } = {}): Promise<Blob> {
  let bytes: Uint8Array = new Uint8Array(await blob.arrayBuffer());
  const format = imageFormat(bytes);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(format)) throw new Error('Tag writing supports JPEG, PNG, and WebP. Export JSON for this format, or sanitize a copy to PNG first.');
  const native = (Array.isArray(edits) ? edits : edits ? [edits] : []).filter((edit) => ['exif', 'gps'].includes(edit.section));
  if (format === 'image/jpeg') {
    const secondaryImages = options.keepSecondaryImages !== false;
    if (native.length) {
      const dataUrl = await blobToDataUrl(blob), exif = ensureExifDicts(piexif.load(dataUrl));
      applyNativeEdits(exif, native);
      bytes = new Uint8Array(await dataUrlToBlob(piexif.insert(dumpExif(exif), dataUrl)).arrayBuffer());
    }
    const xmp = xmpPacket(raw, nativeExifData(bytes), secondaryImages ? ultraHdrXmp(bytes) : null);
    bytes = jpegPackets(bytes, (marker, data) => !(marker === 225 && !text(data.subarray(0, 6)).startsWith('Exif\0')) && marker !== 237,
      [jpegPacket(join([encoder.encode('http://ns.adobe.com/xap/1.0/\0'), xmp]))], { secondaryImages });
  } else if (format === 'image/png') {
    const packets = containerPackets(bytes).filter((p) => !['tEXt', 'zTXt', 'iTXt'].includes(p.type));
    const exifPacket = packets.find((packet) => packet.type === 'eXIf');
    if (exifPacket && native.length) { exifPacket.data = editExifPacket(exifPacket.data, native); exifPacket.packet = pngChunk('eXIf', exifPacket.data); }
    const xmp = xmpPacket(raw, exifPacket?.data ?? null);
    const texts = Object.entries(raw.pngChunks || {}).filter(([key]) => key !== 'XML:com.adobe.xmp').map(([key, value]) => pngChunk('iTXt', join([encoder.encode(key), new Uint8Array(5), encoder.encode(String(value))])));
    bytes = join([bytes.subarray(0, 8), ...packets.filter((p) => p.type !== 'IEND').map((p) => p.packet), ...texts,
      pngChunk('iTXt', join([encoder.encode('XML:com.adobe.xmp'), new Uint8Array(5), xmp])), packets[packets.length - 1].packet]);
  } else {
    let exifData = containerPackets(bytes).find((packet) => packet.type === 'EXIF')?.data ?? null;
    if (exifData && native.length) exifData = editExifPacket(exifData, native);
    bytes = rewriteWebp(bytes, xmpPacket(raw, exifData), exifData);
  }
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: format });
}
export async function sanitizeViaCanvas(blob: Blob, mimeType = 'image/png', quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob), image = new Image();
    const timer = setTimeout(() => { URL.revokeObjectURL(url); reject(new Error('Image decoding timed out.')); }, 20000);
    const cleanup = () => { clearTimeout(timer); URL.revokeObjectURL(url); };
    image.onerror = () => { cleanup(); reject(new Error('This browser cannot decode this format. Convert it to PNG or JPEG first.')); };
    image.onload = async () => {
      cleanup();
      try {
        if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 64000000) throw new Error('Browser conversion supports images up to 64 megapixels.');
        const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Image conversion is unavailable. No changes were made.');
        context.drawImage(image, 0, 0);
        resolve(await encodeCanvas(canvas, mimeType, quality));
      } catch (error) { reject(error); }
    };
    image.src = url;
  });
}
const isIccSegment = (marker: number, data: Uint8Array) => marker === 226 && text(data.subarray(0, 12)) === 'ICC_PROFILE\0';
/**
 * Lossless JPEG clean. Keeps the compressed image, the JFIF header, Adobe colour transform, ICC colour profile,
 * and a minimal EXIF block holding only the orientation, so rotated photos display correctly without re-encoding.
 * JFIF extension thumbnails (JFXX) are dropped because they can show the uncropped original.
 */
export function stripJpegToEssentials(bytes: Uint8Array): Uint8Array {
  const native = nativeExifData(bytes);
  let orientation = 1;
  try { if (native) orientation = Number(loadExifPacket(native)['0th']?.[piexif.ImageIFD.Orientation]) || 1; } catch { /* Unreadable EXIF has no orientation to keep. */ }
  const insert = orientation > 1 && orientation <= 8
    ? [jpegPacket(join([encoder.encode('Exif\0\0'), tiffBytes({ '0th': { [piexif.ImageIFD.Orientation]: orientation } })]))]
    : [];
  return jpegPackets(bytes, (marker, data) => marker < 224 || marker === 238 || (marker === 224 && text(data.subarray(0, 5)) === 'JFIF\0') || isIccSegment(marker, data), insert);
}
export async function stripAllMetadataFromBlob(blob: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer()), format = imageFormat(bytes);
  if (format === 'image/jpeg') return new Blob([stripJpegToEssentials(bytes) as Uint8Array<ArrayBuffer>], { type: format });
  if (format === 'image/png') {
    const keep = ['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'acTL', 'fcTL', 'fdAT', 'cICP', 'mDCV', 'cLLI'];
    return new Blob([join([bytes.subarray(0, 8), ...containerPackets(bytes).filter((p) => keep.includes(p.type)).map((p) => p.packet)]) as Uint8Array<ArrayBuffer>], { type: format });
  }
  if (format === 'image/webp') return new Blob([rewriteWebp(bytes) as Uint8Array<ArrayBuffer>], { type: format });
  if (format === 'image/gif') throw new Error('GIF sanitization could remove animation. Convert a copy to PNG or WebP first.');
  return sanitizeViaCanvas(blob);
}
export async function stripGpsFromBlob(blob: Blob): Promise<Blob> {
  if (imageFormat(new Uint8Array(await blob.slice(0, 40).arrayBuffer())) !== 'image/jpeg') return stripAllMetadataFromBlob(blob);
  const dataUrl = await blobToDataUrl(blob), exif = ensureExifDicts(piexif.load(dataUrl));
  exif.GPS = {}; delete exif['0th']![piexif.ImageIFD.GPSTag]; delete exif.Exif![piexif.ExifIFD.MakerNote];
  exif.thumbnail = null; exif['1st'] = {};
  const cleaned = dataUrlToBlob(piexif.insert(piexif.dump(exif), dataUrl));
  // Secondary packets and thumbnails can carry another copy of the location.
  const bytes = jpegPackets(new Uint8Array(await cleaned.arrayBuffer()), (marker, data) => marker < 224 || marker === 224 || marker === 238 || (marker === 225 && text(data.subarray(0, 6)) === 'Exif\0\0') || (marker === 226 && text(data.subarray(0, 12)) === 'ICC_PROFILE\0'));
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' });
}
