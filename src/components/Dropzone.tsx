'use client';

import React, { useRef, useState } from 'react';
import { useMetaForge } from '@/lib/store';
import { UploadCloud, ShieldCheck, Sparkles, MapPin } from 'lucide-react';
import { createSampleExifImage, createSampleAiPng } from '@/lib/sample-data';
import { filesFromDataTransfer, importImageFiles } from '@/lib/import-files';

export default function Dropzone() {
  const { addFiles, addToast, isProcessing } = useMetaForge('addFiles', 'addToast', 'isProcessing');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Moving between child elements fires dragleave on the parent; only reset when the pointer leaves the zone.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // Folder entries must be read before this handler returns.
    void filesFromDataTransfer(e.dataTransfer).then(importImageFiles);
  };

  const handleLoadSampleGps = async () => {
    try {
      const sample = await createSampleExifImage({
        title: 'Shibuya Crossing Night Street Photography',
        cameraMake: 'Sony',
        cameraModel: 'ILCE-7M4 (A7 IV)',
        lensModel: 'FE 35mm F1.4 GM',
        serialNumber: 'SN-7849102-JP',
        artist: 'Hiroshi Tanaka',
        copyright: '© 2026 Hiroshi Tanaka. All rights reserved.',
        latitude: 35.6595,
        longitude: 139.7005,
        color: '#0369a1'
      });
      await addFiles([sample]);
    } catch (error) { addToast({ type: 'error', title: 'Sample Could Not Load', description: error instanceof Error ? error.message : 'Try loading an image from your device.' }); }
  };

  const handleLoadSampleAi = async () => {
    try {
      const sample = await createSampleAiPng();
      await addFiles([sample]);
    } catch (error) { addToast({ type: 'error', title: 'Sample Could Not Load', description: error instanceof Error ? error.message : 'Try loading an image from your device.' }); }
  };

  return (
    <div
      role="group"
      aria-label="Import images"
      data-dropzone
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition duration-200 cursor-pointer text-center ${
        isDragOver
          ? 'border-purple-500 bg-purple-950/20'
          : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/70'
      }`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        aria-label="Choose image files"
        accept="image/jpeg,image/png,image/webp,image/avif,image/tiff,image/heic,image/heif,image/gif,.heic,.heif"
        onChange={(e) => { void importImageFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
        className="sr-only"
      />

      <div className="p-3 rounded-2xl bg-neutral-800/80 text-neutral-300 border border-neutral-700 mb-3 group-hover:scale-105 transition">
        <UploadCloud className="w-6 h-6 text-purple-400" />
      </div>

      <h3 className="text-sm font-bold text-white tracking-wide">
        Drop images or folders here, or <span className="text-purple-400 underline underline-offset-2">browse files</span>
      </h3>
      <p className="text-xs text-neutral-400 mt-1">
        JPEG, PNG, WebP, AVIF, HEIC, TIFF, GIF • 100 MB per image • Paste with Ctrl/⌘+V
      </p>

      {/* Privacy Guarantee Tag */}
      <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Local metadata tools • AI analysis is optional</span>
      </div>

      {/* Quick Sample Buttons */}
      <div
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleLoadSampleGps}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
        >
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          Load Sample (GPS + Sony EXIF)
        </button>

        <button
          type="button"
          onClick={handleLoadSampleAi}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          Load Sample (AI / ComfyUI)
        </button>
      </div>
    </div>
  );
}
