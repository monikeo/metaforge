import piexif from 'piexifjs';
import type { AiCleanLevel, MetaFile } from './types';
import { AI_SECTIONS, c2paDeclaresAi, c2paJumbfInstances, classifyAiField, isAiKeyword, isKeywordKey, isStandardChunk, jumbfInstance, keywordItems, normalizeKey, packetHasAiLabel, scanAiProvenance } from './ai-provenance';
import { firstText, gifBlocks, imageFormat, isRenderingGifExtension, jpegPackets, rewriteContainerChunks, rewriteNativeExif, stripAllMetadataFromBlob, writeMetadataToBlob, type NativeEdit } from './metadata-writer';

type RawMetadata = MetaFile['rawMetadata'];
export interface AiCleanOptions { level: AiCleanLevel; keepAttribution: boolean }

const latin1 = new TextDecoder('latin1');
const EDITABLE = ['image/jpeg', 'image/png', 'image/webp'];

/** Coordinates and place names. "Remove GPS" and the location level remove all of them, so no copy survives in XMP or IPTC. */
const LOCATION_FIELD = /^(?:gps[a-z0-9]*|latitude|longitude|altitude|city|state|country|countrycode|countryname|countryprimarylocationname|countryprimarylocationcode|provincestate|sublocation|location|locationcreated|locationshown|worldregion)$/;
/** Device, ownership, and document-tracking identifiers removed by the "AI + location & device" level. */
const DEVICE_FIELD = /^(?:bodyserialnumber|cameraserialnumber|lensserialnumber|serialnumber|internalserialnumber|cameraownername|ownername|imageuniqueid|hostcomputer|makernote|software|processingsoftware|creatortool|history|ingredients|pantry|derivedfrom|documentid|instanceid|originaldocumentid|preservedfilename|rawfilename|originalrawfilename|documentname)$/;
export const isLocationField = (key: string) => LOCATION_FIELD.test(normalizeKey(key));

/** Removes location fields from every section, including the snapshot copies MetaForge keeps in XMP. */
export function withoutLocation(source: RawMetadata): RawMetadata {
  const raw = structuredClone(source);
  delete raw.gps;
  for (const section of ['exif', 'iptc', 'xmp'] as const) for (const key of Object.keys(raw[section] || {})) if (isLocationField(key)) delete raw[section]![key];
  return raw;
}
/** Clears the GPS directory and the places that can repeat it: MakerNotes and the embedded thumbnail. */
export function clearNativeLocation(exif: piexif.IExifElement): void {
  exif.GPS = {};
  exif.thumbnail = null; exif['1st'] = {};
  delete exif.Exif?.[piexif.ExifIFD.MakerNote];
}
const DEVICE_TAGS: ['0th' | 'Exif', string][] = [
  ['0th', 'HostComputer'], ['0th', 'Software'], ['0th', 'ProcessingSoftware'], ['0th', 'CameraSerialNumber'], ['0th', 'DocumentName'],
  ['Exif', 'BodySerialNumber'], ['Exif', 'LensSerialNumber'], ['Exif', 'CameraOwnerName'], ['Exif', 'ImageUniqueID']
];
function clearNativeDevice(exif: piexif.IExifElement): void {
  clearNativeLocation(exif);
  for (const [ifd, name] of DEVICE_TAGS) {
    const tag = (ifd === '0th' ? piexif.ImageIFD : piexif.ExifIFD)[name];
    if (tag !== undefined) delete exif[ifd]?.[tag];
  }
}

/**
 * Removes AI fields (and, for the location level, device and location fields) from parsed metadata.
 * Returns the matching native EXIF removals so the file and the parsed copy stay in step.
 */
