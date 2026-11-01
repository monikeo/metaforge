import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { 
  MetaFile, 
  SeoMetadata, 
  AppView, 
  MetadataPreset, 
  BatchJob, 
  ToastMessage, 
  MetadataHistoryItem 
} from './types';
import { parseDeepMetadata, seoFromRaw } from './metadata-reader';
import { stripGpsFromBlob, stripAllMetadataFromBlob, writeMetadataToBlob, writeTagsToJpeg } from './metadata-writer';
import { analyzePrivacyRisks } from './privacy-rules';
import { workspaceHref, workspaceView } from './navigation';
import { DEFAULT_GEMINI_MODEL, normalizeGeminiModel } from './ai-models';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const DEFAULT_PRESETS: MetadataPreset[] = [
  {
    id: 'preset-seo-web',
    name: 'Website SEO & Discovery',
    category: 'SEO',
    description: 'Optimize for search crawlers while stripping physical GPS coordinates.',
    tags: {
      copyright: '© 2026 All Rights Reserved',
      credit: 'Web Publishing Media',
      keywords: ['seo', 'optimized', 'web-ready', 'digital-asset']
    },
    stripGps: true,
    stripSerials: false,
    filenameTemplate: '{title}-web'
  },
  {
    id: 'preset-photographer',
    name: 'Pro Photographer Attribution',
    category: 'Photography',
    description: 'Retains camera telemetry, stamps copyright and creator, scrubs exact GPS location.',
    tags: {
      artist: 'Lead Photographer',
      copyright: '© 2026 Professional Photography Studio',
      credit: 'Editorial Media'
    },
    stripGps: true,
    stripSerials: false,
    filenameTemplate: '{artist}-{title}'
  },
  {
    id: 'preset-ecommerce',
    name: 'E-Commerce Product Catalog',
    category: 'E-commerce',
    description: 'Strips camera serials and GPS, injects product catalog tags and alt descriptions.',
    tags: {
      copyright: '© 2026 Store Catalog',
      keywords: ['product', 'retail', 'e-commerce', 'catalog']
    },
    stripGps: true,
    stripSerials: true,
    filenameTemplate: 'prod-{counter}'
  },
  {
    id: 'preset-social-opsec',
    name: 'Social Media Privacy Shield',
    category: 'Privacy',
    description: 'Maximal sanitization: purges GPS, body serials, host OS names, and MakerNotes.',
    tags: {
      copyright: 'Public Domain / Anonymous'
    },
    stripGps: true,
    stripSerials: true,
    filenameTemplate: 'clean-{date}'
  }
];

interface FilterOptions {
  format: string;
  seoStatus: string;
  privacyStatus: string;
  aiStatus: string;
}

interface MetaForgeState {
  // Navigation & Views
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Files
  files: MetaFile[];
  activeFileId: string | null;
  selectedFileIds: string[];
  compareFileIds: [string | null, string | null];

  // Presets & Jobs
  presets: MetadataPreset[];
  batchJobs: BatchJob[];
  clearCompletedJobs: () => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;

  // Command Palette
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;

  // Filters & Search
  searchQuery: string;
  filterOptions: FilterOptions;
  setSearchQuery: (query: string) => void;
  setFilterOptions: (filters: Partial<FilterOptions>) => void;

  // Global Settings
  aiEnabled: boolean;
  geminiApiKey: string;
  selectedModel: string;
  isProcessing: boolean;
  processingMessage: string;
  activeTab: 'inspector' | 'privacy' | 'seo' | 'hex' | 'workflow';
  isAiSettingsOpen: boolean;

  // Actions
  setAiEnabled: (enabled: boolean) => void;
  toggleAI: () => void;
  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
  setActiveFile: (id: string | null) => void;
  setActiveTab: (tab: 'inspector' | 'privacy' | 'seo' | 'hex' | 'workflow') => void;
  setIsAiSettingsOpen: (open: boolean) => void;

