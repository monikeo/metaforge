import { GoogleGenAI } from '@google/genai';
import { SeoMetadata } from './types';

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
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
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
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Auto-diagnoses raw Gemini API / network errors into actionable descriptions
 */
function classifyGeminiError(err: any): Error {
  const msg = String(err?.message || err || '');
  const status = err?.status || err?.statusCode || 0;

  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || status === 400 || status === 403) {
    return new Error('Invalid Gemini API Key. Please verify or re-enter your key in AI Settings (⌘K).');
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || status === 429) {
    return new Error('Gemini API rate limit exceeded. Please wait a few seconds before generating again.');
  }
  if (msg.includes('SAFETY') || msg.includes('blocked') || msg.includes('HARM_CATEGORY')) {
    return new Error('Image analysis blocked by Gemini safety filters (contains sensitive content).');
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('offline')) {
    return new Error('Network connection to Google Gemini endpoint failed. Check your internet connection.');
  }
  if (msg.includes('not found') || msg.includes('model') || status === 404) {
    return new Error('Requested Gemini model not available on your API key tier. Try switching to gemini-2.5-flash.');
  }

  return new Error(`Gemini Vision analysis error: ${msg || 'Unknown failure'}`);
}

export async function generateImageSeoMetadata(
  apiKey: string,
  imageBlob: Blob,
  modelName = 'gemini-2.5-flash'
): Promise<SeoMetadata> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Google Gemini API Key is required. Please add your key in AI Settings.');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  
  // Prepare optimized image payload
  let base64Data: string;
  let mimeType: string;

  try {
    const prepared = await prepareImageForAi(imageBlob);
    base64Data = prepared.base64Data;
    mimeType = prepared.mimeType;
  } catch {
    const buffer = await imageBlob.arrayBuffer();
    base64Data = bufferToBase64(buffer);
    mimeType = imageBlob.type || 'image/jpeg';
  }

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
        responseMimeType: 'application/json'
      }
    });
  } catch (apiErr: any) {
    console.error('Gemini generateContent raw error:', apiErr);
    throw classifyGeminiError(apiErr);
  }

  let cleanedText = (response?.text || '{}').trim();
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleanedText);
    return {
      title: parsed.title || '',
      caption: parsed.caption || '',
      altText: parsed.altText || '',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      privacyFlags: {
        containsFaces: Boolean(parsed.privacyFlags?.containsFaces),
        containsIdentifiableText: Boolean(parsed.privacyFlags?.containsIdentifiableText)
      }
    };
  } catch (err) {
    console.error('Failed to parse Gemini response as JSON:', cleanedText, err);
    throw new Error('Could not parse Gemini JSON response structure. Please try generating again.');
  }
}
