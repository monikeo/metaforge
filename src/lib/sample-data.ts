import piexif from 'piexifjs';
import { encodeCanvas } from './canvas-encoder';
import { blobToDataUrl, containerPackets, dataUrlToBlob, pngChunk, toSafeExifString, writeMetadataToBlob } from './metadata-writer';

/**
 * Creates a sample with native EXIF/GPS, using PNG if the browser falls back from JPEG.
 */
export async function createSampleExifImage(options: {
  title: string;
  cameraMake: string;
  cameraModel: string;
  lensModel: string;
  serialNumber: string;
  artist: string;
  copyright: string;
  latitude: number;
  longitude: number;
  color: string;
  width?: number;
  height?: number;
}): Promise<File> {
  const width = options.width || 800;
  const height = options.height || 600;

  // 1. Draw canvas image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas not supported');

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, options.color);
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decorative grid / visual elements
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Text overlay
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(options.title, 40, 90);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '16px monospace';
  ctx.fillText(`Camera: ${options.cameraMake} ${options.cameraModel}`, 40, 140);
  ctx.fillText(`Lens: ${options.lensModel}`, 40, 170);
  ctx.fillText(`Serial: ${options.serialNumber}`, 40, 200);
  ctx.fillText(`GPS: ${options.latitude.toFixed(4)}, ${options.longitude.toFixed(4)}`, 40, 230);
  ctx.fillText(`Artist: ${options.artist}`, 40, 260);

  const encoded = await encodeCanvas(canvas, 'image/jpeg', 0.95);

  // 2. Build EXIF & GPS
  const zeroth: Record<number, any> = {};
  const exif: Record<number, any> = {};
  const gps: Record<number, any> = {};

  zeroth[piexif.ImageIFD.Make] = toSafeExifString(options.cameraMake);
  zeroth[piexif.ImageIFD.Model] = toSafeExifString(options.cameraModel);
  zeroth[piexif.ImageIFD.Artist] = toSafeExifString(options.artist);
  zeroth[piexif.ImageIFD.Copyright] = toSafeExifString(options.copyright);
  zeroth[piexif.ImageIFD.Software] = 'MetaForge Studio v1.0.4';
  zeroth[piexif.ImageIFD.HostComputer] = 'MacBookPro18,1';
  zeroth[piexif.ImageIFD.CameraSerialNumber] = toSafeExifString(options.serialNumber);
  zeroth[piexif.ImageIFD.ImageDescription] = toSafeExifString(options.title);

  exif[piexif.ExifIFD.ExposureTime] = [1, 250];
  exif[piexif.ExifIFD.FNumber] = [28, 10]; // f/2.8
  exif[piexif.ExifIFD.ISOSpeedRatings] = 200;
  exif[piexif.ExifIFD.FocalLength] = [35, 1];
  exif[piexif.ExifIFD.LensModel] = toSafeExifString(options.lensModel);
  exif[piexif.ExifIFD.BodySerialNumber] = toSafeExifString(options.serialNumber);
  exif[piexif.ExifIFD.DateTimeOriginal] = '2026:08:14 19:42:10';

  // GPS formatting
  const latRef = options.latitude >= 0 ? 'N' : 'S';
  const lonRef = options.longitude >= 0 ? 'E' : 'W';
  gps[piexif.GPSIFD.GPSLatitudeRef] = latRef;
  gps[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(Math.abs(options.latitude));
  gps[piexif.GPSIFD.GPSLongitudeRef] = lonRef;
  gps[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(Math.abs(options.longitude));
  gps[piexif.GPSIFD.GPSAltitude] = [38, 1];

  const exifObj = { '0th': zeroth, Exif: exif, GPS: gps };
  const exifBytes = piexif.dump(exifObj);
  let enriched: Blob;
  if (encoded.type === 'image/jpeg') {
    enriched = dataUrlToBlob(piexif.insert(exifBytes, await blobToDataUrl(encoded)));
  } else {
    const bytes = new Uint8Array(await encoded.arrayBuffer());
    const nativeExif = pngChunk('eXIf', Uint8Array.from(exifBytes.slice(6), character => character.charCodeAt(0)));
    const packets = containerPackets(bytes);
    enriched = new Blob([bytes.subarray(0, 8), ...packets.flatMap((packet, index) => index === 0 ? [packet.packet, nativeExif] : [packet.packet])] as BlobPart[], { type: 'image/png' });
  }

  const safeFilename = options.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + (enriched.type === 'image/jpeg' ? '.jpg' : '.png');
  return new File([enriched], safeFilename, { type: enriched.type });
}

export async function createSampleAiPng(): Promise<File> {
  const width = 800;
  const height = 600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas not supported');

  // Sci-fi neon background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#1e1b4b');
  grad.addColorStop(0.5, '#4c1d95');
  grad.addColorStop(1, '#831843');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(400, 300, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Neon Cyberpunk Alleyway', 40, 80);

  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText('AI Workflow: ComfyUI + SDXL Lightning', 40, 120);
  ctx.fillText('Prompt: Cinematic ultra-detailed rain-slicked Tokyo neon streets', 40, 150);

  const encoded = await encodeCanvas(canvas);
  const prompt = {
    '1': { class_type: 'CLIPTextEncode', inputs: { text: 'Cinematic ultra-detailed rain-slicked Tokyo neon streets' } },
    '2': { class_type: 'KSampler', inputs: { seed: 7849102, steps: 8, sampler_name: 'euler', scheduler: 'normal', cfg: 2 } }
  };
  const sample = await writeMetadataToBlob(encoded, { pngChunks: { prompt: JSON.stringify(prompt) } });
  return new File([sample], 'cyberpunk_shibuya_sdxl.png', { type: sample.type });
}
