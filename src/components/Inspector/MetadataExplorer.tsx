'use client';

import React, { useState } from 'react';
import { useMetaForgeStore } from '@/lib/store';
import TagEditorModal from './TagEditorModal';
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Search, 
  FileText, 
  Camera, 
  MapPin, 
  Tag as TagIcon, 
  Cpu, 
  ExternalLink,
  Plus 
} from 'lucide-react';

interface MetadataExplorerProps {
  fileId: string;
}

export default function MetadataExplorer({ fileId }: MetadataExplorerProps) {
  const { files, updateTag, deleteTag, stripGps } = useMetaForgeStore();
  const file = files.find((f) => f.id === fileId);

  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit modal state
  const [editingTarget, setEditingTarget] = useState<{
    section: string;
    key: string;
    value: any;
    isNew?: boolean;
  } | null>(null);

  // Section open/close states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    file: true,
    exif: true,
    gps: true,
    iptc: true,
    xmp: true,
    other: false
  });

  if (!file) return null;

  const toggleSection = (s: string) => {
    setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));
  };

  const handleCopy = (tagPath: string, value: any) => {
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    navigator.clipboard.writeText(str);
    setCopiedKey(tagPath);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Group rawMetadata into categories
  const raw = file.rawMetadata || {};

  const fileSection = {
    Filename: file.name,
    'MIME Type': file.type,
    'Dimensions': file.width && file.height ? `${file.width} × ${file.height} px` : 'Unknown',
    'Aspect Ratio': file.width && file.height ? `${(file.width / file.height).toFixed(2)}:1` : 'Unknown',
    'File Size': `${(file.size / 1024).toFixed(1)} KB (${file.size.toLocaleString()} bytes)`,
    'Last Modified': new Date(file.lastModified).toLocaleString(),
    'Modified in MetaForge': file.isDirty ? 'Yes (Local in-memory mutations)' : 'No (Original)'
  };

  const exifSection = raw.exif || {};
  const gpsSection = raw.gps || {};
  const iptcSection = raw.iptc || {};
  const xmpSection = raw.xmp || {};

  // Extract GPS coordinates if present
  let lat: number | undefined;
  let lon: number | undefined;
  if (raw.latitude !== undefined && raw.longitude !== undefined) {
    lat = raw.latitude;
    lon = raw.longitude;
  } else if (raw.gps?.latitude !== undefined) {
    lat = raw.gps.latitude;
    lon = raw.gps.longitude;
  }

  // Filter helper
  const filterEntries = (entries: [string, any][]) => {
    if (!searchTerm.trim()) return entries;
    const term = searchTerm.toLowerCase();
    return entries.filter(([k, v]) => {
      const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      return k.toLowerCase().includes(term) || valStr.toLowerCase().includes(term);
    });
  };

  const renderTagRow = (sectionName: string, key: string, value: any, isEditable = true) => {
    const fullPath = `${sectionName}.${key}`;
    const isCopied = copiedKey === fullPath;

    let displayValue: string;
    if (value === null || value === undefined) {
      displayValue = 'null';
    } else if (value instanceof Date) {
      displayValue = value.toISOString();
    } else if (typeof value === 'object') {
      displayValue = JSON.stringify(value);
    } else {
      displayValue = String(value);
    }

    return (
      <div
        key={key}
        className="group flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-neutral-800/60 transition text-xs font-mono"
      >
        <div className="flex items-baseline gap-2 min-w-0 pr-2">
          <span className="text-neutral-400 font-semibold shrink-0 select-text">
            {key}:
          </span>
          <span className="text-neutral-200 truncate select-all" title={displayValue}>
            {displayValue}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
          <button
            onClick={() => handleCopy(fullPath, displayValue)}
            title="Copy value"
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-700"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {isEditable && (
            <>
              <button
                onClick={() => setEditingTarget({ section: sectionName, key, value })}
                title="Edit tag"
                className="p-1 rounded text-neutral-400 hover:text-purple-400 hover:bg-neutral-700"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteTag(file.id, sectionName, key)}
                title="Delete tag"
                className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search Input & Add Tag Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Filter EXIF, IPTC, XMP tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        <button
          onClick={() => setEditingTarget({ section: 'iptc', key: '', value: '', isNew: true })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition shrink-0 shadow-xs"
          title="Add new EXIF, IPTC, or XMP tag"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Tag</span>
        </button>
      </div>

      {/* Accordion Categories */}
      <div className="flex flex-col gap-2">
        {/* 1. File Info */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('file')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-900 text-left hover:bg-neutral-850 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>📁 File Info</span>
              <span className="text-[10px] text-neutral-500 font-mono">
                ({Object.keys(fileSection).length})
              </span>
            </div>
            {openSections.file ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.file && (
            <div className="p-2 divide-y divide-neutral-800/40">
              {filterEntries(Object.entries(fileSection)).map(([k, v]) =>
                renderTagRow('file', k, v, false)
              )}
            </div>
          )}
        </div>

        {/* 2. EXIF & Camera */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('exif')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-900 text-left hover:bg-neutral-850 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>📷 EXIF & Camera Hardware</span>
              <span className="text-[10px] text-neutral-500 font-mono">
                ({Object.keys(exifSection).length})
              </span>
            </div>
            {openSections.exif ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.exif && (
            <div className="p-2 divide-y divide-neutral-800/40">
              {filterEntries(Object.entries(exifSection)).length > 0 ? (
                filterEntries(Object.entries(exifSection)).map(([k, v]) =>
                  renderTagRow('exif', k, v, true)
                )
              ) : (
                <div className="text-xs text-neutral-500 p-2 italic">
                  {Object.keys(exifSection).length === 0 ? 'No EXIF chunk present' : 'No matching tags'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. GPS & Location */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('gps')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-900 text-left hover:bg-neutral-850 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>📍 GPS & Spatial Coordinates</span>
              {lat !== undefined && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  LEAK DETECTED
                </span>
              )}
            </div>
            {openSections.gps ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.gps && (
            <div className="p-2.5 flex flex-col gap-2">
              {lat !== undefined && lon !== undefined ? (
                <>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-rose-950/30 border border-rose-500/20 text-xs">
                    <span className="font-mono text-rose-200">
                      {lat.toFixed(6)}, {lon.toFixed(6)}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                      >
                        View on Map
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => stripGps(file.id)}
                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition"
                      >
                        Remove GPS
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-neutral-800/40">
                    {filterEntries(Object.entries(gpsSection)).map(([k, v]) =>
                      renderTagRow('gps', k, v, true)
                    )}
                  </div>
                </>
              ) : (
                <div className="text-xs text-neutral-500 p-2 italic flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-600" />
                  No GPS coordinates found (Clean)
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. IPTC & Dublin Core */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('iptc')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-900 text-left hover:bg-neutral-850 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
              <TagIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>🏷️ IPTC & Editorial Credits</span>
              <span className="text-[10px] text-neutral-500 font-mono">
                ({Object.keys(iptcSection).length})
              </span>
            </div>
            {openSections.iptc ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.iptc && (
            <div className="p-2 divide-y divide-neutral-800/40">
              {filterEntries(Object.entries(iptcSection)).length > 0 ? (
                filterEntries(Object.entries(iptcSection)).map(([k, v]) =>
                  renderTagRow('iptc', k, v, true)
                )
              ) : (
                <div className="text-xs text-neutral-500 p-2 italic">
                  No IPTC metadata present
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. XMP / Chunks */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('xmp')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-900 text-left hover:bg-neutral-850 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>🧬 XMP & Advanced Chunks</span>
              <span className="text-[10px] text-neutral-500 font-mono">
                ({Object.keys(xmpSection).length})
              </span>
            </div>
            {openSections.xmp ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.xmp && (
            <div className="p-2 divide-y divide-neutral-800/40">
              {filterEntries(Object.entries(xmpSection)).length > 0 ? (
                filterEntries(Object.entries(xmpSection)).map(([k, v]) =>
                  renderTagRow('xmp', k, v, true)
                )
              ) : (
                <div className="text-xs text-neutral-500 p-2 italic">
                  No XMP packet present
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tag Editor Modal */}
      {editingTarget && (
        <TagEditorModal
          isOpen={Boolean(editingTarget)}
          isNew={editingTarget.isNew}
          section={editingTarget.section}
          tagKey={editingTarget.key}
          initialValue={editingTarget.value}
          onSave={(sec, k, val) => updateTag(file.id, sec, k, val)}
          onClose={() => setEditingTarget(null)}
        />
      )}
    </div>
  );
}
