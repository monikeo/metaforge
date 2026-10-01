'use client';

import React, { useState } from 'react';
import { useMetaForgeStore } from '@/lib/store';
import TagEditorModal from '../Inspector/TagEditorModal';
import { 
  GitCompare, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Edit2,
  ExternalLink
} from 'lucide-react';

export default function MetadataCompareView() {
  const { 
    files, 
    compareFileIds, 
    setCompareFile, 
    updateTag,
    setActiveFile,
    setCurrentView,
    addToast 
  } = useMetaForgeStore();

  const fileA = files.find((f) => f.id === compareFileIds[0]) || files[0];
  const fileB = files.find((f) => f.id === compareFileIds[1]) || files[1] || files[0];

  // Inline editing target
  const [editingTarget, setEditingTarget] = useState<{
    fileId: string;
    section: string;
    tagKey: string;
    initialValue: any;
  } | null>(null);

  if (files.length < 2) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center max-w-md mx-auto min-h-[50vh]">
        <GitCompare className="w-12 h-12 text-neutral-600 mb-3" />
        <h3 className="text-base font-bold text-white">Compare Requires 2+ Images</h3>
        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
          Please upload or import at least two images into MetaForge to run side-by-side metadata comparisons, diff transfers, and direct editing.
        </p>
      </div>
    );
  }

  // Fields to compare with mapping to IFD section and key
  const comparisonFields = [
    { 
      key: 'Title', 
      section: 'iptc',
      tagKey: 'Headline',
      getA: () => fileA?.seoData?.title || fileA?.rawMetadata?.iptc?.Headline || '—', 
      getB: () => fileB?.seoData?.title || fileB?.rawMetadata?.iptc?.Headline || '—' 
    },
    { 
      key: 'Alt Text / Caption', 
      section: 'iptc',
      tagKey: 'Caption',
      getA: () => fileA?.seoData?.altText || fileA?.seoData?.caption || fileA?.rawMetadata?.iptc?.Caption || '—', 
      getB: () => fileB?.seoData?.altText || fileB?.seoData?.caption || fileB?.rawMetadata?.iptc?.Caption || '—' 
    },
    { 
      key: 'Keywords', 
      section: 'iptc',
      tagKey: 'Keywords',
      getA: () => (Array.isArray(fileA?.rawMetadata?.iptc?.Keywords) ? fileA.rawMetadata.iptc.Keywords.join(', ') : fileA?.seoData?.keywords?.join(', ')) || '—', 
      getB: () => (Array.isArray(fileB?.rawMetadata?.iptc?.Keywords) ? fileB.rawMetadata.iptc.Keywords.join(', ') : fileB?.seoData?.keywords?.join(', ')) || '—' 
    },
    { 
      key: 'Camera Make & Model', 
      section: 'exif',
      tagKey: 'Model',
      getA: () => `${fileA?.rawMetadata?.exif?.Make || ''} ${fileA?.rawMetadata?.exif?.Model || ''}`.trim() || '—', 
      getB: () => `${fileB?.rawMetadata?.exif?.Make || ''} ${fileB?.rawMetadata?.exif?.Model || ''}`.trim() || '—' 
    },
    { 
      key: 'Lens Specification', 
      section: 'exif',
      tagKey: 'LensModel',
      getA: () => fileA?.rawMetadata?.exif?.LensModel || '—', 
      getB: () => fileB?.rawMetadata?.exif?.LensModel || '—' 
    },
    { 
      key: 'Exposure / ISO / Aperture', 
      section: 'exif',
      tagKey: 'ISOSpeedRatings',
      getA: () => `ISO ${fileA?.rawMetadata?.exif?.ISOSpeedRatings || 'N/A'} • F/${fileA?.rawMetadata?.exif?.FNumber || 'N/A'}`, 
      getB: () => `ISO ${fileB?.rawMetadata?.exif?.ISOSpeedRatings || 'N/A'} • F/${fileB?.rawMetadata?.exif?.FNumber || 'N/A'}` 
    },
    { 
      key: 'GPS Coordinates', 
      section: 'gps',
      tagKey: 'latitude',
      getA: () => fileA?.privacyReport.hasGps ? `GPS Present (${fileA.rawMetadata?.latitude?.toFixed(4) || 'Coords'})` : 'None (Scrubbed)', 
      getB: () => fileB?.privacyReport.hasGps ? `GPS Present (${fileB.rawMetadata?.latitude?.toFixed(4) || 'Coords'})` : 'None (Scrubbed)' 
    },
    { 
      key: 'Copyright Notice', 
      section: 'exif',
      tagKey: 'Copyright',
      getA: () => fileA?.rawMetadata?.exif?.Copyright || fileA?.rawMetadata?.iptc?.CopyrightNotice || '—', 
      getB: () => fileB?.rawMetadata?.exif?.Copyright || fileB?.rawMetadata?.iptc?.CopyrightNotice || '—' 
    },
    { 
      key: 'Artist / Author', 
      section: 'exif',
      tagKey: 'Artist',
      getA: () => fileA?.rawMetadata?.exif?.Artist || fileA?.rawMetadata?.iptc?.Byline || '—', 
      getB: () => fileB?.rawMetadata?.exif?.Artist || fileB?.rawMetadata?.iptc?.Byline || '—' 
    },
    { 
      key: 'Dimensions & Format', 
      section: 'file',
      tagKey: 'Dimensions',
      getA: () => `${fileA?.width || 'N/A'}×${fileA?.height || 'N/A'} • ${fileA?.type}`, 
      getB: () => `${fileB?.width || 'N/A'}×${fileB?.height || 'N/A'} • ${fileB?.type}` 
    }
  ];

  const handleCopyFieldAtoB = (fieldKey: string, valA: string) => {
    if (!fileB || valA === '—') return;
    if (fieldKey === 'Copyright Notice') {
      updateTag(fileB.id, 'exif', 'Copyright', valA);
      updateTag(fileB.id, 'iptc', 'CopyrightNotice', valA);
    } else if (fieldKey === 'Artist / Author') {
      updateTag(fileB.id, 'exif', 'Artist', valA);
      updateTag(fileB.id, 'iptc', 'Byline', valA);
    } else if (fieldKey === 'Title') {
      updateTag(fileB.id, 'iptc', 'Headline', valA);
    } else if (fieldKey === 'Alt Text / Caption') {
      updateTag(fileB.id, 'iptc', 'Caption', valA);
    } else if (fieldKey === 'Keywords') {
      const arr = valA.split(',').map((s) => s.trim()).filter(Boolean);
      updateTag(fileB.id, 'iptc', 'Keywords', arr);
    } else if (fieldKey === 'Lens Specification') {
      updateTag(fileB.id, 'exif', 'LensModel', valA);
    } else if (fieldKey === 'Camera Make & Model' && fileA?.rawMetadata?.exif?.Model) {
      updateTag(fileB.id, 'exif', 'Model', fileA.rawMetadata.exif.Model);
      if (fileA.rawMetadata.exif.Make) updateTag(fileB.id, 'exif', 'Make', fileA.rawMetadata.exif.Make);
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
      updateTag(fileA.id, 'iptc', 'CopyrightNotice', valB);
    } else if (fieldKey === 'Artist / Author') {
      updateTag(fileA.id, 'exif', 'Artist', valB);
      updateTag(fileA.id, 'iptc', 'Byline', valB);
    } else if (fieldKey === 'Title') {
      updateTag(fileA.id, 'iptc', 'Headline', valB);
    } else if (fieldKey === 'Alt Text / Caption') {
      updateTag(fileA.id, 'iptc', 'Caption', valB);
    } else if (fieldKey === 'Keywords') {
      const arr = valB.split(',').map((s) => s.trim()).filter(Boolean);
      updateTag(fileA.id, 'iptc', 'Keywords', arr);
    } else if (fieldKey === 'Lens Specification') {
      updateTag(fileA.id, 'exif', 'LensModel', valB);
    } else if (fieldKey === 'Camera Make & Model' && fileB?.rawMetadata?.exif?.Model) {
      updateTag(fileA.id, 'exif', 'Model', fileB.rawMetadata.exif.Model);
      if (fileB.rawMetadata.exif.Make) updateTag(fileA.id, 'exif', 'Make', fileB.rawMetadata.exif.Make);
    }
    addToast({
      type: 'info',
      title: 'Field Transferred',
      description: `Copied "${fieldKey}" to Asset A.`
    });
  };

  const handleOpenStudio = (fileId: string) => {
    setActiveFile(fileId);
    setCurrentView('studio');
  };

  return (
    <div className="flex-1 flex flex-col gap-5 sm:gap-6 p-3 sm:p-6 max-w-7xl mx-auto w-full pb-safe">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-amber-400" />
            Side-by-Side Metadata Difference &amp; Live Editor
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Compare tags between two image assets, highlight deviations, sync fields bidirectionally, or edit any tag directly.
          </p>
        </div>
      </div>

      {/* Selectors & Previews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slot A */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Asset A</span>
            <div className="flex items-center gap-2">
              <select
                value={fileA?.id}
                onChange={(e) => setCompareFile(0, e.target.value)}
                className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none min-h-[36px] max-w-[180px] truncate"
              >
                {files.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {fileA && (
                <button
                  onClick={() => handleOpenStudio(fileA.id)}
                  title="Open Asset A in Studio Inspector"
                  className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white transition flex items-center gap-1 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Studio</span>
                </button>
              )}
            </div>
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
            <div className="flex items-center gap-2">
              <select
                value={fileB?.id}
                onChange={(e) => setCompareFile(1, e.target.value)}
                className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none min-h-[36px] max-w-[180px] truncate"
              >
                {files.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {fileB && (
                <button
                  onClick={() => handleOpenStudio(fileB.id)}
                  title="Open Asset B in Studio Inspector"
                  className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white transition flex items-center gap-1 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Studio</span>
                </button>
              )}
            </div>
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
            const isEditable = field.section !== 'file';

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

                {/* Asset A Value + Direct Edit Pencil */}
                <div className="col-span-4 flex items-center justify-between gap-1 pr-2">
                  <span className={`font-mono truncate ${
                    isMatch ? 'text-neutral-300' : 'text-purple-300 font-semibold'
                  }`} title={valA}>
                    {valA}
                  </span>
                  {isEditable && fileA && (
                    <button
                      onClick={() => setEditingTarget({
                        fileId: fileA.id,
                        section: field.section,
                        tagKey: field.tagKey,
                        initialValue: valA === '—' ? '' : valA
                      })}
                      title={`Edit ${field.key} on Asset A`}
                      className="p-1 rounded text-neutral-500 hover:text-purple-400 hover:bg-neutral-800 shrink-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Sync Buttons */}
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

                {/* Asset B Value + Direct Edit Pencil */}
                <div className="col-span-4 flex items-center justify-between gap-1 pl-2">
                  <span className={`font-mono truncate ${
                    isMatch ? 'text-neutral-300' : 'text-blue-300 font-semibold'
                  }`} title={valB}>
                    {valB}
                  </span>
                  {isEditable && fileB && (
                    <button
                      onClick={() => setEditingTarget({
                        fileId: fileB.id,
                        section: field.section,
                        tagKey: field.tagKey,
                        initialValue: valB === '—' ? '' : valB
                      })}
                      title={`Edit ${field.key} on Asset B`}
                      className="p-1 rounded text-neutral-500 hover:text-blue-400 hover:bg-neutral-800 shrink-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
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
          const isEditable = field.section !== 'file';

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

              {/* Asset A Value + Edit */}
              <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-purple-400">Asset A Value</span>
                  {isEditable && fileA && (
                    <button
                      onClick={() => setEditingTarget({
                        fileId: fileA.id,
                        section: field.section,
                        tagKey: field.tagKey,
                        initialValue: valA === '—' ? '' : valA
                      })}
                      className="text-[11px] text-purple-400 hover:text-white flex items-center gap-1 touch-target sm:min-h-0"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
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

              {/* Asset B Value + Edit */}
              <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-blue-400">Asset B Value</span>
                  {isEditable && fileB && (
                    <button
                      onClick={() => setEditingTarget({
                        fileId: fileB.id,
                        section: field.section,
                        tagKey: field.tagKey,
                        initialValue: valB === '—' ? '' : valB
                      })}
                      className="text-[11px] text-blue-400 hover:text-white flex items-center gap-1 touch-target sm:min-h-0"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
                <span className="text-xs font-mono text-blue-200 break-words">{valB}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Direct Tag Editor Modal */}
      {editingTarget && (
        <TagEditorModal
          isOpen={Boolean(editingTarget)}
          section={editingTarget.section}
          tagKey={editingTarget.tagKey}
          initialValue={editingTarget.initialValue}
          onSave={async (sec, key, val) => {
            await updateTag(editingTarget.fileId, sec, key, val);
            addToast({
              type: 'success',
              title: 'Tag Updated',
              description: `Updated ${sec}.${key} successfully.`
            });
            setEditingTarget(null);
          }}
          onClose={() => setEditingTarget(null)}
        />
      )}
    </div>
  );
}