export function cleanAiRaw(source: RawMetadata, level: Exclude<AiCleanLevel, 'all'>, options: { dropProvenanceRef?: boolean } = {}): { raw: RawMetadata; edits: NativeEdit[]; changed: boolean } {
  const dropRef = options.dropProvenanceRef || level === 'private';
  const raw = structuredClone(source), edits: NativeEdit[] = [];
  let changed = false;
  if (level === 'private' && raw.gps) { delete raw.gps; changed = true; }
  for (const section of AI_SECTIONS) {
    const block = raw[section];
    if (!block || typeof block !== 'object') continue;
    for (const [key, value] of Object.entries(block)) {
      const name = normalizeKey(key);
      let remove = (level === 'private' && (LOCATION_FIELD.test(name) || DEVICE_FIELD.test(name) || (section === 'pngChunks' && /^(?:software|source)$/.test(name))))
        // An XMP pointer to a removed manifest would dangle.
        || (dropRef && name === 'provenance' && /c2pa|jumbf/i.test(String(value)));
      if (!remove && isKeywordKey(key)) {
        const items = keywordItems(value), kept = items.filter((item) => !isAiKeyword(item));
        if (kept.length === items.length) continue;
        changed = true;
        if (kept.length) {
          block[key] = section === 'exif' ? kept.join(';') : kept;
          if (section === 'exif') edits.push({ section, key, value: kept.join(';') });
          continue;
        }
        remove = true;
      }
      if (!remove && !classifyAiField(key, value)) continue;
      delete block[key]; changed = true;
      if (section === 'exif') edits.push({ section, key, remove: true });
    }
  }
  return { raw, edits, changed };
}

/** Removes C2PA manifests and any packet that still carries an AI label after the metadata rewrite. Image data is untouched. */
export async function stripProvenancePackets(blob: Blob, level: AiCleanLevel): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer()), format = imageFormat(bytes);
  let output: Uint8Array;
  if (format === 'image/jpeg') {
    // "AI labels only" keeps camera-signed Content Credentials that declare no AI; the other levels remove every manifest.
    const manifests = c2paJumbfInstances(bytes, level === 'ai');
    // Appended data is dropped, except Ultra HDR gain maps and other indexed images at the "AI labels only" level.
    output = jpegPackets(bytes, (marker, data) => {
      // Other JUMBF boxes (JPEG XT HDR data, JPEG 360) are image content and stay.
      if (marker === 235 && jumbfInstance(data) >= 0) return !manifests.has(jumbfInstance(data));
      if (marker === 254) return level === 'ai' && !packetHasAiLabel(data, 'text');
      if ((marker === 225 && latin1.decode(data.subarray(0, 6)) !== 'Exif\0\0') || marker === 237) return !packetHasAiLabel(data, 'xmp');
      if (marker >= 227 && marker <= 239 && marker !== 238) return !packetHasAiLabel(data, 'text');
      return true;
    }, [], { secondaryImages: level === 'ai' });
  } else if (format === 'image/png' || format === 'image/webp') {
    output = rewriteContainerChunks(bytes, ({ type, data, packet }) => {
      if (type === 'caBX' || type === 'C2PA') return level !== 'ai' || c2paDeclaresAi(data) ? null : packet;
      if (type === 'XMP ' || (type === 'iTXt' && latin1.decode(data.subarray(0, 18)) === 'XML:com.adobe.xmp\0')) return packetHasAiLabel(data, 'xmp') ? null : packet;
      if (!isStandardChunk(format, type)) return packetHasAiLabel(data, 'opaque') ? null : packet;
      return packet;
    });
  } else if (format === 'image/gif') {
    // Comments, XMP and application blocks that carry AI markers are dropped, and so is data after the trailer.
    output = joinBytes(gifBlocks(bytes).filter((block) => block.kind !== 'extension' || isRenderingGifExtension(block) || !(block.label === 0xfe
      ? packetHasAiLabel(block.payload!, 'text')
      : packetHasAiLabel(block.packet, block.app === 'XMP DataXMP' ? 'xmp' : 'opaque'))).map((block) => block.packet));
  } else return blob;
  return new Blob([output as Uint8Array<ArrayBuffer>], { type: format });
}
const joinBytes = (parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0)); let offset = 0; for (const part of parts) { out.set(part, offset); offset += part.length; } return out; };

