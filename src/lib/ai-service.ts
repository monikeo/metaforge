import { GoogleGenAI } from '@google/genai';
import { SeoMetadata } from './types';
import { DEFAULT_GEMINI_MODEL } from './ai-models';

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Resizes an image file if it exceeds max dimension for faster, low-bandwidth Gemini Vision analysis
 */
export async function prepareImageForAi(blob: Blob, maxDimension = 1536): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const timer = setTimeout(() => { URL.revokeObjectURL(url); reject(new Error('Image decoding timed out.')); }, 20000);

    img.onload = () => {
      clearTimeout(timer); URL.revokeObjectURL(url);
      try {
      let { naturalWidth: width, naturalHeight: height } = img;
      if (!width || !height) throw new Error('Image dimensions unavailable.');
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.max(1, Math.round((height * maxDimension) / width));
          width = maxDimension;
        } else {
          width = Math.max(1, Math.round((width * maxDimension) / height));
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const base64Data = dataUrl.split(',')[1];
      resolve({ base64Data, mimeType: 'image/jpeg' });
      } catch (error) { reject(error); }
    };

    img.onerror = () => {
      clearTimeout(timer); URL.revokeObjectURL(url);
      reject(new Error('This browser cannot decode the image for AI analysis. Convert it to PNG or JPEG first.'));
    };

    img.src = url;
  });
}

/**
 * Auto-diagnoses raw Gemini API / network errors into actionable descriptions
 */
export function classifyGeminiError(err: any): Error {
  const msg = String(err?.message || err || '');
  const status = Number(err?.status || err?.statusCode || 0);

  if (/API_KEY_INVALID|API key not valid/i.test(msg) || status === 401) {
    return new Error('Invalid Gemini API Key. Please verify or re-enter your key in AI Settings (⌘K).');
  }
  if (/RESOURCE_EXHAUSTED|quota/i.test(msg) || status === 429) {
    return new Error('Gemini API rate limit exceeded. Check your project quota and billing, then wait before trying again.');
  }
  if (status === 403) return new Error('Gemini API access denied. Check API key restrictions, project permissions, and regional availability.');
  if (status === 402) return new Error('Gemini billing credits are unavailable. Check the billing settings for your API project.');
  if (status === 408 || /timeout|timed out/i.test(msg)) return new Error('Gemini analysis timed out. Try again with a smaller image or check your connection.');
  if (status >= 500) return new Error('Google Gemini is temporarily unavailable. Please try again later.');
  if (msg.includes('SAFETY') || msg.includes('blocked') || msg.includes('HARM_CATEGORY')) {
    return new Error('Image analysis blocked by Gemini safety filters (contains sensitive content).');
  }
  if (/Failed to fetch|NetworkError|offline|Load failed|network connection/i.test(msg)) {
    return new Error('Network connection to Google Gemini endpoint failed. Check your internet connection.');
  }
  if (status === 404 || /model.*(?:not found|not available|not supported)/i.test(msg)) {
    return new Error(`Requested Gemini model is unavailable for this API project. Try ${DEFAULT_GEMINI_MODEL} in AI Settings.`);
  }

  return new Error('Gemini could not analyze the image. Check your API configuration and try again.');
}

export async function generateImageSeoMetadata(
  apiKey: string,
  imageBlob: Blob,
  modelName: string = DEFAULT_GEMINI_MODEL,
  signal?: AbortSignal
): Promise<SeoMetadata> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Google Gemini API Key is required. Please add your key in AI Settings.');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  
  if (signal?.aborted) throw new DOMException('Analysis cancelled.', 'AbortError');
  // Re-encoding removes source metadata before any image is sent to Google.
  const { base64Data, mimeType } = await prepareImageForAi(imageBlob);
  if (signal?.aborted) throw new DOMException('Analysis cancelled.', 'AbortError');

  const prompt = `You are an elite Digital Asset Management (DAM) & Image SEO specialist.
Analyze this image thoroughly. Produce search-optimized metadata and identify sensitive privacy flags.
Respond in strict JSON format with this exact JSON schema:
{
  "title": "Concise, descriptive headline for search ranking (max 65 chars)",
  "caption": "Detailed editorial caption explaining context, visual elements, and subject matter (1-2 sentences)",
  "altText": "Screen-reader accessible alt text describing visual content objectively without buzzwords",
  "keywords": ["5 to 10 highly relevant search terms, categories, and technical descriptors"],
  "privacyFlags": {
    "containsFaces": true or false,
    "containsIdentifiableText": true or false
  }
}`;

  let response: any;
  try {
    response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        abortSignal: signal,
        httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } }
      }
    });
  } catch (apiErr: any) {
    if (signal?.aborted) throw new DOMException('Analysis cancelled.', 'AbortError');
    throw classifyGeminiError(apiErr);
  }

  const blockReason = response?.promptFeedback?.blockReason;
  if ((blockReason && blockReason !== 'BLOCKED_REASON_UNSPECIFIED') || ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'IMAGE_SAFETY'].includes(response?.candidates?.[0]?.finishReason)) {
    throw new Error('Image analysis blocked by Gemini safety filters. Try another image.');
  }
  if (response?.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new Error('Gemini returned an incomplete response. Try generating again.');
  return parseGeminiSeoResponse(response?.text || '');
}

export function parseGeminiSeoResponse(text: string): SeoMetadata {
  let cleanedText = text.trim();
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleanedText);
    if (!parsed || typeof parsed !== 'object' || !['title', 'caption', 'altText'].every((key) => typeof parsed[key] === 'string' && parsed[key].trim()) || !Array.isArray(parsed.keywords) || parsed.keywords.some((value: unknown) => typeof value !== 'string')) throw new Error('Invalid SEO fields');
    return {
      title: parsed.title.trim().slice(0, 200),
      caption: parsed.caption.trim().slice(0, 4000),
      altText: parsed.altText.trim().slice(0, 2000),
      keywords: [...new Set<string>(parsed.keywords.map((value: string) => value.trim()).filter(Boolean))].slice(0, 30),
      privacyFlags: {
        containsFaces: parsed.privacyFlags?.containsFaces === true,
        containsIdentifiableText: parsed.privacyFlags?.containsIdentifiableText === true
      }
    };
  } catch {
    throw new Error('Could not parse Gemini JSON response structure. Please try generating again.');
  }
}
