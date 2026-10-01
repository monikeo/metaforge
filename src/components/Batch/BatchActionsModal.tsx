'use client';

import React, { useState } from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { 
  Layers, 
  X, 
  Check 
} from 'lucide-react';

interface BatchActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BatchActionsModal({ isOpen, onClose }: BatchActionsModalProps) {
  const { 
    files, 
    selectedFileIds, 
    batchBulkEdit, 
    batchRename 
  } = useMetaForgeStore();

  const [activeTab, setActiveTab] = useState<'metadata' | 'rename'>('metadata');
  
  // Metadata fields
  const [copyright, setCopyright] = useState('');
  const [artist, setArtist] = useState('');
  const [keywords, setKeywords] = useState('');
  const [keywordMode, setKeywordMode] = useState<'append' | 'replace'>('append');

  // Rename fields
  const [template, setTemplate] = useState('{title}-{date}-{counter}');

  if (!isOpen) return null;

  const targetIds = selectedFileIds.length > 0 ? selectedFileIds : files.map((f) => f.id);
  const targetCount = targetIds.length;

  const handleApplyMetadata = async () => {
    await batchBulkEdit(targetIds, {
      copyright: copyright.trim() || undefined,
      artist: artist.trim() || undefined,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      keywordMode
    });
    onClose();
  };

  const handleApplyRename = async () => {
    await batchRename(targetIds, template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl flex flex-col gap-4 max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto pb-safe sm:pb-5">
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-neutral-700/60 rounded-full mx-auto sm:hidden -mt-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Batch Operations Console</h3>
              <p className="text-xs text-neutral-400 font-mono">
                {targetCount} image(s) targeted for bulk processing
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg touch-target sm:min-h-0 sm:min-w-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('metadata')}
            className={`flex-1 py-2 sm:py-1.5 rounded-lg transition touch-target sm:min-h-0 ${
              activeTab === 'metadata' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Bulk Metadata Edit
          </button>
          <button
            onClick={() => setActiveTab('rename')}
            className={`flex-1 py-2 sm:py-1.5 rounded-lg transition touch-target sm:min-h-0 ${
              activeTab === 'rename' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Bulk Filename Renaming
          </button>
        </div>

        {/* Tab 1: Metadata */}
        {activeTab === 'metadata' && (
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-300">Set Copyright Notice</label>
              <input
                type="text"
                placeholder="e.g. © 2026 Acme Corp. All rights reserved."
                value={copyright}
                onChange={(e) => setCopyright(e.target.value)}
                className="px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500 min-h-[40px] sm:min-h-0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-300">Set Artist / Creator</label>
              <input
                type="text"
                placeholder="e.g. Lead Photographer"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500 min-h-[40px] sm:min-h-0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-neutral-300">Keywords (Comma-separated)</label>
                <div className="flex items-center gap-3 text-[11px]">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="kwMode"
                      checked={keywordMode === 'append'}
                      onChange={() => setKeywordMode('append')}
                      className="text-purple-600 bg-neutral-950 border-neutral-800"
                    />
                    <span className="text-neutral-400">Append</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="kwMode"
                      checked={keywordMode === 'replace'}
                      onChange={() => setKeywordMode('replace')}
                      className="text-purple-600 bg-neutral-950 border-neutral-800"
                    />
                    <span className="text-neutral-400">Replace</span>
                  </label>
                </div>
              </div>
              <input
                type="text"
                placeholder="e.g. editorial, landscape, commercial"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500 min-h-[40px] sm:min-h-0"
              />
            </div>

            <div className="flex justify-end items-center gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-neutral-400 hover:text-white rounded-lg touch-target sm:min-h-0 sm:min-w-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyMetadata}
                className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5 touch-target sm:min-h-0 sm:min-w-0 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Apply to {targetCount} Files
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Rename */}
        {activeTab === 'rename' && (
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-300">Filename Template</label>
              <input
                type="text"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="{title}-{date}-{counter}"
                className="px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500 min-h-[40px] sm:min-h-0"
              />
              <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                Available tags: <code className="text-purple-400">{'{title}'}</code>, <code className="text-purple-400">{'{date}'}</code>, <code className="text-purple-400">{'{artist}'}</code>, <code className="text-purple-400">{'{counter}'}</code>
              </p>
            </div>

            {/* Template Preview */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
              <span className="text-[10px] text-neutral-500 uppercase font-mono">Example Output Preview</span>
              <span className="font-mono text-purple-300 break-all">
                {template
                  .replace('{title}', 'shibuya-crossing')
                  .replace('{date}', '2026-10-01')
                  .replace('{artist}', 'hiroshi-tanaka')
                  .replace('{counter}', '001')}.jpg
              </span>
            </div>

            <div className="flex justify-end items-center gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-neutral-400 hover:text-white rounded-lg touch-target sm:min-h-0 sm:min-w-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRename}
                className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5 touch-target sm:min-h-0 sm:min-w-0 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Rename {targetCount} Files
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
