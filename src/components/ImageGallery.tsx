'use client';

import React, { useState } from 'react';
import { useMetaForge } from '@/lib/store';
import { formatBytes } from '@/lib/format';
import { 
  MapPin, 
  Sparkles, 
  Trash2, 
  Search, 
  Image as ImageIcon,
  Check, 
  ShieldAlert, 
  Filter, 
  CheckSquare, 
  Square, 
  Layers 
} from 'lucide-react';
import BatchActionsModal from './Batch/BatchActionsModal';

const FORMAT_OPTIONS: [string, string][] = [['image/jpeg', 'JPEG'], ['image/png', 'PNG'], ['image/webp', 'WebP'], ['image/avif', 'AVIF'], ['image/heic', 'HEIC'], ['image/tiff', 'TIFF'], ['image/gif', 'GIF']];

export default function ImageGallery() {
  const {
    files, activeFileId, setActiveFile, removeFile, clearFiles, searchQuery, setSearchQuery,
    selectedFileIds, toggleSelectFile, selectAllFiles, clearSelection, filterOptions, setFilterOptions
  } = useMetaForge('files', 'activeFileId', 'setActiveFile', 'removeFile', 'clearFiles', 'searchQuery', 'setSearchQuery',
    'selectedFileIds', 'toggleSelectFile', 'selectAllFiles', 'clearSelection', 'filterOptions', 'setFilterOptions');

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const query = searchQuery.trim().toLowerCase();
  const activeFilterCount = Object.values(filterOptions).filter((value) => value !== 'ALL').length;

  // Apply filters
  const filteredFiles = files.filter((f) => {
    // Search: filename, SEO title, and keywords
    const matchesSearch = !query || f.name.toLowerCase().includes(query) ||
      (f.seoData?.title?.toLowerCase().includes(query) ?? false) ||
      (f.seoData?.keywords?.some((keyword) => keyword.toLowerCase().includes(query)) ?? false);
    if (!matchesSearch) return false;
    if (filterOptions.aiStatus === 'AI_DETECTED' && !f.aiWorkflow.detected) return false;
    if (filterOptions.aiStatus === 'NO_AI' && f.aiWorkflow.detected) return false;

    // Format (by detected MIME type: filenames are normalized, so extensions are not reliable)
    if (filterOptions.format !== 'ALL' && f.type !== filterOptions.format) return false;

    // Privacy
    if (filterOptions.privacyStatus === 'GPS_PRESENT' && !f.privacyReport.hasGps) return false;
    if (filterOptions.privacyStatus === 'CLEAN' && f.privacyReport.hasGps) return false;

    // SEO
    if (filterOptions.seoStatus === 'SEO_READY' && (!f.seoData?.title || !f.seoData?.altText)) return false;
    if (filterOptions.seoStatus === 'NEEDS_SEO' && f.seoData?.title && f.seoData?.altText) return false;

    return true;
  });

  const isAllSelected = files.length > 0 && selectedFileIds.length === files.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Bulk Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
          <ImageIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span>Queue ({files.length})</span>
          {selectedFileIds.length > 0 && (
            <span className="px-1.5 py-px rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30 shrink-0">
              {selectedFileIds.length} sel
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {files.length > 0 && (
            <button
              onClick={() => (isAllSelected ? clearSelection() : selectAllFiles())}
              className="text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded-lg transition flex items-center gap-1 min-h-[36px] sm:min-h-0"
              title="Toggle Select All"
            >
              {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" /> : <Square className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isAllSelected ? 'Deselect' : 'Select All'}</span>
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            className={`relative p-2 sm:p-1.5 rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center ${
              showFilters || activeFilterCount ? 'bg-neutral-800 text-purple-400' : 'text-neutral-500 hover:text-white'
            }`}
            title={activeFilterCount ? `Filters (${activeFilterCount} active)` : 'Toggle Filter Panel'}
          >
            <Filter className="w-3.5 h-3.5" />
            {activeFilterCount > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-400" />}
          </button>

          {files.length > 0 && (
            <button
              onClick={clearFiles}
              className="text-[11px] text-neutral-500 hover:text-rose-400 transition px-2 py-1 rounded min-h-[36px] sm:min-h-0 flex items-center"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Batch Operations Bar */}
      {selectedFileIds.length > 0 && (
        <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between gap-2 animate-fade-in">
          <span className="text-xs font-semibold text-purple-200">
            {selectedFileIds.length} file(s) selected
          </span>
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-sm touch-target sm:min-h-0 sm:min-w-0"
          >
            <Layers className="w-3.5 h-3.5" />
            Batch Edit
          </button>
        </div>
      )}

      {/* Filter Drawer */}
      {showFilters && (
        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2 text-[11px] animate-slide-down">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-neutral-500 block mb-1">Format</span>
              <select
                aria-label="Format filter"
                value={filterOptions.format}
                onChange={(e) => setFilterOptions({ format: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-300 min-h-[36px] sm:min-h-0"
              >
                <option value="ALL">All Formats</option>
                {FORMAT_OPTIONS.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
              </select>
            </div>

            <div>
              <span className="text-neutral-500 block mb-1">AI Workflow</span>
              <select
                aria-label="AI workflow filter"
                value={filterOptions.aiStatus}
                onChange={(e) => setFilterOptions({ aiStatus: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-300 min-h-[36px] sm:min-h-0"
              >
                <option value="ALL">Any</option>
                <option value="AI_DETECTED">AI workflow detected</option>
                <option value="NO_AI">No AI workflow</option>
              </select>
            </div>

            <div>
              <span className="text-neutral-500 block mb-1">Privacy</span>
              <select
                aria-label="Privacy filter"
                value={filterOptions.privacyStatus}
                onChange={(e) => setFilterOptions({ privacyStatus: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-300 min-h-[36px] sm:min-h-0"
              >
                <option value="ALL">All Statuses</option>
                <option value="GPS_PRESENT">GPS Present</option>
                <option value="CLEAN">Clean (No GPS)</option>
              </select>
            </div>

            <div>
              <span className="text-neutral-500 block mb-1">SEO Status</span>
              <select
                aria-label="SEO filter"
                value={filterOptions.seoStatus}
                onChange={(e) => setFilterOptions({ seoStatus: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-300 min-h-[36px] sm:min-h-0"
              >
                <option value="ALL">All Statuses</option>
                <option value="SEO_READY">SEO Ready</option>
                <option value="NEEDS_SEO">Needs SEO</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search Input (kept visible while a query is active, so a filtered-out queue can always be reset) */}
      {(files.length > 1 || searchQuery) && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            aria-label="Search images"
            placeholder="Search filenames, titles, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700 min-h-[40px] sm:min-h-0"
          />
        </div>
      )}

      {/* Thumbnails Scroll List */}
      <div className="flex flex-col gap-2 max-h-[50dvh] sm:max-h-[max(12rem,calc(100dvh-420px))] overflow-y-auto pr-1">
        {!filteredFiles.length && (
          <div className="py-6 flex flex-col items-center gap-2 text-center text-xs text-neutral-400">
            <p>No images match these filters.</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setFilterOptions({ format: 'ALL', seoStatus: 'ALL', privacyStatus: 'ALL', aiStatus: 'ALL' }); }}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
            >
              Reset search and filters
            </button>
          </div>
        )}
        {filteredFiles.map((file) => {
          const isActive = file.id === activeFileId;
          const isSelected = selectedFileIds.includes(file.id);
          const hasGps = file.privacyReport.hasGps;
          const isAi = file.aiWorkflow.detected;
          const hasSeo = Boolean(file.seoData?.title && file.seoData?.altText);

          return (
            <div
              key={file.id}
              role="group"
              aria-label={file.name}
              tabIndex={0}
              onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setActiveFile(file.id); } }}
              onClick={() => setActiveFile(file.id)}
              className={`group relative flex items-center gap-2.5 p-2 rounded-xl border transition cursor-pointer select-none ${
                isActive
                  ? 'bg-neutral-800/90 border-purple-500 shadow-md shadow-purple-950/20'
                  : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-850 hover:border-neutral-700'
              }`}
            >
              {/* Checkbox (Touch target friendly) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelectFile(file.id);
                }}
                className="text-neutral-500 hover:text-white p-2 min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Select file"
                aria-label={`${isSelected ? 'Deselect' : 'Select'} ${file.name}`}
                aria-pressed={isSelected}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                ) : (
                  <Square className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                )}
              </button>

              {/* Thumbnail */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-neutral-950 border border-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.thumbnailUrl}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                {file.isDirty && (
                  <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-neutral-950" title="Modified in memory" />
                )}
              </div>

              {/* File Info & Badges */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-neutral-300'}`}>
                  {file.name}
                </span>

                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
                  <span>{formatBytes(file.size)}</span>
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
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <MapPin className="w-2.5 h-2.5" /> GPS
                    </span>
                  )}
                  {isAi && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <Sparkles className="w-2.5 h-2.5" /> {file.aiWorkflow.type}
                    </span>
                  )}
                  {hasSeo && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Check className="w-2.5 h-2.5" /> SEO
                    </span>
                  )}
                  {file.privacyReport.riskLevel === 'HIGH' && !hasGps && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <ShieldAlert className="w-2.5 h-2.5" /> Risk
                    </span>
                  )}
                </div>
              </div>

              {/* Delete Button (Touch-accessible on mobile without needing hover) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.id);
                }}
                className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 p-2 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Remove file"
                aria-label={`Remove ${file.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Batch Actions Modal */}
      <BatchActionsModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
      />
    </div>
  );
}
