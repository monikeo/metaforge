'use client';

import ModalOverlay from '@/components/ModalOverlay';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, Plus } from 'lucide-react';
import { editableMetadataValue } from '@/lib/format';
import { isExifDateTag } from '@/lib/metadata-writer';

interface TagEditorModalProps {
  isOpen: boolean;
  section: string;
  tagKey: string;
  initialValue: any;
  isNew?: boolean;
  onSave: (section: string, key: string, value: any) => Promise<boolean>;
  onClose: () => void;
}

const COMMON_TAG_SUGGESTIONS: Record<string, string[]> = {
  iptc: ['Headline', 'Caption', 'Byline', 'CopyrightNotice', 'Keywords', 'Credit', 'Source', 'City', 'Country'],
  exif: ['Artist', 'Copyright', 'ImageDescription', 'UserComment', 'Make', 'Model', 'Software'],
  xmp: ['title', 'description', 'creator', 'rights', 'subject', 'label']
};

export default function TagEditorModal({
  isOpen,
  section: initialSection,
  tagKey: initialKey,
  initialValue,
  isNew = false,
  onSave,
  onClose
}: TagEditorModalProps) {
  const [currentSection, setCurrentSection] = useState(initialSection || 'iptc');
  const [currentKey, setCurrentKey] = useState(initialKey || '');
  const [val, setVal] = useState(editableMetadataValue(initialValue));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [prevProps, setPrevProps] = useState({
    isOpen,
    initialSection,
    initialKey,
    initialValue
  });

  if (
    prevProps.isOpen !== isOpen ||
    prevProps.initialSection !== initialSection ||
    prevProps.initialKey !== initialKey ||
    prevProps.initialValue !== initialValue
  ) {
    setPrevProps({ isOpen, initialSection, initialKey, initialValue });
    if (isOpen) {
      setCurrentSection(initialSection || 'iptc');
      setCurrentKey(initialKey || '');
      setVal(editableMetadataValue(initialValue));
    }
  }

  const commitSave = useCallback(async () => {
    if (!currentKey.trim() || isSaving) return;
    setIsSaving(true);
    setError('');
    const trimmed = val.trim();
    let parsed: any = val;
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = val;
      }
    } else if (typeof initialValue === 'number' && !isNaN(Number(trimmed)) && trimmed !== '') {
      parsed = Number(trimmed);
    }

    try {
      if (await onSave(currentSection, currentKey.trim(), parsed)) onClose();
      else setError('The tag could not be saved. Check the error message and try again.');
    } catch { setError('The tag could not be saved. Please try again.'); }
    finally { setIsSaving(false); }
  }, [currentKey, val, onSave, currentSection, onClose, isSaving, initialValue]);

  // Global Esc & Ctrl+Enter keyboard listeners
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (currentKey.trim()) {
          commitSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, currentKey, commitSave]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitSave();
  };

  const isDateTag = currentSection === 'exif' && isExifDateTag(currentKey.trim());
  const isKeywordTag = /^(Keywords|subject)$/i.test(currentKey.trim());
  const detectedType = (() => {
    const trimmed = val.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) return 'JSON';
    if (isDateTag) return 'Date';
    if (isKeywordTag) return 'List';
    if (!isNaN(Number(trimmed)) && trimmed !== '') return 'Number';
    return 'String';
  })();

  const suggestions = COMMON_TAG_SUGGESTIONS[currentSection] || [];

  return (
    <ModalOverlay onClose={onClose} label="Edit metadata tag" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-5 text-neutral-100 flex flex-col gap-4 max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto pb-safe sm:pb-5">
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-neutral-700/60 rounded-full mx-auto sm:hidden -mt-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              {isNew ? <Plus className="w-4 h-4 text-purple-400" /> : null}
              {isNew ? 'Add New Metadata Tag' : 'Edit Metadata Tag'}
            </h3>
            {!isNew ? (
              <p className="text-xs font-mono text-neutral-400">
                {currentSection}.<span className="text-purple-400 font-semibold">{currentKey}</span>
              </p>
            ) : (
              <p className="text-xs text-neutral-400">
                Inject custom EXIF, IPTC, or XMP attributes into this asset
              </p>
            )}
          </div>
          <button 
            aria-label="Close tag editor"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg touch-target sm:min-h-0 sm:min-w-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* If creating new tag, allow selecting section & entering tag name */}
          {isNew && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-400">Metadata Standard / IFD</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['iptc', 'exif', 'xmp'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setCurrentSection(s);
                        setCurrentKey('');
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold uppercase transition touch-target sm:min-h-0 sm:min-w-0 ${
                        currentSection === s
                          ? 'bg-purple-600 text-white'
                          : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-400">Tag Identifier</label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. CopyrightNotice, Artist, Keywords..."
                  aria-label="Tag name"
                  value={currentKey}
                  onChange={(e) => setCurrentKey(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs font-mono text-neutral-100 focus:outline-none focus:border-purple-500 min-h-[40px] sm:min-h-0"
                />

                {/* Quick Preset Tag Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-neutral-500 font-mono">Suggested:</span>
                  {suggestions.slice(0, 5).map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setCurrentKey(sugg)}
                      className="px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-[10px] font-mono text-neutral-300 transition"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-neutral-400">Tag Value</label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-500 font-mono">Format:</span>
                <span className={`px-1.5 py-px rounded text-[10px] font-mono font-semibold ${
                  detectedType === 'JSON'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : detectedType === 'Number'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                }`}>
                  {detectedType}
                </span>
              </div>
            </div>
            <textarea
              autoFocus={!isNew}
              rows={4}
              required
              aria-label="Tag value"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="Enter tag string, number, or JSON..."
              className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs font-mono text-neutral-100 focus:outline-none focus:border-purple-500 transition"
            />
            {(isDateTag || isKeywordTag) && (
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {isDateTag ? 'Use YYYY:MM:DD HH:MM:SS (local time). ISO dates such as 2026-08-14 19:42 are converted.' : 'Separate keywords with commas, semicolons, or new lines.'}
              </p>
            )}
            <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono mt-0.5">
              <span>Press <kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">Ctrl+Enter</kbd> to save</span>
              <span><kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">Esc</kbd> to cancel</span>
            </div>
          </div>

          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          <div className="flex justify-end items-center gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-neutral-400 hover:text-white rounded-lg touch-target sm:min-h-0 sm:min-w-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!currentKey.trim() || isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition touch-target sm:min-h-0 sm:min-w-0 cursor-pointer shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Saving…' : isNew ? 'Create Tag' : 'Save Tag'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
