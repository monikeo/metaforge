'use client';

import React from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { BatchJob } from '@/lib/types';
import { 
  Cpu, 
  MapPinOff, 
  ShieldCheck, 
  Download, 
  Trash2
} from 'lucide-react';

export default function BatchJobsView() {
  const { files, stripAllGps, batchSanitizeForSocial, exportAllZip, batchJobs: jobs, clearCompletedJobs, isProcessing } = useMetaForgeStore();
  const startNewBatchJob = async (_name: string, type: BatchJob['type']) => {
    if (type === 'STRIP_GPS') await stripAllGps();
    else if (type === 'SANITIZE_SOCIAL') await batchSanitizeForSocial();
    else if (type === 'EXPORT_ZIP') await exportAllZip();
  };
  const handleClearCompleted = clearCompletedJobs;

  return (
    <div className="flex-1 flex flex-col gap-5 sm:gap-6 p-3 sm:p-6 max-w-7xl mx-auto w-full pb-safe">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            Background Batch Processing Queue
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Asynchronous task queue monitor. Live progress and per-file results for this browser session.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={isProcessing || files.length === 0}
            onClick={() => startNewBatchJob('Batch GPS Strip Queue', 'STRIP_GPS')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition touch-target sm:min-h-0 sm:min-w-0 cursor-pointer shadow-xs"
          >
            <MapPinOff className="w-3.5 h-3.5 text-rose-400" />
            Strip GPS
          </button>

          <button
            disabled={isProcessing || files.length === 0}
            onClick={() => startNewBatchJob('Social OPSEC Batch Sanitize', 'SANITIZE_SOCIAL')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition touch-target sm:min-h-0 sm:min-w-0 cursor-pointer shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Social Sanitize
          </button>

          <button
            disabled={isProcessing || files.length === 0}
            onClick={() => startNewBatchJob('Package All as Compressed ZIP', 'EXPORT_ZIP')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition touch-target sm:min-h-0 sm:min-w-0 cursor-pointer shadow-md shadow-purple-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            Batch ZIP Export
          </button>

          {jobs.some((j) => j.status !== 'RUNNING' && j.status !== 'QUEUED') && (
            <button
              onClick={handleClearCompleted}
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
          const isCompleted = job.status === 'COMPLETED';

          return (
            <div
              key={job.id}
              className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3 shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${
                    isRunning
                      ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}>
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{job.name}</h3>
                    <p className="text-[11px] font-mono text-neutral-500">
                      ID: {job.id} • Started {new Date(job.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    isRunning
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {job.status}
                  </span>

                  <span className="text-xs font-mono font-bold text-neutral-200">
                    {job.completed} / {job.total} images
                  </span>
                </div>
              </div>

              {job.errors.length > 0 && <ul className="text-xs text-rose-300 break-words space-y-1" aria-label="File errors">{job.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
              {/* Progress Bar */}
              <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    isRunning ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-emerald-500'
                  }`}
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
