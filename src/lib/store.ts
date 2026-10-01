import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  MetaFile, 
  SeoMetadata, 
  AppView, 
  MetadataPreset, 
  BatchJob, 
  ToastMessage, 
  MetadataHistoryItem 
} from './types';
import { parseDeepMetadata } from './metadata-reader';
import { 
  stripGpsFromBlob, 
  stripAllMetadataFromBlob, 
  sanitizeForSocialMedia, 
  writeTagsToJpeg 
} from './metadata-writer';
import { analyzePrivacyRisks } from './privacy-rules';
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
  addFiles: (newFiles: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  // Metadata operations
  updateTag: (fileId: string, section: string, key: string, value: any) => Promise<void>;
  deleteTag: (fileId: string, section: string, key: string) => Promise<void>;
  stripGps: (fileId: string) => Promise<void>;
  stripAllGps: () => Promise<void>;
  stripAllMetadata: (fileId: string) => Promise<void>;
  stripAllMetadataBatch: () => Promise<void>;
  sanitizeForSocial: (fileId: string) => Promise<void>;
  batchSanitizeForSocial: () => Promise<void>;
  applyAiSeo: (fileId: string, seo: SeoMetadata) => void;
  writeSeoToMetadata: (fileId: string) => Promise<void>;

  // Presets & Batch
  applyPreset: (presetId: string, targetFileIds: string[]) => Promise<void>;
  createPreset: (preset: Omit<MetadataPreset, 'id'>) => void;
  deletePreset: (id: string) => void;
  batchBulkEdit: (fileIds: string[], updates: { copyright?: string; artist?: string; keywords?: string[]; keywordMode?: 'append' | 'replace' }) => Promise<void>;
  batchRename: (fileIds: string[], template: string) => Promise<void>;

  // History
  restoreHistory: (fileId: string, historyId: string) => Promise<void>;

  // Export
  exportSingle: (fileId: string) => void;
  exportAllZip: () => Promise<void>;
}

