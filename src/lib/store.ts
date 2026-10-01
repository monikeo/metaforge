import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MetaFile, SeoMetadata } from './types';
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

interface MetaForgeState {
  files: MetaFile[];
  activeFileId: string | null;
  aiEnabled: boolean;
  geminiApiKey: string;
  selectedModel: string;
  isProcessing: boolean;
  processingMessage: string;
  searchQuery: string;
  activeTab: 'inspector' | 'privacy' | 'seo' | 'hex' | 'workflow';
  isAiSettingsOpen: boolean;

  // Actions
  setAiEnabled: (enabled: boolean) => void;
  toggleAI: () => void;
  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
  setActiveFile: (id: string | null) => void;
  setActiveTab: (tab: 'inspector' | 'privacy' | 'seo' | 'hex' | 'workflow') => void;
  setSearchQuery: (query: string) => void;
  setIsAiSettingsOpen: (open: boolean) => void;

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

  // Export
  exportSingle: (fileId: string) => void;
  exportAllZip: () => Promise<void>;
}

export const useMetaForgeStore = create<MetaForgeState>()(
  persist(
    (set, get) => ({
      files: [],
      activeFileId: null,
      aiEnabled: false,
      geminiApiKey: '',
      selectedModel: 'gemini-2.5-flash',
      isProcessing: false,
      processingMessage: '',
      searchQuery: '',
      activeTab: 'inspector',
      isAiSettingsOpen: false,

      setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
      toggleAI: () => set((state) => ({ aiEnabled: !state.aiEnabled })),
      setApiKey: (key) => set({ geminiApiKey: key }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setActiveFile: (id) => set({ activeFileId: id }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setIsAiSettingsOpen: (open) => set({ isAiSettingsOpen: open }),

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
            return {
              files: combined,
              activeFileId: state.activeFileId || parsedFiles[0]?.id || null,
              isProcessing: false,
              processingMessage: ''
            };
          });
        } catch (err) {
          console.error('Error adding files:', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      removeFile: (id: string) => {
        set((state) => {
          const filtered = state.files.filter((f) => f.id !== id);
          return {
            files: filtered,
            activeFileId: state.activeFileId === id ? (filtered[0]?.id || null) : state.activeFileId
          };
        });
      },

      clearFiles: () => {
        set({ files: [], activeFileId: null });
      },

      updateTag: async (fileId: string, section: string, key: string, value: any) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return;

        const updatedRaw = { ...file.rawMetadata };
        if (!updatedRaw[section]) updatedRaw[section] = {};
        updatedRaw[section][key] = value;

        // Recalculate privacy report
        const newReport = analyzePrivacyRisks(updatedRaw);

        // Update state
        set((state) => ({
          files: state.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  rawMetadata: updatedRaw,
                  privacyReport: newReport,
                  isDirty: true
                }
              : f
          )
        }));
      },

      deleteTag: async (fileId: string, section: string, key: string) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return;

        const updatedRaw = { ...file.rawMetadata };
        if (updatedRaw[section] && updatedRaw[section][key] !== undefined) {
          delete updatedRaw[section][key];
        }

        const newReport = analyzePrivacyRisks(updatedRaw);

        set((state) => ({
          files: state.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  rawMetadata: updatedRaw,
                  privacyReport: newReport,
                  isDirty: true
                }
              : f
          )
        }));
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

          set((state) => ({
            files: state.files.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    modifiedBlob: cleanedBlob,
                    rawMetadata: updatedRaw,
                    privacyReport: newReport,
                    isDirty: true
                  }
                : f
            ),
            isProcessing: false,
            processingMessage: ''
          }));
        } catch (err) {
          console.error('Failed stripping GPS', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      stripAllGps: async () => {
        const { files } = get();
        if (!files.length) return;

        set({ isProcessing: true, processingMessage: `Batch stripping GPS from ${files.length} images...` });
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
                isDirty: true
              });
            } else {
              updatedFiles.push(f);
            }
          }

          set({ files: updatedFiles, isProcessing: false, processingMessage: '' });
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
                    isDirty: true
                  }
                : f
            ),
            isProcessing: false,
            processingMessage: ''
          }));
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
                    isDirty: true
                  }
                : f
            ),
            isProcessing: false,
            processingMessage: ''
          }));
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
                  isDirty: true
                }
              : f
          )
        }));
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
        } catch (err) {
          console.error('Failed writing SEO to metadata', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      },

      exportSingle: (fileId: string) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return;

        const blob = file.modifiedBlob || file.originalBlob;
        const prefix = file.modifiedBlob ? 'metaforge_' : '';
        saveAs(blob, `${prefix}${file.name}`);
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
        } catch (err) {
          console.error('Failed exporting zip', err);
          set({ isProcessing: false, processingMessage: '' });
        }
      }
    }),
    {
      name: 'metaforge_storage_v1',
      partialize: (state) => ({
        aiEnabled: state.aiEnabled,
        geminiApiKey: state.geminiApiKey,
        selectedModel: state.selectedModel
      })
    }
  )
);
