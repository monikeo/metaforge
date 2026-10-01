'use client';

import React, { useState } from 'react';
import { AiWorkflowInfo } from '@/lib/types';
import { Bot, Copy, Check, ChevronDown, ChevronRight, Terminal, Sparkles, Cpu } from 'lucide-react';

interface AIWorkflowDetectProps {
  workflow: AiWorkflowInfo;
}

export default function AIWorkflowDetect({ workflow }: AIWorkflowDetectProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  if (!workflow.detected) {
    return (
      <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center">
        <Bot className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-neutral-300">No AI Workflow Artifacts Detected</p>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          This image appears to be an authentic camera capture or clean raster without ComfyUI, Stable Diffusion, or Midjourney generation chunks.
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    if (workflow.rawWorkflow) {
      navigator.clipboard.writeText(workflow.rawWorkflow);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-neutral-900 border border-purple-500/30 p-4 shadow-lg shadow-purple-950/20">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                AI Generation Detected
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {workflow.type}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">Embedded prompt parameters & pipeline graph</p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy Parameters'}
        </button>
      </div>

      {/* Prompt */}
      {workflow.prompt && (
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Terminal className="w-3 h-3 text-purple-400" /> Positive Prompt
          </span>
          <p className="text-xs font-mono text-purple-200/90 leading-relaxed whitespace-pre-wrap select-all">
            {workflow.prompt}
          </p>
        </div>
      )}

      {/* Negative Prompt */}
      {workflow.negativePrompt && (
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Negative Prompt
          </span>
          <p className="text-xs font-mono text-rose-300/80 leading-relaxed whitespace-pre-wrap select-all">
            {workflow.negativePrompt}
          </p>
        </div>
      )}

      {/* Synthesis Hyperparameters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {workflow.sampler && (
          <div className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block uppercase">Sampler</span>
            <span className="text-xs font-mono font-medium text-neutral-200 truncate block">
              {workflow.sampler}
            </span>
          </div>
        )}
        {workflow.steps !== undefined && (
          <div className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block uppercase">Steps</span>
            <span className="text-xs font-mono font-medium text-neutral-200">
              {workflow.steps}
            </span>
          </div>
        )}
        {workflow.cfg !== undefined && (
          <div className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block uppercase">CFG Scale</span>
            <span className="text-xs font-mono font-medium text-neutral-200">
              {workflow.cfg}
            </span>
          </div>
        )}
        {workflow.seed && (
          <div className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block uppercase">Seed</span>
            <span className="text-xs font-mono font-medium text-neutral-200 truncate block" title={workflow.seed}>
              {workflow.seed}
            </span>
          </div>
        )}
        {workflow.model && (
          <div className="col-span-2 p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block uppercase flex items-center gap-1">
              <Cpu className="w-3 h-3 text-neutral-400" /> Base Model
            </span>
            <span className="text-xs font-mono font-medium text-neutral-200 truncate block">
              {workflow.model}
            </span>
          </div>
        )}
      </div>

      {/* Raw Workflow Collapsible */}
      {workflow.rawWorkflow && (
        <div className="flex flex-col gap-1 border-t border-neutral-800/80 pt-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center justify-between text-xs text-neutral-400 hover:text-white py-1 px-1 rounded transition"
          >
            <span className="flex items-center gap-1.5 font-medium">
              {showRaw ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Inspect Raw Workflow Graph / Metadata
            </span>
            <span className="text-[10px] font-mono text-neutral-500">
              {workflow.rawWorkflow.length} bytes
            </span>
          </button>

          {showRaw && (
            <div className="mt-1 max-h-48 overflow-auto p-3 rounded-xl bg-black border border-neutral-800 text-[11px] font-mono text-neutral-400 whitespace-pre-wrap select-all">
              {workflow.rawWorkflow}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
