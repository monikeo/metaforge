'use client';

import ModalOverlay from '@/components/ModalOverlay';

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
import ErrorBoundary from '@/components/ErrorBoundary';
import DashboardView from '@/components/Dashboard/DashboardView';
import MetadataCompareView from '@/components/Compare/MetadataCompareView';
import PresetsView from '@/components/Presets/PresetsView';
import BatchJobsView from '@/components/Jobs/BatchJobsView';
import { useMetaForge } from '@/lib/store';
import { useLayoutMode } from '@/lib/use-layout-mode';
import { filesFromDataTransfer, importImageFiles, isImageFile, namePastedImages } from '@/lib/import-files';
import { firstText } from '@/lib/metadata-writer';
import BrandMark from '@/components/BrandMark';
import {
  FileText,
  ShieldAlert,
  Sparkles,
  Binary,
  Cpu,
  CheckCircle2,
  Lock,
  Layers,
  ArrowLeft,
  ArrowRight,
  Shield,
  HelpCircle,
  X,
  Globe,
  Tag,
  Images,
  ChevronRight
} from 'lucide-react';

const VIEW_TITLES: Record<string, string> = { studio: 'Studio', dashboard: 'Dashboard', compare: 'Compare', presets: 'Presets', jobs: 'Batch Queue' };

