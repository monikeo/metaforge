'use client';

import React from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  UploadCloud, 
  Flame, 
  ArrowRight, 
  Layers, 
  MapPinOff, 
  GitCompare 
} from 'lucide-react';
import { createSampleExifJpeg, createSampleAiPng } from '@/lib/sample-data';

export default function DashboardView() {
  const { 
    files, 
    setCurrentView, 
    setActiveFile, 
    addFiles, 
    stripAllGps, 
    batchSanitizeForSocial 
  } = useMetaForgeStore();

  const total = files.length;
  const processed = files.filter((f) => f.isDirty).length;
  const seoOptimized = files.filter((f) => f.seoData?.title && f.seoData?.altText).length;
  const privacyCleaned = files.filter((f) => f.privacyReport.score === 0).length;
  const gpsExposed = files.filter((f) => f.privacyReport.hasGps).length;

  const handleLoadSampleDemo = async () => {
    const sample1 = await createSampleExifJpeg({
      title: 'Shibuya Crossing Night Street Photography',
      cameraMake: 'Sony',
      cameraModel: 'ILCE-7M4 (A7 IV)',
      lensModel: 'FE 35mm F1.4 GM',
      serialNumber: 'SN-7849102-JP',
      artist: 'Hiroshi Tanaka',
      copyright: '© 2026 Hiroshi Tanaka. All rights reserved.',
      latitude: 35.6595,
      longitude: 139.7005,
      color: '#0369a1'
    });
    const sample2 = await createSampleAiPng();
    await addFiles([sample1, sample2]);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Welcome SaaS Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-400" />
            MetaForge SaaS Operations Console
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Real-time metadata telemetry, SEO readiness index, and privacy sanitization pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {total === 0 && (
            <button
              onClick={handleLoadSampleDemo}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Load Sample Data
            </button>
          )}

          <button
            onClick={() => setCurrentView('studio')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg shadow-purple-600/20"
          >
            <Layers className="w-3.5 h-3.5" />
            Open Studio Workstation
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Total Images
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
            {total}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">In memory queue</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Processed
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">
            {processed}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">Locally modified</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> SEO Enriched
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-purple-400 mt-1">
            {seoOptimized}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">Alt text + title set</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Privacy Clean
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">
            {privacyCleaned}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">Zero location leak</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> GPS Exposed
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-400 mt-1">
            {gpsExposed}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">Action required</span>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Executive Quick Operations
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setCurrentView('studio')}
            className="p-4 rounded-2xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-left flex items-start justify-between transition group"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                Inspect Image Telemetry
              </span>
              <p className="text-[11px] text-neutral-400">View &amp; edit EXIF, IPTC, XMP trees</p>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition" />
          </button>

          <button
            onClick={() => stripAllGps()}
            disabled={gpsExposed === 0}
            className="p-4 rounded-2xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-left flex items-start justify-between transition group disabled:opacity-50"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <MapPinOff className="w-3.5 h-3.5 text-rose-400" />
                Purge All GPS ({gpsExposed})
              </span>
              <p className="text-[11px] text-neutral-400">Scrub location coordinates</p>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition" />
          </button>

          <button
            onClick={() => batchSanitizeForSocial()}
            disabled={total === 0}
            className="p-4 rounded-2xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-left flex items-start justify-between transition group disabled:opacity-50"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Social Media Sanitize
              </span>
              <p className="text-[11px] text-neutral-400">Strip device IDs, keep attribution</p>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition" />
          </button>

          <button
            onClick={() => setCurrentView('compare')}
            disabled={total < 2}
            className="p-4 rounded-2xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-left flex items-start justify-between transition group disabled:opacity-50"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5 text-amber-400" />
                Compare Metadata
              </span>
              <p className="text-[11px] text-neutral-400">Side-by-side diff comparison</p>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition" />
          </button>
        </div>
      </div>

      {/* Recent Files Table / Cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Active Image Inventory ({files.length})
          </h3>
          {files.length > 0 && (
            <button
              onClick={() => setCurrentView('studio')}
              className="text-xs text-purple-400 hover:underline"
            >
              Open in Studio &rarr;
            </button>
          )}
        </div>

        {files.length > 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden divide-y divide-neutral-800/60">
            {files.slice(0, 6).map((file) => (
              <div
                key={file.id}
                onClick={() => {
                  setActiveFile(file.id);
                  setCurrentView('studio');
                }}
                className="flex items-center justify-between p-3 sm:p-4 hover:bg-neutral-850/60 transition cursor-pointer gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-neutral-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.thumbnailUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {(file.size / 1024).toFixed(1)} KB • {file.width ? `${file.width}×${file.height} px` : file.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {file.privacyReport.hasGps ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      GPS Alert
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hidden sm:inline-block">
                      Clean
                    </span>
                  )}

                  {file.seoData?.title && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 hidden md:inline-block">
                      SEO Ready
                    </span>
                  )}

                  <ArrowRight className="w-4 h-4 text-neutral-600" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center flex flex-col items-center gap-3">
            <UploadCloud className="w-8 h-8 text-neutral-600" />
            <div>
              <p className="text-sm font-semibold text-neutral-300">No images currently in memory</p>
              <p className="text-xs text-neutral-500 mt-0.5">Import images or load sample demo photos to get started.</p>
            </div>
            <button
              onClick={handleLoadSampleDemo}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
            >
              Load Demo Images
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
