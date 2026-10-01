import exifr from 'exifr';
import { AiWorkflowInfo, MetaFile } from './types';
import { analyzePrivacyRisks } from './privacy-rules';

export async function parsePngTextChunks(file: File): Promise<Record<string, string>> {
  try {
    const buffer = await file.slice(0, 1024 * 1024 * 2).arrayBuffer(); // read first 2MB
    const view = new DataView(buffer);
    
    // Check PNG signature: 137 80 78 71 13 10 26 10
    if (view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) {
      return {};
    }

    const textChunks: Record<string, string> = {};
    let offset = 8;
    const decoder = new TextDecoder('utf-8');

    while (offset < buffer.byteLength - 8) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7)
      );

      if (type === 'tEXt') {
        const chunkData = new Uint8Array(buffer, offset + 8, length);
        const nullIdx = chunkData.indexOf(0);
        if (nullIdx !== -1) {
          const keyword = decoder.decode(chunkData.slice(0, nullIdx));
          const text = decoder.decode(chunkData.slice(nullIdx + 1));
          textChunks[keyword] = text;
        }
      } else if (type === 'iTXt') {
        const chunkData = new Uint8Array(buffer, offset + 8, length);
        const nullIdx1 = chunkData.indexOf(0);
        if (nullIdx1 !== -1) {
          const keyword = decoder.decode(chunkData.slice(0, nullIdx1));
          // iTXt has compression flag, method, lang, translated keyword, then text
          let textStart = nullIdx1 + 3;
          // Find next two null separators
          const nullIdx2 = chunkData.indexOf(0, textStart);
          if (nullIdx2 !== -1) {
            const nullIdx3 = chunkData.indexOf(0, nullIdx2 + 1);
            if (nullIdx3 !== -1) {
              textStart = nullIdx3 + 1;
            }
          }
          const text = decoder.decode(chunkData.slice(textStart));
          textChunks[keyword] = text;
        }
      } else if (type === 'IEND') {
        break;
      }

      offset += 8 + length + 4; // 4 len + 4 type + data + 4 crc
    }

    return textChunks;
  } catch {
    return {};
  }
}

export function detectAiWorkflow(metadata: any, pngChunks: Record<string, string> = {}): AiWorkflowInfo {
  // Combine all searchable strings
  const combined = {
    ...metadata,
    ...pngChunks,
    parameters: pngChunks.parameters || metadata?.parameters || metadata?.userComment || metadata?.ImageDescription || '',
    prompt: pngChunks.prompt || metadata?.prompt || '',
    workflow: pngChunks.workflow || metadata?.workflow || ''
  };

  const serialized = JSON.stringify(combined);

  // 1. ComfyUI Detection
  const hasComfyPrompt = serialized.includes('"inputs"') && serialized.includes('"class_type"');
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
      rawWorkflow: typeof combined.workflow === 'string' ? combined.workflow : typeof combined.prompt === 'string' ? combined.prompt : JSON.stringify(combined),
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
  const buffer = await file.arrayBuffer();
  const hexSample = generateHexSample(buffer, 384);

  // Parse PNG chunks if PNG
  let pngChunks: Record<string, string> = {};
  if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
    pngChunks = await parsePngTextChunks(file);
  }

  // Parse with exifr
  let rawMetadata: Record<string, any> = {};
  try {
    const parsed = await exifr.parse(file, {
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
      sanitize: false,
      mergeOutput: false,
    });
    rawMetadata = parsed || {};
  } catch (err) {
    console.warn('Exifr parse warning for', file.name, err);
  }

  // If PNG text chunks found, augment XMP/custom metadata
  if (Object.keys(pngChunks).length > 0) {
    rawMetadata.pngChunks = pngChunks;
  }

  // Detect AI workflow
  const aiWorkflow = detectAiWorkflow(rawMetadata, pngChunks);

  // Detect Privacy risks
  const privacyReport = analyzePrivacyRisks(rawMetadata);

  // Generate thumbnail URL
  const thumbnailUrl = URL.createObjectURL(file);

  // Try extracting dimensions
  let width: number | undefined;
  let height: number | undefined;

  if (rawMetadata.exif?.ExifImageWidth && rawMetadata.exif?.ExifImageHeight) {
    width = rawMetadata.exif.ExifImageWidth;
    height = rawMetadata.exif.ExifImageHeight;
  } else if (rawMetadata.ihdr?.width && rawMetadata.ihdr?.height) {
    width = rawMetadata.ihdr.width;
    height = rawMetadata.ihdr.height;
  } else if (typeof window !== 'undefined') {
    try {
      const img = new Image();
      img.src = thumbnailUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => {
          width = img.naturalWidth;
          height = img.naturalHeight;
          resolve();
        };
        img.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }

  // Auto populate basic SEO data if tags exist
  const seoData = {
    title: rawMetadata.iptc?.Headline || rawMetadata.iptc?.ObjectName || rawMetadata.xmp?.title || '',
    caption: rawMetadata.iptc?.Caption || rawMetadata.exif?.ImageDescription || rawMetadata.xmp?.description || '',
    altText: rawMetadata.xmp?.altText || rawMetadata.iptc?.Caption || '',
    keywords: Array.isArray(rawMetadata.iptc?.Keywords) 
      ? rawMetadata.iptc.Keywords 
      : typeof rawMetadata.iptc?.Keywords === 'string'
      ? [rawMetadata.iptc.Keywords]
      : []
  };

  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    size: file.size,
    type: file.type || 'image/jpeg',
    lastModified: file.lastModified,
    width,
    height,
    originalBlob: file,
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
        id: `hist-init-${Date.now()}`,
        timestamp: Date.now(),
        actor: 'System' as const,
        action: 'Imported File',
        diffSummary: 'Initial metadata loaded from file headers'
      }
    ],
    sourceTags: {}
  };
}
