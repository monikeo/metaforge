import { useMetaForgeStore } from './store';

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|avif|tiff?|heic|heif|gif)$/i;
const MAX_DROPPED_FILES = 500;
export const SUPPORTED_FORMATS_LABEL = 'JPEG, PNG, WebP, AVIF, HEIC, TIFF, or GIF';

export const isImageFile = (file: File) => file.type.startsWith('image/') || IMAGE_EXTENSION.test(file.name);

/** Filters non-images, reports what was skipped, and queues the rest behind any running operation. */
export async function importImageFiles(files: File[]): Promise<boolean> {
  const { addFiles, addToast } = useMetaForgeStore.getState();
  if (!files.length) return false;
  const images = files.filter(isImageFile);
  const skipped = files.length - images.length;
  if (!images.length) {
    addToast({ type: 'error', title: 'No Supported Images', description: `Choose ${SUPPORTED_FORMATS_LABEL} files.` });
    return false;
  }
  if (skipped) addToast({ type: 'warning', title: 'Non-Image Files Skipped', description: `${skipped} file(s) ignored. MetaForge supports ${SUPPORTED_FORMATS_LABEL}.` });
  return addFiles(images);
}

const readEntryFile = (entry: FileSystemFileEntry) => new Promise<File>((resolve, reject) => entry.file(resolve, reject));
const readDirectoryBatch = (reader: FileSystemDirectoryReader) => new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));

/**
 * Files from a drop, including images inside dropped folders.
 * Entries must be captured synchronously: the DataTransfer is emptied once the event handler returns.
 */
export function filesFromDataTransfer(transfer: DataTransfer | null): Promise<File[]> {
  if (!transfer) return Promise.resolve([]);
  const plainFiles = Array.from(transfer.files);
  const entries = Array.from(transfer.items || []).map((item) => item.kind === 'file' ? item.webkitGetAsEntry?.() ?? null : null);
  if (!entries.some((entry) => entry?.isDirectory)) return Promise.resolve(plainFiles);
  return (async () => {
    const collected: File[] = [];
    const walk = async (entry: FileSystemEntry, depth: number): Promise<void> => {
      if (collected.length >= MAX_DROPPED_FILES || depth > 16 || entry.name.startsWith('.')) return;
      if (entry.isFile) { collected.push(await readEntryFile(entry as FileSystemFileEntry)); return; }
      if (!entry.isDirectory) return;
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries returns results in batches until it yields an empty list.
      for (let batch = await readDirectoryBatch(reader); batch.length; batch = await readDirectoryBatch(reader)) {
        for (const child of batch) await walk(child, depth + 1);
      }
    };
    for (const entry of entries) if (entry) await walk(entry, 0);
    return collected.filter(isImageFile);
  })();
}

/** Clipboard images usually arrive as "image.png"; give each a distinct, dated name. */
export function namePastedImages(files: File[]): File[] {
  const now = new Date(), pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return files.map((file, index) => file.name && !/^image\.\w+$/i.test(file.name) ? file
    : new File([file], `pasted-${stamp}${files.length > 1 ? `-${index + 1}` : ''}.${file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'}`, { type: file.type, lastModified: Date.now() }));
}
