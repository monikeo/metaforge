import exifr from 'exifr';
import { AiWorkflowInfo, MetaFile } from './types';
import { analyzePrivacyRisks } from './privacy-rules';
import { imageFormat, containerPackets, readEmbeddedSnapshot, readNativeUserComment, firstText, textList, MIRRORED_SNAPSHOT_FIELDS } from './metadata-writer';

const pngWarnings = new WeakMap<Blob, string>();

/**
 * EXIF UserComment starts with an 8-byte character code. exifr returns the raw bytes as a string,
 * so UNICODE comments (used by Stable Diffusion WebUI for JPEG parameters) arrive as interleaved NUL bytes.
 */
export function decodeUserComment(value: unknown, littleEndian?: boolean): unknown {
  let bytes: number[];
  if (typeof value === 'string') {
    if (!/^(ASCII\0{3}|UNICODE\0|JIS\0{5}|\0{8})/.test(value)) return value;
    bytes = Array.from(value, (character) => character.charCodeAt(0) & 255);
  } else if (value instanceof Uint8Array || (Array.isArray(value) && value.every((item) => Number.isInteger(item)))) {
    bytes = Array.from(value as ArrayLike<number>);
  } else return value;
  const prefix = String.fromCharCode(...bytes.slice(0, 8));
  const body = bytes.slice(8);
  if (prefix === 'UNICODE\0') {
    if (body.length % 2) body.push(0);
    let evenZeros = 0, oddZeros = 0;
    body.forEach((byte, index) => { if (!byte) { if (index % 2) oddZeros++; else evenZeros++; } });
    // ASCII-range text reveals its byte order; otherwise follow the TIFF header, as the EXIF spec intends.
    const encoding = evenZeros === oddZeros ? (littleEndian ? 'utf-16le' : 'utf-16be') : evenZeros > oddZeros ? 'utf-16be' : 'utf-16le';
    try { return new TextDecoder(encoding).decode(new Uint8Array(body)).replace(/\0+$/, ''); } catch { return value; }
  }
  if (prefix.startsWith('ASCII') || prefix === '\0'.repeat(8)) return new TextDecoder().decode(new Uint8Array(body)).replace(/\0+$/, '');
  return value;
}

async function inflateText(bytes: Uint8Array): Promise<string> {
  const reader = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024) throw new Error('Compressed metadata exceeds the 2 MB text limit.');
      parts.push(value);
    }
  } finally { await reader.cancel(); }
  return new TextDecoder().decode(await new Blob(parts as BlobPart[]).arrayBuffer());
}

export async function parsePngTextChunks(file: Blob): Promise<Record<string, string>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (imageFormat(bytes) !== 'image/png') return {};
  const result: Record<string, string> = Object.create(null);
  for (const { type, data } of containerPackets(bytes)) {
    if (!['tEXt', 'zTXt', 'iTXt'].includes(type)) continue;
    if (data.length > 2 * 1024 * 1024) { pngWarnings.set(file, 'Some PNG text metadata exceeded the inspection limit. Sanitize before sharing.'); continue; }
    const separator = data.indexOf(0);
    if (separator < 1 || separator > 79) continue;
    const key = new TextDecoder('latin1').decode(data.subarray(0, separator));
    if (key === 'XML:com.adobe.xmp') continue;
    try {
      if (type === 'tEXt') result[key] = new TextDecoder('latin1').decode(data.subarray(separator + 1));
      if (type === 'zTXt' && data[separator + 1] === 0) result[key] = await inflateText(data.subarray(separator + 2));
      if (type === 'iTXt') {
        const languageEnd = data.indexOf(0, separator + 3);
        const translatedEnd = languageEnd < 0 ? -1 : data.indexOf(0, languageEnd + 1);
        if (translatedEnd < 0) continue;
        const content = data.subarray(translatedEnd + 1);
        result[key] = data[separator + 1] === 1 ? await inflateText(content) : new TextDecoder().decode(content);
      }
    } catch { pngWarnings.set(file, 'Some compressed PNG metadata could not be inspected. Sanitize before sharing.'); }
  }
  return result;
}

export function seoFromRaw(raw: Record<string, any>) {
  const keywords = [raw.iptc?.Keywords, raw.xmp?.subject].map(textList).find((list) => list.length) ?? [];
  return {
    title: firstText(raw.iptc?.Headline, raw.iptc?.ObjectName, raw.xmp?.title, raw.xmp?.Headline),
    caption: firstText(raw.iptc?.Caption, raw.xmp?.description, raw.exif?.ImageDescription),
    altText: firstText(raw.xmp?.altText, raw.xmp?.AltTextAccessibility),
    keywords: [...new Set(keywords)]
  };
}

