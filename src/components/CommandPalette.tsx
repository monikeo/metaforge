'use client';

import React, { useState, useEffect } from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { 
  Search, 
  Layers, 
  LayoutDashboard, 
  GitCompare, 
  Sliders, 
  Cpu, 
  MapPinOff, 
  ShieldCheck, 
  Download, 
  Settings2, 
  X,
  Image as ImageIcon
} from 'lucide-react';

export default function CommandPalette() {
  const { 
    isCommandPaletteOpen, 
    setIsCommandPaletteOpen, 
    files, 
    setCurrentView, 
    setActiveFile, 
    stripAllGps, 
    batchSanitizeForSocial, 
    exportAllZip,
    setIsAiSettingsOpen 
  } = useMetaForgeStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global keydown handler for Cmd+K / Ctrl+K and /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  // Static commands
  const commands = [
    {
      id: 'cmd-studio',
      title: 'Workstation Studio',
      category: 'Navigation',
      icon: Layers,
      action: () => setCurrentView('studio')
    },
    {
      id: 'cmd-dashboard',
      title: 'Analytics Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => setCurrentView('dashboard')
    },
    {
      id: 'cmd-compare',
      title: 'Side-by-Side Metadata Compare',
      category: 'Tools',
      icon: GitCompare,
      action: () => setCurrentView('compare')
    },
    {
      id: 'cmd-presets',
      title: 'Metadata Presets Manager',
      category: 'Tools',
      icon: Sliders,
      action: () => setCurrentView('presets')
    },
    {
      id: 'cmd-jobs',
      title: 'Batch Processing Queue',
      category: 'Tools',
      icon: Cpu,
      action: () => setCurrentView('jobs')
    },
    {
      id: 'cmd-strip-gps',
      title: 'Batch Action: Strip All GPS Coordinates',
      category: 'Actions',
      icon: MapPinOff,
      action: () => stripAllGps()
    },
    {
      id: 'cmd-sanitize-social',
      title: 'Batch Action: Sanitize for Social Media',
      category: 'Actions',
      icon: ShieldCheck,
      action: () => batchSanitizeForSocial()
    },
    {
      id: 'cmd-export-zip',
      title: 'Export: Download All Processed as ZIP',
      category: 'Actions',
      icon: Download,
      action: () => exportAllZip()
    },
    {
      id: 'cmd-ai-settings',
      title: 'Configure Google Gemini API Key (BYOK)',
      category: 'Settings',
      icon: Settings2,
      action: () => setIsAiSettingsOpen(true)
    }
  ];

  // Image search results
  const matchingFiles = files
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()) || f.seoData?.title?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map((f) => ({
      id: `file-${f.id}`,
      title: f.name,
      category: 'Image Files',
      icon: ImageIcon,
      action: () => {
        setActiveFile(f.id);
        setCurrentView('studio');
      }
    }));

  const allFiltered = [
    ...matchingFiles,
    ...commands.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase()))
  ];

  const handleSelect = (idx: number) => {
    const item = allFiltered[idx];
    if (item) {
      item.action();
      setIsCommandPaletteOpen(false);
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allFiltered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (allFiltered.length || 1)) % (allFiltered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Search input header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-800">
          <Search className="w-4 h-4 text-purple-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, tool, or search files..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400 font-mono border border-neutral-700">
            Esc
          </kbd>
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
          {allFiltered.length > 0 ? (
            allFiltered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition ${
                    isSelected
                      ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
                      : 'hover:bg-neutral-800/60 text-neutral-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 text-purple-400" />
                    <span className="font-medium truncate">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase shrink-0">
                    {item.category}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-neutral-500">
              No matching commands or images found for &quot;{query}&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <span>Navigate with ↑ ↓ • Select with Enter</span>
          <span>MetaForge Command Engine</span>
        </div>
      </div>
    </div>
  );
}
