'use client';

import React, { useState } from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { generateImageSeoMetadata } from '@/lib/ai-service';
import { 
  Sparkles, 
  Loader2, 
  Key, 
  Check, 
  FileEdit, 
  Tag, 
  Eye, 
  UserX, 
  Type, 
  AlertCircle 
} from 'lucide-react';

interface AIGeneratorPanelProps {
  fileId: string;
}

export default function AIGeneratorPanel({ fileId }: AIGeneratorPanelProps) {
  const { 
    files, 
    aiEnabled, 
    geminiApiKey, 
    selectedModel, 
    setIsAiSettingsOpen, 
    applyAiSeo, 
    writeSeoToMetadata 
  } = useMetaForgeStore();

  const file = files.find((f) => f.id === fileId);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!file) return null;

  const currentSeo = file.seoData || {};

  // Case 1: AI is globally disabled
  if (!aiEnabled) {
    return (
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-center flex flex-col items-center gap-3">
        <div className="p-2.5 rounded-full bg-neutral-800 text-neutral-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-neutral-300">AI Assistant is Disabled</h4>
          <p className="text-xs text-neutral-500 mt-1 max-w-xs">
            MetaForge is running in 100% offline, privacy-first mode. Turn on the AI toggle in the navigation bar to enable vision-assisted SEO generation.
          </p>
        </div>
      </div>
    );
  }

  // Case 2: AI is enabled, but no API Key configured
  if (!geminiApiKey) {
    return (
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-center flex flex-col items-center gap-3">
        <div className="p-2.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
          <Key className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-purple-200">Google Gemini Key Needed</h4>
          <p className="text-xs text-purple-300/70 mt-1 max-w-xs">
            To use visual SEO analysis and prompt extraction, configure your free Google Gemini API key.
          </p>
        </div>
        <button
          onClick={() => setIsAiSettingsOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5"
        >
          <Key className="w-3.5 h-3.5" />
          Add Gemini API Key
        </button>
      </div>
    );
  }

  // Handle Generate with Gemini
  const handleAnalyze = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const blob = file.modifiedBlob || file.originalBlob;
      const result = await generateImageSeoMetadata(geminiApiKey, blob, selectedModel);
      applyAiSeo(file.id, result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to analyze image with Gemini');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleChange = (val: string) => {
    applyAiSeo(file.id, { ...currentSeo, title: val });
  };

  const handleAltTextChange = (val: string) => {
    applyAiSeo(file.id, { ...currentSeo, altText: val });
  };

  const handleCaptionChange = (val: string) => {
    applyAiSeo(file.id, { ...currentSeo, caption: val });
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    const existing = currentSeo.keywords || [];
    if (!existing.includes(newKeyword.trim())) {
      applyAiSeo(file.id, { ...currentSeo, keywords: [...existing, newKeyword.trim()] });
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (tagToRemove: string) => {
    const existing = currentSeo.keywords || [];
    applyAiSeo(file.id, {
      ...currentSeo,
      keywords: existing.filter((k) => k !== tagToRemove)
    });
  };

  const handleSaveToMetadata = async () => {
    await writeSeoToMetadata(file.id);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide">
              Gemini Vision SEO
            </span>
            <span className="text-[10px] text-purple-400 font-mono ml-2">
              ({selectedModel})
            </span>
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 disabled:opacity-50 transition flex items-center gap-1.5"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Analyze with Gemini
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SEO Title Input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-neutral-300 flex items-center gap-1">
            <Type className="w-3.5 h-3.5 text-neutral-400" />
            SEO Headline / Title
          </label>
          <span className={`text-[10px] font-mono ${(currentSeo.title?.length || 0) > 65 ? 'text-amber-400' : 'text-neutral-500'}`}>
            {currentSeo.title?.length || 0}/65 chars
          </span>
        </div>
        <input
          type="text"
          value={currentSeo.title || ''}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. Vintage Leica M6 Film Camera on Mahogany Table"
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 transition"
        />
      </div>

      {/* Alt Text Input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-neutral-300 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-neutral-400" />
            Accessible Alt Text (Screen Readers)
          </label>
        </div>
        <textarea
          rows={2}
          value={currentSeo.altText || ''}
          onChange={(e) => handleAltTextChange(e.target.value)}
          placeholder="Describe the image content accurately for accessibility and search crawler comprehension..."
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 transition resize-none"
        />
      </div>

      {/* Editorial Caption Input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-neutral-300 flex items-center gap-1">
            <FileEdit className="w-3.5 h-3.5 text-neutral-400" />
            Editorial Caption / Description
          </label>
        </div>
        <textarea
          rows={2}
          value={currentSeo.caption || ''}
          onChange={(e) => handleCaptionChange(e.target.value)}
          placeholder="Full editorial caption providing contextual background..."
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 transition resize-none"
        />
      </div>

      {/* Keywords */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-neutral-400" />
          Keywords & Search Tags ({currentSeo.keywords?.length || 0})
        </label>
        
        <form onSubmit={handleAddKeyword} className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Add keyword + Enter..."
            className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200"
          >
            Add
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {currentSeo.keywords?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-800 text-neutral-200 border border-neutral-700 group hover:border-neutral-500"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveKeyword(tag)}
                className="text-neutral-500 hover:text-rose-400 ml-1"
              >
                ×
              </button>
            </span>
          ))}
          {(!currentSeo.keywords || currentSeo.keywords.length === 0) && (
            <span className="text-[11px] text-neutral-500 italic">No keywords added yet.</span>
          )}
        </div>
      </div>

      {/* Privacy Flags Detected by Vision */}
      {currentSeo.privacyFlags && (
        <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between text-xs">
          <span className="text-neutral-400 flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5 text-neutral-400" />
            AI Visual Privacy Audit:
          </span>
          <div className="flex gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              currentSeo.privacyFlags.containsFaces 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {currentSeo.privacyFlags.containsFaces ? 'Human Faces Detected' : 'No Faces'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              currentSeo.privacyFlags.containsIdentifiableText 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {currentSeo.privacyFlags.containsIdentifiableText ? 'Visible Text/Signage' : 'No Text'}
            </span>
          </div>
        </div>
      )}

      {/* Write to IPTC/XMP Button */}
      <button
        onClick={handleSaveToMetadata}
        className="w-full py-2.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-600 transition flex items-center justify-center gap-2 shadow-sm"
      >
        {isSaved ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 font-bold">Written to EXIF/IPTC Tags!</span>
          </>
        ) : (
          <>
            <FileEdit className="w-4 h-4 text-purple-400" />
            Write SEO Data to IPTC/EXIF Chunks
          </>
        )}
      </button>
    </div>
  );
}
