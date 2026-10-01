import React from 'react';
import Link from 'next/link';
import { Flame, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 p-0.5 shadow-xl shadow-purple-600/20">
          <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
            <Flame className="w-7 h-7 text-amber-400" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-3xl font-black font-mono text-purple-400">404</span>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            The workspace or route you requested does not exist or has been moved.
          </p>
        </div>

        <Link
          href="/"
          className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to MetaForge Studio</span>
        </Link>
      </div>
    </div>
  );
}
