'use client';

import React, { useRef, useState } from 'react';
import { useMetaForge, type ZipResultItem } from '@/lib/store';
import { filesFromDataTransfer, importImageFiles } from '@/lib/import-files';
import { isZipFile, summarizeZipReport, ZIP_LIMITS, ZIP_OUTCOME_LABELS, type ZipEntryResult, type ZipOutcome } from '@/lib/zip-cleaner';
import { formatBytes } from '@/lib/format';
import type { AiCleanLevel } from '@/lib/types';
import { FileArchive, Download, FileSpreadsheet, ChevronDown, X, Square, AlertTriangle } from 'lucide-react';

export const AI_LEVEL_NAMES: Record<AiCleanLevel, string> = { ai: 'AI labels only', private: 'AI labels + location & device', all: 'Everything' };

const OUTCOME_STYLES: Record<ZipOutcome, string> = {
  cleaned: 'bg-purple-500/15 text-purple-200 border-purple-500/30',
  stripped: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  clean: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  kept: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  removed: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  archive: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  failed: 'bg-rose-500/15 text-rose-200 border-rose-500/30'
};
/** The details list starts with what needs attention. */
const DETAIL_ORDER: ZipOutcome[] = ['failed', 'stripped', 'cleaned', 'removed', 'archive', 'kept', 'clean'];
const DETAIL_ROWS = 200;

const BEHAVIOUR_OPTIONS = [
  { key: 'escalate', title: 'Strip fully when a marker remains', description: 'If an image still carries a marker after cleaning, remove all of its metadata instead of leaving it out.' },
  { key: 'dropAiSidecars', title: 'Remove AI sidecar files', description: 'Prompt, caption, workflow and XMP files next to an image that carry AI metadata.' },
  { key: 'dropSystemFiles', title: 'Remove system files', description: '__MACOSX folders, ._ files, .DS_Store, Thumbs.db and desktop.ini, which can record where files came from.' }
] as const;

