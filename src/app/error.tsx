'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCcw, Home, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error captured by MetaForge boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-950/30">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Unexpected Workspace Error
          </h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            An isolated exception occurred during client-side execution. Your files remain protected in local browser memory.
          </p>
        </div>

        {error.message && (
          <div className="w-full p-3 rounded-xl bg-black border border-neutral-800 text-[11px] font-mono text-rose-300/90 text-left max-h-32 overflow-auto break-words">
            {error.message}
          </div>
        )}

        <div className="flex items-center gap-2.5 w-full pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition active:scale-95"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Recover Session</span>
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Reset Studio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
