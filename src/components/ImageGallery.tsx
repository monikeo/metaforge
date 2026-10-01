'use client';

import React from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { 
  MapPin, 
  Sparkles, 
  Trash2, 
  Search, 
  Image as ImageIcon,
  Check,
  ShieldAlert
} from 'lucide-react';

export default function ImageGallery() {
  const { 
    files, 
    activeFileId, 
    setActiveFile, 
    removeFile, 
    clearFiles,
    searchQuery,
    setSearchQuery
  } = useMetaForgeStore();

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Counter Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
          <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
          <span>Image Queue</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-400 font-mono">
            {files.length}
          </span>
        </div>

        {files.length > 0 && (
          <button
            onClick={clearFiles}
            className="text-[11px] text-neutral-500 hover:text-rose-400 transition"
          >
            Clear All
          </button>
        )}
      </div>

      {files.length > 1 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search filenames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
          />
        </div>
      )}

      {/* Thumbnails Scroll List */}
      <div className="flex flex-col gap-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
        {filteredFiles.map((file) => {
          const isActive = file.id === activeFileId;
          const hasGps = file.privacyReport.hasGps;
          const isAi = file.aiWorkflow.detected;
          const hasSeo = Boolean(file.seoData?.title && file.seoData?.altText);

          return (
            <div
              key={file.id}
              onClick={() => setActiveFile(file.id)}
              className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                isActive
                  ? 'bg-neutral-800/90 border-purple-500 shadow-md shadow-purple-950/20'
                  : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-850 hover:border-neutral-700'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-neutral-950 border border-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.thumbnailUrl}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                {file.isDirty && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-neutral-950" title="Unsaved in-memory changes" />
                )}
              </div>

              {/* File Info & Badges */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-neutral-300'}`}>
                  {file.name}
                </span>

                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
                  <span>{(file.size / 1024).toFixed(0)} KB</span>
                  {file.width && file.height && (
                    <>
                      <span>•</span>
                      <span>{file.width}×{file.height}</span>
                    </>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  {hasGps && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <MapPin className="w-2.5 h-2.5" /> GPS Alert
                    </span>
                  )}
                  {isAi && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <Sparkles className="w-2.5 h-2.5" /> {file.aiWorkflow.type}
                    </span>
                  )}
                  {hasSeo && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Check className="w-2.5 h-2.5" /> SEO Ready
                    </span>
                  )}
                  {file.privacyReport.riskLevel === 'HIGH' && !hasGps && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <ShieldAlert className="w-2.5 h-2.5" /> High Risk
                    </span>
                  )}
                </div>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition"
                title="Remove file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
