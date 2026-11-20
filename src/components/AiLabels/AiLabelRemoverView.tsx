'use client';

import React, { useState } from 'react';
import { useMetaForge } from '@/lib/store';
import { createSampleAiLabeledImage } from '@/lib/sample-data';
import type { AiCleanLevel, AiSignalKind, MetaFile } from '@/lib/types';
import Dropzone from '@/components/Dropzone';
import {
  ScanEye,
  Eraser,
  BadgeCheck,
  ShieldAlert,
  Sparkles,
  Download,
  ChevronDown,
  Info,
  Images,
  Layers
} from 'lucide-react';

export const AI_KIND_LABELS: Record<AiSignalKind, string> = {
  C2PA: 'Content Credentials',
  SOURCE_TYPE: 'AI source type',
  AI_FIELD: 'AI fields',
  GENERATOR: 'AI tool name',
  PROMPT: 'Prompt',
  HISTORY: 'AI edit history',
  DISCLOSURE: 'AI text'
};

export const AI_STATUS_STYLES = {
  LABELED: { label: 'Label signals', className: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  TRACES: { label: 'AI metadata', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  CLEAN: { label: 'Clean', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
} as const;

const LEVELS: { id: AiCleanLevel; title: string; description: string }[] = [
  { id: 'ai', title: 'AI labels only', description: 'Removes Content Credentials that declare AI, the IPTC AI source type and AI fields, prompts, workflows, AI tool names and AI keywords. Camera data, location, copyright and SEO stay.' },
  { id: 'private', title: 'AI labels + location & device', description: 'Also removes all Content Credentials, GPS and place names, serial numbers, owner, software, document IDs, MakerNotes and thumbnails.' },
  { id: 'all', title: 'Everything', description: 'Removes every metadata block. Keeps the colour profile and orientation so the photo looks the same.' }
];

const wasCleaned = (file: MetaFile) => file.history.some((entry) => entry.action === 'AI Labels Removed' || entry.action === 'AI Label Removal');

export default function AiLabelRemoverView() {
  const {
    files, aiCleanLevel, aiKeepAttribution, setAiCleanOptions, removeAiLabels, batchRemoveAiLabels,
    exportSingle, exportAllZip, setActiveFile, setCurrentView, addFiles, addToast, isProcessing
  } = useMetaForge('files', 'aiCleanLevel', 'aiKeepAttribution', 'setAiCleanOptions', 'removeAiLabels', 'batchRemoveAiLabels',
    'exportSingle', 'exportAllZip', 'setActiveFile', 'setCurrentView', 'addFiles', 'addToast', 'isProcessing');
  const [filter, setFilter] = useState<'all' | 'needs' | 'clean'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const labeled = files.filter((file) => file.aiProvenance.status === 'LABELED').length;
  const traces = files.filter((file) => file.aiProvenance.status === 'TRACES').length;
  const needsCleaning = labeled + traces;
  const cleaned = files.filter((file) => wasCleaned(file) && file.aiProvenance.status === 'CLEAN');
  const batchCount = aiCleanLevel === 'ai' ? needsCleaning : files.length;
  const visible = files.filter((file) => filter === 'all' || (filter === 'needs') === (file.aiProvenance.status !== 'CLEAN'));

  const loadSample = async () => {
    try { await addFiles([await createSampleAiLabeledImage()]); }
    catch (error) { addToast({ type: 'error', title: 'Sample Could Not Load', description: error instanceof Error ? error.message : 'Try an image from your device.' }); }
  };

  return (
    <div className="flex-1 flex flex-col gap-5 sm:gap-6 p-3 sm:p-6 max-w-7xl mx-auto w-full pb-safe">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="max-w-2xl">
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ScanEye className="w-5 h-5 text-purple-400" aria-hidden="true" />
            AI Label Remover
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed">
            Finds and removes the metadata that makes Instagram, Facebook, Threads, TikTok and LinkedIn show “AI info” labels:
            Content Credentials (C2PA), the IPTC AI source type, prompts and AI tool names. Everything runs on this device and the image itself is not re-encoded.
          </p>
        </div>
        {cleaned.length > 0 && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => { void exportAllZip(cleaned.map((file) => file.id)); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition touch-target sm:min-h-0 shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
            Download {cleaned.length} cleaned (ZIP)
          </button>
        )}
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col gap-4 max-w-3xl w-full mx-auto">
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-bold text-white">Check a photo for AI labels</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">Add images to see which AI markers they carry. Nothing is uploaded.</p>
            </div>
            <button
              type="button"
              onClick={() => { void loadSample(); }}
              disabled={isProcessing}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition touch-target sm:min-h-0 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
              Try an AI-labelled sample
            </button>
          </div>
          <Dropzone />
          <WatermarkNote />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Scanned" value={files.length} note="Images in the queue" />
            <Stat label="Label signals" value={labeled} note="Platforms can label these" tone={labeled ? 'text-rose-300' : 'text-white'} />
            <Stat label="AI metadata" value={traces} note="Prompts, tools, history" tone={traces ? 'text-amber-300' : 'text-white'} />
            <Stat label="Clean" value={files.length - needsCleaning} note={cleaned.length ? `${cleaned.length} cleaned and verified` : 'No AI markers found'} tone="text-emerald-300" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">
            {/* Cleaning options: first on phones, so the level is chosen before running. */}
            <section aria-labelledby="ai-clean-heading" className="lg:order-2 lg:sticky lg:top-0 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3">
              <h2 id="ai-clean-heading" className="text-xs font-bold uppercase tracking-wider text-neutral-400">Cleaning level</h2>
              <div role="radiogroup" aria-labelledby="ai-clean-heading" className="flex flex-col gap-2">
                {LEVELS.map((level) => (
                  <label
                    key={level.id}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-purple-500/40 ${
                      aiCleanLevel === level.id ? 'border-purple-500/50 bg-purple-500/10' : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ai-clean-level"
                      value={level.id}
                      checked={aiCleanLevel === level.id}
                      onChange={() => setAiCleanOptions({ level: level.id })}
                      aria-labelledby={`ai-level-${level.id}-title`}
                      aria-describedby={`ai-level-${level.id}-description`}
                      className="mt-0.5 w-4 h-4 accent-purple-500 shrink-0"
                    />
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span id={`ai-level-${level.id}-title`} className="text-xs font-semibold text-white">{level.title}</span>
                      <span id={`ai-level-${level.id}-description`} className="text-[11px] text-neutral-400 leading-snug">{level.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              {aiCleanLevel === 'all' && (
                <label className="flex items-start gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiKeepAttribution}
                    onChange={(event) => setAiCleanOptions({ keepAttribution: event.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-purple-500 shrink-0"
                  />
                  <span>Keep creator and copyright <span className="text-neutral-500">(unless they name an AI tool)</span></span>
                </label>
              )}
              <button
                type="button"
                disabled={isProcessing || batchCount === 0}
                onClick={() => { void batchRemoveAiLabels(); }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-md touch-target cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
                {batchCount === 0 ? 'Nothing to remove' : `Remove from ${batchCount} image${batchCount === 1 ? '' : 's'}`}
              </button>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Each image is checked again after cleaning. If a marker remains, the image is left unchanged and the job reports it. Every change can be undone from the image history.
              </p>
              <div className="pt-3 border-t border-neutral-800 flex flex-col gap-2 text-[11px] leading-snug">
                <span className="font-semibold text-neutral-300">What platforms read</span>
                <p className="text-neutral-400"><span className="text-neutral-200">Content Credentials (C2PA):</span> Instagram, Facebook, Threads, TikTok, LinkedIn and Google.</p>
                <p className="text-neutral-400"><span className="text-neutral-200">IPTC digital source type:</span> Instagram, Facebook, Threads and Google.</p>
                <p className="text-neutral-400"><span className="text-neutral-200">Prompts and tool names:</span> not used for labels, but anyone who opens the file can read them.</p>
              </div>
            </section>

            {/* Image list */}
            <section aria-labelledby="ai-images-heading" className="lg:order-1 min-w-0 p-3 sm:p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="ai-images-heading" className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Images className="w-3.5 h-3.5" aria-hidden="true" /> Images
                </h2>
                <div role="group" aria-label="Show images" className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-xl text-[11px] font-semibold">
                  {([['all', `All ${files.length}`], ['needs', `Needs cleaning ${needsCleaning}`], ['clean', `Clean ${files.length - needsCleaning}`]] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={filter === id}
                      onClick={() => setFilter(id)}
                      className={`px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${filter === id ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {visible.length === 0 ? (
                <p className="py-8 text-center text-xs text-neutral-400">{filter === 'needs' ? 'No image carries AI labels or AI metadata.' : 'No images in this group.'}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visible.map((file) => (
                    <ImageRow
                      key={file.id}
                      file={file}
                      expanded={expandedId === file.id}
                      onToggle={() => setExpandedId(expandedId === file.id ? null : file.id)}
                      onRemove={() => { void removeAiLabels(file.id); }}
                      onDownload={() => exportSingle(file.id)}
                      onOpen={() => { setActiveFile(file.id); setCurrentView('studio'); }}
                      disabled={isProcessing}
                    />
                  ))}
                </ul>
              )}
              <div className="pt-1">
                <Dropzone />
              </div>
            </section>
          </div>
          <WatermarkNote />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, note, tone = 'text-white' }: { label: string; value: number; note: string; tone?: string }) {
  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider truncate">{label}</span>
      <span className={`text-2xl font-bold font-mono ${tone}`}>{value}</span>
      <span className="text-[10px] text-neutral-500 font-mono truncate">{note}</span>
    </div>
  );
}

function ImageRow({ file, expanded, onToggle, onRemove, onDownload, onOpen, disabled }: {
  file: MetaFile; expanded: boolean; onToggle: () => void; onRemove: () => void; onDownload: () => void; onOpen: () => void; disabled: boolean;
}) {
  const report = file.aiProvenance;
  const status = AI_STATUS_STYLES[report.status];
  const verified = report.status === 'CLEAN' && wasCleaned(file);
  const kinds = [...new Set(report.signals.map((signal) => signal.kind))];
  const detailsId = `ai-signals-${file.id}`;
  return (
    <li className="rounded-xl border border-neutral-800 bg-neutral-950/50">
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-2.5">
        <button type="button" onClick={onOpen} title="Open in the Studio" className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black border border-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" />
        </button>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-white truncate">{file.name}</span>
            <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-px rounded border text-[10px] font-bold ${status.className}`}>
              {verified ? <><BadgeCheck className="w-3 h-3" aria-hidden="true" /> Cleaned · verified</> : status.label}
            </span>
          </div>
          {report.signals.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {kinds.slice(0, 4).map((kind) => (
                <span key={kind} className="px-1.5 py-px rounded bg-neutral-800 text-neutral-300 text-[10px] font-medium">{AI_KIND_LABELS[kind]}</span>
              ))}
              {kinds.length > 4 && <span className="text-[10px] text-neutral-500">+{kinds.length - 4}</span>}
              {report.generator && <span className="text-[10px] text-neutral-400 truncate">· {report.generator}</span>}
            </div>
          ) : (
            <span className="text-[11px] text-neutral-500">{verified ? 'No AI markers remain in the file.' : 'No AI labels or AI metadata found.'}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {report.status !== 'CLEAN' ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 transition touch-target sm:min-h-8"
            >
              <Eraser className="w-3.5 h-3.5" aria-hidden="true" /> Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition touch-target sm:min-h-8"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" /> Download
            </button>
          )}
          {report.signals.length > 0 && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={detailsId}
              aria-label={`${expanded ? 'Hide' : 'Show'} AI markers in ${file.name}`}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition touch-target sm:min-h-8 sm:min-w-8 flex items-center justify-center"
            >
              <ChevronDown className={`w-4 h-4 transition ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {expanded && report.signals.length > 0 && (
        <ul id={detailsId} className="border-t border-neutral-800 divide-y divide-neutral-800/70 text-[11px]">
          {report.signals.map((signal) => (
            <li key={signal.id} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 px-3 py-2">
              <span className="sm:w-44 shrink-0 flex items-center gap-1.5 font-semibold text-neutral-200">
                {signal.triggersLabel ? <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-hidden="true" /> : <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />}
                {signal.label}
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-neutral-300 break-words">{signal.detail}</span>
                <span className="text-neutral-500 font-mono text-[10px] break-words">
                  {signal.locations.join(' · ')}{signal.triggersLabel ? ' · read by platforms' : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function WatermarkNote() {
  return (
    <p className="flex items-start gap-2 text-[11px] text-neutral-500 leading-relaxed max-w-3xl">
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        This removes metadata only. Invisible watermarks inside the pixels (such as Google SynthID) are part of the image and stay,
        and platforms can still label an image from their own detection or from how it is posted.
      </span>
    </p>
  );
}
