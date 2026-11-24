import { useMetaForgeStore } from './store';
import { SUPPORTED_FORMATS_LABEL } from './metadata-writer';
import { isZipFile } from './zip-cleaner';

const IMAGE_EXTENSION = /\.(jpe?g|jfif|png|apng|webp|avif|tiff?|heic|heif|gif)$/i;
// Formats the app can read. Other image types (SVG, BMP, ICO) are skipped up front instead of failing one by one.
const IMAGE_TYPE = /^image\/(?:jpe?g|pjpeg|png|apng|webp|avif|tiff|heic|heif|heic-sequence|heif-sequence|gif)$/i;
const MAX_DROPPED_FILES = 500;
export { SUPPORTED_FORMATS_LABEL, isZipFile };

/** Files the importer accepts: by MIME type, or by extension when the browser reports none (common for HEIC). */
export const isImageFile = (file: File) => IMAGE_TYPE.test(file.type) || IMAGE_EXTENSION.test(file.name);

/**
 * Filters unsupported files, reports what was skipped, and queues the rest behind any running operation.
 * ZIP archives are cleaned into a new archive on the AI Label Remover page; elsewhere their images join the queue.
 */
export async function importImageFiles(files: File[]): Promise<boolean> {
  const { addFiles, addToast, cleanZipArchives, importZipArchives, currentView } = useMetaForgeStore.getState();
  if (!files.length) return false;
  const archives = files.filter(isZipFile);
  const others = files.filter((file) => !isZipFile(file));
  const images = others.filter(isImageFile);
  const skipped = others.length - images.length;
  if (!images.length && !archives.length) {
    addToast({ type: 'error', title: 'No Supported Images', description: `Choose ${SUPPORTED_FORMATS_LABEL} files, or a ZIP of them.` });
    return false;
  }
  if (skipped) addToast({ type: 'warning', title: 'Unsupported Files Skipped', description: `${skipped} file(s) ignored. MetaForge supports ${SUPPORTED_FORMATS_LABEL} images and ZIP archives.` });
  const results: Promise<boolean>[] = [];
  if (images.length) results.push(addFiles(images));
  if (archives.length) results.push(currentView === 'ai-labels' ? cleanZipArchives(archives) : importZipArchives(archives));
  return (await Promise.all(results)).every(Boolean);
}

const readEntryFile = (entry: FileSystemFileEntry) => new Promise<File>((resolve, reject) => entry.file(resolve, reject));
const readDirectoryBatch = (reader: FileSystemDirectoryReader) => new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
const isAccepted = (file: File) => isImageFile(file) || isZipFile(file);

/**
 * Files from a drop, including images and ZIP archives inside dropped folders.
 * Entries must be captured synchronously: the DataTransfer is emptied once the event handler returns.
 * An unreadable file or folder is skipped rather than failing the whole drop.
 */
export function filesFromDataTransfer(transfer: DataTransfer | null): Promise<File[]> {
  if (!transfer) return Promise.resolve([]);
  const plainFiles = Array.from(transfer.files);
  const entries = Array.from(transfer.items || []).map((item) => item.kind === 'file' ? item.webkitGetAsEntry?.() ?? null : null);
  if (!entries.some((entry) => entry?.isDirectory)) return Promise.resolve(plainFiles);
  return (async () => {
    const collected: File[] = [];
    let unreadable = 0;
    const walk = async (entry: FileSystemEntry, depth: number): Promise<void> => {
      if (collected.length >= MAX_DROPPED_FILES || depth > 16 || entry.name.startsWith('.')) return;
      try {
        if (entry.isFile) {
          const file = await readEntryFile(entry as FileSystemFileEntry);
          // Only accepted files count towards the limit, so a folder of documents does not hide its images.
          if (isAccepted(file)) collected.push(file);
          return;
        }
        if (!entry.isDirectory) return;
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        // readEntries returns results in batches until it yields an empty list.
        for (let batch = await readDirectoryBatch(reader); batch.length; batch = await readDirectoryBatch(reader)) {
          for (const child of batch) await walk(child, depth + 1);
        }
      } catch { unreadable++; }
    };
    for (const entry of entries) if (entry) await walk(entry, 0);
    if (unreadable) useMetaForgeStore.getState().addToast({ type: 'warning', title: 'Some Files Could Not Be Read', description: `${unreadable} file(s) or folder(s) in the drop were skipped.` });
    if (collected.length >= MAX_DROPPED_FILES) useMetaForgeStore.getState().addToast({ type: 'info', title: 'Drop Limit Reached', description: `The first ${MAX_DROPPED_FILES} images were taken from the dropped folders.` });
    return collected;
  })();
}

/** Clipboard images usually arrive as "image.png"; give each a distinct, dated name. */
export function namePastedImages(files: File[]): File[] {
  const now = new Date(), pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return files.map((file, index) => file.name && !/^image\.\w+$/i.test(file.name) ? file
    : new File([file], `pasted-${stamp}${files.length > 1 ? `-${index + 1}` : ''}.${file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'}`, { type: file.type, lastModified: Date.now() }));
}
