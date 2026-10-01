'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMetaForgeStore } from '@/lib/store';
import { 
  Sparkles, 
  ShieldCheck, 
  Settings2, 
  Download, 
  MapPinOff, 
  Flame, 
  Shield, 
  Layers, 
  Info, 
  BookOpen, 
  FileCode,
  Zap,
  X
} from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const [mobileQuickActionsOpen, setMobileQuickActionsOpen] = useState(false);

  const { 
    files, 
    setCurrentView, 
    aiEnabled, 
    toggleAI, 
    setIsAiSettingsOpen, 
    stripAllGps, 
    batchSanitizeForSocial, 
    exportAllZip, 
    exportAllMetadataJson, 
    isProcessing, 
    processingMessage 
  } = useMetaForgeStore();

  const gpsCount = files.filter((f) => f.privacyReport.hasGps).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md pt-safe">
      <div className="max-w-[1700px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Main Route Links */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-purple-600/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:scale-110 transition" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black tracking-wider text-white uppercase font-sans">
                  METAFORGE
                </span>
                <span className="hidden xs:inline px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium italic hidden lg:block leading-none mt-0.5">
                Inspect. Clean. Enrich. Publish.
              </p>
            </div>
          </Link>

          {/* Navigation Links for Studio, Docs, Guides */}
          <nav className="flex items-center gap-0.5 sm:gap-1 ml-1 sm:ml-3 bg-neutral-900/70 p-1 rounded-xl border border-neutral-800/80">
            <Link
              href="/"
              onClick={() => setCurrentView('studio')}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition touch-target sm:min-h-0 sm:min-w-0 ${
                pathname === '/'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Metadata Studio Workstation"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
              <BookOpen className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span className="hidden md:inline">Guide</span>
            </Link>
          </nav>
        </div>

        {/* Center: Global Processing Status or Batch Quick Actions */}
        {isProcessing ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs animate-pulse mx-auto">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span className="truncate max-w-[180px] sm:max-w-none">{processingMessage || 'Processing in-memory...'}</span>
          </div>
        ) : (
          pathname === '/' && files.length > 0 && (
            <>
              {/* Desktop Quick Actions (Visible on XL screens) */}
              <div className="hidden xl:flex items-center gap-2">
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
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  Sanitize All
                </button>

                <button
                  onClick={exportAllZip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-700 transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  Export ZIP ({files.length})
                </button>

                <button
                  onClick={exportAllMetadataJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-700 transition shadow-xs cursor-pointer active:scale-95"
                  title="Export all image metadata records as a unified JSON catalog"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  Export JSON ({files.length})
                </button>
              </div>

              {/* Mobile & Tablet Quick Actions Trigger Button */}
              <div className="xl:hidden flex items-center">
                <button
                  onClick={() => setMobileQuickActionsOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-850 transition touch-target"
                  title="Open batch actions menu"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Actions</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono">
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
              onClick={toggleAI}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer min-h-[36px] sm:min-h-0 ${
                aiEnabled
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">AI {aiEnabled ? 'ENABLED' : 'DISABLED'}</span>
              <span className="md:hidden">{aiEnabled ? 'ON' : 'OFF'}</span>
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
            <span>0 Bytes Upload</span>
          </div>

          {/* Source Repo */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="GitHub Repository"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Mobile/Tablet Quick Actions Sheet */}
      {mobileQuickActionsOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-4 shadow-2xl pb-safe">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Batch Quick Actions</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono">
                  {files.length} images
                </span>
              </div>
              <button
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
                <Shield className="w-4 h-4 text-indigo-400" />
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
                  <Download className="w-4 h-4 text-blue-400" />
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
                  <FileCode className="w-4 h-4 text-amber-400" />
                  Export Unified Metadata JSON Catalog
                </span>
                <span className="font-mono text-[11px] text-neutral-400">
                  .json
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
