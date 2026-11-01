/** Canvas encoders may return PNG when the requested codec is unavailable. */
export async function encodeCanvas(canvas: HTMLCanvasElement, mimeType = 'image/png', quality = 0.95): Promise<Blob> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Image encoding timed out. Try a smaller image.')), 15000);
    try {
      canvas.toBlob((result) => {
        clearTimeout(timer);
        if (result?.size) resolve(result);
        else reject(new Error('This browser could not encode the image. Try a smaller image or another browser.'));
      }, mimeType, quality);
    } catch (error) { clearTimeout(timer); reject(error); }
  });
  const header = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  const actualType = header[0] === 255 && header[1] === 216 ? 'image/jpeg'
    : header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71 ? 'image/png' : null;
  if (!actualType) throw new Error('The browser returned an unsupported image encoding.');
  return blob.type === actualType ? blob : new Blob([blob], { type: actualType });
}