/**
 * Why a cleaned file (parsed again) is not clean enough for `level`, or null when it is.
 * Shared by the image queue and ZIP cleaning, so both accept exactly the same results.
 */
export function cleaningProblem(scan: Pick<MetaFile, 'aiProvenance' | 'privacyReport'>, level: AiCleanLevel): string | null {
  const remaining = scan.aiProvenance.signals;
  if (remaining.length) return `${remaining.length} AI marker(s) could not be removed safely (${remaining.slice(0, 2).map((signal) => signal.label).join(', ')})`;
  const leaks = [level !== 'ai' && scan.privacyReport.hasGps && 'location', level === 'private' && scan.privacyReport.hasDeviceSerial && 'device identifiers'].filter(Boolean);
  return leaks.length ? `Some ${leaks.join(' and ')} could not be removed safely` : null;
}

/** Creator and copyright to keep, unless they themselves name an AI tool. */
function attributionOf(raw: RawMetadata): Record<string, string> {
  const fields: [string, string][] = [
    ['Artist', firstText(raw.exif?.Artist, raw.iptc?.Byline, raw.xmp?.creator)],
    ['Copyright', firstText(raw.exif?.Copyright, raw.iptc?.CopyrightNotice, raw.xmp?.rights)]
  ];
  return Object.fromEntries(fields.filter(([key, value]) => value && !classifyAiField(key, value)));
}

/**
 * Removes AI labels and AI metadata.
 * - ai: C2PA manifests, IPTC AI source types and AI fields, prompts, workflows, AI generator names, AI edit history and AI keywords.
 *   Everything else (camera data, location, copyright, SEO) stays, and the compressed image is not re-encoded.
 * - private: the above, plus location, serial numbers, owner, host, software, document IDs, MakerNotes and thumbnails.
 * - all: every metadata block, keeping the colour profile and orientation, and optionally the creator and copyright.
 * GIF is cleaned block by block without touching frames. Other formats that cannot be edited in place (HEIC, AVIF, TIFF)
 * are converted to PNG (attribution is kept for the first two levels).
 */
export async function removeAiMetadataFromBlob(blob: Blob, raw: RawMetadata, options: AiCleanOptions): Promise<Blob> {
  const format = imageFormat(new Uint8Array(await blob.slice(0, 64).arrayBuffer()));
  if (format === 'image/gif' && options.level === 'ai') return stripProvenancePackets(blob, 'ai');
  if (options.level === 'all' || !EDITABLE.includes(format)) {
    const stripped = await stripAllMetadataFromBlob(blob);
    const attribution = options.level !== 'all' || options.keepAttribution ? attributionOf(raw) : {};
    // GIF has no EXIF block to hold attribution.
    if (!Object.keys(attribution).length || !EDITABLE.includes(stripped.type)) return stripped;
    return writeMetadataToBlob(stripped, { exif: attribution }, Object.entries(attribution).map(([key, value]) => ({ section: 'exif', key, value })));
  }
  let output = blob;
  const removesManifest = scanAiProvenance(new Uint8Array(await blob.arrayBuffer()), {}).signals.some((signal) => signal.kind === 'C2PA');
  if (options.level === 'private') output = await rewriteNativeExif(output, clearNativeDevice);
  const { raw: cleaned, edits, changed } = cleanAiRaw(raw, options.level, { dropProvenanceRef: removesManifest });
  // Secondary images (Ultra HDR gain maps) stay for "AI labels only"; the location level drops them with their own metadata.
  if (changed) output = await writeMetadataToBlob(output, cleaned, edits, { keepSecondaryImages: options.level === 'ai' });
  return stripProvenancePackets(output, options.level);
}
