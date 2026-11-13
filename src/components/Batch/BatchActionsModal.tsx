'use client';

import ModalOverlay from '@/components/ModalOverlay';

import React, { useState } from 'react';
import { renameFromTemplate, useMetaForge } from '@/lib/store';
import {
  Layers,
  X,
  Check,
  Sparkles,
  Download,
  Key
} from 'lucide-react';

interface BatchActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'metadata' | 'rename' | 'ai';

export default function BatchActionsModal({ isOpen, onClose }: BatchActionsModalProps) {
  const { files, selectedFileIds, batchBulkEdit, batchRename, batchGenerateSeo, exportAllZip, isProcessing, aiEnabled, geminiApiKey, selectedModel, setIsAiSettingsOpen } =
    useMetaForge('files', 'selectedFileIds', 'batchBulkEdit', 'batchRename', 'batchGenerateSeo', 'exportAllZip', 'isProcessing', 'aiEnabled', 'geminiApiKey', 'selectedModel', 'setIsAiSettingsOpen');

  const [activeTab, setActiveTab] = useState<Tab>('metadata');

  // Metadata fields
  const [copyright, setCopyright] = useState('');
  const [artist, setArtist] = useState('');
  const [keywords, setKeywords] = useState('');
  const [keywordMode, setKeywordMode] = useState<'append' | 'replace'>('append');

  // Rename fields
  const [template, setTemplate] = useState('{title}-{date}-{counter}');

  // AI fields
  const [saveToImage, setSaveToImage] = useState(true);
  const [skipComplete, setSkipComplete] = useState(true);

  if (!isOpen) return null;

  const targetIds = selectedFileIds.length > 0 ? selectedFileIds : files.map((f) => f.id);
  const targetCount = targetIds.length;
  const keywordList = keywords.split(/[,;\n]/).map((k) => k.trim()).filter(Boolean);
  const hasMetadataChanges = Boolean(copyright.trim() || artist.trim() || keywordList.length || keywordMode === 'replace');
  const aiReady = aiEnabled && Boolean(geminiApiKey);

  let renamePreview = '', renameError = '';
  try {
    const sample = files.find((file) => file.id === targetIds[0]);
    renamePreview = sample ? renameFromTemplate(sample, template, 0) : '';
  } catch (error) { renameError = error instanceof Error ? error.message : 'Invalid template.'; }

  const handleApplyMetadata = async () => {
    const success = await batchBulkEdit(targetIds, {
      copyright: copyright.trim() || undefined,
      artist: artist.trim() || undefined,
      keywords: keywordList.length || keywordMode === 'replace' ? keywordList : undefined,
      keywordMode
    });
    if (success) onClose();
  };

  const handleApplyRename = async () => {
    if (await batchRename(targetIds, template)) onClose();
  };

  const handleGenerateSeo = () => {
    // The job runs in the background; progress and cancel live in the header and the Batch Processing view.
    void batchGenerateSeo(targetIds, { save: saveToImage, skipComplete });
    onClose();
  };

  const tabButton = (tab: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === tab}
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-2 sm:py-1.5 rounded-lg transition touch-target sm:min-h-0 ${
        activeTab === tab ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <ModalOverlay onClose={onClose} label="Batch operations" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
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
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={isProcessing || !targetCount}
              onClick={() => { void exportAllZip(targetIds); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 touch-target sm:min-h-0 sm:min-w-0"
              title="Download these images as a ZIP archive"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">ZIP</span>
            </button>
            <button
              aria-label="Close batch operations"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg touch-target sm:min-h-0 sm:min-w-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div role="tablist" aria-label="Batch operation" className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-semibold">
          {tabButton('metadata', 'Bulk Metadata Edit')}
          {tabButton('rename', 'Bulk Filename Renaming')}
          {tabButton('ai', 'AI SEO')}
        </div>

        {/* Tab 1: Metadata */}
        {activeTab === 'metadata' && (
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-300" htmlFor="batch-copyright">Set Copyright Notice</label>
              <input
                id="batch-copyright"
                type="text"
                placeholder="e.g. © 2026 Acme Corp. All rights reserved."
                value={copyright}
                onChange={(e) => setCopyright(e.target.value)}
                className="px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500 min-h-[40px] sm:min-h-0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-300" htmlFor="batch-artist">Set Artist / Creator</label>
              <input
                id="batch-artist"
                type="text"
                placeholder="e.g. Lead Photographer"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500 min-h-[40px] sm:min-h-0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-neutral-300" htmlFor="batch-keywords">Keywords (Comma-separated)</label>
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
                id="batch-keywords"
                type="text"
                placeholder="e.g. editorial, landscape, commercial"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500 min-h-[40px] sm:min-h-0"
              />
              {keywordMode === 'replace' && !keywordList.length && (
                <p className="text-[11px] text-amber-300">Replace with an empty list removes all keywords from these images.</p>
              )}
            </div>

            <p className="text-[11px] text-neutral-500">Values are written to EXIF, IPTC, and XMP together so other apps show the same attribution.</p>

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
                disabled={isProcessing || !targetCount || !hasMetadataChanges}
                onClick={handleApplyMetadata}
                className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md flex items-center justify-center gap-1.5 touch-target sm:min-h-0 sm:min-w-0 cursor-pointer"
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
              <label className="font-semibold text-neutral-300" htmlFor="batch-template">Filename Template</label>
              <input
                id="batch-template"
                type="text"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="{title}-{date}-{counter}"
                aria-invalid={!!renameError}
                className="px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500 min-h-[40px] sm:min-h-0"
              />
              <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                Available tags: <code className="text-purple-400">{'{title}'}</code>, <code className="text-purple-400">{'{date}'}</code>, <code className="text-purple-400">{'{artist}'}</code>, <code className="text-purple-400">{'{counter}'}</code>
              </p>
            </div>

            {/* Template Preview (from the first targeted image) */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
              <span className="text-[10px] text-neutral-500 uppercase font-mono">First File Preview</span>
              {renameError
                ? <span role="alert" className="text-rose-300">{renameError}</span>
                : <span className="font-mono text-purple-300 break-all">{renamePreview}</span>}
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
                disabled={isProcessing || !targetCount || !template.trim() || !!renameError}
                onClick={handleApplyRename}
                className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md flex items-center justify-center gap-1.5 touch-target sm:min-h-0 sm:min-w-0 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Rename {targetCount} Files
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: AI SEO */}
        {activeTab === 'ai' && (
          <div className="flex flex-col gap-3 text-xs">
            <p className="text-neutral-400 leading-relaxed">
              Gemini writes a title, caption, alt text, and keywords for each image, one at a time. Each preview is re-encoded without metadata before it is sent to Google.
              The job stops on key or quota errors and can be cancelled from the header.
            </p>

            {!aiReady ? (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2 text-neutral-300">
                <span>{aiEnabled ? 'Add a Gemini API key to generate SEO.' : 'Turn on AI and add a Gemini API key to generate SEO.'}</span>
                <button
                  type="button"
                  onClick={() => { setIsAiSettingsOpen(true); onClose(); }}
                  className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-purple-300"
                >
                  <Key className="w-3.5 h-3.5" />
                  Open AI settings
                </button>
              </div>
            ) : (
              <>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={saveToImage} onChange={(e) => setSaveToImage(e.target.checked)} className="mt-0.5 w-4 h-4" />
                  <span className="text-neutral-300">Save results into the image metadata <span className="text-neutral-500">(otherwise they stay as editable drafts)</span></span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={skipComplete} onChange={(e) => setSkipComplete(e.target.checked)} className="mt-0.5 w-4 h-4" />
                  <span className="text-neutral-300">Skip images that already have a title, caption, alt text, and keywords</span>
                </label>
                <p className="text-[11px] text-neutral-500 font-mono">Model: {selectedModel}</p>
              </>
            )}

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
                disabled={isProcessing || !targetCount || !aiReady}
                onClick={handleGenerateSeo}
                className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md flex items-center justify-center gap-1.5 touch-target sm:min-h-0 sm:min-w-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate for {targetCount} Files
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