// Blocks exifr returns for containers and IFDs. Every other top-level block is an XMP namespace (dc, photoshop, Iptc4xmpCore...).
const NON_XMP_BLOCKS = new Set(['ifd0', 'ifd1', 'exif', 'gps', 'interop', 'iptc', 'icc', 'jfif', 'ihdr', 'makerNote', 'userComment', 'xmp', 'thumbnail', 'pngChunks', 'file']);
/** With mergeOutput disabled, exifr reports each XMP namespace separately. The app reads them from one xmp block. */
function foldXmpNamespaces(raw: Record<string, any>): void {
  const xmp: Record<string, any> = { ...(raw.xmp && typeof raw.xmp === 'object' ? raw.xmp : {}) };
  for (const [key, value] of Object.entries(raw)) {
    if (NON_XMP_BLOCKS.has(key) || !value || typeof value !== 'object' || Array.isArray(value) || ArrayBuffer.isView(value)) continue;
    delete raw[key];
    if (key === 'mf') continue; // MetaForge's own snapshot is read and validated separately.
    for (const [field, item] of Object.entries(value)) if (!(field in xmp)) xmp[field] = item;
  }
  if (Object.keys(xmp).length) raw.xmp = xmp;
}

export function detectAiWorkflow(metadata: any, pngChunks: Record<string, string> = {}): AiWorkflowInfo {
  metadata = { ...metadata, ...metadata?.exif, ...metadata?.xmp };
  if (metadata.UserComment !== undefined) metadata.UserComment = decodeUserComment(metadata.UserComment);
  if (metadata.userComment !== undefined) metadata.userComment = decodeUserComment(metadata.userComment);
  // Combine all searchable strings
  const combined = {
    ...metadata,
    ...pngChunks,
    parameters: pngChunks.parameters || metadata?.parameters || metadata?.UserComment || metadata?.userComment || metadata?.ImageDescription || '',
    prompt: pngChunks.prompt || metadata?.prompt || '',
    workflow: pngChunks.workflow || metadata?.workflow || ''
  };

  const serialized = JSON.stringify(combined);

  // 1. ComfyUI Detection
  const hasComfyPrompt = JSON.stringify(combined.prompt).includes('class_type') && JSON.stringify(combined.prompt).includes('inputs');
  const hasComfyWorkflow = typeof combined.workflow === 'string' && combined.workflow.includes('"nodes"');
  if (hasComfyPrompt || hasComfyWorkflow) {
    let promptExtract = '';
    let seedExtract = '';
    let stepsExtract: number | undefined;
    let samplerExtract: string | undefined;

    try {
      const parsedPrompt = typeof combined.prompt === 'string' ? JSON.parse(combined.prompt) : combined.prompt;
      if (parsedPrompt && typeof parsedPrompt === 'object') {
        for (const nodeId of Object.keys(parsedPrompt)) {
          const node = parsedPrompt[nodeId];
          if (node?.class_type?.includes('CLIPTextEncode') && node?.inputs?.text) {
            promptExtract += (promptExtract ? ' | ' : '') + node.inputs.text;
          }
          if (node?.inputs?.seed !== undefined) {
            seedExtract = String(node.inputs.seed);
          }
          if (node?.inputs?.steps !== undefined) {
            stepsExtract = Number(node.inputs.steps);
          }
          if (node?.inputs?.sampler_name) {
            samplerExtract = String(node.inputs.sampler_name);
          }
        }
      }
    } catch {
      // fallback regex
    }

    return {
      detected: true,
      type: 'ComfyUI',
      rawWorkflow: combined.workflow ? (typeof combined.workflow === 'string' ? combined.workflow : JSON.stringify(combined.workflow)) : typeof combined.prompt === 'string' ? combined.prompt : JSON.stringify(combined.prompt),
      prompt: promptExtract || 'ComfyUI Graph Node Network Detected',
      seed: seedExtract,
      steps: stepsExtract,
      sampler: samplerExtract
    };
  }

  // 2. Stable Diffusion / Automatic1111 / WebUI / Forge Detection
  const paramsStr = typeof combined.parameters === 'string' ? combined.parameters : serialized;
  const isSD = paramsStr.includes('Steps:') && paramsStr.includes('Sampler:');
  if (isSD) {
    let prompt = '';
    let negativePrompt = '';
    let steps: number | undefined;
    let sampler: string | undefined;
    let cfg: number | undefined;
    let seed: string | undefined;
    let model: string | undefined;

    if (typeof combined.parameters === 'string') {
      const negMatch = combined.parameters.match(/Negative prompt:\s*([\s\S]*?)(?=Steps:|$)/i);
      if (negMatch) {
        negativePrompt = negMatch[1].trim();
        prompt = combined.parameters.substring(0, negMatch.index).trim();
      } else {
        const stepsIdx = combined.parameters.indexOf('Steps:');
        if (stepsIdx !== -1) {
          prompt = combined.parameters.substring(0, stepsIdx).trim();
        }
      }

      const stepsMatch = combined.parameters.match(/Steps:\s*(\d+)/i);
      if (stepsMatch) steps = parseInt(stepsMatch[1], 10);

      const samplerMatch = combined.parameters.match(/Sampler:\s*([^,\n]+)/i);
      if (samplerMatch) sampler = samplerMatch[1].trim();

      const cfgMatch = combined.parameters.match(/CFG scale:\s*([\d.]+)/i);
      if (cfgMatch) cfg = parseFloat(cfgMatch[1]);

      const seedMatch = combined.parameters.match(/Seed:\s*(\d+)/i);
      if (seedMatch) seed = seedMatch[1].trim();

      const modelMatch = combined.parameters.match(/Model:\s*([^,\n]+)/i);
      if (modelMatch) model = modelMatch[1].trim();
    }

    return {
      detected: true,
      type: 'Stable Diffusion',
      rawWorkflow: combined.parameters || serialized,
      prompt: prompt || 'Stable Diffusion Generation Parameters',
      negativePrompt,
      steps,
      sampler,
      cfg,
      seed,
      model
    };
  }

  // 3. Midjourney Detection
  if (serialized.includes('--v ') || serialized.includes('--ar ') || serialized.includes('Midjourney')) {
    return {
      detected: true,
      type: 'Midjourney',
      rawWorkflow: serialized,
      prompt: typeof combined.Description === 'string' ? combined.Description : undefined
    };
  }

  return {
    detected: false,
    type: 'None',
    rawWorkflow: null
  };
}

