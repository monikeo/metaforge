import piexif from 'piexifjs';
import { encodeCanvas } from './canvas-encoder';

const encoder = new TextEncoder(), decoder = new TextDecoder();
const text = (bytes: Uint8Array) => decoder.decode(bytes);
const nativeAliases: Record<string, string> = { ISO: 'ISOSpeedRatings', SerialNumber: 'BodySerialNumber' };
const nativeTagName = (key: string) => nativeAliases[key] || key;
const join = (parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};
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
export function toSafeExifString(value = ''): string { return value.replace(/[^\x20-\x7e\xa0-\xff]/g, '?'); }

// Rewrite container packets while preserving the compressed pixel stream.
function jpegPackets(bytes: Uint8Array, keep: (marker: number, data: Uint8Array) => boolean, insert: Uint8Array[] = []): Uint8Array {
  const parts = [bytes.subarray(0, 2), ...insert];
  let offset = 2;
  while (offset + 1 < bytes.length) {
    const start = offset;
    if (bytes[offset++] !== 255) throw new Error('Corrupt JPEG marker.');
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 217) { parts.push(bytes.subarray(start, offset)); return join(parts); }
    if (marker === 218) {
      const headerLength = (bytes[offset] << 8) | bytes[offset + 1];
      for (let i = offset + headerLength; i + 1 < bytes.length; i++) {
        if (bytes[i] === 255 && bytes[i + 1] === 217) { parts.push(bytes.subarray(start, i + 2)); return join(parts); }
      }
      throw new Error('JPEG end marker is missing.');
    }
    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) throw new Error('Truncated JPEG packet.');
    if (keep(marker, bytes.subarray(offset + 2, offset + length))) parts.push(bytes.subarray(start, offset + length));
    offset += length;
  }
  throw new Error('Incomplete JPEG image.');
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
function webpChunk(type: string, data: Uint8Array): Uint8Array {
  const packet = new Uint8Array(8 + data.length + (data.length % 2));
  packet.set(encoder.encode(type)); new DataView(packet.buffer).setUint32(4, data.length, true); packet.set(data, 8);
  return packet;
}
function rewriteWebp(bytes: Uint8Array, xmp?: Uint8Array, nativeExif?: Uint8Array): Uint8Array {
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
const escapeXml = (value: unknown) => String(value ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
const unescapeXml = (value: string) => value.replace(/&(lt|gt|amp|quot|apos);/g, (_, key: string) => ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" })[key]!);
export function readEmbeddedMetadata(bytes: Uint8Array): Record<string, any> | null {
  let packets: Uint8Array[] = [];
  if (imageFormat(bytes) === 'image/jpeg') jpegPackets(bytes, (marker, data) => { if (marker === 225) packets.push(data); return true; });
  else if (['image/png', 'image/webp'].includes(imageFormat(bytes))) packets = containerPackets(bytes).filter((p) => ['iTXt', 'XMP '].includes(p.type)).map((p) => p.data);
  for (const packet of packets) {
    const match = text(packet).match(/<mf:Metadata>([\s\S]*?)<\/mf:Metadata>/);
    if (!match) continue;
    try {
      const raw = JSON.parse(unescapeXml(match[1]));
      if (!raw || Array.isArray(raw) || typeof raw !== 'object') continue;
      return Object.fromEntries(['exif', 'gps', 'iptc', 'xmp', 'pngChunks'].filter((key) => raw[key] && typeof raw[key] === 'object' && !Array.isArray(raw[key])).map((key) => [key, raw[key]]));
    } catch { /* Invalid optional packets must not hide native metadata. */ }
  }
  return null;
}
function xmpPacket(raw: Record<string, any>): Uint8Array {
  const iptc = raw.iptc || {}, exif = raw.exif || {}, xmp = raw.xmp || {};
  const snapshot = Object.fromEntries(['exif', 'gps', 'iptc', 'xmp', 'pngChunks'].filter((key) => raw[key]).map((key) => [key, key === 'exif' ? Object.fromEntries(Object.entries(raw.exif).filter(([name, value]) => name !== 'MakerNote' && !ArrayBuffer.isView(value) && !(value instanceof ArrayBuffer))) : raw[key]]));
  const alt = (name: string, value: unknown) => `<dc:${name}><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(value)}</rdf:li></rdf:Alt></dc:${name}>`;
  const keywords = iptc.Keywords || xmp.subject || [];
  return encoder.encode(`<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/" xmlns:mf="https://metaforge.local/ns/1.0/">${alt('title', iptc.Headline ?? xmp.title ?? '')}${alt('description', iptc.Caption ?? xmp.description ?? exif.ImageDescription ?? '')}${alt('rights', exif.Copyright ?? iptc.CopyrightNotice ?? xmp.rights ?? '')}<dc:creator><rdf:Seq><rdf:li>${escapeXml(exif.Artist ?? iptc.Byline ?? xmp.creator ?? '')}</rdf:li></rdf:Seq></dc:creator><dc:subject><rdf:Bag>${(Array.isArray(keywords) ? keywords : [keywords]).map((value: unknown) => `<rdf:li>${escapeXml(value)}</rdf:li>`).join('')}</rdf:Bag></dc:subject><Iptc4xmpCore:AltTextAccessibility>${escapeXml(xmp.altText ?? '')}</Iptc4xmpCore:AltTextAccessibility><mf:Metadata>${escapeXml(JSON.stringify(snapshot))}</mf:Metadata></rdf:Description></rdf:RDF></x:xmpmeta>`);
}
function editExifPacket(data: Uint8Array, edit: { section: string; key: string; value?: any; remove?: boolean }): Uint8Array {
  let binary = '';
  for (let offset = 0; offset < data.length; offset += 8192) binary += String.fromCharCode(...data.subarray(offset, offset + 8192));
  const exif = ensureExifDicts(piexif.load(binary.startsWith('Exif\0\0') ? binary : 'Exif\0\0' + binary));
  const dictionaries = edit.section === 'gps' ? [['GPS', piexif.GPSIFD] as const] : [['0th', piexif.ImageIFD] as const, ['Exif', piexif.ExifIFD] as const];
  for (const [section, tags] of dictionaries) {
    const tag = tags[nativeTagName(edit.key)];
    if (tag === undefined) continue;
    if (edit.remove) delete exif[section]![tag];
    else {
      const kind = piexif.TAGS[section === '0th' ? 'Image' : section]?.[tag]?.type;
      let value = edit.value;
      if (kind === 'Ascii') value = toSafeExifString(String(value));
      if (kind === 'Rational' && typeof value === 'number') value = [Math.round(value * 1000000), 1000000];
      exif[section]![tag] = value;
    }
  }
  return Uint8Array.from(piexif.dump(exif), (character) => character.charCodeAt(0));
}
export async function writeMetadataToBlob(blob: Blob, raw: Record<string, any>, edit?: { section: string; key: string; value?: any; remove?: boolean }): Promise<Blob> {
  let bytes: Uint8Array = new Uint8Array(await blob.arrayBuffer());
  const format = imageFormat(bytes);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(format)) throw new Error('Tag writing supports JPEG, PNG, and WebP. Export JSON for this format, or sanitize a copy to PNG first.');
  const xmp = xmpPacket(raw);
  if (format === 'image/jpeg') {
    if (edit && ['exif', 'gps'].includes(edit.section)) {
      const dataUrl = await blobToDataUrl(blob), exif = ensureExifDicts(piexif.load(dataUrl));
      const dictionaries = edit.section === 'gps' ? [['GPS', piexif.GPSIFD] as const] : [['0th', piexif.ImageIFD] as const, ['Exif', piexif.ExifIFD] as const];
      for (const [section, tags] of dictionaries) {
        const tag = tags[nativeTagName(edit.key)];
        if (tag === undefined) continue;
        if (edit.remove) delete exif[section]![tag];
        else {
          const kind = piexif.TAGS[section === '0th' ? 'Image' : section]?.[tag]?.type;
          let value = edit.value;
          if (kind === 'Ascii') value = toSafeExifString(String(value));
          if (kind === 'Rational' && typeof value === 'number') value = [Math.round(value * 1000000), 1000000];
          exif[section]![tag] = value;
        }
      }
      bytes = new Uint8Array(await dataUrlToBlob(piexif.insert(piexif.dump(exif), dataUrl)).arrayBuffer());
    }
    bytes = jpegPackets(bytes, (marker, data) => !(marker === 225 && !text(data.subarray(0, 6)).startsWith('Exif\0')) && marker !== 237,
      [jpegPacket(join([encoder.encode('http://ns.adobe.com/xap/1.0/\0'), xmp]))]);
  } else if (format === 'image/png') {
    const packets = containerPackets(bytes).filter((p) => !['tEXt', 'zTXt', 'iTXt'].includes(p.type));
    if (edit && ['exif', 'gps'].includes(edit.section)) {
      const native = packets.find((packet) => packet.type === 'eXIf');
      if (native) native.packet = pngChunk('eXIf', editExifPacket(native.data, edit).subarray(6));
    }
    const texts = Object.entries(raw.pngChunks || {}).filter(([key]) => key !== 'XML:com.adobe.xmp').map(([key, value]) => pngChunk('iTXt', join([encoder.encode(key), new Uint8Array(5), encoder.encode(String(value))])));
    bytes = join([bytes.subarray(0, 8), ...packets.filter((p) => p.type !== 'IEND').map((p) => p.packet), ...texts,
      pngChunk('iTXt', join([encoder.encode('XML:com.adobe.xmp'), new Uint8Array(5), xmp])), packets[packets.length - 1].packet]);
  } else {
    let native = containerPackets(bytes).find((packet) => packet.type === 'EXIF')?.data;
    if (native && edit && ['exif', 'gps'].includes(edit.section)) native = editExifPacket(native, edit);
    bytes = rewriteWebp(bytes, xmp, native);
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
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Image conversion is unavailable. No changes were made.');
        context.drawImage(image, 0, 0);
        resolve(await encodeCanvas(canvas, mimeType, quality));
      } catch (error) { reject(error); }
    };
    image.src = url;
  });
}
export async function stripAllMetadataFromBlob(blob: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer()), format = imageFormat(bytes);
  if (format === 'image/jpeg') {
    const orientation = piexif.load(await blobToDataUrl(blob))['0th']?.[piexif.ImageIFD.Orientation];
    if (orientation && orientation !== 1) return sanitizeViaCanvas(blob, 'image/jpeg');
    return new Blob([jpegPackets(bytes, (marker) => marker === 224 || marker === 238 || marker < 224) as Uint8Array<ArrayBuffer>], { type: format });
  }
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
export async function writeTagsToJpeg(blob: Blob, tags: { title?: string; artist?: string; copyright?: string; description?: string; userComment?: string }): Promise<Blob> {
  if (imageFormat(new Uint8Array(await blob.slice(0, 40).arrayBuffer())) !== 'image/jpeg') throw new Error('Native EXIF writing requires JPEG.');
  const dataUrl = await blobToDataUrl(blob), exif = ensureExifDicts(piexif.load(dataUrl));
  for (const [key, tag] of [['artist', 'Artist'], ['copyright', 'Copyright'], ['description', 'ImageDescription']] as const) {
    if (tags[key] !== undefined) exif['0th']![piexif.ImageIFD[tag]] = toSafeExifString(tags[key]);
  }
  if (tags.userComment !== undefined) exif.Exif![piexif.ExifIFD.UserComment] = 'ASCII\0\0\0' + toSafeExifString(tags.userComment);
  return dataUrlToBlob(piexif.insert(piexif.dump(exif), dataUrl));
}
