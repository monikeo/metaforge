'use client';

import React from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { 
  GitCompare, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function MetadataCompareView() {
  const { 
    files, 
    compareFileIds, 
    setCompareFile, 
    updateTag,
    addToast 
  } = useMetaForgeStore();

  const fileA = files.find((f) => f.id === compareFileIds[0]) || files[0];
  const fileB = files.find((f) => f.id === compareFileIds[1]) || files[1] || files[0];

  if (files.length < 2) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center max-w-md mx-auto min-h-[50vh]">
        <GitCompare className="w-12 h-12 text-neutral-600 mb-3" />
        <h3 className="text-base font-bold text-white">Compare Requires 2+ Images</h3>
        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
          Please upload or import at least two images into MetaForge to run side-by-side metadata comparisons and diff transfers.
        </p>
      </div>
    );
  }

  // Fields to compare
  const comparisonFields = [
    { key: 'Title', getA: () => fileA?.seoData?.title || fileA?.rawMetadata?.iptc?.Headline || '—', getB: () => fileB?.seoData?.title || fileB?.rawMetadata?.iptc?.Headline || '—' },
    { key: 'Alt Text / Caption', getA: () => fileA?.seoData?.altText || fileA?.seoData?.caption || '—', getB: () => fileB?.seoData?.altText || fileB?.seoData?.caption || '—' },
    { key: 'Keywords', getA: () => fileA?.seoData?.keywords?.join(', ') || '—', getB: () => fileB?.seoData?.keywords?.join(', ') || '—' },
    { key: 'Camera Make & Model', getA: () => `${fileA?.rawMetadata?.exif?.Make || ''} ${fileA?.rawMetadata?.exif?.Model || ''}`.trim() || '—', getB: () => `${fileB?.rawMetadata?.exif?.Make || ''} ${fileB?.rawMetadata?.exif?.Model || ''}`.trim() || '—' },
    { key: 'Lens Specification', getA: () => fileA?.rawMetadata?.exif?.LensModel || '—', getB: () => fileB?.rawMetadata?.exif?.LensModel || '—' },
    { key: 'Exposure / ISO / Aperture', getA: () => `ISO ${fileA?.rawMetadata?.exif?.ISOSpeedRatings || 'N/A'} • F/${fileA?.rawMetadata?.exif?.FNumber || 'N/A'}`, getB: () => `ISO ${fileB?.rawMetadata?.exif?.ISOSpeedRatings || 'N/A'} • F/${fileB?.rawMetadata?.exif?.FNumber || 'N/A'}` },
    { key: 'GPS Coordinates', getA: () => fileA?.privacyReport.hasGps ? `GPS Present (${fileA.rawMetadata?.latitude?.toFixed(4) || 'Coords'})` : 'None (Scrubbed)', getB: () => fileB?.privacyReport.hasGps ? `GPS Present (${fileB.rawMetadata?.latitude?.toFixed(4) || 'Coords'})` : 'None (Scrubbed)' },
    { key: 'Copyright Notice', getA: () => fileA?.rawMetadata?.exif?.Copyright || fileA?.rawMetadata?.iptc?.CopyrightNotice || '—', getB: () => fileB?.rawMetadata?.exif?.Copyright || fileB?.rawMetadata?.iptc?.CopyrightNotice || '—' },
    { key: 'Artist / Author', getA: () => fileA?.rawMetadata?.exif?.Artist || fileA?.rawMetadata?.iptc?.Byline || '—', getB: () => fileB?.rawMetadata?.exif?.Artist || fileB?.rawMetadata?.iptc?.Byline || '—' },
    { key: 'Dimensions & Format', getA: () => `${fileA?.width || 'N/A'}×${fileA?.height || 'N/A'} • ${fileA?.type}`, getB: () => `${fileB?.width || 'N/A'}×${fileB?.height || 'N/A'} • ${fileB?.type}` }
  ];

  const handleCopyFieldAtoB = (fieldKey: string, valA: string) => {
    if (!fileB || valA === '—') return;
    if (fieldKey === 'Copyright Notice') {
      updateTag(fileB.id, 'exif', 'Copyright', valA);
    } else if (fieldKey === 'Artist / Author') {
      updateTag(fileB.id, 'exif', 'Artist', valA);
    } else if (fieldKey === 'Title') {
      updateTag(fileB.id, 'iptc', 'Headline', valA);
    }
    addToast({
      type: 'info',
      title: 'Field Transferred',
      description: `Copied "${fieldKey}" to Asset B.`
    });
  };

  const handleCopyFieldBtoA = (fieldKey: string, valB: string) => {
    if (!fileA || valB === '—') return;
    if (fieldKey === 'Copyright Notice') {
      updateTag(fileA.id, 'exif', 'Copyright', valB);
    } else if (fieldKey === 'Artist / Author') {
      updateTag(fileA.id, 'exif', 'Artist', valB);
    } else if (fieldKey === 'Title') {
      updateTag(fileA.id, 'iptc', 'Headline', valB);
    }
    addToast({
      type: 'info',
      title: 'Field Transferred',
      description: `Copied "${fieldKey}" to Asset A.`
    });
  };

  return (
    <div className="flex-1 flex flex-col gap-5 sm:gap-6 p-3 sm:p-6 max-w-7xl mx-auto w-full pb-safe">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-amber-400" />
            Side-by-Side Metadata Difference Comparator
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Compare tags between two image assets, highlight deviations, and copy metadata bi-directionally.
          </p>
        </div>
      </div>

      {/* Selectors & Previews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slot A */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Asset A</span>
            <select
              value={fileA?.id}
              onChange={(e) => setCompareFile(0, e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none min-h-[36px] max-w-[200px] truncate"
            >
              {files.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="h-36 sm:h-44 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-neutral-800">
            {fileA && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileA.thumbnailUrl} alt={fileA.name} className="h-full object-contain" />
            )}
          </div>
          <span className="text-xs font-mono text-neutral-300 truncate font-semibold">{fileA?.name}</span>
        </div>

        {/* Slot B */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Asset B</span>
            <select
              value={fileB?.id}
              onChange={(e) => setCompareFile(1, e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none min-h-[36px] max-w-[200px] truncate"
            >
              {files.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="h-36 sm:h-44 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-neutral-800">
            {fileB && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileB.thumbnailUrl} alt={fileB.name} className="h-full object-contain" />
            )}
          </div>
          <span className="text-xs font-mono text-neutral-300 truncate font-semibold">{fileB?.name}</span>
        </div>
      </div>

      {/* 1. DESKTOP & TABLET COMPARISON TABLE (Screens ≥ 768px) */}
      <div className="hidden md:block rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2.5 bg-neutral-950 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
          <div className="col-span-3">Metadata Field</div>
          <div className="col-span-4 text-purple-300">Asset A Value</div>
          <div className="col-span-1 text-center">Sync</div>
          <div className="col-span-4 text-blue-300">Asset B Value</div>
        </div>

        <div className="divide-y divide-neutral-800/40">
          {comparisonFields.map((field) => {
            const valA = field.getA();
            const valB = field.getB();
            const isMatch = valA === valB;

            return (
              <div
                key={field.key}
                className={`grid grid-cols-12 px-4 py-3 text-xs items-center transition ${
                  isMatch ? 'bg-neutral-900/40' : 'bg-amber-950/10'
                }`}
              >
                <div className="col-span-3 font-semibold text-neutral-300">
                  {field.key}
                </div>

                <div className={`col-span-4 font-mono truncate pr-2 ${
                  isMatch ? 'text-neutral-300' : 'text-purple-300 font-semibold'
                }`} title={valA}>
                  {valA}
                </div>

                <div className="col-span-1 flex items-center justify-center gap-1">
                  {!isMatch && (
                    <>
                      <button
                        onClick={() => handleCopyFieldAtoB(field.key, valA)}
                        title="Copy A → B"
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopyFieldBtoA(field.key, valB)}
                        title="Copy B → A"
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {isMatch && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                      ✓ Match
                    </span>
                  )}
                </div>

                <div className={`col-span-4 font-mono truncate pl-2 ${
                  isMatch ? 'text-neutral-300' : 'text-blue-300 font-semibold'
                }`} title={valB}>
                  {valB}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. MOBILE RESPONSIVE COMPARISON CARDS (Screens < 768px) */}
      <div className="md:hidden flex flex-col gap-3">
        {comparisonFields.map((field) => {
          const valA = field.getA();
          const valB = field.getB();
          const isMatch = valA === valB;

          return (
            <div
              key={field.key}
              className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 transition ${
                isMatch ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-900 border-amber-500/30 shadow-xs'
              }`}
            >
              {/* Card Title & Match Status */}
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                <span className="font-bold text-xs text-white">{field.key}</span>
                {isMatch ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Identical
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <AlertCircle className="w-3 h-3" /> Differs
                  </span>
                )}
              </div>

              {/* Asset A Value */}
              <div className="flex flex-col gap-1 p-2 rounded-xl bg-purple-950/20 border border-purple-500/20">
                <span className="text-[10px] font-bold uppercase text-purple-400">Asset A Value</span>
                <span className="text-xs font-mono text-purple-200 break-words">{valA}</span>
              </div>

              {/* Sync Actions (if differed) */}
              {!isMatch && (
                <div className="flex items-center justify-center gap-2 py-1">
                  <button
                    onClick={() => handleCopyFieldAtoB(field.key, valA)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 touch-target"
                  >
                    <span>Copy A → B</span>
                    <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                  </button>
                  <button
                    onClick={() => handleCopyFieldBtoA(field.key, valB)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 touch-target"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
                    <span>Copy B → A</span>
                  </button>
                </div>
              )}

              {/* Asset B Value */}
              <div className="flex flex-col gap-1 p-2 rounded-xl bg-blue-950/20 border border-blue-500/20">
                <span className="text-[10px] font-bold uppercase text-blue-400">Asset B Value</span>
                <span className="text-xs font-mono text-blue-200 break-words">{valB}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
