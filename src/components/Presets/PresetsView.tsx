'use client';

import React, { useState } from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { 
  Sliders, 
  Plus, 
  Check, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  Globe, 
  Camera, 
  ShoppingBag,
  X
} from 'lucide-react';

export default function PresetsView() {
  const { 
    presets, 
    files, 
    activeFileId, 
    applyPreset, 
    createPreset, 
    deletePreset 
  } = useMetaForgeStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<'active' | 'all'>('all');

  // New preset form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'SEO' | 'Photography' | 'E-commerce' | 'Stock' | 'Privacy' | 'Custom'>('Custom');
  const [description, setDescription] = useState('');
  const [artist, setArtist] = useState('');
  const [copyright, setCopyright] = useState('');
  const [keywords, setKeywords] = useState('');
  const [stripGps, setStripGps] = useState(true);
  const [stripSerials, setStripSerials] = useState(false);

  const handleApply = async (presetId: string) => {
    let targets: string[] = [];
    if (selectedTarget === 'active' && activeFileId) {
      targets = [activeFileId];
    } else {
      targets = files.map((f) => f.id);
    }
    await applyPreset(presetId, targets);
  };

  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createPreset({
      name: name.trim(),
      category,
      description: description.trim() || 'Custom user configuration',
      tags: {
        artist: artist.trim() || undefined,
        copyright: copyright.trim() || undefined,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean)
      },
      stripGps,
      stripSerials,
      filenameTemplate: '{title}-{counter}'
    });

    setIsModalOpen(false);
    setName('');
    setDescription('');
    setArtist('');
    setCopyright('');
    setKeywords('');
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            Metadata &amp; SEO Presets Manager
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Standardize attribution, privacy scrub rules, and SEO keywords across entire photo libraries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={() => setSelectedTarget('all')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedTarget === 'all' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              All Images ({files.length})
            </button>
            <button
              onClick={() => setSelectedTarget('active')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedTarget === 'active' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Active Only
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg shadow-purple-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            New Preset
          </button>
        </div>
      </div>

      {/* Presets Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((preset) => {
          let Icon = Sparkles;
          if (preset.category === 'SEO') Icon = Globe;
          else if (preset.category === 'Photography') Icon = Camera;
          else if (preset.category === 'E-commerce') Icon = ShoppingBag;
          else if (preset.category === 'Privacy') Icon = ShieldCheck;

          return (
            <div
              key={preset.id}
              className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between gap-4 hover:border-neutral-700 transition"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-neutral-800 text-purple-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
                      {preset.category}
                    </span>
                  </div>

                  {preset.id.startsWith('preset-') && !['preset-seo-web', 'preset-photographer', 'preset-ecommerce', 'preset-social-opsec'].includes(preset.id) && (
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="p-1 rounded text-neutral-500 hover:text-rose-400"
                      title="Delete preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white mt-1">{preset.name}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">{preset.description}</p>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col gap-1 text-[11px] font-mono text-neutral-400 mt-2">
                  {preset.tags.artist && <div>Artist: {preset.tags.artist}</div>}
                  {preset.tags.copyright && <div>Copyright: {preset.tags.copyright}</div>}
                  {preset.tags.keywords?.length ? (
                    <div>Keywords: {preset.tags.keywords.join(', ')}</div>
                  ) : null}
                  <div className="text-emerald-400 pt-1">
                    {preset.stripGps ? '✓ Strips GPS' : '✕ Keeps GPS'} • {preset.stripSerials ? '✓ Strips Serials' : '✕ Keeps Serials'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleApply(preset.id)}
                disabled={files.length === 0}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-600 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 text-purple-400" />
                Apply Preset to {selectedTarget === 'all' ? `All (${files.length})` : 'Active'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Create Preset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create Metadata &amp; SEO Preset</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePreset} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-neutral-300">Preset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Agency Client Batch Preset"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-neutral-300">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none"
                  >
                    <option value="SEO">SEO</option>
                    <option value="Photography">Photography</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Privacy">Privacy</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-neutral-300">Artist / Creator Tag</label>
                  <input
                    type="text"
                    placeholder="Studio or Author"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-neutral-300">Copyright Notice</label>
                <input
                  type="text"
                  placeholder="© 2026 Brand Name. All rights reserved."
                  value={copyright}
                  onChange={(e) => setCopyright(e.target.value)}
                  className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-neutral-300">Keywords (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. editorial, portrait, nature, travel"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-4 py-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stripGps}
                    onChange={(e) => setStripGps(e.target.checked)}
                    className="rounded bg-neutral-950 border-neutral-800 text-purple-600 focus:ring-0"
                  />
                  <span className="text-neutral-300">Strip GPS Coordinates</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stripSerials}
                    onChange={(e) => setStripSerials(e.target.checked)}
                    className="rounded bg-neutral-950 border-neutral-800 text-purple-600 focus:ring-0"
                  />
                  <span className="text-neutral-300">Strip Camera Serials</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
