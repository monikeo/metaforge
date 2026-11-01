/** Canvas encoders may return PNG when the requested codec is unavailable. */
export async function encodeCanvas(canvas: HTMLCanvasElement, mimeType = 'image/png', quality = 0.95): Promise<Blob> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => { settled = true; clearTimeout(timer); reject(error); };
    const timer = setTimeout(() => fail(new Error('Image encoding timed out. Try a smaller image.')), 15000);
    const encode = (type: string) => {
      try { canvas.toBlob((result) => {
        if (settled) return;
        if (!result?.size && type === 'image/jpeg') { encode('image/png'); return; }
        settled = true;
        clearTimeout(timer);
        if (result?.size) resolve(result);
        else reject(new Error('This browser could not encode the image. Try a smaller image or another browser.'));
      }, type, quality); } catch (error) { fail(error); }
    };
    encode(mimeType);
  });
  const header = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  const actualType = header[0] === 255 && header[1] === 216 ? 'image/jpeg'
    : [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte) ? 'image/png' : null;
  if (!actualType) throw new Error('The browser returned an unsupported image encoding.');
  return blob.type === actualType ? blob : new Blob([blob], { type: actualType });
}
