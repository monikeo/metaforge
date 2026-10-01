'use client';

import React from 'react';
import Header from '@/components/Header';
import Dropzone from '@/components/Dropzone';
import ImageGallery from '@/components/ImageGallery';
import ImageCanvasPreview from '@/components/Inspector/ImageCanvasPreview';
import MetadataExplorer from '@/components/Inspector/MetadataExplorer';
import PrivacyAuditor from '@/components/Inspector/PrivacyAuditor';
import RawHexViewer from '@/components/Inspector/RawHexViewer';
import AIWorkflowDetect from '@/components/AI/AIWorkflowDetect';
import AIGeneratorPanel from '@/components/AI/AIGeneratorPanel';
import AISettingsModal from '@/components/AI/AISettingsModal';
import SeoPreviewCard from '@/components/SEO/SeoPreviewCard';
import SitemapExport from '@/components/SEO/SitemapExport';
import { useMetaForgeStore } from '@/lib/store';
import { 
  FileText, 
  ShieldAlert, 
  Sparkles, 
  Binary, 
  Cpu, 
  Flame, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';

export default function MetaForgeStudio() {
  const { 
    files, 
    activeFileId, 
    activeTab, 
    setActiveTab 
  } = useMetaForgeStore();

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans">
      <Header />
      <AISettingsModal />

      {files.length === 0 ? (
        /* Empty / Hero State */
        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
          <div className="flex flex-col items-center text-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 p-0.5 shadow-2xl shadow-purple-600/30">
              <div className="w-full h-full bg-neutral-950 rounded-[22px] flex items-center justify-center">
                <Flame className="w-9 h-9 text-amber-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
                METAFORGE
              </h1>
              <p className="text-base sm:text-lg font-medium text-neutral-300">
                Intelligent Image Metadata Studio & Privacy Sanitizer
              </p>
              <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto">
                Inspect deep EXIF/IPTC/XMP headers, purge physical GPS leaks, detect ComfyUI & SD prompt parameters, and auto-enrich SEO via Google Gemini.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% In-Browser WASM</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Zero Server Uploads</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gemini Vision BYOK</span>
              </div>
            </div>
          </div>

          <div className="w-full">
            <Dropzone />
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full">
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Privacy Shield</h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Scan and strip exact GPS latitude/longitude, camera body serial numbers, and machine hostnames before publishing.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Workflow Decoder</h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Extract generation prompts, negative prompts, samplers, CFG scales, and seeds embedded in PNG chunks from ComfyUI and Automatic1111.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Visual SEO & Sitemaps</h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Generate accessible alt texts, search headlines, and IPTC keyword tags with Gemini Vision, then export standard Google XML sitemaps.
              </p>
            </div>
          </div>
        </main>
      ) : (
        /* Active 3-Column Workstation Layout */
        <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT PANEL: File Queue & Batch Actions (col-span-3) */}
          <aside className="lg:col-span-3 flex flex-col gap-4">
            <Dropzone />
            <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 flex flex-col gap-3">
              <ImageGallery />
            </div>
          </aside>

          {/* CENTER PANEL: Interactive Canvas & Dynamic Inspector (col-span-5) */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            {activeFile && (
              <>
                <ImageCanvasPreview file={activeFile} />

                {/* Sub-Tabs for Center Inspector */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('inspector')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        activeTab === 'inspector'
                          ? 'bg-neutral-800 text-white shadow-xs'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Metadata Explorer
                    </button>

                    <button
                      onClick={() => setActiveTab('privacy')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        activeTab === 'privacy'
                          ? 'bg-neutral-800 text-white shadow-xs'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      Privacy Shield
                      {activeFile.privacyReport.hasGps && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab('workflow')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        activeTab === 'workflow'
                          ? 'bg-neutral-800 text-white shadow-xs'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      AI Workflow
                      {activeFile.aiWorkflow.detected && (
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab('hex')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        activeTab === 'hex'
                          ? 'bg-neutral-800 text-white shadow-xs'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Binary className="w-3.5 h-3.5 text-amber-400" />
                      Raw Hex
                    </button>
                  </div>

                  {/* Active Tab View */}
                  {activeTab === 'inspector' && (
                    <MetadataExplorer fileId={activeFile.id} />
                  )}

                  {activeTab === 'privacy' && (
                    <PrivacyAuditor fileId={activeFile.id} />
                  )}

                  {activeTab === 'workflow' && (
                    <AIWorkflowDetect workflow={activeFile.aiWorkflow} />
                  )}

                  {activeTab === 'hex' && (
                    <RawHexViewer
                      hexData={activeFile.rawHexSample}
                      fileName={activeFile.name}
                      fileSize={activeFile.size}
                    />
                  )}
                </div>
              </>
            )}
          </section>

          {/* RIGHT PANEL: SEO Suite & Privacy Shield (col-span-4) */}
          <aside className="lg:col-span-4 flex flex-col gap-4">
            {activeFile && (
              <>
                {/* 1. Quick Privacy Risk Card */}
                <PrivacyAuditor fileId={activeFile.id} />

                {/* 2. SEO Studio (Dynamic AI Layer) */}
                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-4">
                  <AIGeneratorPanel fileId={activeFile.id} />
                </div>

                {/* 3. Live Google Image & Social Simulator */}
                <SeoPreviewCard file={activeFile} />

                {/* 4. Google Image Sitemap XML Builder */}
                <SitemapExport />
              </>
            )}
          </aside>
        </main>
      )}
    </div>
  );
}
