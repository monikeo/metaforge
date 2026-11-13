'use client';

import React from 'react';
import { useMetaForge } from '@/lib/store';
import type { BatchJob } from '@/lib/types';
import {
  Cpu,
  MapPinOff,
  ShieldCheck,
  Download,
  Trash2,
  Square
} from 'lucide-react';

const STATUS_STYLES: Record<BatchJob['status'], { badge: string; bar: string; icon: string }> = {
  RUNNING: { badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30', bar: 'bg-purple-500', icon: 'bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse' },
  QUEUED: { badge: 'bg-neutral-800 text-neutral-400', bar: 'bg-neutral-600', icon: 'bg-neutral-800 border-neutral-700 text-neutral-400' },
  PAUSED: { badge: 'bg-neutral-800 text-neutral-400', bar: 'bg-neutral-600', icon: 'bg-neutral-800 border-neutral-700 text-neutral-400' },
  COMPLETED: { badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', bar: 'bg-emerald-500', icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  FAILED: { badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30', bar: 'bg-rose-500', icon: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
  CANCELLED: { badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30', bar: 'bg-amber-500', icon: 'bg-amber-500/10 border-amber-500/20 text-amber-400' }
};

export default function BatchJobsView() {
  const { files, stripAllGps, batchSanitizeForSocial, exportAllZip, batchJobs: jobs, clearCompletedJobs, cancelBatch, isProcessing } =
    useMetaForge('files', 'stripAllGps', 'batchSanitizeForSocial', 'exportAllZip', 'batchJobs', 'clearCompletedJobs', 'cancelBatch', 'isProcessing');

  return (
    <div className="flex-1 flex flex-col gap-5 sm:gap-6 p-3 sm:p-6 max-w-7xl mx-auto w-full pb-safe">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-neutral-400" />
            Background Batch Processing Queue
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Asynchronous task queue monitor. Live progress and per-file results for this browser session. Running jobs can be cancelled between images.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={isProcessing || files.length === 0}
            onClick={() => { void stripAllGps(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition touch-target sm:min-h-0 sm:min-w-0 cursor-pointer shadow-xs"
          >
            <MapPinOff className="w-3.5 h-3.5 text-rose-400" />
            Strip GPS
          </button>

          <button
            disabled={isProcessing || files.length === 0}
            onClick={() => { void batchSanitizeForSocial(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition touch-target sm:min-h-0 sm:min-w-0 cursor-pointer shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
            Social Sanitize
          </button>

          <button
            disabled={isProcessing || files.length === 0}
            onClick={() => { void exportAllZip(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition touch-target sm:min-h-0 sm:min-w-0 cursor-pointer shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            Batch ZIP Export
          </button>

          {jobs.some((j) => j.status !== 'RUNNING' && j.status !== 'QUEUED') && (
            <button
              onClick={clearCompletedJobs}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition cursor-pointer"
              title="Clear completed tasks"
            >
              <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
              <span>Clear Finished</span>
            </button>
          )}
        </div>
      </div>
      {/* Jobs Queue List */}
      <div className="flex flex-col gap-3">
        {!jobs.length && <p className="p-6 rounded-2xl border border-neutral-800 text-sm text-neutral-400 text-center">No jobs yet. Import images and run a batch operation to see its progress here.</p>}
        {jobs.map((job) => {
          const isRunning = job.status === 'RUNNING';
          const style = STATUS_STYLES[job.status] || STATUS_STYLES.QUEUED;

          return (
            <div
              key={job.id}
              className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3 shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl border ${style.icon}`}>
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white">{job.name}</h3>
                    <p className="text-[11px] font-mono text-neutral-500 truncate">
                      Started {new Date(job.createdAt).toLocaleTimeString()} • {job.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${style.badge}`}>
                    {job.status}
                  </span>

                  <span className="text-xs font-mono font-bold text-neutral-200">
                    {job.completed} / {job.total} images
                  </span>

                  {isRunning && (
                    <button
                      type="button"
                      onClick={cancelBatch}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-neutral-800 hover:bg-rose-600 text-neutral-200 border border-neutral-700 transition"
                    >
                      <Square className="w-3 h-3" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {job.errors.length > 0 && <ul className="text-xs text-rose-300 break-words space-y-1 max-h-40 overflow-y-auto" aria-label="File errors">{job.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
              {/* Progress Bar */}
              <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800" role="progressbar" aria-label={`${job.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progress}>
                <div
                  className={`h-full transition-all duration-300 ${style.bar}`}
                  style={{ width: `${job.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>Progress: {job.progress}%</span>
                <span>Success: {job.completed} • Errors: {job.failed}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