export default function ZipCleanerPanel() {
  const {
    cleanZipArchives, zipBehaviour, setZipBehaviour, zipResults, downloadZipResult, downloadZipReport, removeZipResult,
    processingMessage, batchJobs, cancelBatch, aiCleanLevel, addToast
  } = useMetaForge('cleanZipArchives', 'zipBehaviour', 'setZipBehaviour', 'zipResults', 'downloadZipResult', 'downloadZipReport', 'removeZipResult',
    'processingMessage', 'batchJobs', 'cancelBatch', 'aiCleanLevel', 'addToast');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const running = batchJobs.find((job) => job.type === 'CLEAN_ZIP' && job.status === 'RUNNING');

  const start = (files: File[]) => {
    const archives = files.filter(isZipFile), others = files.filter((file) => !isZipFile(file));
    if (archives.length) void cleanZipArchives(archives);
    if (!others.length) return;
    // Loose images are still useful: they join the image list instead of being rejected.
    if (!archives.length) addToast({ type: 'info', title: 'Added to the Image List', description: 'This area returns a cleaned copy of a ZIP archive. Loose images join the image list.' });
    void importImageFiles(others);
  };

  return (
    <section aria-labelledby="zip-clean-heading" className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="zip-clean-heading" className="text-sm font-bold text-white flex items-center gap-2">
          <FileArchive className="w-4 h-4 text-purple-400" aria-hidden="true" />
          Clean a ZIP archive
        </h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Get a cleaned copy back with the same folders and file names. Each image is checked again after cleaning, images without AI metadata are copied unchanged,
          and anything that cannot be cleaned is left out and listed. Nothing is uploaded.
        </p>
      </div>

      {running ? (
        <div role="status" className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-purple-100 font-semibold truncate min-w-0">{processingMessage || `Cleaning ${running.name.replace(/^Clean ZIP: /, '')}…`}</span>
            <button
              type="button"
              onClick={cancelBatch}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-neutral-900 hover:bg-rose-600 text-neutral-100 border border-neutral-700 transition touch-target sm:min-h-0"
            >
              <Square className="w-3 h-3" aria-hidden="true" /> Cancel
            </button>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden" role="progressbar" aria-label="ZIP cleaning progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={running.progress}>
            <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${running.progress}%` }} />
          </div>
          <span className="text-[11px] text-purple-200/80 font-mono">{running.completed} of {running.total} files checked</span>
        </div>
      ) : (
        <div
          role="group"
          aria-label="Clean ZIP archives"
          data-zip-dropzone
          onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragOver(false); }}
          onDrop={(event) => { event.preventDefault(); setIsDragOver(false); void filesFromDataTransfer(event.dataTransfer).then(start); }}
          onClick={() => inputRef.current?.click()}
          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed cursor-pointer transition has-[input:focus-visible]:border-purple-500 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-purple-500/30 ${
            isDragOver ? 'border-purple-500 bg-purple-950/20' : 'border-neutral-700 bg-neutral-950/50 hover:border-neutral-600 hover:bg-neutral-950'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            aria-label="Choose ZIP archives"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={(event) => { start(Array.from(event.target.files || [])); event.target.value = ''; }}
            className="sr-only"
          />
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 shrink-0">
            <FileArchive className="w-5 h-5 text-purple-300" aria-hidden="true" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white">
              Drop a ZIP here, or <span className="text-purple-400 underline underline-offset-2">choose a ZIP</span>
            </span>
            <span className="text-[11px] text-neutral-400 leading-snug">
              Level: <span className="text-neutral-200">{AI_LEVEL_NAMES[aiCleanLevel]}</span> · up to {ZIP_LIMITS.archiveBytes / 1024 ** 3} GB and {ZIP_LIMITS.entries.toLocaleString('en-US')} files · nested ZIPs included
            </span>
          </div>
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">ZIP cleaning options</legend>
        {BEHAVIOUR_OPTIONS.map((option) => (
          <label key={option.key} className="flex items-start gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={zipBehaviour[option.key]}
              onChange={(event) => setZipBehaviour({ [option.key]: event.target.checked })}
              aria-describedby={`zip-option-${option.key}`}
              className="mt-0.5 w-4 h-4 accent-purple-500 shrink-0"
            />
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold text-neutral-200">{option.title}</span>
              <span id={`zip-option-${option.key}`} className="text-[11px] text-neutral-500 leading-snug">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {zipResults.length > 0 && (
        <div className="flex flex-col gap-2 pt-3 border-t border-neutral-800">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Cleaned archives</h3>
          <ul className="flex flex-col gap-2">
            {zipResults.map((item) => (
              <ResultRow
                key={item.id}
                item={item}
                onDownload={() => downloadZipResult(item.id)}
                onReport={() => downloadZipReport(item.id)}
                onRemove={() => removeZipResult(item.id)}
              />
            ))}
          </ul>
          <p className="text-[11px] text-neutral-500 leading-snug">Cleaned archives are kept until the page reloads, so they can be downloaded again.</p>
        </div>
      )}
    </section>
  );
}

function ResultRow({ item, onDownload, onReport, onRemove }: { item: ZipResultItem; onDownload: () => void; onReport: () => void; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { report } = item;
  const detailsId = `zip-details-${item.id}`;
  const sorted = [...report.entries].sort((a, b) => DETAIL_ORDER.indexOf(a.outcome) - DETAIL_ORDER.indexOf(b.outcome));
  return (
    <li className="rounded-xl border border-neutral-800 bg-neutral-950/50">
      <div className="flex flex-wrap sm:flex-nowrap items-start gap-2 p-2.5">
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-white truncate">{item.name}</span>
          <span className="text-[11px] text-neutral-300 leading-snug">{summarizeZipReport(report)}</span>
          <span className="text-[10px] text-neutral-500 font-mono break-words">
            {report.aiImages} of {report.images} image{report.images === 1 ? '' : 's'} had AI metadata · {AI_LEVEL_NAMES[report.level]} · {formatBytes(report.bytesBefore)} → {formatBytes(report.bytesAfter)}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button type="button" onClick={onDownload} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition touch-target sm:min-h-8">
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download
          </button>
          <button type="button" onClick={onReport} title="Download a CSV report of every file" aria-label={`Download the report for ${item.name}`} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition touch-target sm:min-h-8 sm:min-w-8 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded ? 'Hide' : 'Show'} files in ${item.name}`} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition touch-target sm:min-h-8 sm:min-w-8 flex items-center justify-center">
            <ChevronDown className={`w-4 h-4 transition ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <button type="button" onClick={onRemove} aria-label={`Forget ${item.name}`} title="Forget this archive" className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition touch-target sm:min-h-8 sm:min-w-8 flex items-center justify-center">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {(report.counts.failed > 0 || report.archiveComment) && (
        <div className="px-3 pb-2.5 flex flex-col gap-1 text-[11px] leading-snug">
          {report.counts.failed > 0 && (
            <p className="flex items-start gap-1.5 text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
              <span>{report.counts.failed} file{report.counts.failed === 1 ? '' : 's'} could not be cleaned and {report.counts.failed === 1 ? 'is' : 'are'} not in the archive. Show the files for the reasons.</span>
            </p>
          )}
          {report.archiveComment && <p className="text-neutral-500 break-words">The archive comment was not copied: “{report.archiveComment.slice(0, 160)}”</p>}
        </div>
      )}
      {expanded && (
        <div id={detailsId} className="border-t border-neutral-800">
          <ul className="divide-y divide-neutral-800/70 max-h-96 overflow-y-auto custom-scrollbar text-[11px]">
            {sorted.slice(0, DETAIL_ROWS).map((entry) => <EntryRow key={entry.path} entry={entry} />)}
          </ul>
          {sorted.length > DETAIL_ROWS && (
            <p className="px-3 py-2 text-[11px] text-neutral-500 border-t border-neutral-800">Showing {DETAIL_ROWS} of {sorted.length.toLocaleString('en-US')} files. The CSV report lists every file.</p>
          )}
        </div>
      )}
    </li>
  );
}

function EntryRow({ entry }: { entry: ZipEntryResult }) {
  const renamed = entry.output && entry.output !== entry.path;
  return (
    <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 px-3 py-2">
      <span className={`self-start shrink-0 px-1.5 py-px rounded border text-[10px] font-bold sm:w-24 text-center ${OUTCOME_STYLES[entry.outcome]}`}>{ZIP_OUTCOME_LABELS[entry.outcome]}</span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-mono text-neutral-200 break-all">{entry.path}{renamed ? <span className="text-neutral-500"> → {entry.output}</span> : null}</span>
        {entry.markers.length > 0 && (
          <span className="text-neutral-400 break-words">
            {entry.outcome === 'failed' ? 'Carries' : 'Had'}: {entry.markers.slice(0, 4).join(', ')}{entry.markers.length > 4 ? ` +${entry.markers.length - 4}` : ''}{entry.generator ? ` · ${entry.generator}` : ''}
          </span>
        )}
        {entry.note && <span className={entry.outcome === 'failed' ? 'text-rose-300' : 'text-neutral-500'}>{entry.note}</span>}
      </span>
    </li>
  );
}
