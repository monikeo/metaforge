'use client';

import React, { useRef, useState } from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { UploadCloud, ShieldCheck, Sparkles, MapPin } from 'lucide-react';
import { createSampleExifJpeg, createSampleAiPng } from '@/lib/sample-data';

export default function Dropzone() {
  const { addFiles, addToast, isProcessing } = useMetaForgeStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    const allFiles = Array.from(fileList);
    const validFiles = allFiles.filter(
      (f) => f.type.startsWith('image/') || f.name.match(/\.(jpe?g|png|webp|avif|tiff?|heic)$/i)
    );
    const skippedCount = allFiles.length - validFiles.length;

    if (skippedCount > 0) {
      addToast({
        type: 'warning',
        title: 'Non-Image Files Skipped',
        description: `${skippedCount} file(s) ignored. MetaForge supports JPEG, PNG, WebP, AVIF, TIFF.`
      });
    }

    if (validFiles.length) {
      await addFiles(validFiles);
    } else if (allFiles.length > 0) {
      addToast({
        type: 'error',
        title: 'No Supported Images',
        description: 'Please upload image files (JPEG, PNG, WebP, AVIF, TIFF).'
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    await handleFiles(e.dataTransfer.files);
  };

  const handleLoadSampleGps = async () => {
    const sample = await createSampleExifJpeg({
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
  };

  const handleLoadSampleAi = async () => {
    const sample = await createSampleAiPng();
    await addFiles([sample]);
  };

  return (
    <div
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
        accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      <div className="p-3 rounded-2xl bg-neutral-800/80 text-neutral-300 border border-neutral-700 mb-3 group-hover:scale-105 transition">
        <UploadCloud className="w-6 h-6 text-purple-400" />
      </div>

      <h3 className="text-sm font-bold text-white tracking-wide">
        Drop images here, or <span className="text-purple-400 underline underline-offset-2">browse files</span>
      </h3>
      <p className="text-xs text-neutral-400 mt-1">
        Supports JPEG, PNG, WebP, AVIF, TIFF • Unlimited multi-file queue
      </p>

      {/* Privacy Guarantee Tag */}
      <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>In-Memory Client Engine — 0 Bytes Sent to Server</span>
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
