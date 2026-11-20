'use client';

import React from 'react';
import { useMetaForge } from '@/lib/store';
import type { MetaFile } from '@/lib/types';
import { AI_KIND_LABELS } from './AiLabelRemoverView';
import { ScanEye, Eraser, CheckCircle2, ArrowRight } from 'lucide-react';

const LEVEL_NAMES = { ai: 'AI labels only', private: 'AI + location & device', all: 'Everything' } as const;

/** AI label findings for one image, shown in the Studio's privacy panel. */
export default function AiLabelSummary({ file }: { file: MetaFile }) {
  const { removeAiLabels, setCurrentView, aiCleanLevel, isProcessing } = useMetaForge('removeAiLabels', 'setCurrentView', 'aiCleanLevel', 'isProcessing');
  const report = file.aiProvenance;

  if (report.status === 'CLEAN') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-950/50 border border-neutral-800 text-xs text-neutral-300">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
        <span>No AI labels or AI metadata found.</span>
      </div>
    );
  }

  const labeled = report.status === 'LABELED';
  return (
    <div className={`flex flex-col gap-2.5 p-3 rounded-xl border text-xs ${labeled ? 'bg-rose-950/20 border-rose-500/25' : 'bg-amber-950/20 border-amber-500/25'}`}>
      <div className="flex items-start gap-2.5">
        <ScanEye className={`w-4 h-4 mt-0.5 shrink-0 ${labeled ? 'text-rose-400' : 'text-amber-400'}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">
            {labeled ? 'Platforms can show an AI label for this image' : 'AI metadata found'}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
            {report.signals.length} marker{report.signals.length === 1 ? '' : 's'}: {[...new Set(report.signals.map((signal) => AI_KIND_LABELS[signal.kind]))].join(', ')}
            {report.generator ? ` · ${report.generator}` : ''}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => { void removeAiLabels(file.id); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition touch-target sm:min-h-8"
        >
          <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
          Remove AI labels
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('ai-labels')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition touch-target sm:min-h-8"
        >
          Details &amp; levels <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </button>
        <span className="text-[10px] text-neutral-500 font-mono">Level: {LEVEL_NAMES[aiCleanLevel]}</span>
      </div>
    </div>
  );
}
