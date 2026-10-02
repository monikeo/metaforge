'use client';

import React, { useState } from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { Key, ShieldCheck, Sparkles, X, ExternalLink, Eye, EyeOff } from 'lucide-react';

export default function AISettingsModal() {
  const { 
    isAiSettingsOpen, 
    setIsAiSettingsOpen, 
    geminiApiKey, 
    setApiKey, 
    selectedModel, 
    setSelectedModel,
    aiEnabled,
    setAiEnabled
  } = useMetaForgeStore();

  const [inputKey, setInputKey] = useState(geminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(selectedModel || 'gemini-2.5-flash');

  if (!isAiSettingsOpen) return null;

  const handleSave = () => {
    setApiKey(inputKey.trim());
    setSelectedModel(model);
    if (inputKey.trim() && !aiEnabled) {
      setAiEnabled(true);
    }
    setIsAiSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-5 sm:p-6 text-neutral-100 flex flex-col gap-4 sm:gap-5 max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto pb-safe sm:pb-6"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-neutral-700/60 rounded-full mx-auto sm:hidden -mt-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">Google Gemini AI Engine</h2>
              <p className="text-xs text-neutral-400">Bring Your Own Key (BYOK) — Zero Server Relay</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAiSettingsOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition touch-target sm:min-h-0 sm:min-w-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4">
          {/* Privacy Guarantee Note */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-200">100% Client-Side Direct Execution:</span>
              <p className="mt-0.5 text-emerald-300/80">
                Your key and images are communicated directly between your browser and Google&apos;s Gemini endpoint. No proxy, no database, no middleware logging.
              </p>
            </div>
          </div>

          {/* API Key Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-purple-400" />
                Gemini API Key
              </label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline min-h-[36px] sm:min-h-0"
              >
                Get a free key
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700/70 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 font-mono pr-10 min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1.5 touch-target sm:min-h-0 sm:min-w-0"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400">
              Stored exclusively in browser localStorage.
            </p>
          </div>

          {/* Model Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Vision Model Architecture
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700/70 rounded-xl text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-purple-500 min-h-[44px]"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Fastest, latest generation vision — Recommended)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (Standard lightweight vision)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (High reasoning, deep scene analysis)</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-3 sm:pt-4 mt-2">
          {geminiApiKey && (
            <button
              type="button"
              onClick={() => {
                setInputKey('');
                setApiKey('');
              }}
              className="text-xs text-rose-400 hover:text-rose-300 hover:underline min-h-[40px] flex items-center"
            >
              Clear Key
            </button>
          )}
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={() => setIsAiSettingsOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition touch-target sm:min-h-0 sm:min-w-0"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition flex items-center justify-center gap-1.5 touch-target sm:min-h-0 sm:min-w-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
