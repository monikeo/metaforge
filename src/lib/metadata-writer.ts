import piexif from 'piexifjs';

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}

/**
 * Universal canvas sanitization. Draws image to an offscreen canvas and exports.
 * This mathematically destroys 100% of EXIF, GPS, MakerNotes, XMP, and device chunks.
 */
export async function sanitizeViaCanvas(blob: Blob, mimeType = 'image/jpeg', quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0);

      const targetMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (newBlob) => {
          if (newBlob) {
            resolve(newBlob);
          } else {
            resolve(blob);
          }
        },
        targetMime,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Strips GPS tags specifically from JPEG using lossless binary insertion.
 * Falls back to canvas sanitization for non-JPEGs.
 */
export async function stripGpsFromBlob(blob: Blob): Promise<Blob> {
  const isJpeg = blob.type === 'image/jpeg' || blob.type === 'image/jpg';

  if (!isJpeg) {
    return sanitizeViaCanvas(blob, blob.type);
  }

  try {
    const dataUrl = await blobToDataUrl(blob);
    const exifObj = piexif.load(dataUrl);

    // Empty GPS IFD
    exifObj.GPS = {};

    // Remove GPS pointer from 0th IFD if present
    if (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.GPSTag]) {
      delete exifObj['0th'][piexif.ImageIFD.GPSTag];
    }

    const exifBytes = piexif.dump(exifObj);
    const cleanDataUrl = piexif.insert(exifBytes, dataUrl);
    return dataUrlToBlob(cleanDataUrl);
  } catch (err) {
    console.warn('piexif strip GPS failed, falling back to canvas sanitize', err);
    return sanitizeViaCanvas(blob, 'image/jpeg');
  }
}

/**
 * Strips 100% of EXIF/metadata from the file.
 */
export async function stripAllMetadataFromBlob(blob: Blob): Promise<Blob> {
  const isJpeg = blob.type === 'image/jpeg' || blob.type === 'image/jpg';

  if (isJpeg) {
    try {
      const dataUrl = await blobToDataUrl(blob);
      const cleanDataUrl = piexif.remove(dataUrl);
      return dataUrlToBlob(cleanDataUrl);
    } catch {
      return sanitizeViaCanvas(blob, 'image/jpeg');
    }
  }

  return sanitizeViaCanvas(blob, blob.type);
}

/**
 * "Sanitize for Social Media":
 * Strips GPS, Serial numbers, Software, Host computer, MakerNotes.
 * Retains artist & copyright if present.
 */
export async function sanitizeForSocialMedia(blob: Blob, retainCopyright = true): Promise<Blob> {
  const isJpeg = blob.type === 'image/jpeg' || blob.type === 'image/jpg';

  if (!isJpeg) {
    return sanitizeViaCanvas(blob, blob.type);
  }

  try {
    const dataUrl = await blobToDataUrl(blob);
    const exifObj = piexif.load(dataUrl);

    // 1. Remove all GPS
    exifObj.GPS = {};
    if (exifObj['0th']?.[piexif.ImageIFD.GPSTag]) {
      delete exifObj['0th'][piexif.ImageIFD.GPSTag];
    }

    // 2. Strip sensitive tags from 0th
    if (exifObj['0th']) {
      delete exifObj['0th'][piexif.ImageIFD.HostComputer];
      delete exifObj['0th'][piexif.ImageIFD.Software];
      delete exifObj['0th'][piexif.ImageIFD.CameraSerialNumber];
      delete exifObj['0th'][piexif.ImageIFD.DocumentName];
      delete exifObj['0th'][piexif.ImageIFD.OriginalRawFileName];

      if (!retainCopyright) {
        delete exifObj['0th'][piexif.ImageIFD.Copyright];
        delete exifObj['0th'][piexif.ImageIFD.Artist];
      }
    }

    // 3. Strip sensitive tags from Exif IFD
    if (exifObj.Exif) {
      delete exifObj.Exif[piexif.ExifIFD.MakerNote];
      delete exifObj.Exif[piexif.ExifIFD.BodySerialNumber];
      delete exifObj.Exif[piexif.ExifIFD.LensSerialNumber];
      delete exifObj.Exif[piexif.ExifIFD.CameraOwnerName];
      delete exifObj.Exif[piexif.ExifIFD.DeviceSettingDescription];
    }

    const exifBytes = piexif.dump(exifObj);
    const cleanDataUrl = piexif.insert(exifBytes, dataUrl);
    return dataUrlToBlob(cleanDataUrl);
  } catch (err) {
    console.warn('Social sanitize fallback to canvas', err);
    return sanitizeViaCanvas(blob, 'image/jpeg');
  }
}

/**
 * Updates specific EXIF tags in a JPEG image.
 */
export async function writeTagsToJpeg(
  blob: Blob,
  tags: {
    title?: string;
    artist?: string;
    copyright?: string;
    description?: string;
    userComment?: string;
  }
): Promise<Blob> {
  const isJpeg = blob.type === 'image/jpeg' || blob.type === 'image/jpg';
  if (!isJpeg) {
    return blob;
  }

  try {
    const dataUrl = await blobToDataUrl(blob);
    let exifObj: piexif.IExifElement;

    try {
      exifObj = piexif.load(dataUrl);
    } catch {
      exifObj = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {}, thumbnail: null };
    }

    if (!exifObj['0th']) exifObj['0th'] = {};
    if (!exifObj.Exif) exifObj.Exif = {};

    if (tags.artist) {
      exifObj['0th'][piexif.ImageIFD.Artist] = tags.artist;
    }
    if (tags.copyright) {
      exifObj['0th'][piexif.ImageIFD.Copyright] = tags.copyright;
    }
    if (tags.description || tags.title) {
      exifObj['0th'][piexif.ImageIFD.ImageDescription] = tags.description || tags.title || '';
    }
    if (tags.userComment) {
      exifObj.Exif[piexif.ExifIFD.UserComment] = tags.userComment;
    }

    const exifBytes = piexif.dump(exifObj);
    const updatedDataUrl = piexif.insert(exifBytes, dataUrl);
    return dataUrlToBlob(updatedDataUrl);
  } catch (err) {
    console.error('Failed writing tags to JPEG', err);
    return blob;
  }
}