  // Selection
  toggleSelectFile: (id: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
  setCompareFile: (slot: 0 | 1, id: string | null) => void;

  // File mutations
  addFiles: (newFiles: File[]) => Promise<boolean>;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  // Metadata operations
  updateTag: (fileId: string, section: string, key: string, value: any) => Promise<boolean>;
  deleteTag: (fileId: string, section: string, key: string) => Promise<boolean>;
  stripGps: (fileId: string) => Promise<boolean>;
  stripAllGps: () => Promise<boolean>;
  stripAllMetadata: (fileId: string) => Promise<boolean>;
  stripAllMetadataBatch: () => Promise<boolean>;
  sanitizeForSocial: (fileId: string) => Promise<boolean>;
  batchSanitizeForSocial: () => Promise<boolean>;
  applyAiSeo: (fileId: string, seo: SeoMetadata, actor?: 'User' | 'AI') => void;
  writeSeoToMetadata: (fileId: string) => Promise<boolean>;

  // Presets & Batch
  applyPreset: (presetId: string, targetFileIds: string[]) => Promise<boolean>;
  createPreset: (preset: Omit<MetadataPreset, 'id'>) => void;
  deletePreset: (id: string) => void;
  batchBulkEdit: (fileIds: string[], updates: { copyright?: string; artist?: string; keywords?: string[]; keywordMode?: 'append' | 'replace' }) => Promise<boolean>;
  batchRename: (fileIds: string[], template: string) => Promise<boolean>;

  // History
  restoreHistory: (fileId: string, historyId: string) => Promise<boolean>;

  renameFile: (fileId: string, newName: string) => void;

  // Export
  exportSingle: (fileId: string) => void;
  exportAllZip: () => Promise<boolean>;
  exportMetadataJson: (fileId: string) => void;
  exportAllMetadataJson: () => void;
}

const uid = () => crypto.randomUUID();
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'An unexpected error occurred. Try again.';
const clone = <T,>(value: T): T => structuredClone(value);
const blobOf = (file: MetaFile) => file.modifiedBlob || file.originalBlob;
const extension: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/heic': 'heic', 'image/tiff': 'tiff', 'image/gif': 'gif' };
export function safeFilename(name: string, type: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 180) || 'image';
  const ext = extension[type] || 'bin';
  const base = cleaned.replace(/\.[^.]+$/, '') || 'image';
  return `${/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base) ? `image-${base}` : base}.${ext}`;
}
export function renameFromTemplate(file: MetaFile, template: string, index: number): string {
  if (!template.trim()) throw new Error('Enter a filename template.');
  const slug = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'image';
  const tokens: Record<string, string> = {
    title: slug(file.seoData.title || file.name.replace(/\.[^.]+$/, '')),
    artist: slug(String(file.rawMetadata.exif?.Artist || file.rawMetadata.iptc?.Byline || 'creator')),
    date: new Date().toISOString().slice(0, 10), counter: String(index + 1).padStart(3, '0')
  };
  if (/\{(?!title\}|artist\}|date\}|counter\})[^}]*\}/.test(template)) throw new Error('Unknown template token. Use {title}, {artist}, {date}, or {counter}.');
  return safeFilename(template.replace(/\{(title|artist|date|counter)\}/g, (_, key: string) => tokens[key]), file.type);
}
export function validatePreset(value: unknown): Omit<MetadataPreset, 'id'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Each preset must be an object.');
  const p = value as Record<string, any>;
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100) throw new Error('Preset names must contain 1–100 characters.');
  if (!['SEO', 'Photography', 'E-commerce', 'Stock', 'Privacy', 'Custom'].includes(p.category)) throw new Error('Invalid preset category.');
  if (typeof p.stripGps !== 'boolean' || typeof p.stripSerials !== 'boolean') throw new Error('Preset privacy rules must be true or false.');
  const tags: MetadataPreset['tags'] = {};
  for (const key of ['artist', 'copyright', 'credit', 'headline', 'caption'] as const) {
    if (p.tags?.[key] !== undefined) {
      if (typeof p.tags[key] !== 'string' || p.tags[key].length > 4000) throw new Error(`Invalid preset ${key}.`);
      tags[key] = p.tags[key];
    }
  }
  if (p.tags?.keywords !== undefined) {
    if (!Array.isArray(p.tags.keywords) || p.tags.keywords.length > 100 || p.tags.keywords.some((k: unknown) => typeof k !== 'string' || k.length > 200)) throw new Error('Preset keywords must be an array of up to 100 strings.');
    tags.keywords = [...new Set<string>(p.tags.keywords.map((k: string) => k.trim()).filter(Boolean))];
  }
  if (p.filenameTemplate !== undefined && (typeof p.filenameTemplate !== 'string' || p.filenameTemplate.length > 180)) throw new Error('Invalid filename template.');
  return { name: p.name.trim(), category: p.category, description: typeof p.description === 'string' ? p.description.slice(0, 1000) : '', tags, stripGps: p.stripGps, stripSerials: p.stripSerials, filenameTemplate: p.filenameTemplate };
}
function snapshot(file: MetaFile, action: string, actor: MetadataHistoryItem['actor'] = 'User'): MetadataHistoryItem {
  return { id: uid(), timestamp: Date.now(), actor, action, diffSummary: action, previousRaw: clone(file.rawMetadata), previousBlob: blobOf(file), previousSeo: clone(file.seoData), previousName: file.name };
}
const persistedStorage: PersistStorage<Partial<MetaForgeState>> = {
  getItem: (name) => {
    try { const value = localStorage.getItem(name); return value ? JSON.parse(value) : null; } catch { return null; }
  },
  setItem: (name, value) => { try { localStorage.setItem(name, JSON.stringify(value)); } catch { /* The current session still works when storage is unavailable. */ } },
  removeItem: (name) => { try { localStorage.removeItem(name); } catch { /* Storage may be disabled. */ } }
};
let operationQueue: Promise<unknown> = Promise.resolve();
let importGeneration = 0;

