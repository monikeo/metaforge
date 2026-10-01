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

  const response = await ai.models.generateContent({
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

  const responseText = response.text || '{}';
  try {
    const parsed = JSON.parse(responseText);
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
    console.error('Failed to parse Gemini response as JSON:', responseText, err);
    throw new Error('Could not parse AI response. Please try again.');
  }
}
