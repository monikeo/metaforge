'use client';

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface TagEditorModalProps {
  isOpen: boolean;
  section: string;
  tagKey: string;
  initialValue: any;
  onSave: (section: string, key: string, value: any) => void;
  onClose: () => void;
}

export default function TagEditorModal({
  isOpen,
  section,
  tagKey,
  initialValue,
  onSave,
  onClose
}: TagEditorModalProps) {
  const [val, setVal] = useState(
    typeof initialValue === 'object' ? JSON.stringify(initialValue, null, 2) : String(initialValue ?? '')
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    onSave(section, tagKey, parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-5 text-neutral-100 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Edit Metadata Tag</h3>
            <p className="text-xs font-mono text-neutral-400">
              {section}.<span className="text-purple-400 font-semibold">{tagKey}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-400">Tag Value</label>
            <textarea
              rows={4}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs font-mono text-neutral-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Save Tag
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
