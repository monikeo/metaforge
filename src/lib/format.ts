import { formatExifDate, metadataText } from './metadata-writer';

export const isBinaryValue = (value: unknown): value is ArrayBuffer | ArrayBufferView => value instanceof ArrayBuffer || ArrayBuffer.isView(value);
const isLanguageAlternative = (value: unknown): value is { lang?: string; value?: unknown } =>
  !!value && typeof value === 'object' && !Array.isArray(value) && 'lang' in value && Object.keys(value).every((key) => key === 'lang' || key === 'value');

/** One-line display text for any parsed metadata value. */
export function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 'Invalid date' : formatExifDate(value);
  if (isBinaryValue(value)) return `[binary ${value.byteLength} bytes]`;
  if (isLanguageAlternative(value)) return metadataText(value);
  if (typeof value === 'object') {
    try { return JSON.stringify(value, (_key, item) => isBinaryValue(item) ? `[binary ${item.byteLength} bytes]` : typeof item === 'bigint' ? item.toString() : item); }
    catch { return '[unreadable value]'; }
  }
  return String(value);
}

/** Text placed in the tag editor. Dates use the EXIF format the writer expects. */
export function editableMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : formatExifDate(value);
  if (isLanguageAlternative(value)) return metadataText(value);
  if (typeof value === 'object') { try { return JSON.stringify(value, null, 2); } catch { return ''; } }
  return String(value);
}

export const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
