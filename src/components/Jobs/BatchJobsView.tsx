'use client';

import React, { useState } from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { BatchJob } from '@/lib/types';
import { 
  Cpu, 
  MapPinOff, 
  ShieldCheck 
} from 'lucide-react';

export default function BatchJobsView() {
  const { files } = useMetaForgeStore();

  // Local active and historical batch jobs (lazy initialization for pure render)
  const [jobs, setJobs] = useState<BatchJob[]>(() => {
    const now = Date.now();
    return [
      {
        id: 'job-101',
        name: 'Batch GPS Coordinate Removal Pipeline',
        type: 'STRIP_GPS',
        status: 'COMPLETED',
        total: 1284,
        completed: 1284,
        failed: 0,
        progress: 100,
        createdAt: now - 3600000,
        errors: []
      },
      {
        id: 'job-102',
        name: 'Google Gemini Vision Alt-Text Generation',
        type: 'AI_SEO',
        status: 'COMPLETED',
        total: 428,
        completed: 428,
        failed: 0,
        progress: 100,
        createdAt: now - 1800000,
        errors: []
      }
    ];
  });

  const startNewBatchJob = (name: string, type: BatchJob['type']) => {
    const totalCount = files.length || 250;
    const newJob: BatchJob = {
      id: `job-${Date.now()}`,
      name,
      type,
      status: 'RUNNING',
      total: totalCount,
      completed: 0,
      failed: 0,
      progress: 0,
      createdAt: Date.now(),
      errors: []
    };

    setJobs((prev) => [newJob, ...prev]);

    // Simulate progress in increments
    let comp = 0;
    const interval = setInterval(() => {
      comp += Math.floor(Math.random() * 25) + 15;
      if (comp >= totalCount) {
        comp = totalCount;
        clearInterval(interval);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === newJob.id
              ? { ...j, completed: totalCount, progress: 100, status: 'COMPLETED' }
              : j
          )
        );
      } else {
        const prog = Math.round((comp / totalCount) * 100);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === newJob.id ? { ...j, completed: comp, progress: prog } : j
          )
        );
      }
    }, 300);
  };

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
            Asynchronous task queue monitor. High-throughput parallel operations with zero main thread freezes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => startNewBatchJob('Batch GPS Strip Queue', 'STRIP_GPS')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition touch-target sm:min-h-0 sm:min-w-0"
          >
            <MapPinOff className="w-3.5 h-3.5 text-rose-400" />
            Run GPS Scrub Job
          </button>

          <button
            onClick={() => startNewBatchJob('Social OPSEC Batch Sanitize', 'SANITIZE_SOCIAL')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition touch-target sm:min-h-0 sm:min-w-0"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Run Social Sanitize
          </button>
        </div>
      </div>

      {/* Jobs Queue List */}
      <div className="flex flex-col gap-3">
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
