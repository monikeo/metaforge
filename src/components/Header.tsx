'use client';

import ModalOverlay from '@/components/ModalOverlay';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMetaForge } from '@/lib/store';
import BrandMark from '@/components/BrandMark';
import {
  Sparkles,
  ShieldCheck,
  Settings2,
  Download,
  MapPinOff,
  Shield,
  Layers,
  Info,
  BookOpen,
  FileCode,
  FileSpreadsheet,
  Zap,
  X
} from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const [mobileQuickActionsOpen, setMobileQuickActionsOpen] = useState(false);

  const {
    files, currentView, setCurrentView, aiEnabled, toggleAI, setIsAiSettingsOpen, stripAllGps, batchSanitizeForSocial,
    exportAllZip, exportAllMetadataJson, exportMetadataCsv, isProcessing, processingMessage, batchJobs, cancelBatch
  } = useMetaForge('files', 'currentView', 'setCurrentView', 'aiEnabled', 'toggleAI', 'setIsAiSettingsOpen', 'stripAllGps', 'batchSanitizeForSocial',
    'exportAllZip', 'exportAllMetadataJson', 'exportMetadataCsv', 'isProcessing', 'processingMessage', 'batchJobs', 'cancelBatch');

  const gpsCount = files.filter((f) => f.privacyReport.hasGps).length;
  const batchRunning = batchJobs.some((job) => job.status === 'RUNNING');

  return (
    <header className="shrink-0 sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md pt-safe">
      <div className="max-w-[1700px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Main Route Links */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/" prefetch={false} onNavigate={(event) => { if (pathname === '/') { event.preventDefault(); setCurrentView('studio'); } }} className="flex items-center gap-1 min-[400px]:gap-2 sm:gap-2.5 group">
            <BrandMark className="w-7 h-7 min-[400px]:w-8 min-[400px]:h-8 sm:w-9 sm:h-9" />
            <span className="text-xs min-[400px]:text-sm sm:text-[15px] font-semibold tracking-[0.14em] text-white uppercase">
              METAFORGE
            </span>
          </Link>

          {/* Navigation Links for Studio, Docs, Guides */}
          <nav aria-label="Site" className="hidden md:flex items-center gap-0.5 sm:gap-1 ml-1 sm:ml-3 bg-neutral-900/70 p-1 rounded-xl border border-neutral-800/80">
            <Link
              href="/"
              prefetch={false}
              onNavigate={(event) => { if (pathname === '/') { event.preventDefault(); setCurrentView('studio'); } }}
              aria-current={pathname === '/' && currentView === 'studio' ? 'page' : undefined}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition touch-target sm:min-h-0 sm:min-w-0 ${
                pathname === '/' && currentView === 'studio'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Metadata Studio Workstation"
            >
              <Layers className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="hidden sm:inline">Studio</span>
            </Link>

            <Link
              href="/about"
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition touch-target sm:min-h-0 sm:min-w-0 ${
                pathname === '/about'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Architecture & Engine Docs"
            >
              <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="hidden md:inline">Docs</span>
            </Link>

            <Link
              href="/tutorial"
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition touch-target sm:min-h-0 sm:min-w-0 ${
                pathname === '/tutorial'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Interactive Feature Tutorials"
            >
              <BookOpen className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="hidden md:inline">Guide</span>
            </Link>
          </nav>
        </div>

        {/* Center: Global Processing Status or Batch Quick Actions */}
        {isProcessing ? (
          <div className="absolute top-full left-3 right-3 md:static flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs mx-auto min-w-0">
            <div className="w-2 h-2 shrink-0 rounded-full bg-purple-400 animate-ping" />
            <span role="status" className="truncate max-w-[180px] sm:max-w-none">{processingMessage || 'Processing in-memory...'}</span>
            {batchRunning && (
              <button
                type="button"
                onClick={cancelBatch}
                className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-900/70 hover:bg-rose-600 text-purple-100 border border-purple-400/40 transition"
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          pathname === '/' && files.length > 0 && (
            <>
              {/* Desktop Quick Actions (Visible on XL screens) */}
              <div className="hidden min-[1440px]:flex items-center gap-2">
                {gpsCount > 0 && (
                  <button
                    onClick={stripAllGps}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 transition shadow-xs cursor-pointer active:scale-95"
                  >
                    <MapPinOff className="w-3.5 h-3.5" />
                    Strip GPS ({gpsCount})
                  </button>
                )}

                <button
                  onClick={batchSanitizeForSocial}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-700 transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Shield className="w-3.5 h-3.5 text-neutral-400" />
                  Sanitize All
                </button>

                <button
                  onClick={() => exportAllZip()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-700 transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-400" />
                  Export ZIP ({files.length})
                </button>

                <button
                  onClick={exportAllMetadataJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-700 transition shadow-xs cursor-pointer active:scale-95"
                  title="Export all image metadata records as a unified JSON catalog"
                >
                  <FileCode className="w-3.5 h-3.5 text-neutral-400" />
                  Export JSON ({files.length})
                </button>

                <button
                  onClick={exportMetadataCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-700 transition shadow-xs cursor-pointer active:scale-95"
                  title="Export a spreadsheet of titles, captions, keywords, camera data and privacy findings"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  CSV
                </button>
              </div>

              {/* Mobile & Tablet Quick Actions Trigger Button */}
              <div className="min-[1440px]:hidden flex items-center">
                <button
                  onClick={() => setMobileQuickActionsOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-850 transition touch-target"
                  title="Open batch actions menu"
                >
                  <Zap className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="hidden sm:inline">Actions</span>
                  <span className="hidden min-[400px]:inline px-1.5 py-px rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono">
                    {files.length}
                  </span>
                </button>
              </div>
            </>
          )
        )}

        {/* Right: AI Toggle & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* AI Toggle Button */}
          <div className="flex items-center p-0.5 sm:p-1 rounded-xl bg-neutral-900 border border-neutral-800 shadow-inner">
            <button
              aria-pressed={aiEnabled}
              aria-label="Toggle AI assistant"
              onClick={toggleAI}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer min-h-[36px] sm:min-h-0 ${
                aiEnabled
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">AI {aiEnabled ? 'ENABLED' : 'DISABLED'}</span>
              <span className="hidden min-[360px]:inline md:hidden">{aiEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setIsAiSettingsOpen(true)}
              title="AI BYOK Settings"
              className="p-2 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
            >
              <Settings2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

          {/* Privacy badge (Large Screens) */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{aiEnabled ? 'AI opt-in' : 'Local processing'}</span>
          </div>


        </div>
      </div>

      {/* Mobile/Tablet Quick Actions Sheet */}
      {mobileQuickActionsOpen && (
        <ModalOverlay visibleWhen="(max-width: 1439px)" onClose={() => setMobileQuickActionsOpen(false)} label="Quick actions" className="min-[1440px]:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs p-3 animate-fade-in">
          <div className="w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-4 shadow-2xl pb-safe">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-neutral-400" />
                <h3 className="text-sm font-bold text-white">Batch Quick Actions</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono">
                  {files.length} images
                </span>
              </div>
              <button
                aria-label="Close quick actions"
                onClick={() => setMobileQuickActionsOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {gpsCount > 0 && (
                <button
                  onClick={() => {
                    stripAllGps();
                    setMobileQuickActionsOpen(false);
                  }}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 flex items-center justify-between touch-target"
                >
                  <span className="flex items-center gap-2">
                    <MapPinOff className="w-4 h-4 text-rose-400" />
                    Strip Physical GPS Coordinates
                  </span>
                  <span className="font-mono text-[11px] bg-rose-900/40 px-2 py-0.5 rounded">
                    {gpsCount} files
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  batchSanitizeForSocial();
                  setMobileQuickActionsOpen(false);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-neutral-950 hover:bg-neutral-850 text-neutral-200 border border-neutral-800 flex items-center gap-2 touch-target"
              >
                <Shield className="w-4 h-4 text-neutral-400" />
                Sanitize All for Social Media Sharing
              </button>

              <button
                onClick={() => {
                  exportAllZip();
                  setMobileQuickActionsOpen(false);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-neutral-950 hover:bg-neutral-850 text-neutral-200 border border-neutral-800 flex items-center justify-between touch-target"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-neutral-400" />
                  Download Complete ZIP Package
                </span>
                <span className="font-mono text-[11px] text-neutral-400">
                  {files.length} images
                </span>
              </button>

              <button
                onClick={() => {
                  exportAllMetadataJson();
                  setMobileQuickActionsOpen(false);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-neutral-950 hover:bg-neutral-850 text-neutral-200 border border-neutral-800 flex items-center justify-between touch-target"
              >
                <span className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-neutral-400" />
                  Export Unified Metadata JSON Catalog
                </span>
                <span className="font-mono text-[11px] text-neutral-400">
                  .json
                </span>
              </button>

              <button
                onClick={() => {
                  exportMetadataCsv();
                  setMobileQuickActionsOpen(false);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-neutral-950 hover:bg-neutral-850 text-neutral-200 border border-neutral-800 flex items-center justify-between touch-target"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Export Metadata Spreadsheet
                </span>
                <span className="font-mono text-[11px] text-neutral-400">
                  .csv
                </span>
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </header>
  );
}