export const useMetaForgeStore = create<MetaForgeState>()(
  persist(
    (set, get) => ({
      currentView: 'studio',
      setCurrentView: (view) => set({ currentView: view }),

      files: [],
      activeFileId: null,
      selectedFileIds: [],
      compareFileIds: [null, null],

      presets: DEFAULT_PRESETS,
      batchJobs: [],

      toasts: [],
      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newToast: ToastMessage = { ...toast, id, timestamp: Date.now() };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, 4000);
      },
      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      isCommandPaletteOpen: false,
      setIsCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

      searchQuery: '',
      filterOptions: {
        format: 'ALL',
        seoStatus: 'ALL',
        privacyStatus: 'ALL',
        aiStatus: 'ALL'
      },
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterOptions: (filters) => set((state) => ({
        filterOptions: { ...state.filterOptions, ...filters }
      })),

      aiEnabled: false,
      geminiApiKey: '',
      selectedModel: 'gemini-2.5-flash',
      isProcessing: false,
      processingMessage: '',
      activeTab: 'inspector',
      isAiSettingsOpen: false,

      setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
      toggleAI: () => set((state) => ({ aiEnabled: !state.aiEnabled })),
      setApiKey: (key) => set({ geminiApiKey: key }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setActiveFile: (id) => set({ activeFileId: id }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsAiSettingsOpen: (open) => set({ isAiSettingsOpen: open }),

      toggleSelectFile: (id) => set((state) => ({
        selectedFileIds: state.selectedFileIds.includes(id)
          ? state.selectedFileIds.filter((fid) => fid !== id)
          : [...state.selectedFileIds, id]
      })),

      selectAllFiles: () => set((state) => ({
        selectedFileIds: state.files.map((f) => f.id)
      })),

      clearSelection: () => set({ selectedFileIds: [] }),

      setCompareFile: (slot, id) => set((state) => {
        const next: [string | null, string | null] = [...state.compareFileIds];
        next[slot] = id;
        return { compareFileIds: next };
      }),

      addFiles: async (newFiles: File[]) => {
        if (!newFiles.length) return;
        set({ isProcessing: true, processingMessage: `Parsing ${newFiles.length} file(s)...` });

        try {
          const parsedFiles: MetaFile[] = [];
          for (const file of newFiles) {
            const meta = await parseDeepMetadata(file);
            parsedFiles.push(meta);
          }

          set((state) => {
            const combined = [...state.files, ...parsedFiles];
            const activeId = state.activeFileId || parsedFiles[0]?.id || null;
            const compareA = state.compareFileIds[0] || combined[0]?.id || null;
            const compareB = state.compareFileIds[1] || combined[1]?.id || null;

            return {
              files: combined,
              activeFileId: activeId,
              compareFileIds: [compareA, compareB],
              isProcessing: false,
              processingMessage: ''
            };
          });

          get().addToast({
            type: 'success',
            title: 'Files Imported',
            description: `Successfully loaded ${newFiles.length} image(s) in-memory.`
          });
        } catch (err) {
          console.error('Error adding files:', err);
          set({ isProcessing: false, processingMessage: '' });
          get().addToast({
            type: 'error',
            title: 'Import Failed',
            description: 'Could not parse selected files.'
          });
        }
      },

      removeFile: (id: string) => {
        set((state) => {
          const filtered = state.files.filter((f) => f.id !== id);
          return {
            files: filtered,
            activeFileId: state.activeFileId === id ? (filtered[0]?.id || null) : state.activeFileId,
            selectedFileIds: state.selectedFileIds.filter((fid) => fid !== id)
          };
        });
      },

      clearFiles: () => {
        set({ files: [], activeFileId: null, selectedFileIds: [] });
      },

      updateTag: async (fileId: string, section: string, key: string, value: any) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return;

        const updatedRaw = { ...file.rawMetadata };
        if (!updatedRaw[section]) updatedRaw[section] = {};
        const oldVal = updatedRaw[section][key];
        updatedRaw[section][key] = value;

        const newReport = analyzePrivacyRisks(updatedRaw);

        const historyItem: MetadataHistoryItem = {
          id: `hist-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'User',
          action: `Edited ${section}.${key}`,
          diffSummary: `${key}: ${String(oldVal)} → ${String(value)}`,
          previousRaw: file.rawMetadata,
          previousBlob: file.modifiedBlob || file.originalBlob
        };

        set((state) => ({
          files: state.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  rawMetadata: updatedRaw,
                  privacyReport: newReport,
                  isDirty: true,
                  history: [historyItem, ...(f.history || [])]
                }
              : f
          )
        }));

        get().addToast({
          type: 'success',
          title: 'Tag Updated',
          description: `${key} saved.`
        });
      },

      deleteTag: async (fileId: string, section: string, key: string) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return;

        const updatedRaw = { ...file.rawMetadata };
        if (updatedRaw[section] && updatedRaw[section][key] !== undefined) {
          delete updatedRaw[section][key];
        }

        const newReport = analyzePrivacyRisks(updatedRaw);

        const historyItem: MetadataHistoryItem = {
          id: `hist-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'User',
          action: `Deleted ${section}.${key}`,
          diffSummary: `Removed tag ${key}`,
          previousRaw: file.rawMetadata,
          previousBlob: file.modifiedBlob || file.originalBlob
        };

        set((state) => ({
          files: state.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  rawMetadata: updatedRaw,
                  privacyReport: newReport,
                  isDirty: true,
                  history: [historyItem, ...(f.history || [])]
                }
              : f
          )
        }));

        get().addToast({
          type: 'info',
          title: 'Tag Removed',
          description: `Deleted ${key} from ${section}.`
        });
      },

      stripGps: async (fileId: string) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return;

        set({ isProcessing: true, processingMessage: 'Stripping GPS data...' });
        try {
          const blobToClean = file.modifiedBlob || file.originalBlob;
          const cleanedBlob = await stripGpsFromBlob(blobToClean);

          const updatedRaw = { ...file.rawMetadata };
          delete updatedRaw.gps;
          delete updatedRaw.GPS;
          if (updatedRaw.exif) {
            delete updatedRaw.exif.latitude;
            delete updatedRaw.exif.longitude;
            delete updatedRaw.exif.GPSLatitude;
            delete updatedRaw.exif.GPSLongitude;
          }

          const newReport = analyzePrivacyRisks(updatedRaw);

          const historyItem: MetadataHistoryItem = {
            id: `hist-${Date.now()}`,
            timestamp: Date.now(),
            actor: 'User',
            action: 'Stripped GPS Coordinates',
            diffSummary: 'Purged latitude/longitude from IFD tables',
            previousRaw: file.rawMetadata,
            previousBlob: file.modifiedBlob || file.originalBlob
          };

          set((state) => ({
            files: state.files.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    modifiedBlob: cleanedBlob,
                    rawMetadata: updatedRaw,
                    privacyReport: newReport,
                    isDirty: true,
                    history: [historyItem, ...(f.history || [])]
                  }
                : f
            ),
            isProcessing: false,
            processingMessage: ''
          }));

          get().addToast({
            type: 'success',
            title: 'GPS Purged',
            description: 'Geographic coordinates eliminated.'
          });
        } catch (err) {
          console.error('Failed stripping GPS', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      stripAllGps: async () => {
        const { files } = get();
        if (!files.length) return;

        const count = files.filter((f) => f.privacyReport.hasGps).length;
        set({ isProcessing: true, processingMessage: `Batch stripping GPS from ${count} images...` });

        try {
          const updatedFiles: MetaFile[] = [];
          for (const f of files) {
            if (f.privacyReport.hasGps) {
              const blob = f.modifiedBlob || f.originalBlob;
              const cleaned = await stripGpsFromBlob(blob);
              const updatedRaw = { ...f.rawMetadata };
              delete updatedRaw.gps;
              delete updatedRaw.GPS;
              if (updatedRaw.exif) {
                delete updatedRaw.exif.latitude;
                delete updatedRaw.exif.longitude;
              }
              const report = analyzePrivacyRisks(updatedRaw);

              updatedFiles.push({
                ...f,
                modifiedBlob: cleaned,
                rawMetadata: updatedRaw,
                privacyReport: report,
                isDirty: true,
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    timestamp: Date.now(),
                    actor: 'System',
                    action: 'Batch GPS Strip',
                    diffSummary: 'Removed GPS coordinates in batch'
                  },
                  ...(f.history || [])
                ]
              });
            } else {
              updatedFiles.push(f);
            }
          }

          set({ files: updatedFiles, isProcessing: false, processingMessage: '' });

          get().addToast({
            type: 'success',
            title: 'Batch GPS Cleaned',
            description: `Sanitized ${count} image(s).`
          });
        } catch (err) {
          console.error('Batch strip GPS failed', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      stripAllMetadata: async (fileId: string) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return;

        set({ isProcessing: true, processingMessage: 'Stripping 100% of metadata chunks...' });
        try {
          const cleaned = await stripAllMetadataFromBlob(file.modifiedBlob || file.originalBlob);
          const emptyRaw: Record<string, any> = {
            file: {
              name: file.name,
              size: cleaned.size,
              type: cleaned.type
            }
          };

          const newReport = analyzePrivacyRisks(emptyRaw);

          set((state) => ({
            files: state.files.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    modifiedBlob: cleaned,
                    rawMetadata: emptyRaw,
                    privacyReport: newReport,
                    isDirty: true,
                    history: [
                      {
                        id: `hist-${Date.now()}`,
                        timestamp: Date.now(),
                        actor: 'User',
                        action: '100% Metadata Purge',
                        diffSummary: 'Cleared all EXIF, IPTC, and XMP chunks'
                      },
                      ...(f.history || [])
                    ]
                  }
                : f
            ),
            isProcessing: false,
            processingMessage: ''
          }));

          get().addToast({
            type: 'success',
            title: '100% EXIF Stripped',
            description: 'All metadata blocks removed.'
          });
        } catch (err) {
          console.error('Strip all metadata failed', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      stripAllMetadataBatch: async () => {
        const { files } = get();
        if (!files.length) return;

        set({ isProcessing: true, processingMessage: `Sanitizing all ${files.length} images...` });
        try {
          const updatedFiles: MetaFile[] = [];
          for (const f of files) {
            const cleaned = await stripAllMetadataFromBlob(f.modifiedBlob || f.originalBlob);
            const emptyRaw = {
              file: { name: f.name, size: cleaned.size, type: cleaned.type }
            };
            updatedFiles.push({
              ...f,
              modifiedBlob: cleaned,
              rawMetadata: emptyRaw,
              privacyReport: analyzePrivacyRisks(emptyRaw),
              isDirty: true
            });
          }
          set({ files: updatedFiles, isProcessing: false, processingMessage: '' });

          get().addToast({
            type: 'success',
            title: 'All Metadata Stripped',
            description: `Cleaned ${files.length} images.`
          });
        } catch (err) {
          console.error('Batch strip all metadata failed', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      sanitizeForSocial: async (fileId: string) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return;

        set({ isProcessing: true, processingMessage: 'Sanitizing for social media safe publication...' });
        try {
          const cleaned = await sanitizeForSocialMedia(file.modifiedBlob || file.originalBlob, true);
          const updatedRaw = { ...file.rawMetadata };
          delete updatedRaw.gps;
          delete updatedRaw.GPS;
          if (updatedRaw.exif) {
            delete updatedRaw.exif.latitude;
            delete updatedRaw.exif.longitude;
            delete updatedRaw.exif.CameraSerialNumber;
            delete updatedRaw.exif.BodySerialNumber;
            delete updatedRaw.exif.LensSerialNumber;
            delete updatedRaw.exif.HostComputer;
            delete updatedRaw.exif.Software;
            delete updatedRaw.exif.MakerNote;
          }

          const newReport = analyzePrivacyRisks(updatedRaw);

          set((state) => ({
            files: state.files.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    modifiedBlob: cleaned,
                    rawMetadata: updatedRaw,
                    privacyReport: newReport,
                    isDirty: true,
                    history: [
                      {
                        id: `hist-${Date.now()}`,
                        timestamp: Date.now(),
                        actor: 'User',
                        action: 'Sanitized for Social',
                        diffSummary: 'Purged GPS and hardware serials; retained attribution'
                      },
                      ...(f.history || [])
                    ]
                  }
                : f
            ),
            isProcessing: false,
            processingMessage: ''
          }));

          get().addToast({
            type: 'success',
            title: 'Social Sanitized',
            description: 'GPS and serials removed.'
          });
        } catch (err) {
          console.error('Social sanitize failed', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      batchSanitizeForSocial: async () => {
        const { files } = get();
        if (!files.length) return;

        set({ isProcessing: true, processingMessage: `Social sanitizing ${files.length} images...` });
        try {
          const updatedFiles: MetaFile[] = [];
          for (const f of files) {
            const cleaned = await sanitizeForSocialMedia(f.modifiedBlob || f.originalBlob, true);
            const updatedRaw = { ...f.rawMetadata };
            delete updatedRaw.gps;
            delete updatedRaw.GPS;
            if (updatedRaw.exif) {
              delete updatedRaw.exif.latitude;
              delete updatedRaw.exif.longitude;
              delete updatedRaw.exif.CameraSerialNumber;
              delete updatedRaw.exif.HostComputer;
              delete updatedRaw.exif.MakerNote;
            }
            updatedFiles.push({
              ...f,
              modifiedBlob: cleaned,
              rawMetadata: updatedRaw,
              privacyReport: analyzePrivacyRisks(updatedRaw),
              isDirty: true
            });
          }
          set({ files: updatedFiles, isProcessing: false, processingMessage: '' });

          get().addToast({
            type: 'success',
            title: 'Batch Social Sanitized',
            description: `Sanitized ${files.length} images.`
          });
        } catch (err) {
          console.error('Batch social sanitize failed', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      applyAiSeo: (fileId: string, seo: SeoMetadata) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  seoData: { ...f.seoData, ...seo },
                  isDirty: true,
                  history: [
                    {
                      id: `hist-${Date.now()}`,
                      timestamp: Date.now(),
                      actor: 'AI',
                      action: 'Gemini Vision SEO Generated',
                      diffSummary: `Title: ${seo.title || 'N/A'}, Alt: ${seo.altText || 'N/A'}`
                    },
                    ...(f.history || [])
                  ]
                }
              : f
          )
        }));

        get().addToast({
          type: 'success',
          title: 'AI SEO Generated',
          description: 'Title, Alt Text, and keywords proposed.'
        });
      },

      writeSeoToMetadata: async (fileId: string) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file || !file.seoData) return;

        set({ isProcessing: true, processingMessage: 'Writing SEO & tags to image EXIF...' });
        try {
          const blob = file.modifiedBlob || file.originalBlob;
          const updatedBlob = await writeTagsToJpeg(blob, {
            title: file.seoData.title,
            description: file.seoData.caption || file.seoData.altText,
            userComment: file.seoData.keywords?.join(', ')
          });

          const updatedRaw = { ...file.rawMetadata };
          if (!updatedRaw.exif) updatedRaw.exif = {};
          if (file.seoData.title) updatedRaw.exif.ImageDescription = file.seoData.title;
          if (file.seoData.keywords?.length) {
            if (!updatedRaw.iptc) updatedRaw.iptc = {};
            updatedRaw.iptc.Keywords = file.seoData.keywords;
          }

          set((state) => ({
            files: state.files.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    modifiedBlob: updatedBlob,
                    rawMetadata: updatedRaw,
                    isDirty: true
                  }
                : f
            ),
            isProcessing: false,
            processingMessage: ''
          }));

          get().addToast({
            type: 'success',
            title: 'Saved to EXIF',
            description: 'SEO fields written to image chunks.'
          });
        } catch (err) {
          console.error('Failed writing SEO to metadata', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      applyPreset: async (presetId: string, targetFileIds: string[]) => {
        const preset = get().presets.find((p) => p.id === presetId);
        if (!preset || !targetFileIds.length) return;

        set({ isProcessing: true, processingMessage: `Applying "${preset.name}" to ${targetFileIds.length} image(s)...` });

        try {
          const updatedFiles = await Promise.all(
            get().files.map(async (file) => {
              if (!targetFileIds.includes(file.id)) return file;

              let blob = file.modifiedBlob || file.originalBlob;

              if (preset.stripGps) {
                blob = await stripGpsFromBlob(blob);
              }
              if (preset.stripSerials) {
                blob = await sanitizeForSocialMedia(blob, true);
              }

              blob = await writeTagsToJpeg(blob, {
                artist: preset.tags.artist,
                copyright: preset.tags.copyright,
                description: preset.tags.caption,
                userComment: preset.tags.keywords?.join(', ')
              });

              const updatedRaw = { ...file.rawMetadata };
              if (!updatedRaw.iptc) updatedRaw.iptc = {};
              if (preset.tags.keywords?.length) {
                updatedRaw.iptc.Keywords = preset.tags.keywords;
              }
              if (preset.tags.copyright) {
                updatedRaw.iptc.CopyrightNotice = preset.tags.copyright;
              }

              const historyItem: MetadataHistoryItem = {
                id: `hist-${Date.now()}`,
                timestamp: Date.now(),
                actor: 'Preset',
                action: `Applied Preset "${preset.name}"`,
                diffSummary: `Preset rules stamped: ${Object.keys(preset.tags).join(', ')}`
              };

              return {
                ...file,
                modifiedBlob: blob,
                rawMetadata: updatedRaw,
                privacyReport: analyzePrivacyRisks(updatedRaw),
                isDirty: true,
                history: [historyItem, ...(file.history || [])]
              };
            })
          );

          set({ files: updatedFiles, isProcessing: false, processingMessage: '' });

          get().addToast({
            type: 'success',
            title: 'Preset Applied',
            description: `Applied "${preset.name}" to ${targetFileIds.length} file(s).`
          });
        } catch (err) {
          console.error('Failed applying preset', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      createPreset: (newPreset) => {
        const id = `preset-${Date.now()}`;
        set((state) => ({
          presets: [...state.presets, { ...newPreset, id }]
        }));
        get().addToast({
          type: 'success',
          title: 'Preset Created',
          description: `Created preset "${newPreset.name}".`
        });
      },

      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id)
        }));
        get().addToast({
          type: 'info',
          title: 'Preset Deleted',
          description: 'Preset was removed.'
        });
      },

      batchBulkEdit: async (fileIds, updates) => {
        if (!fileIds.length) return;
        set({ isProcessing: true, processingMessage: `Bulk updating ${fileIds.length} files...` });

        try {
          const updatedFiles = await Promise.all(
            get().files.map(async (file) => {
              if (!fileIds.includes(file.id)) return file;

              let blob = file.modifiedBlob || file.originalBlob;
              blob = await writeTagsToJpeg(blob, {
                artist: updates.artist,
                copyright: updates.copyright,
                userComment: updates.keywords?.join(', ')
              });

              const updatedRaw = { ...file.rawMetadata };
              if (!updatedRaw.iptc) updatedRaw.iptc = {};

              if (updates.copyright) updatedRaw.iptc.CopyrightNotice = updates.copyright;
              if (updates.artist) updatedRaw.iptc.Byline = updates.artist;

              if (updates.keywords?.length) {
                if (updates.keywordMode === 'append') {
                  const existing = Array.isArray(updatedRaw.iptc.Keywords) ? updatedRaw.iptc.Keywords : [];
                  updatedRaw.iptc.Keywords = Array.from(new Set([...existing, ...updates.keywords]));
                } else {
                  updatedRaw.iptc.Keywords = updates.keywords;
                }
              }

              return {
                ...file,
                modifiedBlob: blob,
                rawMetadata: updatedRaw,
                isDirty: true,
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    timestamp: Date.now(),
                    actor: 'User' as const,
                    action: 'Batch Bulk Edit',
                    diffSummary: 'Updated attribution & keywords'
                  },
                  ...(file.history || [])
                ]
              };
            })
          );

          set({ files: updatedFiles, isProcessing: false, processingMessage: '' });

          get().addToast({
            type: 'success',
            title: 'Bulk Edit Complete',
            description: `Updated ${fileIds.length} image(s).`
          });
        } catch (err) {
          console.error(err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      batchRename: async (fileIds, template) => {
        if (!fileIds.length) return;

        set((state) => {
          let counter = 1;
          const updated = state.files.map((file) => {
            if (!fileIds.includes(file.id)) return file;

            const ext = file.name.substring(file.name.lastIndexOf('.'));
            const dateStr = new Date(file.lastModified).toISOString().slice(0, 10);
            const titleStr = file.seoData?.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'image';
            const artistStr = file.rawMetadata?.exif?.Artist?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'photo';

            let newName = template
              .replace('{title}', titleStr)
              .replace('{date}', dateStr)
              .replace('{artist}', artistStr)
              .replace('{counter}', String(counter).padStart(3, '0'));

            if (!newName.endsWith(ext)) {
              newName += ext;
            }

            counter++;
            return { ...file, name: newName, isDirty: true };
          });

          return { files: updated };
        });

        get().addToast({
          type: 'success',
          title: 'Batch Rename Complete',
          description: `Renamed ${fileIds.length} files using template.`
        });
      },

      restoreHistory: async (fileId, historyId) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return;

        const record = file.history.find((h) => h.id === historyId);
        if (!record || !record.previousRaw) return;

        set((state) => ({
          files: state.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  rawMetadata: record.previousRaw || f.rawMetadata,
                  modifiedBlob: record.previousBlob !== undefined ? record.previousBlob : f.modifiedBlob,
                  privacyReport: analyzePrivacyRisks(record.previousRaw || {}),
                  isDirty: true,
                  history: [
                    {
                      id: `hist-restore-${Date.now()}`,
                      timestamp: Date.now(),
                      actor: 'User',
                      action: 'Restored Version',
                      diffSummary: `Rolled back to state before: ${record.action}`
                    },
                    ...f.history
                  ]
                }
              : f
          )
        }));

        get().addToast({
          type: 'info',
          title: 'Version Restored',
          description: `Rolled back to snapshot from ${new Date(record.timestamp).toLocaleTimeString()}.`
        });
      },

      exportSingle: (fileId: string) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return;

        const blob = file.modifiedBlob || file.originalBlob;
        const prefix = file.modifiedBlob ? 'metaforge_' : '';
        saveAs(blob, `${prefix}${file.name}`);

        get().addToast({
          type: 'success',
          title: 'Export Started',
          description: `Saved ${file.name}.`
        });
      },

      exportAllZip: async () => {
        const { files } = get();
        if (!files.length) return;

        set({ isProcessing: true, processingMessage: 'Packaging files into ZIP archive...' });
        try {
          const zip = new JSZip();
          const folder = zip.folder('metaforge_export');

          for (const f of files) {
            const blob = f.modifiedBlob || f.originalBlob;
            const filename = f.modifiedBlob ? `metaforge_${f.name}` : f.name;
            folder?.file(filename, blob);
          }

          const content = await zip.generateAsync({ type: 'blob' });
          saveAs(content, `metaforge_export_${new Date().toISOString().slice(0, 10)}.zip`);

          set({ isProcessing: false, processingMessage: '' });

          get().addToast({
            type: 'success',
            title: 'ZIP Export Complete',
            description: `Packaged ${files.length} images into ZIP.`
          });
        } catch (err) {
          console.error('Failed exporting zip', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      }
    }),
    {
      name: 'metaforge_storage_v2',
      partialize: (state) => ({
        aiEnabled: state.aiEnabled,
        geminiApiKey: state.geminiApiKey,
        selectedModel: state.selectedModel,
        presets: state.presets
      })
    }
  )
);
