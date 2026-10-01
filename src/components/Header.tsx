'use client';

import React from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { 
  Sparkles, 
  ShieldCheck, 
  Settings2, 
  Download, 
  MapPinOff, 
  Flame, 
  Shield 
} from 'lucide-react';

export default function Header() {
  const { 
    files, 
    aiEnabled, 
    toggleAI, 
    setIsAiSettingsOpen, 
    stripAllGps, 
    batchSanitizeForSocial, 
    exportAllZip,
    isProcessing,
    processingMessage 
  } = useMetaForgeStore();

  const gpsCount = files.filter((f) => f.privacyReport.hasGps).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-purple-600/20 flex items-center justify-center">
            <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-wider text-white uppercase font-sans">
                METAFORGE
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium italic hidden sm:block">
              Inspect. Clean. Enrich. Publish.
            </p>
          </div>
        </div>

        {/* Center: Global Processing Status or Batch Quick Actions */}
        {isProcessing ? (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs animate-pulse">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>{processingMessage || 'Processing in-memory...'}</span>
          </div>
        ) : (
          files.length > 0 && (
            <div className="hidden lg:flex items-center gap-2">
              {gpsCount > 0 && (
                <button
                  onClick={stripAllGps}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 transition shadow-xs"
                >
                  <MapPinOff className="w-3.5 h-3.5" />
                  Strip All GPS ({gpsCount})
                </button>
              )}

              <button
                onClick={batchSanitizeForSocial}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-700 transition shadow-xs"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Sanitize All for Social
              </button>

              <button
                onClick={exportAllZip}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-700 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                Export ZIP ({files.length})
              </button>
            </div>
          )
        )}

        {/* Right: AI Toggle & Settings */}
        <div className="flex items-center gap-3 shrink-0">
          {/* AI Toggle Button */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 shadow-inner">
            <button
              onClick={toggleAI}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                aiEnabled
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI {aiEnabled ? 'ENABLED' : 'DISABLED'}</span>
            </button>

            <button
              onClick={() => setIsAiSettingsOpen(true)}
              title="AI BYOK Settings"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition ml-1"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Privacy badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Upload Guarantee</span>
          </div>

          {/* Source Repo */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition"
            title="GitHub Repository"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
