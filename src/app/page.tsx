'use client';

import React, { useState, useEffect } from 'react';
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
import AppSidebar from '@/components/Navigation/AppSidebar';
import CommandPalette from '@/components/CommandPalette';
import Toasts from '@/components/Toasts';
import DashboardView from '@/components/Dashboard/DashboardView';
import MetadataCompareView from '@/components/Compare/MetadataCompareView';
import PresetsView from '@/components/Presets/PresetsView';
import BatchJobsView from '@/components/Jobs/BatchJobsView';
import { useMetaForgeStore } from '@/lib/store';
import { 
  FileText, 
  ShieldAlert, 
  Sparkles, 
  Binary, 
  Cpu, 
  Flame, 
  CheckCircle2, 
  Lock,
  Layers,
  ArrowLeft,
  ArrowRight,
  Shield,
  HelpCircle,
  X
} from 'lucide-react';

export default function MetaForgeStudio() {
  const { 
    files, 
    currentView,
    activeFileId, 
    setActiveFile,
    activeTab, 
    setActiveTab 
  } = useMetaForgeStore();

  // Mobile active section switcher (< 768px)
  const [mobileSection, setMobileSection] = useState<'canvas' | 'privacy' | 'seo' | 'queue'>('canvas');
  // Tablet active tab switcher (768px - 1199px)
  const [tabletInspectorTab, setTabletInspectorTab] = useState<'metadata' | 'privacy' | 'seo' | 'workflow' | 'hex'>('metadata');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const activeIndex = files.findIndex((f) => f.id === activeFileId);
  const activeFile = files[activeIndex] || files[0];

  // Keyboard navigation across images
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ']') {
        if (files.length > 1) {
          const nextIndex = (activeIndex + 1) % files.length;
          setActiveFile(files[nextIndex].id);
        }
      } else if (e.key === 'ArrowLeft' || e.key === '[') {
        if (files.length > 1) {
          const prevIndex = (activeIndex - 1 + files.length) % files.length;
          setActiveFile(files[prevIndex].id);
        }
      } else if (e.key === '?') {
        setShowKeyboardHelp((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowKeyboardHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, activeIndex, setActiveFile]);

  return (
    <div className="min-h-dvh flex flex-col bg-neutral-950 text-neutral-100 font-sans pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <Header />
      <CommandPalette />
      <Toasts />
      <AISettingsModal />

      {/* Keyboard Shortcuts Helper Modal (Bottom Sheet on mobile, modal on desktop) */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl flex flex-col gap-4 pb-safe sm:pb-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg touch-target sm:min-h-0 sm:min-w-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Next Image</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[11px]">
                  → or ]
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Previous Image</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[11px]">
                  ← or [
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Command Runner</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[11px]">
                  ⌘K or /
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-neutral-400">Close Dialogs</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[11px]">
                  Esc
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main App Container with Sidebar & View Switcher */}
      <div className="flex-1 flex flex-row min-w-0">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'compare' && <MetadataCompareView />}
          {currentView === 'presets' && <PresetsView />}
          {currentView === 'jobs' && <BatchJobsView />}
          
          {currentView === 'studio' && (
            files.length === 0 ? (
              /* Empty / Hero State (Fully responsive for mobile, tablet, and wide desktop) */
              <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 max-w-4xl mx-auto w-full">
                <div className="flex flex-col items-center text-center gap-4 mb-6 sm:mb-8">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 p-0.5 shadow-2xl shadow-purple-600/30">
                    <div className="w-full h-full bg-neutral-950 rounded-[22px] flex items-center justify-center">
                      <Flame className="w-8 h-8 sm:w-9 sm:h-9 text-amber-400" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase">
                      METAFORGE
                    </h1>
                    <p className="text-sm sm:text-lg font-medium text-neutral-300">
                      Intelligent Image Metadata Studio &amp; Privacy Sanitizer
                    </p>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto leading-relaxed">
                      Inspect deep EXIF/IPTC/XMP headers, purge physical GPS leaks, detect ComfyUI &amp; SD prompt parameters, and auto-enrich SEO via Google Gemini.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] sm:text-xs text-neutral-300">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>100% In-Browser WASM</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] sm:text-xs text-neutral-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Zero Server Uploads</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] sm:text-xs text-neutral-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Gemini Vision BYOK</span>
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  <Dropzone />
                </div>

                {/* Feature Highlights Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8 w-full">
                  <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Privacy Shield</h3>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Scan and strip exact GPS coordinates, camera serial numbers, and hostnames before sharing online.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Workflow Decoder</h3>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Extract ComfyUI node graphs, Stable Diffusion prompts, seeds, and samplers embedded in PNG text chunks.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Visual SEO &amp; Sitemaps</h3>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Auto-generate accessible alt texts, search headlines, and export XML image sitemaps for Google Search.
                    </p>
                  </div>
                </div>
              </main>
            ) : (
              /* WORKSTATION LAYOUT: 3 DISTINCT INTENTIONAL EXPERIENCES (Mobile, Tablet, Desktop) */
              <main className="flex-1 max-w-[1850px] w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
                
                {/* 1. MOBILE EXPERIENCE CONTROLS (< 768px / md) */}
                <div className="md:hidden flex items-center justify-between gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-2xl sticky top-16 z-30 shadow-md">
                  <button
                    onClick={() => setMobileSection('canvas')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition touch-target ${
                      mobileSection === 'canvas'
                        ? 'bg-neutral-800 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Inspector</span>
                  </button>

                  <button
                    onClick={() => setMobileSection('privacy')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition touch-target ${
                      mobileSection === 'privacy'
                        ? 'bg-neutral-800 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-rose-400" />
                    <span>Privacy</span>
                    {activeFile?.privacyReport.hasGps && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>

                  <button
                    onClick={() => setMobileSection('seo')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition touch-target ${
                      mobileSection === 'seo'
                        ? 'bg-neutral-800 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>SEO</span>
                  </button>

                  <button
                    onClick={() => setMobileSection('queue')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition touch-target ${
                      mobileSection === 'queue'
                        ? 'bg-neutral-800 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Queue ({files.length})</span>
                  </button>
                </div>

                {/* Desktop & Tablet Top Bar: Active File Navigation and Shortcut Hints */}
                <div className="hidden md:flex items-center justify-between text-xs text-neutral-500 px-1 py-1 border-b border-neutral-850">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-400">Active File:</span>
                    <span className="font-mono text-neutral-200 font-semibold truncate max-w-xs">{activeFile?.name}</span>
                    <span className="text-neutral-500 font-mono">({activeIndex + 1} of {files.length})</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const prevIdx = (activeIndex - 1 + files.length) % files.length;
                          setActiveFile(files[prevIdx].id);
                        }}
                        className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:text-white hover:bg-neutral-800 transition"
                        title="Previous image ([)"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const nextIdx = (activeIndex + 1) % files.length;
                          setActiveFile(files[nextIdx].id);
                        }}
                        className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:text-white hover:bg-neutral-800 transition"
                        title="Next image (])"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => setShowKeyboardHelp(true)}
                      className="hover:text-neutral-300 flex items-center gap-1 font-mono text-[11px] text-neutral-400 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Shortcuts [?]</span>
                    </button>
                  </div>
                </div>

                {/* 2. MOBILE LAYOUT (< 768px): Single active column with touch-optimized components */}
                <div className="md:hidden flex flex-col gap-4">
                  {mobileSection === 'queue' && (
                    <div className="flex flex-col gap-4">
                      <Dropzone />
                      <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3">
                        <ImageGallery />
                      </div>
                    </div>
                  )}

                  {mobileSection === 'canvas' && activeFile && (
                    <div className="flex flex-col gap-4">
                      <ImageCanvasPreview file={activeFile} />

                      {/* Sub-Tabs for Mobile Inspector */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
                          <button
                            onClick={() => setActiveTab('inspector')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition touch-target ${
                              activeTab === 'inspector' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                            Metadata
                          </button>
                          <button
                            onClick={() => setActiveTab('privacy')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition touch-target ${
                              activeTab === 'privacy' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            Privacy
                          </button>
                          <button
                            onClick={() => setActiveTab('workflow')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition touch-target ${
                              activeTab === 'workflow' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <Cpu className="w-3.5 h-3.5 text-purple-400" />
                            Workflow
                          </button>
                          <button
                            onClick={() => setActiveTab('hex')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition touch-target ${
                              activeTab === 'hex' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <Binary className="w-3.5 h-3.5 text-amber-400" />
                            Hex
                          </button>
                        </div>

                        {activeTab === 'inspector' && <MetadataExplorer fileId={activeFile.id} />}
                        {activeTab === 'privacy' && <PrivacyAuditor fileId={activeFile.id} />}
                        {activeTab === 'workflow' && <AIWorkflowDetect workflow={activeFile.aiWorkflow} />}
                        {activeTab === 'hex' && (
                          <RawHexViewer
                            hexData={activeFile.rawHexSample}
                            fileName={activeFile.name}
                            fileSize={activeFile.size}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {mobileSection === 'privacy' && activeFile && (
                    <PrivacyAuditor fileId={activeFile.id} />
                  )}

                  {mobileSection === 'seo' && activeFile && (
                    <div className="flex flex-col gap-4">
                      <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-4">
                        <AIGeneratorPanel fileId={activeFile.id} />
                      </div>
                      <SeoPreviewCard file={activeFile} />
                      <SitemapExport />
                    </div>
                  )}
                </div>

                {/* 3. TABLET LAYOUT (768px - 1199px / md to xl): 2-Column Split Workstation */}
                <div className="hidden md:grid xl:hidden grid-cols-12 gap-4">
                  {/* Left Column (5 cols): Filmstrip & Interactive Canvas Preview */}
                  <div className="col-span-5 flex flex-col gap-4">
                    <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col gap-3">
                      <ImageGallery />
                    </div>
                    {activeFile && (
                      <ImageCanvasPreview file={activeFile} />
                    )}
                  </div>

                  {/* Right Column (7 cols): Tabbed Unified Inspector */}
                  <div className="col-span-7 flex flex-col gap-4">
                    {/* Tablet Subtabs */}
                    <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-semibold overflow-x-auto">
                      <button
                        onClick={() => setTabletInspectorTab('metadata')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap ${
                          tabletInspectorTab === 'metadata' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Metadata</span>
                      </button>

                      <button
                        onClick={() => setTabletInspectorTab('privacy')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap ${
                          tabletInspectorTab === 'privacy' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 text-rose-400" />
                        <span>Privacy</span>
                        {activeFile?.privacyReport.hasGps && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </button>

                      <button
                        onClick={() => setTabletInspectorTab('seo')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap ${
                          tabletInspectorTab === 'seo' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>AI / SEO</span>
                      </button>

                      <button
                        onClick={() => setTabletInspectorTab('workflow')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap ${
                          tabletInspectorTab === 'workflow' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Cpu className="w-3.5 h-3.5 text-purple-400" />
                        <span>AI Graph</span>
                      </button>

                      <button
                        onClick={() => setTabletInspectorTab('hex')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap ${
                          tabletInspectorTab === 'hex' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Binary className="w-3.5 h-3.5 text-amber-400" />
                        <span>Hex</span>
                      </button>
                    </div>

                    {/* Tablet Tab Panels */}
                    {activeFile && (
                      <div className="flex flex-col gap-4">
                        {tabletInspectorTab === 'metadata' && (
                          <MetadataExplorer fileId={activeFile.id} />
                        )}

                        {tabletInspectorTab === 'privacy' && (
                          <PrivacyAuditor fileId={activeFile.id} />
                        )}

                        {tabletInspectorTab === 'seo' && (
                          <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-4">
                              <AIGeneratorPanel fileId={activeFile.id} />
                            </div>
                            <SeoPreviewCard file={activeFile} />
                            <SitemapExport />
                          </div>
                        )}

                        {tabletInspectorTab === 'workflow' && (
                          <AIWorkflowDetect workflow={activeFile.aiWorkflow} />
                        )}

                        {tabletInspectorTab === 'hex' && (
                          <RawHexViewer
                            hexData={activeFile.rawHexSample}
                            fileName={activeFile.name}
                            fileSize={activeFile.size}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. DESKTOP EXPERIENCE (≥ 1200px / xl / 2xl): 3-Column Studio Workstation */}
                <div className="hidden xl:grid grid-cols-12 gap-5">
                  {/* COLUMN 1: File Browser & Batch Drawer (col-span-3) */}
                  <aside className="col-span-3 flex flex-col gap-4">
                    <Dropzone />
                    <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col gap-3">
                      <ImageGallery />
                    </div>
                  </aside>

                  {/* COLUMN 2: Interactive Canvas & Dynamic Inspector (col-span-5) */}
                  <section className="col-span-5 flex flex-col gap-4">
                    {activeFile && (
                      <>
                        <ImageCanvasPreview file={activeFile} />

                        {/* Sub-Tabs for Center Inspector */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
                            <button
                              onClick={() => setActiveTab('inspector')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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

                  {/* COLUMN 3: Privacy & SEO Views (col-span-4) */}
                  <aside className="col-span-4 flex flex-col gap-4">
                    {activeFile && (
                      <>
                        {/* Privacy Auditor */}
                        <PrivacyAuditor fileId={activeFile.id} />

                        {/* SEO Studio & Simulators */}
                        <div className="flex flex-col gap-4">
                          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-4">
                            <AIGeneratorPanel fileId={activeFile.id} />
                          </div>

                          <SeoPreviewCard file={activeFile} />

                          <SitemapExport />
                        </div>
                      </>
                    )}
                  </aside>
                </div>
              </main>
            )
          )}
        </div>
      </div>
    </div>
  );
}