export const useMetaForgeStore = create<MetaForgeState>()(persist((set, get) => {
  const notify = (title: string, error: unknown) => get().addToast({ type: 'error', title, description: errorMessage(error) });
  const run = (message: string, task: () => Promise<boolean>): Promise<boolean> => {
    const result = operationQueue.then(async () => {
      set({ isProcessing: true, processingMessage: message });
      try { return await task(); }
      catch (error) { notify('Operation Failed', error); return false; }
      finally { set({ isProcessing: false, processingMessage: '' }); }
    });
    operationQueue = result.catch(() => false);
    return result;
  };
  const commit = (before: MetaFile, after: MetaFile, action: string, actor: MetadataHistoryItem['actor'] = 'User') => {
    const current = get().files.find((f) => f.id === before.id);
    if (!current) { if (after.thumbnailUrl !== before.thumbnailUrl) URL.revokeObjectURL(after.thumbnailUrl); return false; }
    if (current.thumbnailUrl !== after.thumbnailUrl) URL.revokeObjectURL(current.thumbnailUrl);
    set((state) => ({ files: state.files.map((file) => {
      if (file.id !== before.id) return file;
      const draftChanges = Object.fromEntries(Object.entries(file.seoData || {}).filter(([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(before.seoData?.[key as keyof SeoMetadata])
      ));
      return {
        ...after, id: before.id, originalBlob: before.originalBlob, isDirty: true,
        name: file.name !== before.name ? safeFilename(file.name, after.type) : after.name,
        seoData: { ...after.seoData, ...draftChanges },
        history: [snapshot(file, action, actor), ...file.history].slice(0, 50)
      };
    }) }));
    return true;
  };
  const fromBlob = async (file: MetaFile, blob: Blob): Promise<MetaFile> => {
    const name = safeFilename(file.name, blob.type);
    const parsed = await parseDeepMetadata(new File([blob], name, { type: blob.type, lastModified: file.lastModified }));
    return { ...file, ...parsed, id: file.id, originalBlob: file.originalBlob, modifiedBlob: blob, history: file.history };
  };
  const mutate = (id: string, action: string, transform: (file: MetaFile) => Promise<MetaFile>) => run(action, async () => {
    const file = get().files.find((f) => f.id === id);
    if (!file) throw new Error('This image is no longer in the queue.');
    if (!commit(file, await transform(file), action)) throw new Error('The image was removed before the operation finished.');
    get().addToast({ type: 'success', title: action });
    return true;
  });
  const batch = (name: string, type: BatchJob['type'], ids: string[], transform: (file: MetaFile, index: number) => Promise<MetaFile>, actor: MetadataHistoryItem['actor'] = 'System') => run(name, async () => {
    const targets = [...new Set(ids)].filter((id) => get().files.some((f) => f.id === id));
    if (!targets.length) throw new Error('Import or select images first.');
    const job: BatchJob = { id: uid(), name, type, status: 'RUNNING', total: targets.length, completed: 0, failed: 0, progress: 0, createdAt: Date.now(), errors: [] };
    set((state) => ({ batchJobs: [job, ...state.batchJobs].slice(0, 100) }));
    for (const [index, id] of targets.entries()) {
      const file = get().files.find((f) => f.id === id);
      try {
        if (!file) throw new Error('Image was removed from the queue.');
        if (!commit(file, await transform(file, index), name, actor)) throw new Error('Image was removed before processing finished.');
        job.completed++;
      } catch (error) { job.failed++; job.errors.push(`${file?.name || id}: ${errorMessage(error)}`); }
      job.progress = Math.round(((index + 1) / targets.length) * 100);
      set((state) => ({ processingMessage: `${name}: ${index + 1}/${targets.length}`, batchJobs: state.batchJobs.map((j) => j.id === job.id ? { ...job, errors: [...job.errors] } : j) }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    job.status = job.failed ? 'FAILED' : 'COMPLETED';
    set((state) => ({ batchJobs: state.batchJobs.map((j) => j.id === job.id ? { ...job } : j) }));
    get().addToast({ type: job.failed ? 'warning' : 'success', title: job.failed ? `${name}: ${job.failed} failed` : name, description: `${job.completed}/${job.total} images processed.${job.errors[0] ? ` ${job.errors[0]}` : ''}` });
    return job.failed === 0;
  });
  const social = async (file: MetaFile) => {
    const cleaned = await fromBlob(file, await stripAllMetadataFromBlob(blobOf(file)));
    const artist = file.rawMetadata.exif?.Artist || file.rawMetadata.iptc?.Byline;
    const copyright = file.rawMetadata.exif?.Copyright || file.rawMetadata.iptc?.CopyrightNotice;
    if (!artist && !copyright) return cleaned;
    try {
      const raw = { ...cleaned.rawMetadata, exif: { ...(artist ? { Artist: artist } : {}), ...(copyright ? { Copyright: copyright } : {}) } };
      return await fromBlob(file, await writeMetadataToBlob(blobOf(cleaned), raw));
    } finally { URL.revokeObjectURL(cleaned.thumbnailUrl); }
  };
  const removeGps = async (file: MetaFile) => {
    const cleaned = await fromBlob(file, await stripGpsFromBlob(blobOf(file)));
    if (!cleaned.privacyReport.hasGps) return cleaned;
    URL.revokeObjectURL(cleaned.thumbnailUrl);
    // Coordinates can also be embedded in free-form EXIF comments.
    return fromBlob(file, await stripAllMetadataFromBlob(blobOf(file)));
  };
  const removeSerials = async (file: MetaFile) => {
    const sensitive = (key: string) => /serialnumber|ownername|makernote|imageuniqueid/i.test(key.replace(/[^a-z]/gi, ''));
    const scrub = (value: any): any => {
      if (value instanceof Date || ArrayBuffer.isView(value)) return value;
      if (Array.isArray(value)) return value.map(scrub);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitive(key)).map(([key, item]) => [key, scrub(item)]));
      if (typeof value === 'string' && /^\s*[\[{]/.test(value)) { try { return JSON.stringify(scrub(JSON.parse(value))); } catch { /* Plain text. */ } }
      return value;
    };
    const raw = scrub(file.rawMetadata);
    delete raw.pngChunks;
    let blob = blobOf(file);
    const keys = new Set([...Object.keys(file.rawMetadata.exif || {}).filter(sensitive), 'BodySerialNumber', 'LensSerialNumber', 'CameraSerialNumber', 'CameraOwnerName', 'MakerNote', 'ImageUniqueID']);
    for (const key of keys) blob = await writeMetadataToBlob(blob, raw, { section: 'exif', key, remove: true });
    const result = await fromBlob(file, blob);
    if (result.privacyReport.hasDeviceSerial || result.privacyReport.inspectionWarning) {
      URL.revokeObjectURL(result.thumbnailUrl);
      throw new Error('Some device identifiers could not be removed safely. Use full social sanitization for this image.');
    }
    return result;
  };
  const writeRaw = async (file: MetaFile, raw: MetaFile['rawMetadata']) => {
    let blob = blobOf(file);
    if (file.type === 'image/jpeg') blob = await writeTagsToJpeg(blob, { artist: raw.exif?.Artist, copyright: raw.exif?.Copyright });
    return fromBlob(file, await writeMetadataToBlob(blob, raw));
  };
  const editTag = (id: string, section: string, key: string, value: any, remove = false) => mutate(id, remove ? 'Tag Deleted' : 'Tag Saved', async (file) => {
    if (!['exif', 'iptc', 'xmp', 'gps'].includes(section) || !key.trim() || ['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid metadata section or tag name.');
    if (section === 'gps') throw new Error('Use Remove GPS to remove the complete location safely. Individual GPS edits are not supported.');
    const raw = clone(file.rawMetadata); raw[section] ||= {};
    if (remove) delete raw[section][key]; else raw[section][key] = value;
    const groups = [
      [['iptc', 'Headline'], ['iptc', 'ObjectName'], ['xmp', 'title']],
      [['iptc', 'Caption'], ['xmp', 'description'], ['exif', 'ImageDescription']],
      [['exif', 'Artist'], ['iptc', 'Byline'], ['xmp', 'creator']],
      [['exif', 'Copyright'], ['iptc', 'CopyrightNotice'], ['xmp', 'rights']],
      [['iptc', 'Keywords'], ['xmp', 'subject']]
    ];
    const group = groups.find((fields) => fields.some(([s, k]) => s === section && k.toLowerCase() === key.toLowerCase()));
    let nativeEdit = { section, key, value, remove };
    if (group) {
      for (const [s, k] of group) {
        raw[s] ||= {};
        if (remove) delete raw[s][k]; else raw[s][k] = value;
      }
      const native = group.find(([s]) => s === 'exif');
      if (native) nativeEdit = { ...nativeEdit, section: native[0], key: native[1] };
    }
    return fromBlob(file, await writeMetadataToBlob(blobOf(file), raw, nativeEdit));
  });
  const exportJson = (payload: unknown, name: string) => {
    try { saveAs(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), name); }
    catch (error) { notify('JSON Export Failed', error); }
  };
  const jsonRecord = (file: MetaFile) => ({ file: { name: file.name, size: file.size, type: file.type, width: file.width, height: file.height, lastModified: file.lastModified }, rawMetadata: file.rawMetadata, seoMetadata: file.seoData, privacyReport: file.privacyReport, aiWorkflow: file.aiWorkflow });
  return {
    currentView: 'studio', setCurrentView: (view) => {
      const currentView = workspaceView(view);
      if (typeof window !== 'undefined' && window.location.pathname === '/') {
        const href = workspaceHref(currentView);
        if (window.location.pathname + window.location.search !== href) window.history.pushState(null, '', href);
      }
      set({ currentView });
    },
    files: [], activeFileId: null, selectedFileIds: [], compareFileIds: [null, null], presets: DEFAULT_PRESETS, batchJobs: [],
    clearCompletedJobs: () => set((state) => ({ batchJobs: state.batchJobs.filter((job) => job.status === 'RUNNING' || job.status === 'QUEUED') })),
    toasts: [],
    addToast: (toast) => {
      const id = uid();
      set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id, timestamp: Date.now() }] }));
      setTimeout(() => get().removeToast(id), toast.type === 'error' || toast.type === 'warning' ? 10000 : 4000);
    },
    removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    isCommandPaletteOpen: false, setIsCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
    searchQuery: '', filterOptions: { format: 'ALL', seoStatus: 'ALL', privacyStatus: 'ALL', aiStatus: 'ALL' },
    setSearchQuery: (query) => set({ searchQuery: query }), setFilterOptions: (filters) => set((state) => ({ filterOptions: { ...state.filterOptions, ...filters } })),
    aiEnabled: false, geminiApiKey: '', selectedModel: DEFAULT_GEMINI_MODEL, isProcessing: false, processingMessage: '', activeTab: 'inspector', isAiSettingsOpen: false,
    setAiEnabled: (enabled) => set({ aiEnabled: enabled }), toggleAI: () => set((state) => ({ aiEnabled: !state.aiEnabled })),
    setApiKey: (key) => set({ geminiApiKey: key.trim() }), setSelectedModel: (model) => set({ selectedModel: normalizeGeminiModel(model) }),
    setActiveFile: (id) => set({ activeFileId: get().files.some((f) => f.id === id) ? id : get().files[0]?.id || null }),
    setActiveTab: (tab) => set({ activeTab: tab }), setIsAiSettingsOpen: (open) => set({ isAiSettingsOpen: open }),
    toggleSelectFile: (id) => set((state) => ({ selectedFileIds: !state.files.some((f) => f.id === id) ? state.selectedFileIds : state.selectedFileIds.includes(id) ? state.selectedFileIds.filter((value) => value !== id) : [...state.selectedFileIds, id] })),
    selectAllFiles: () => set((state) => ({ selectedFileIds: state.files.map((f) => f.id) })), clearSelection: () => set({ selectedFileIds: [] }),
    setCompareFile: (slot, id) => set((state) => { const next: [string | null, string | null] = [...state.compareFileIds]; next[slot] = state.files.some((f) => f.id === id) ? id : null; return { compareFileIds: next }; }),
    addFiles: (files) => {
      const generation = importGeneration;
      return run(`Importing ${files.length} images…`, async () => {
        if (!files.length) return false;
        let imported = 0; const errors: string[] = [];
        for (const file of files) {
          try {
            if (generation !== importGeneration) break;
            if (get().files.length >= 500 || get().files.reduce((size, item) => size + item.originalBlob.size, 0) + file.size > 256 * 1024 * 1024) throw new Error('The queue is limited to 500 images and 256 MB. Export and clear some images before importing more.');
            const parsed = await parseDeepMetadata(file);
            if (generation !== importGeneration) { URL.revokeObjectURL(parsed.thumbnailUrl); continue; }
            parsed.name = safeFilename(parsed.name, parsed.type);
            set((state) => { const combined = [...state.files, parsed]; return { files: combined, activeFileId: state.activeFileId || parsed.id, compareFileIds: [state.compareFileIds[0] || combined[0]?.id || null, state.compareFileIds[1] || combined[1]?.id || null] }; });
            imported++;
          } catch (error) { errors.push(`${file.name}: ${errorMessage(error)}`); }
          set({ processingMessage: `Imported ${imported}/${files.length} images…` });
        }
        if (generation !== importGeneration) return false;
        get().addToast({ type: errors.length ? imported ? 'warning' : 'error' : 'success', title: errors.length ? 'Import Finished with Errors' : 'Files Imported', description: `${imported} image(s) imported.${errors[0] ? ` ${errors[0]}` : ''}` });
        return errors.length === 0;
      });
    },
    removeFile: (id) => {
      const file = get().files.find((f) => f.id === id); if (file) URL.revokeObjectURL(file.thumbnailUrl);
      set((state) => { const files = state.files.filter((f) => f.id !== id); return { files, activeFileId: state.activeFileId === id ? files[0]?.id || null : state.activeFileId, selectedFileIds: state.selectedFileIds.filter((value) => value !== id), compareFileIds: state.compareFileIds.map((value, index) => value === id ? files[index]?.id || null : value) as [string | null, string | null] }; });
    },
    clearFiles: () => { importGeneration++; get().files.forEach((f) => URL.revokeObjectURL(f.thumbnailUrl)); set({ files: [], activeFileId: null, selectedFileIds: [], compareFileIds: [null, null], searchQuery: '' }); },
    updateTag: (id, section, key, value) => editTag(id, section, key, value), deleteTag: (id, section, key) => editTag(id, section, key, undefined, true),
    stripGps: (id) => mutate(id, 'GPS Removed', removeGps),
    stripAllGps: () => batch('Batch GPS Removal', 'STRIP_GPS', get().files.filter((f) => f.privacyReport.hasGps || f.privacyReport.inspectionWarning).map((f) => f.id), removeGps),
    stripAllMetadata: (id) => mutate(id, 'Metadata Removed', async (file) => fromBlob(file, await stripAllMetadataFromBlob(blobOf(file)))),
    stripAllMetadataBatch: () => batch('Batch Metadata Removal', 'SANITIZE_SOCIAL', get().files.map((f) => f.id), async (file) => fromBlob(file, await stripAllMetadataFromBlob(blobOf(file)))),
    sanitizeForSocial: (id) => mutate(id, 'Social Sanitization Complete', social),
    batchSanitizeForSocial: () => batch('Social Sanitization', 'SANITIZE_SOCIAL', get().files.map((f) => f.id), social),
    applyAiSeo: (id, seo, actor = 'User') => set((state) => ({ files: state.files.map((file) => file.id === id ? { ...file, seoData: { ...file.seoData, ...seo }, isDirty: true, history: actor === 'AI' ? [snapshot(file, 'Generated SEO draft', 'AI'), ...file.history].slice(0, 50) : file.history } : file) })),
    writeSeoToMetadata: (id) => mutate(id, 'SEO Saved to Image', async (file) => {
      const raw = clone(file.rawMetadata), seo = file.seoData;
      raw.iptc = { ...raw.iptc, Headline: seo.title || '', Caption: seo.caption || '', Keywords: seo.keywords || [] };
      raw.xmp = { ...raw.xmp, title: seo.title || '', description: seo.caption || '', altText: seo.altText || '', subject: seo.keywords || [] };
      return writeRaw(file, raw);
    }),
    applyPreset: (presetId, ids) => batch('Preset Applied', 'APPLY_PRESET', ids, async (file, index) => {
      const found = get().presets.find((p) => p.id === presetId); if (!found) throw new Error('Preset no longer exists.');
      const preset = validatePreset(found);
      let base = file;
      if (preset.category === 'Privacy' && preset.stripGps && preset.stripSerials) base = await social(file);
      else {
        if (preset.stripSerials) base = await removeSerials(file);
        if (preset.stripGps) {
          const previous = base;
          try { base = await removeGps(base); }
          finally { if (previous !== file) URL.revokeObjectURL(previous.thumbnailUrl); }
        }
      }
      try {
        const raw = clone(base.rawMetadata); raw.exif ||= {}; raw.iptc ||= {};
        if (preset.tags.artist !== undefined) raw.exif.Artist = preset.tags.artist;
        if (preset.tags.copyright !== undefined) raw.exif.Copyright = preset.tags.copyright;
        for (const [tag, key] of [['credit', 'Credit'], ['headline', 'Headline'], ['caption', 'Caption'], ['keywords', 'Keywords']] as const) if (preset.tags[tag] !== undefined) raw.iptc[key] = preset.tags[tag];
        const result = await writeRaw(base, raw);
        if (preset.filenameTemplate) result.name = renameFromTemplate(result, preset.filenameTemplate, index);
        return result;
      } finally { if (base !== file) URL.revokeObjectURL(base.thumbnailUrl); }
    }, 'Preset'),
    createPreset: (preset) => { try { const validated = validatePreset(preset); set((state) => ({ presets: [...state.presets, { ...validated, id: uid() }] })); } catch (error) { notify('Invalid Preset', error); } },
    deletePreset: (id) => set((state) => ({ presets: state.presets.filter((p) => p.id !== id) })),
    batchBulkEdit: (ids, updates) => batch('Bulk Metadata Saved', 'APPLY_PRESET', ids, async (file) => {
      const raw = clone(file.rawMetadata); raw.exif ||= {}; raw.iptc ||= {};
      if (updates.artist !== undefined) raw.exif.Artist = updates.artist;
      if (updates.copyright !== undefined) raw.exif.Copyright = updates.copyright;
      if (updates.keywords !== undefined) raw.iptc.Keywords = [...new Set([...(updates.keywordMode === 'append' ? file.seoData.keywords || [] : []), ...updates.keywords])];
      return writeRaw(file, raw);
    }),
    batchRename: (ids, template) => batch('Batch Rename', 'RENAME', ids, async (file, index) => ({ ...file, name: renameFromTemplate(file, template, index) })),
    restoreHistory: (id, historyId) => mutate(id, 'Version Restored', async (file) => {
      const record = file.history.find((h) => h.id === historyId);
      if (!record?.previousRaw || !record.previousBlob) throw new Error('This entry has no restorable snapshot.');
      const restored = await fromBlob(file, record.previousBlob);
      return { ...restored, rawMetadata: clone(record.previousRaw), seoData: clone(record.previousSeo || seoFromRaw(record.previousRaw)), name: record.previousName || file.name, privacyReport: analyzePrivacyRisks(record.previousRaw) };
    }),
    renameFile: (id, name) => {
      const file = get().files.find((f) => f.id === id); if (!file || !name.trim()) return;
      commit(file, { ...file, name: safeFilename(name, file.type) }, 'File Renamed');
    },
    exportSingle: (id) => { try { const file = get().files.find((f) => f.id === id); if (file) saveAs(blobOf(file), safeFilename(file.name, file.type)); } catch (error) { notify('Download Failed', error); } },
    exportAllZip: () => run('Packaging ZIP archive…', async () => {
      const files = [...get().files]; if (!files.length) throw new Error('Import images before exporting.');
      const zip = new JSZip(), used = new Set<string>();
      for (const file of files) {
        const base = safeFilename(file.name, file.type); let name = base, suffix = 2;
        while (used.has(name.toLowerCase())) name = base.replace(/(\.[^.]+)$/, `-${suffix++}$1`);
        used.add(name.toLowerCase()); zip.file(`metaforge_export/${name}`, await blobOf(file).arrayBuffer());
      }
      const content = await zip.generateAsync({ type: 'blob' }, ({ percent }) => set({ processingMessage: `Packaging ZIP: ${Math.round(percent)}%` }));
      saveAs(content, `metaforge_export_${new Date().toISOString().slice(0, 10)}.zip`);
      get().addToast({ type: 'success', title: 'ZIP Export Complete', description: `${files.length} images packaged.` });
      return true;
    }),
    exportMetadataJson: (id) => { const file = get().files.find((f) => f.id === id); if (file) exportJson(jsonRecord(file), `${file.name.replace(/\.[^.]+$/, '')}_metadata.json`); },
    exportAllMetadataJson: () => { if (get().files.length) exportJson(get().files.map(jsonRecord), 'metaforge_catalog.json'); }
  };
}, {
  name: 'metaforge_storage_v2', storage: persistedStorage, skipHydration: true,
  partialize: (state) => ({ aiEnabled: state.aiEnabled, geminiApiKey: state.geminiApiKey, selectedModel: state.selectedModel, presets: state.presets }),
  merge: (persisted, current) => {
    const saved = persisted && typeof persisted === 'object' ? persisted as Partial<MetaForgeState> : {};
    const presets: MetadataPreset[] = [];
    for (const preset of Array.isArray(saved.presets) ? saved.presets : DEFAULT_PRESETS) {
      try { presets.push({ ...validatePreset(preset), id: typeof preset.id === 'string' ? preset.id : uid() }); } catch { /* Ignore invalid saved presets. */ }
    }
    const geminiApiKey = typeof saved.geminiApiKey === 'string' ? saved.geminiApiKey.trim() : '';
    const selectedModel = normalizeGeminiModel(saved.selectedModel);
    return { ...current, presets, aiEnabled: saved.aiEnabled === true, geminiApiKey, selectedModel: !geminiApiKey && selectedModel.startsWith('gemini-2.5-') ? DEFAULT_GEMINI_MODEL : selectedModel };
  }
}));
