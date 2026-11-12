import type { MetaFile } from './types';
import { getGpsCoordinates } from './privacy-rules';
import { formatExifDate } from './metadata-writer';

/** JSON for metadata exports: binary blocks are summarized, BigInts stringified, and cycles cut. */
export function metadataJson(payload: unknown): string {
  const ancestors: unknown[] = [];
  return JSON.stringify(payload, function (this: unknown, _key: string, value: unknown) {
    while (ancestors.length && ancestors[ancestors.length - 1] !== this) ancestors.pop();
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return `[binary ${(value as ArrayBuffer).byteLength} bytes]`;
    if (value && typeof value === 'object') {
      if (ancestors.includes(value)) return '[circular]';
      ancestors.push(value);
    }
    return value;
  }, 2);
}

const first = (...values: unknown[]) => values.find((value) => value !== undefined && value !== null && value !== '');
const CSV_COLUMNS: [string, (file: MetaFile) => unknown][] = [
  ['Filename', (file) => file.name],
  ['Format', (file) => file.type],
  ['Width', (file) => file.width],
  ['Height', (file) => file.height],
  ['Size (bytes)', (file) => file.size],
  ['Title', (file) => file.seoData.title],
  ['Caption', (file) => file.seoData.caption],
  ['Alt text', (file) => file.seoData.altText],
  ['Keywords', (file) => file.seoData.keywords],
  ['Artist', ({ rawMetadata: raw }) => first(raw.exif?.Artist, raw.iptc?.Byline, raw.xmp?.creator)],
  ['Copyright', ({ rawMetadata: raw }) => first(raw.exif?.Copyright, raw.iptc?.CopyrightNotice, raw.xmp?.rights)],
  ['Camera make', ({ rawMetadata: raw }) => raw.exif?.Make],
  ['Camera model', ({ rawMetadata: raw }) => raw.exif?.Model],
  ['Lens', ({ rawMetadata: raw }) => raw.exif?.LensModel],
  ['ISO', ({ rawMetadata: raw }) => first(raw.exif?.ISO, raw.exif?.ISOSpeedRatings)],
  ['Date taken', ({ rawMetadata: raw }) => first(raw.exif?.DateTimeOriginal, raw.exif?.CreateDate)],
  ['Latitude', (file) => file.privacyReport.hasGps ? getGpsCoordinates(file.rawMetadata).lat : undefined],
  ['Longitude', (file) => file.privacyReport.hasGps ? getGpsCoordinates(file.rawMetadata).lon : undefined],
  ['Privacy risk', (file) => file.privacyReport.riskLevel],
  ['Privacy score', (file) => file.privacyReport.score],
  ['Privacy issues', (file) => file.privacyReport.issues.map((issue) => issue.title)],
  ['AI workflow', (file) => file.aiWorkflow.detected ? file.aiWorkflow.type : ''],
  ['Modified in MetaForge', (file) => file.isDirty ? 'yes' : 'no']
];
function csvCell(value: unknown): string {
  let text = value === undefined || value === null ? ''
    : value instanceof Date ? (Number.isNaN(value.getTime()) ? '' : formatExifDate(value))
    : Array.isArray(value) ? value.map((item) => String(item)).join('; ')
    : typeof value === 'object' ? JSON.stringify((value as Record<string, unknown>).value ?? value) : String(value);
  // Spreadsheets execute cells that start with these characters as formulas.
  if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
/** A spreadsheet-ready catalog. The BOM makes Excel read UTF-8 text correctly. */
export function buildMetadataCsv(files: MetaFile[]): string {
  const rows = [CSV_COLUMNS.map(([header]) => csvCell(header)), ...files.map((file) => CSV_COLUMNS.map(([, read]) => csvCell(read(file))))];
  return `﻿${rows.map((row) => row.join(',')).join('\r\n')}\r\n`;
}
