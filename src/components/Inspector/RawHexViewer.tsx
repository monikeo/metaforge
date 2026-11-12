'use client';

import { copyText } from '@/lib/clipboard';

import React, { useState } from 'react';
import { Copy, Check, Binary, Search } from 'lucide-react';

interface RawHexViewerProps {
  hexData?: string;
  fileName?: string;
  fileSize?: number;
}

export default function RawHexViewer({ hexData, fileName, fileSize }: RawHexViewerProps) {
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('');

  const handleCopy = async () => {
    if (hexData) {
      if (!(await copyText(hexData))) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = (hexData || '').split('\n').filter(Boolean);
  const filteredLines = filter
    ? lines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300">
            <Binary className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-200">Raw Binary Header & Hex Stream</h4>
            <p className="text-[11px] text-neutral-500 font-mono">
              {fileName || 'File'} • {fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search hex/ASCII..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 pr-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 w-36"
            />
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Hex'}
          </button>
        </div>
      </div>

      {/* Hex Stream Display */}
      <div className="overflow-x-auto rounded-xl bg-black border border-neutral-800 p-3 font-mono text-[11px] leading-5 text-neutral-400 select-all max-h-96">
        <div className="text-neutral-600 border-b border-neutral-900 pb-1 mb-1 font-semibold">
          OFFSET   00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F  |ASCII DECODE|
        </div>
        {filteredLines.length > 0 ? (
          filteredLines.map((line, idx) => (
            <div key={idx} className="hover:bg-neutral-900/60 px-1 rounded transition">
              <span className="text-purple-400">{line.slice(0, 8)}</span>
              <span className="text-neutral-300">{line.slice(8, 56)}</span>
              <span className="text-emerald-400">{line.slice(56)}</span>
            </div>
          ))
        ) : (
          <div className="text-neutral-600 italic py-2">No matching hex patterns found.</div>
        )}
      </div>

      <p className="text-[10px] text-neutral-500">
        Showing the first {lines.length * 16 >= 1024 ? `${Math.round(lines.length * 16 / 1024)} KB` : `${lines.length * 16} bytes`} of the current file, including magic bytes (e.g. FFD8FFE0 for JPEG, 89504E47 for PNG), marker segments, and Exif APP1 chunks.
      </p>
    </div>
  );
}
