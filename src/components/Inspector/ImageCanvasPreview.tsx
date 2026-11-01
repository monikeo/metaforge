'use client';

import React, { useState, useRef } from 'react';
import { MetaFile } from '@/lib/types';
import { useMetaForgeStore } from '@/lib/store';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  History, 
  Edit2, 
  Check, 
  X, 
  FileCode,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import MetadataHistoryModal from '../History/MetadataHistoryModal';

interface ImageCanvasPreviewProps {
  file: MetaFile;
}

export default function ImageCanvasPreview({ file }: ImageCanvasPreviewProps) {
  const { files, setActiveFile, exportSingle, exportMetadataJson, renameFile } = useMetaForgeStore();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(file.name);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const activeIndex = files.findIndex((f) => f.id === file.id);

  const [prevFileId, setPrevFileId] = useState(file.id);
  if (file.id !== prevFileId) {
    setPrevFileId(file.id);
    setNameInput(file.name);
    setIsEditingName(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }

  const handleSaveName = () => {
    if (nameInput.trim() && nameInput.trim() !== file.name) {
      renameFile(file.id, nameInput.trim());
    }
    setIsEditingName(false);
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 4));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
    }
  };

  // Touch Swipe for Mobile Navigation (when scale === 1)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale === 1 && e.touches.length === 1 && !(e.target as HTMLElement).closest('button')) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else touchStartRef.current = null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || scale > 1) return;
    const touchEnd = e.changedTouches[0];
    const diffX = touchEnd.clientX - touchStartRef.current.x;
    const diffY = touchEnd.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Minimum horizontal swipe distance of 50px with low vertical slope
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0 && files.length > 1) {
        // Swipe left -> Next image
        const nextIdx = (activeIndex + 1) % files.length;
        setActiveFile(files[nextIdx].id);
      } else if (diffX > 0 && files.length > 1) {
        // Swipe right -> Prev image
        const prevIdx = (activeIndex - 1 + files.length) % files.length;
        setActiveFile(files[prevIdx].id);
      }
    }
  };

  const handlePrevImage = () => {
    if (files.length > 1) {
      const prevIdx = (activeIndex - 1 + files.length) % files.length;
      setActiveFile(files[prevIdx].id);
    }
  };

  const handleNextImage = () => {
    if (files.length > 1) {
      const nextIdx = (activeIndex + 1) % files.length;
      setActiveFile(files[nextIdx].id);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 p-3 sm:p-4 shadow-xl">
      {/* Canvas Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') {
                    setNameInput(file.name);
                    setIsEditingName(false);
                  }
                }}
                autoFocus
                className="px-2.5 py-1 bg-neutral-950 border border-purple-500 rounded-lg text-xs font-bold text-white focus:outline-none w-28 sm:w-36 font-mono min-h-[36px]"
              />
              <button
                onClick={handleSaveName}
                className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer touch-press"
                title="Save filename"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setNameInput(file.name);
                  setIsEditingName(false);
                }}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer touch-press"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                onClick={() => setIsEditingName(true)}
                title="Click to rename file"
                className="text-xs font-bold text-white truncate max-w-[130px] xs:max-w-[180px] sm:max-w-[min(16rem,50vw)] cursor-pointer hover:text-purple-300 transition"
              >
                {file.name}
              </span>
              <button
                onClick={() => setIsEditingName(true)}
                title="Rename file"
                className="p-1 rounded-lg text-neutral-500 hover:text-white min-w-[32px] min-h-[32px] flex items-center justify-center touch-press"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {file.isDirty ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
              MODIFIED
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 shrink-0">
              ORIGINAL
            </span>
          )}
        </div>

        {/* Zoom & Download Toolbar */}
        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 min-w-0 max-w-full ml-auto">
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 sm:p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer touch-press"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-neutral-400 w-8 text-center select-none">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 sm:p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer touch-press"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            title="Reset Zoom & Pan"
            className="p-2 sm:p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer touch-press"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            title="Audit History & Snapshots"
            className="p-2 sm:p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition relative min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer touch-press"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            {file.history && file.history.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500" />
            )}
          </button>

          <button
            onClick={() => exportMetadataJson(file.id)}
            title="Export Metadata as JSON (.json)"
            className="p-2 sm:p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer touch-press"
          >
            <FileCode className="w-3.5 h-3.5" />
          </button>

          <button
            aria-label="Download image"
            onClick={() => exportSingle(file.id)}
            className="ml-1 sm:ml-2 flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition shadow-xs min-h-[36px] cursor-pointer touch-press"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Interactive Pan/Zoom Canvas with Touch/Pointer/Swipe support */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleTap}
        className={`relative w-full h-[250px] xs:h-[290px] sm:h-[360px] md:h-[400px] xl:h-[420px] rounded-xl overflow-hidden bg-black/90 flex items-center justify-center select-none group shadow-inner ${
          scale > 1 ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-default touch-pan-y'
        }`}
        style={{
          backgroundImage: `
            linear-gradient(45deg, #141416 25%, transparent 25%), 
            linear-gradient(-45deg, #141416 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #141416 75%), 
            linear-gradient(-45deg, transparent 75%, #141416 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}
      >
        {/* Next / Prev Quick Image Navigation Arrows (Overlay for Fast Switching) */}
        {files.length > 1 && scale === 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-neutral-800 text-white/70 hover:text-white backdrop-blur-md border border-neutral-700/60 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-0 transition touch-press"
              title="Previous photo (← or [)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-neutral-800 text-white/70 hover:text-white backdrop-blur-md border border-neutral-700/60 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-0 transition touch-press"
              title="Next photo (→ or ])"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <div
          className="transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.thumbnailUrl}
            alt={file.name}
            className="max-h-[220px] xs:max-h-[260px] sm:max-h-[330px] md:max-h-[360px] xl:max-h-[380px] max-w-full object-contain pointer-events-none rounded shadow-2xl"
          />
        </div>

        {/* Dimension & Format Overlay Badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-neutral-800 text-[10px] font-mono text-neutral-300 shadow-md">
          <span>{file.type.replace('image/', '').toUpperCase()}</span>
          <span>•</span>
          <span>{file.width && file.height ? `${file.width}×${file.height} px` : 'N/A'}</span>
          <span>•</span>
          <span>{(file.size / 1024).toFixed(1)} KB</span>
        </div>

        {/* Mobile Swipe Hint Badge (Visible briefly or when scale is 1 on mobile) */}
        {files.length > 1 && scale === 1 && (
          <div className="md:hidden absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-[10px] text-neutral-400 font-mono border border-neutral-800/80">
            Swipe ↔
          </div>
        )}
      </div>

      {/* Audit History & Snapshot Rollback Modal */}
      <MetadataHistoryModal
        fileId={file.id}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
