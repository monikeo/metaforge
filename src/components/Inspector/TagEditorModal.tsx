'use client';

import React, { useState } from 'react';
import { X, Check, Plus } from 'lucide-react';

interface TagEditorModalProps {
  isOpen: boolean;
  section: string;
  tagKey: string;
  initialValue: any;
  isNew?: boolean;
  onSave: (section: string, key: string, value: any) => void;
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
  const [val, setVal] = useState(
    typeof initialValue === 'object' ? JSON.stringify(initialValue, null, 2) : String(initialValue ?? '')
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentKey.trim()) return;

    let parsed: any = val;
    // Attempt parsing JSON if it looks like an object or array
    if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
      try {
        parsed = JSON.parse(val);
      } catch {
        parsed = val;
      }
    } else if (!isNaN(Number(val)) && val.trim() !== '') {
      parsed = Number(val);
    }

    onSave(currentSection, currentKey.trim(), parsed);
    onClose();
  };

  const suggestions = COMMON_TAG_SUGGESTIONS[currentSection] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
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
                  required
                  placeholder="e.g. CopyrightNotice, Artist, Keywords..."
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
            <label className="text-xs font-medium text-neutral-400">Tag Value</label>
            <textarea
              rows={4}
              required
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="Enter tag string, number, or JSON..."
              className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs font-mono text-neutral-100 focus:outline-none focus:border-purple-500"
            />
          </div>

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
              disabled={!currentKey.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition touch-target sm:min-h-0 sm:min-w-0 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {isNew ? 'Create Tag' : 'Save Tag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