export default function MetaForgeStudio() {
  const { files, currentView, activeFileId, setActiveFile, activeTab, setActiveTab } =
    useMetaForge('files', 'currentView', 'activeFileId', 'setActiveFile', 'activeTab', 'setActiveTab');
  const layout = useLayoutMode();

  // Mobile dedicated section switcher (< 768px)
  const [mobileSection, setMobileSection] = useState<'canvas' | 'tags' | 'privacy' | 'seo' | 'queue'>('canvas');
  // Tablet active tab switcher (768px - 1199px)
  const [tabletInspectorTab, setTabletInspectorTab] = useState<'metadata' | 'privacy' | 'seo' | 'workflow' | 'hex'>('metadata');
  // Desktop right-column intelligence panel switcher (≥ 1200px)
  const [desktopStudioTab, setDesktopStudioTab] = useState<'seo' | 'privacy' | 'sitemap'>('seo');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const activeIndex = Math.max(0, files.findIndex((f) => f.id === activeFileId));
  const activeFile = files[activeIndex];

  // Browser tabs and history entries should say which workspace they show.
  useEffect(() => {
    document.title = `${VIEW_TITLES[currentView] ?? 'Studio'} — MetaForge`;
  }, [currentView]);

  // Paste screenshots or copied images anywhere in the studio (outside text fields and dialogs).
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('[aria-modal="true"]')) return;
      const images = Array.from(event.clipboardData?.files || []).filter(isImageFile);
      if (!images.length) return;
      event.preventDefault();
      void importImageFiles(namePastedImages(images));
    };
    // Files dropped outside the drop zone would otherwise make the browser leave the page and discard the session.
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types || []).includes('Files');
    const handleDragOver = (event: DragEvent) => { if (hasFiles(event)) event.preventDefault(); };
    const handleDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      const handledByDropzone = event.defaultPrevented;
      event.preventDefault();
      if (handledByDropzone || document.querySelector('[aria-modal="true"]')) return;
      void filesFromDataTransfer(event.dataTransfer).then(importImageFiles);
    };
    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Keyboard navigation across images
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[aria-modal="true"]') || (e.target as HTMLElement)?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes((e.target as HTMLElement)?.tagName) || currentView !== 'studio') {
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
  }, [files, activeIndex, setActiveFile, currentView]);

  return (
    <div className="min-h-dvh md:h-dvh md:min-h-0 md:overflow-hidden flex flex-col bg-neutral-950 text-neutral-100 font-sans pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <Header />
      <CommandPalette />
      <AISettingsModal />

      {/* Keyboard Shortcuts Helper Modal (Bottom Sheet on mobile, modal on desktop) */}
      {showKeyboardHelp && (
        <ModalOverlay onClose={() => setShowKeyboardHelp(false)} label="Keyboard shortcuts" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl flex flex-col gap-4 pb-safe sm:pb-5 animate-slide-up">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Keyboard Shortcuts</h3>
              </div>
              <button
                aria-label="Close keyboard shortcuts"
                onClick={() => setShowKeyboardHelp(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg touch-press"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Next Image</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[11px]">
                  &rarr; or ]
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Previous Image</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[11px]">
                  &larr; or [
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Command Runner</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[11px]">
                  &#8984;K or /
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
        </ModalOverlay>
      )}

      {/* Main App Container with Sidebar & View Switcher */}
      <div className="flex-1 min-h-0 flex flex-row min-w-0">
        <AppSidebar />

        {/* The one main landmark. The skip link in the root layout targets it. */}
        <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 flex flex-col min-w-0 outline-none">
          {currentView === 'dashboard' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ErrorBoundary fallbackTitle="Metadata Analytics Dashboard">
                <DashboardView />
              </ErrorBoundary>
            </div>
          )}
          {currentView === 'compare' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ErrorBoundary fallbackTitle="Metadata Comparator Studio">
                <MetadataCompareView />
              </ErrorBoundary>
            </div>
          )}
          {currentView === 'presets' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ErrorBoundary fallbackTitle="Presets Manager Studio">
                <PresetsView />
              </ErrorBoundary>
            </div>
          )}
          {currentView === 'jobs' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ErrorBoundary fallbackTitle="Batch Automation Queue">
                <BatchJobsView />
              </ErrorBoundary>
            </div>
          )}
          
          {currentView === 'studio' && (
            files.length === 0 ? (
              /* Empty / Hero State (Fully responsive for mobile, tablet, and wide desktop) */
              <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-10 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar">
                {/* mt-auto / mb-auto centre the content when there is room. justify-center would clip the top when it overflows. */}
                <div className="flex flex-col items-center text-center gap-4 mt-auto mb-6 sm:mb-8 animate-fade-in">
                  <BrandMark className="w-14 h-14 sm:w-16 sm:h-16" />

                  <div className="flex flex-col gap-1.5">
                    <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white uppercase">
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
                      <span>Local Image Processing</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] sm:text-xs text-neutral-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Zero Server Uploads</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] sm:text-xs text-neutral-300">
                      <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Gemini Vision BYOK</span>
                    </div>
                  </div>
                </div>

                <div className="w-full animate-slide-up">
                  <Dropzone />
                </div>

                {/* Feature Highlights Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8 mb-auto w-full">
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
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Visual SEO &amp; Sitemaps</h3>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Auto-generate accessible alt texts, search headlines, and export XML image sitemaps for Google Search.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* WORKSTATION LAYOUT: 3 PURPOSE-BUILT RESPONSIVE EXPERIENCES */
              <div className="flex-1 min-h-0 flex flex-col min-w-0">
                <h1 className="sr-only">Metadata Studio</h1>

                {/* =========================================================================
                    1. NATIVE MOBILE EXPERIENCE (< 768px / md)
                    Purpose-built native phone view with dedicated tabs & swipe gestures
                   ========================================================================= */}
                {layout === 'mobile' && (
                <div className="md:hidden flex flex-col flex-1 min-w-0 p-3 gap-3">
                  {/* Mobile Compact File Bar */}
                  <div className="flex items-center justify-between p-2 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => {
                          const prevIdx = (activeIndex - 1 + files.length) % files.length;
                          setActiveFile(files[prevIdx].id);
                        }}
                        className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white touch-press"
                        title="Previous photo"
                        aria-label="Previous image"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate max-w-[140px] xs:max-w-[190px]">
                          {activeFile?.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {activeIndex + 1} of {files.length} • {(activeFile.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeFile?.privacyReport.hasGps && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          GPS LEAK
                        </span>
                      )}
                      <button
                        onClick={() => {
                          const nextIdx = (activeIndex + 1) % files.length;
                          setActiveFile(files[nextIdx].id);
                        }}
                        className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white touch-press"
                        title="Next photo"
                        aria-label="Next image"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Section switcher: five equal columns, so every section stays reachable without sideways scrolling. */}
                  <div role="group" aria-label="Studio sections" className="grid grid-cols-5 gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-md">
                    {([
                      ['canvas', 'Canvas', Layers],
                      ['tags', 'Tags', Tag],
                      ['privacy', 'Privacy', Shield],
                      ['seo', 'SEO', Sparkles],
                      ['queue', 'Queue', Images]
                    ] as const).map(([id, label, Icon]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={mobileSection === id}
                        onClick={() => setMobileSection(id)}
                        className={`relative min-w-0 min-h-12 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[11px] font-bold transition touch-press ${
                          mobileSection === id
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${mobileSection === id ? 'text-purple-400' : ''}`} aria-hidden="true" />
                        <span>{label}</span>
                        {id === 'privacy' && activeFile?.privacyReport.hasGps && (
                          <span aria-hidden="true" className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-rose-400 ring-2 ring-neutral-900" />
                        )}
                        {id === 'queue' && (
                          <span className={`absolute top-0.5 right-1 px-1 rounded-full text-[10px] leading-4 font-mono ${mobileSection === id ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-200'}`}>
                            {files.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Mobile Body Content Area */}
                  <div className="flex-1 flex flex-col gap-3">
                    {mobileSection === 'canvas' && activeFile && (
                      <div className="flex flex-col gap-3 animate-fade-in">
                        <ErrorBoundary fallbackTitle="Mobile Canvas Preview">
                          <ImageCanvasPreview key={activeFile.id} file={activeFile} />
                        </ErrorBoundary>

                        {/* Quick Metadata Summary Pill Card */}
                        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs font-bold text-white border-b border-neutral-800/80 pb-2">
                            <span>Camera &amp; Attribution</span>
                            <button
                              onClick={() => setMobileSection('tags')}
                              className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                            >
                              View All Tags <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="flex flex-col">
                              <span className="text-neutral-500">Camera</span>
                              <span className="text-neutral-200 font-mono truncate">
                                {activeFile.rawMetadata?.exif?.Model || 'Unknown Device'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-neutral-500">Lens</span>
                              <span className="text-neutral-200 font-mono truncate">
                                {activeFile.rawMetadata?.exif?.LensModel || 'Standard'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-neutral-500">Copyright</span>
                              <span className="text-neutral-200 truncate">
                                {firstText(activeFile.rawMetadata?.exif?.Copyright, activeFile.rawMetadata?.iptc?.CopyrightNotice, activeFile.rawMetadata?.xmp?.rights) || 'None set'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-neutral-500">Threat Index</span>
                              <span className={`font-bold ${
                                activeFile.privacyReport.riskLevel === 'HIGH' ? 'text-rose-400' : 'text-emerald-400'
                              }`}>
                                {activeFile.privacyReport.score} / 100
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {mobileSection === 'tags' && activeFile && (
                      <div className="flex flex-col gap-3 animate-fade-in">
                        <ErrorBoundary fallbackTitle="Metadata Explorer">
                          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
                            <MetadataExplorer key={activeFile.id} fileId={activeFile.id} />
                          </div>
                        </ErrorBoundary>
                      </div>
                    )}

                    {mobileSection === 'privacy' && activeFile && (
                      <div className="flex flex-col gap-3 animate-fade-in">
                        <ErrorBoundary fallbackTitle="Privacy Auditor">
                          <PrivacyAuditor fileId={activeFile.id} />
                        </ErrorBoundary>
                      </div>
                    )}

                    {mobileSection === 'seo' && activeFile && (
                      <div className="flex flex-col gap-4 animate-fade-in">
                        <ErrorBoundary fallbackTitle="AI SEO Studio">
                          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-4">
                            <AIGeneratorPanel key={activeFile.id} fileId={activeFile.id} />
                          </div>
                          <SeoPreviewCard file={activeFile} />
                          <SitemapExport />
                        </ErrorBoundary>
                      </div>
                    )}

                    {mobileSection === 'queue' && (
                      <div className="flex flex-col gap-4 animate-fade-in">
                        <Dropzone />
                        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3">
                          <ImageGallery />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
                )}

                {/* =========================================================================
                    2. TABLET EXPERIENCE (768px - 1279px / md to xl)
                    2-Column Split Workstation with Independent Panes
                   ========================================================================= */}
                {layout === 'tablet' && (
                <div className="hidden md:flex xl:hidden flex-1 min-w-0 p-4 gap-4 min-h-0 overflow-hidden">
                  {/* Left Column (5 cols, 42%): Filmstrip & Canvas Preview */}
                  <div className="w-[42%] min-w-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
                    {activeFile && (
                      <ErrorBoundary fallbackTitle="Tablet Canvas Preview">
                        <ImageCanvasPreview key={activeFile.id} file={activeFile} />
                      </ErrorBoundary>
                    )}
                    <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col gap-3">
                      <ImageGallery />
                    </div>
                    <Dropzone />
                  </div>

                  {/* Right Column (7 cols, 58%): Tabbed Unified Inspector */}
                  <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                    {/* Tablet Subtabs */}
                    <div className="shrink-0 sticky top-0 z-20 flex items-center gap-1 p-1 bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl text-xs font-semibold overflow-x-auto shadow-md">
                      <button
                        type="button"
                        aria-pressed={tabletInspectorTab === 'metadata'}
                        onClick={() => setTabletInspectorTab('metadata')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap touch-press ${
                          tabletInspectorTab === 'metadata' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Metadata</span>
                      </button>

                      <button
                        type="button"
                        aria-pressed={tabletInspectorTab === 'privacy'}
                        onClick={() => setTabletInspectorTab('privacy')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap touch-press ${
                          tabletInspectorTab === 'privacy' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Privacy</span>
                        {activeFile?.privacyReport.hasGps && (
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                        )}
                      </button>

                      <button
                        type="button"
                        aria-pressed={tabletInspectorTab === 'seo'}
                        onClick={() => setTabletInspectorTab('seo')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap touch-press ${
                          tabletInspectorTab === 'seo' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                        <span>AI / SEO</span>
                      </button>

                      <button
                        type="button"
                        aria-pressed={tabletInspectorTab === 'workflow'}
                        onClick={() => setTabletInspectorTab('workflow')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap touch-press ${
                          tabletInspectorTab === 'workflow' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Cpu className="w-3.5 h-3.5 text-neutral-400" />
                        <span>AI Graph</span>
                      </button>

                      <button
                        type="button"
                        aria-pressed={tabletInspectorTab === 'hex'}
                        onClick={() => setTabletInspectorTab('hex')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap touch-press ${
                          tabletInspectorTab === 'hex' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Binary className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Hex</span>
                      </button>
                    </div>

                    {/* Tablet Tab Panels */}
                    {activeFile && (
                      <div className="flex flex-col gap-4 animate-fade-in">
                        {tabletInspectorTab === 'metadata' && (
                          <ErrorBoundary fallbackTitle="Metadata Explorer">
                            <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800">
                              <MetadataExplorer key={activeFile.id} fileId={activeFile.id} />
                            </div>
                          </ErrorBoundary>
                        )}

                        {tabletInspectorTab === 'privacy' && (
                          <ErrorBoundary fallbackTitle="Privacy Auditor">
                            <PrivacyAuditor fileId={activeFile.id} />
                          </ErrorBoundary>
                        )}

                        {tabletInspectorTab === 'seo' && (
                          <ErrorBoundary fallbackTitle="AI SEO Studio">
                            <div className="flex flex-col gap-4">
                              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-4">
                                <AIGeneratorPanel key={activeFile.id} fileId={activeFile.id} />
                              </div>
                              <SeoPreviewCard file={activeFile} />
                              <SitemapExport />
                            </div>
                          </ErrorBoundary>
                        )}

                        {tabletInspectorTab === 'workflow' && (
                          <ErrorBoundary fallbackTitle="AI Workflow Graph">
                            <AIWorkflowDetect workflow={activeFile.aiWorkflow} />
                          </ErrorBoundary>
                        )}

                        {tabletInspectorTab === 'hex' && (
                          <ErrorBoundary fallbackTitle="Raw Hex Stream">
                            <RawHexViewer
                              hexData={activeFile.rawHexSample}
                              fileName={activeFile.name}
                              fileSize={activeFile.size}
                            />
                          </ErrorBoundary>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* =========================================================================
                    3. NATIVE DESKTOP EXPERIENCE (≥ 1280px / xl / 2xl)
                    3-Column Workstation Layout with Independent Panes & No Infinite Scroll
                   ========================================================================= */}
                {layout === 'desktop' && (
                <div className="hidden xl:flex flex-col flex-1 min-w-0 p-4 gap-3 min-h-0 overflow-hidden">
                  
                  {/* Desktop Workstation Toolbar */}
                  <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-neutral-900/60 border border-neutral-800/80 rounded-xl shadow-xs shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-neutral-400">Active Asset:</span>
                      <span className="font-mono text-white font-bold truncate max-w-sm">
                        {activeFile?.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {activeIndex + 1} / {files.length}
                      </span>
                      {activeFile?.privacyReport.hasGps && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          GPS Detected
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const prevIdx = (activeIndex - 1 + files.length) % files.length;
                            setActiveFile(files[prevIdx].id);
                          }}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition touch-press"
                          title="Previous image ([)"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            const nextIdx = (activeIndex + 1) % files.length;
                            setActiveFile(files[nextIdx].id);
                          }}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition touch-press"
                          title="Next image (])"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => setShowKeyboardHelp(true)}
                        className="hover:text-white hover:bg-neutral-800 flex items-center gap-1 min-h-8 px-2 rounded-lg font-mono text-[11px] text-neutral-400 cursor-pointer touch-press"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                        <span>Shortcuts [?]</span>
                      </button>
                    </div>
                  </div>

                  {/* 3-PANE SPLIT WORKSTATION GRID */}
                  <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                    
                    {/* COLUMN 1: File Queue & Ingestion (col-span-3, 25%) */}
                    <section aria-label="Image queue" className="col-span-3 min-w-0 flex flex-col gap-3 min-h-0">
                      <Dropzone />
                      <div className="flex-1 min-h-0 p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col gap-3">
                        <ImageGallery fill />
                      </div>
                    </section>

                    {/* COLUMN 2: Interactive Canvas & Deep Tag Inspector (col-span-5, 41.6%) */}
                    <section className="col-span-5 min-w-0 flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                      {activeFile && (
                        <>
                          <ErrorBoundary fallbackTitle="Desktop Canvas Preview">
                            <ImageCanvasPreview key={activeFile.id} file={activeFile} />
                          </ErrorBoundary>

                          {/* Sub-Tabs for Center Inspector */}
                          <div className="flex flex-col gap-2.5">
                            <div className="shrink-0 sticky top-0 z-10 flex items-center gap-1 p-1 overflow-x-auto rounded-xl bg-neutral-900/95 backdrop-blur-md border border-neutral-800 shadow-md">
                              <button
                                type="button"
                                aria-pressed={activeTab === 'inspector'}
                                onClick={() => setActiveTab('inspector')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer touch-press ${
                                  activeTab === 'inspector'
                                    ? 'bg-neutral-800 text-white shadow-xs'
                                    : 'text-neutral-400 hover:text-neutral-200'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                                Metadata Explorer
                              </button>

                              <button
                                type="button"
                                aria-pressed={activeTab === 'workflow'}
                                onClick={() => setActiveTab('workflow')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer touch-press ${
                                  activeTab === 'workflow'
                                    ? 'bg-neutral-800 text-white shadow-xs'
                                    : 'text-neutral-400 hover:text-neutral-200'
                                }`}
                              >
                                <Cpu className="w-3.5 h-3.5 text-neutral-400" />
                                AI Workflow
                                {activeFile.aiWorkflow.detected && (
                                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                                )}
                              </button>

                              <button
                                type="button"
                                aria-pressed={activeTab === 'hex'}
                                onClick={() => setActiveTab('hex')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer touch-press ${
                                  activeTab === 'hex'
                                    ? 'bg-neutral-800 text-white shadow-xs'
                                    : 'text-neutral-400 hover:text-neutral-200'
                                }`}
                              >
                                <Binary className="w-3.5 h-3.5 text-neutral-400" />
                                Raw Hex
                              </button>
                            </div>

                            {/* Active Tab View */}
                            <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 animate-fade-in">
                              {activeTab === 'inspector' && (
                                <ErrorBoundary fallbackTitle="Metadata Explorer">
                                  <MetadataExplorer key={activeFile.id} fileId={activeFile.id} />
                                </ErrorBoundary>
                              )}

                              {activeTab === 'workflow' && (
                                <ErrorBoundary fallbackTitle="AI Workflow Graph">
                                  <AIWorkflowDetect workflow={activeFile.aiWorkflow} />
                                </ErrorBoundary>
                              )}

                              {activeTab === 'hex' && (
                                <ErrorBoundary fallbackTitle="Raw Hex Stream">
                                  <RawHexViewer
                                    hexData={activeFile.rawHexSample}
                                    fileName={activeFile.name}
                                    fileSize={activeFile.size}
                                  />
                                </ErrorBoundary>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </section>

                    {/* COLUMN 3: Intelligence & Publishing Studio (col-span-4, 33.3%) */}
                    <section aria-label="Intelligence tools" className="col-span-4 min-w-0 flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                      {activeFile && (
                        <>
                          {/* Segmented Switcher for Studio Tools */}
                          <div className="shrink-0 sticky top-0 z-10 flex items-center gap-1 p-1 overflow-x-auto rounded-xl bg-neutral-900/95 backdrop-blur-md border border-neutral-800 shadow-md">
                            <button
                              type="button"
                              aria-pressed={desktopStudioTab === 'seo'}
                              onClick={() => setDesktopStudioTab('seo')}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold whitespace-nowrap transition touch-press ${
                                desktopStudioTab === 'seo'
                                  ? 'bg-neutral-800 text-white'
                                  : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 hidden 2xl:block" aria-hidden="true" />
                              <span>AI &amp; SEO</span>
                            </button>

                            <button
                              type="button"
                              aria-pressed={desktopStudioTab === 'privacy'}
                              onClick={() => setDesktopStudioTab('privacy')}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold whitespace-nowrap transition touch-press ${
                                desktopStudioTab === 'privacy'
                                  ? 'bg-neutral-800 text-white'
                                  : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5 hidden 2xl:block" aria-hidden="true" />
                              <span>Privacy Shield</span>
                              {activeFile.privacyReport.hasGps && (
                                <span className="w-2 h-2 rounded-full bg-rose-400" />
                              )}
                            </button>

                            <button
                              type="button"
                              aria-pressed={desktopStudioTab === 'sitemap'}
                              onClick={() => setDesktopStudioTab('sitemap')}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold whitespace-nowrap transition touch-press ${
                                desktopStudioTab === 'sitemap'
                                  ? 'bg-neutral-800 text-white'
                                  : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              <Globe className="w-3.5 h-3.5 hidden 2xl:block" aria-hidden="true" />
                              <span>Sitemaps</span>
                            </button>
                          </div>

                          {/* Desktop Tab Contents */}
                          <div className="flex flex-col gap-4 animate-fade-in">
                            {desktopStudioTab === 'seo' && (
                              <ErrorBoundary fallbackTitle="AI SEO Studio">
                                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-4">
                                  <AIGeneratorPanel key={activeFile.id} fileId={activeFile.id} />
                                </div>
                                <SeoPreviewCard file={activeFile} />
                              </ErrorBoundary>
                            )}

                            {desktopStudioTab === 'privacy' && (
                              <ErrorBoundary fallbackTitle="Privacy Auditor">
                                <PrivacyAuditor fileId={activeFile.id} />
                              </ErrorBoundary>
                            )}

                            {desktopStudioTab === 'sitemap' && (
                              <ErrorBoundary fallbackTitle="Sitemaps & SEO Cards">
                                <SitemapExport />
                                <SeoPreviewCard file={activeFile} />
                              </ErrorBoundary>
                            )}
                          </div>
                        </>
                      )}
                    </section>
                  </div>
                </div>
                )}
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}