export function generateHexSample(buffer: ArrayBuffer, bytesCount = 512): string {
  const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, bytesCount)));
  let result = '';
  const lineSize = 16;

  for (let i = 0; i < bytes.length; i += lineSize) {
    const offsetHex = i.toString(16).padStart(6, '0').toUpperCase();
    const chunk = bytes.slice(i, i + lineSize);
    
    // Hex representations
    const hexParts: string[] = [];
    for (let j = 0; j < lineSize; j++) {
      if (j < chunk.length) {
        hexParts.push(chunk[j].toString(16).padStart(2, '0').toUpperCase());
      } else {
        hexParts.push('  ');
      }
    }
    const hexStr = hexParts.slice(0, 8).join(' ') + '  ' + hexParts.slice(8).join(' ');

    // ASCII representation
    let asciiStr = '';
    for (let j = 0; j < chunk.length; j++) {
      const byte = chunk[j];
      asciiStr += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
    }

    result += `${offsetHex}  ${hexStr}  |${asciiStr}|\n`;
  }

  return result;
}

export async function parseDeepMetadata(file: File): Promise<MetaFile> {
  if (!file.size) throw new Error('The image is empty.');
  if (file.size > 100 * 1024 * 1024) throw new Error('Images must be 100 MB or smaller.');
  const buffer = await file.arrayBuffer();
  const format = imageFormat(new Uint8Array(buffer));
  const embedded = readEmbeddedSnapshot(new Uint8Array(buffer));
  const hexSample = generateHexSample(buffer, 4096);

  // Parse PNG chunks if PNG
  let pngChunks: Record<string, string> = {};
  if (format === 'image/png') {
    pngChunks = await parsePngTextChunks(file);
  }

  // Parse with exifr
  let rawMetadata: Record<string, any> = {};
  let inspectionWarning = pngWarnings.get(file) || '';
  try {
    let input = buffer;
    if (format === 'image/webp') {
      const exif = containerPackets(new Uint8Array(buffer)).find((packet) => packet.type === 'EXIF');
      if (exif) {
        const data = exif.data[0] === 69 ? exif.data.subarray(6) : exif.data;
        input = data.slice().buffer as ArrayBuffer;
      } else input = new ArrayBuffer(0);
      const xmp = containerPackets(new Uint8Array(buffer)).find((packet) => packet.type === 'XMP ');
      if (xmp && typeof DOMParser !== 'undefined') {
        const document = new DOMParser().parseFromString(new TextDecoder().decode(xmp.data), 'application/xml');
        if (document.querySelector('parsererror')) inspectionWarning = 'Some XMP metadata could not be read.';
        else {
          rawMetadata.xmp = {};
          for (const node of Array.from(document.getElementsByTagName('*'))) {
            if (node.localName === 'Metadata') continue;
            const values = Array.from(node.getElementsByTagNameNS('*', 'li')).map((item) => item.textContent || '');
            if (node.namespaceURI === 'http://purl.org/dc/elements/1.1/' && values.length) rawMetadata.xmp[node.localName] = node.localName === 'subject' ? values : values[0];
            else if (!node.children.length) rawMetadata.xmp[node.localName] = node.textContent || '';
            for (const attribute of Array.from(node.attributes)) if (!attribute.name.startsWith('xmlns') && !attribute.name.startsWith('rdf:')) rawMetadata.xmp[attribute.localName] = attribute.value;
          }
        }
      }
    }
    const parsed = input.byteLength ? await exifr.parse(input, {
      tiff: true,
      xmp: true,
      icc: true,
      iptc: true,
      jfif: true,
      ihdr: true,
      exif: true,
      gps: true,
      makerNote: true,
      userComment: true,
      translateKeys: true,
      reviveValues: true,
      translateValues: false,
      sanitize: false,
      mergeOutput: false,
    }) : {};
    rawMetadata = { ...rawMetadata, ...parsed };
  } catch {
    inspectionWarning = 'Some metadata blocks could not be read. Sanitize the image before sharing it.';
  }
  rawMetadata.exif = { ...rawMetadata.ifd0, ...rawMetadata.exif };
  delete rawMetadata.ifd0;
  foldXmpNamespaces(rawMetadata);
  delete rawMetadata.xmp?.Metadata;
  const nativeComment = typeof rawMetadata.exif.UserComment === 'string' && rawMetadata.exif.UserComment.startsWith('UNICODE') ? readNativeUserComment(new Uint8Array(buffer)) : null;
  if (nativeComment) rawMetadata.exif.UserComment = decodeUserComment(nativeComment.binary, nativeComment.littleEndian);
  for (const block of [rawMetadata.exif, rawMetadata]) {
    for (const key of ['UserComment', 'userComment']) if (block?.[key] !== undefined) block[key] = decodeUserComment(block[key]);
  }
  if (nativeComment && rawMetadata.userComment !== undefined) rawMetadata.userComment = rawMetadata.exif.UserComment;
  const nativeMetadata = structuredClone(rawMetadata);
  if (embedded) {
    const { metadata, exifChanged, xmpChanged } = embedded;
    // Another tool rewrote the visible XMP fields after MetaForge saved them, so those native values win.
    if (xmpChanged) for (const [section, fields] of Object.entries(MIRRORED_SNAPSHOT_FIELDS)) for (const field of fields) delete metadata[section]?.[field];
    for (const key of Object.keys(metadata)) {
      if (exifChanged && (key === 'exif' || key === 'gps')) continue;
      rawMetadata[key] = { ...rawMetadata[key], ...metadata[key] };
    }
  }

  // If PNG text chunks found, augment XMP/custom metadata
  if (Object.keys(pngChunks).length > 0) {
    rawMetadata.pngChunks = pngChunks;
  }

  // Detect AI workflow
  const aiWorkflow = detectAiWorkflow(rawMetadata, pngChunks);

  // Detect Privacy risks
  const privacyReport = analyzePrivacyRisks(rawMetadata, nativeMetadata);
  if (inspectionWarning) privacyReport.inspectionWarning = inspectionWarning;

  // Generate thumbnail URL
  const thumbnailUrl = URL.createObjectURL(new Blob([file], { type: format }));

  // Try extracting dimensions
  let width: number | undefined;
  let height: number | undefined;

  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => reject(new Error('Image decoding timed out.')), 15000);
      image.onload = () => { clearTimeout(timer); width = image.naturalWidth; height = image.naturalHeight; resolve(); };
      image.onerror = () => {
        clearTimeout(timer);
        if (['image/heic', 'image/tiff'].includes(format) && Object.keys(rawMetadata.exif || {}).length) {
          width = Number(rawMetadata.exif.ExifImageWidth || rawMetadata.exif.ImageWidth) || undefined;
          height = Number(rawMetadata.exif.ExifImageHeight || rawMetadata.exif.ImageHeight) || undefined;
          resolve();
        }
        else reject(new Error('The image is corrupt or cannot be decoded by this browser.'));
      };
      image.src = thumbnailUrl;
    });
  } catch (error) { URL.revokeObjectURL(thumbnailUrl); throw error; }
  const seoData = seoFromRaw(rawMetadata);

  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: format,
    lastModified: file.lastModified,
    width,
    height,
    originalBlob: new Blob([file], { type: format }),
    modifiedBlob: null,
    thumbnailUrl,
    rawMetadata,
    aiWorkflow,
    seoData,
    privacyReport,
    rawHexSample: hexSample,
    isDirty: false,
    history: [
      {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        actor: 'System' as const,
        action: 'Imported File',
        diffSummary: 'Initial metadata loaded from file headers'
      }
    ],
    sourceTags: {}
  };
}
