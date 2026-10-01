'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Flame, 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  ShieldAlert, 
  Cpu, 
  Globe, 
  FileCode, 
  Download, 
  ZoomIn, 
  Keyboard, 
  Check, 
  Lock, 
  HelpCircle,
  Camera,
  MapPin,
  Tag,
  Key,
  GitCompare,
  Sliders,
  History,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Layers,
  Copy,
  Binary,
  BookOpen,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function TutorialPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const toggleFaq = (idx: number) => {
    setExpandedFaq(expandedFaq === idx ? null : idx);
  };

  const sections = [
    { id: 'quick-cheat-sheet', title: 'Quick Action Cheat Sheet', icon: Zap, color: 'text-amber-400', category: 'Overview' },
    { id: 'inspection', title: '1. Metadata Inspection & Tag CRUD', icon: FileText, color: 'text-blue-400', category: 'Core' },
    { id: 'compare', title: '2. Metadata Comparator & Live Sync', icon: GitCompare, color: 'text-amber-400', category: 'Workflows' },
    { id: 'presets', title: '3. Metadata & SEO Presets Manager', icon: Sliders, color: 'text-purple-400', category: 'Automation' },
    { id: 'privacy', title: '4. Privacy Shield & OPSEC Scrubbing', icon: ShieldAlert, color: 'text-rose-400', category: 'Security' },
    { id: 'ai-workflow', title: '5. ComfyUI & SD Prompt Decoder', icon: Cpu, color: 'text-indigo-400', category: 'AI Generation' },
    { id: 'gemini-seo', title: '6. Gemini Vision AI SEO Studio', icon: Sparkles, color: 'text-purple-400', category: 'AI Intelligence' },
    { id: 'social-preview', title: '7. Search & Social Card Simulator', icon: Globe, color: 'text-emerald-400', category: 'Publishing' },
    { id: 'sitemap-xml', title: '8. Image Sitemap (XML) Builder', icon: FileCode, color: 'text-cyan-400', category: 'SEO' },
    { id: 'batch-zip', title: '9. Batch Queue & Bulk Operations', icon: Download, color: 'text-indigo-400', category: 'Productivity' },
    { id: 'history', title: '10. Audit History & Snapshot Rollback', icon: History, color: 'text-emerald-400', category: 'Version Control' },
    { id: 'json-catalog', title: '11. JSON Metadata Catalog Export', icon: Layers, color: 'text-amber-400', category: 'Developer' },
    { id: 'canvas-shortcuts', title: '12. Canvas Zoom, Pan & Shortcuts', icon: Keyboard, color: 'text-pink-400', category: 'Navigation' },
    { id: 'hex-viewer', title: '13. Raw Hex Stream & Byte Headers', icon: Binary, color: 'text-cyan-400', category: 'Low-Level' },
    { id: 'troubleshooting-faq', title: '14. Troubleshooting & FAQ', icon: HelpCircle, color: 'text-teal-400', category: 'Support' }
  ];

  const filteredSections = sections.filter((s) => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sampleAiPromptJson = `{
  "positive_prompt": "cinematic street photograph of shibuya crossing at night, neon reflections in rain puddles, 85mm f/1.4 lens, shallow depth of field, photorealistic, 8k resolution",
  "negative_prompt": "blurry, low quality, oversaturated, deformed hands, duplicate people, watermark, text",
  "sampler": "Euler a",
  "steps": 28,
  "cfg_scale": 7.0,
  "seed": 4829104812,
  "model_hash": "e4a27559ca",
  "model": "v1-5-pruned-emaonly.safetensors"
}`;

  const sampleCatalogJson = `{
  "generator": "MetaForge v1.2",
  "exportedAt": "2026-10-01T12:00:00.000Z",
  "itemCount": 1,
  "assets": [
    {
      "fileName": "tokyo-rain-street.jpg",
      "fileSize": 3418920,
      "mimeType": "image/jpeg",
      "dimensions": { "width": 4032, "height": 3024 },
      "threatIndex": 0,
      "metadata": {
        "title": "Tokyo Rain Reflections in Shibuya",
        "description": "Pedestrians holding umbrellas crossing neon-lit street during evening rainfall.",
        "altText": "Rain soaked asphalt reflecting colorful shop neon signs in Tokyo",
        "keywords": ["tokyo", "rain", "shibuya", "street photography", "night"],
        "artist": "Kenji Sato",
        "copyright": "Copyright 2026 Kenji Sato. All rights reserved.",
        "camera": { "make": "Sony", "model": "ILCE-7RM5", "lens": "FE 50mm F1.2 GM" },
        "exposure": { "fNumber": 1.4, "exposureTime": "1/160", "iso": 800 }
      }
    }
  ]
}`;

  const faqItems = [
    {
      q: "Does MetaForge upload my high-resolution photos to any server?",
      a: "No. Every byte processing action—including EXIF parsing, lossless tag writing, GPS stripping, hex inspection, and ZIP packaging—runs 100% inside your browser's WebAssembly and JavaScript memory. Zero image files or client data are transmitted to any backend server."
    },
    {
      q: "How does the Google Gemini Vision AI assistant work without an account?",
      a: "MetaForge utilizes a BYOK (Bring Your Own Key) architecture. You provide your free API key obtained directly from Google AI Studio. The key is stored solely in your private browser localStorage and connects client-to-Google via HTTPS with zero intermediary proxy."
    },
    {
      q: "Will stripping GPS coordinates reduce photo image quality or re-compress pixels?",
      a: "No. For JPEG images, MetaForge performs direct binary chunk segment stripping via piexifjs. It safely removes the GPS IFD marker block while leaving the DCT frequency coefficients and image pixel streams untouched, resulting in 100% lossless preservation of sensor quality."
    },
    {
      q: "Why do some social media platforms remove my EXIF and copyright attribution?",
      a: "Major social networks (e.g., Twitter/X, Instagram, Facebook) run automated server-side compression and privacy filters that re-encode images and strip EXIF blocks to protect users from location leaks. To preserve your attribution online, use MetaForge to write IPTC and Dublin Core headers, embed watermarks, and generate Image Sitemaps for Google Search."
    },
    {
      q: "Can I use MetaForge on RAW camera files (CR2, NEF, ARW, DNG)?",
      a: "Yes. MetaForge reads baseline metadata and MakerNotes from RAW camera files. Because modifying proprietary RAW camera binaries can invalidate manufacturer raw sensor data, MetaForge preserves your raw files safely and exports modified metadata into standardized sidecar JSON or XML formats."
    },
    {
      q: "What is the maximum number of images I can process simultaneously in the Batch Queue?",
      a: "There is no hardcoded limitation. Because processing executes client-side using memory streams and web workers, the batch queue capacity depends only on your device's available RAM. Users routinely process hundreds of multi-megapixel images simultaneously without server timeouts."
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/85 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between pt-safe">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
              <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-white uppercase">METAFORGE</span>
            <span className="text-[10px] text-neutral-400 font-mono -mt-1">DOCUMENTATION &amp; MASTER GUIDE</span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition touch-target sm:min-h-0 sm:min-w-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Studio</span>
            <span className="sm:hidden">Studio</span>
          </Link>
          <Link
            href="/about"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition touch-target sm:min-h-0 sm:min-w-0"
          >
            About &amp; Architecture
          </Link>
        </div>
      </nav>

      {/* Main Content Layout with Sticky Directory on Desktop */}
      <div className="flex-1 max-w-[1550px] w-full mx-auto px-3 sm:px-6 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-safe">
        
        {/* LEFT STICKY NAVIGATION (Table of Contents & Quick Search) */}
        <aside className="lg:col-span-3 lg:sticky lg:top-20 h-fit flex flex-col gap-3">
          <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col gap-3 shadow-xl backdrop-blur-md">
            
            {/* Search within Docs */}
            <div className="flex flex-col gap-1.5 border-b border-neutral-800 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Search className="w-3 h-3 text-purple-400" />
                Find Guide or Feature
              </span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. GPS, Alt text, Compare, JSON..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 font-mono"
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              </div>
            </div>

            {/* Quick module links list */}
            <nav className="flex flex-col gap-1 max-h-[calc(100vh-290px)] overflow-y-auto pr-1 text-xs">
              {filteredSections.map((sec) => {
                const Icon = sec.icon;
                return (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${sec.color}`} />
                      <span className="truncate">{sec.title}</span>
                    </div>
                  </a>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>Reading Time:</span>
                <span className="text-purple-300 font-semibold">14 min comprehensive</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                <Lock className="w-3 h-3" />
                <span>Zero Server Uploads Guaranteed</span>
              </div>
              <Link
                href="/"
                className="w-full py-2.5 rounded-xl text-xs font-bold text-center bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm touch-target sm:min-h-0 cursor-pointer"
              >
                Launch Studio Workstation
              </Link>
            </div>
          </div>
        </aside>

        {/* RIGHT MASTER DOCUMENTATION CONTENT (col-span-9) */}
        <main className="lg:col-span-9 flex flex-col gap-12 sm:gap-16">
          
          {/* Header & Overview */}
          <div className="flex flex-col gap-3 border-b border-neutral-800 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Official Master User Manual &amp; Specification</span>
              </div>
              <span className="text-xs text-neutral-500 font-mono">v1.2.0 • Updated October 2026</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              MetaForge Complete Technical Documentation
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-3xl leading-relaxed">
              MetaForge is an in-browser image metadata workstation. Every reading, writing, sanitizing, and batch transformation takes place locally on your device using WebAssembly and in-memory streams—guaranteeing 100% operational privacy and instantaneous zero-latency operations.
            </p>

            {/* Target Personas Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] flex flex-col gap-0.5">
                <span className="font-bold text-white flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-blue-400" /> Photographers
                </span>
                <span className="text-neutral-400">EXIF, Lens specs, serials, copyright</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] flex flex-col gap-0.5">
                <span className="font-bold text-white flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> SEO Specialists
                </span>
                <span className="text-neutral-400">Alt text, keywords, Google sitemaps</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] flex flex-col gap-0.5">
                <span className="font-bold text-white flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> OPSEC / Privacy
                </span>
                <span className="text-neutral-400">GPS stripping, hostname &amp; ID masking</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] flex flex-col gap-0.5">
                <span className="font-bold text-white flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" /> AI Creators
                </span>
                <span className="text-neutral-400">ComfyUI &amp; SD prompts, seeds, sampler</span>
              </div>
            </div>

            {/* Mobile Jump-To Pills (Visible on small screens) */}
            <div className="lg:hidden flex flex-col gap-2 pt-3 border-t border-neutral-800/80">
              <span className="text-[10px] font-bold text-neutral-400 uppercase font-mono">Quick Jump:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-[11px]">
                {sections.slice(0, 8).map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white shrink-0"
                  >
                    {sec.title.split('.')[1] || sec.title}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Action Cheat Sheet */}
          <section id="quick-cheat-sheet" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Quick Action Cheat Sheet</h2>
                <span className="text-xs text-neutral-400">Fast reference for common daily operations</span>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">What do you want to do?</th>
                    <th className="px-4 py-2.5">Where is it located?</th>
                    <th className="px-4 py-2.5">Exact Action to Take</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  <tr className="hover:bg-neutral-850/50">
                    <td className="px-4 py-3 font-semibold text-white">Strip GPS Coordinates from a photo</td>
                    <td className="px-4 py-3 text-neutral-400">Privacy Shield Tab or Header</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-rose-300">Click &quot;Strip GPS Only&quot;</td>
                  </tr>
                  <tr className="hover:bg-neutral-850/50">
                    <td className="px-4 py-3 font-semibold text-white">Edit Title, Alt Text or Caption</td>
                    <td className="px-4 py-3 text-neutral-400">Metadata Explorer (IPTC) or SEO Panel</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-purple-300">Click pencil icon on Headline/Caption</td>
                  </tr>
                  <tr className="hover:bg-neutral-850/50">
                    <td className="px-4 py-3 font-semibold text-white">Inject custom EXIF/IPTC/XMP tag</td>
                    <td className="px-4 py-3 text-neutral-400">Metadata Explorer (Center Column)</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-purple-300">Click &quot;+ Add Tag&quot; button</td>
                  </tr>
                  <tr className="hover:bg-neutral-850/50">
                    <td className="px-4 py-3 font-semibold text-white">Compare two photos &amp; sync tags</td>
                    <td className="px-4 py-3 text-neutral-400">Sidebar &rarr; &quot;Metadata Compare&quot;</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-amber-300">Click &quot;Copy A &rarr; B&quot; or pencil to edit in-place</td>
                  </tr>
                  <tr className="hover:bg-neutral-850/50">
                    <td className="px-4 py-3 font-semibold text-white">Bulk rename files using tags</td>
                    <td className="px-4 py-3 text-neutral-400">Queue list &rarr; &quot;Batch Edit&quot;</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-blue-300">Switch to &quot;Bulk Renaming&quot; tab</td>
                  </tr>
                  <tr className="hover:bg-neutral-850/50">
                    <td className="px-4 py-3 font-semibold text-white">Rollback accidental metadata edits</td>
                    <td className="px-4 py-3 text-neutral-400">Canvas Toolbar (Clock/History icon)</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-emerald-300">Click &quot;Restore&quot; on any previous snapshot</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 1. Metadata Inspection & Tag CRUD */}
          <section id="inspection" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">1. Deep Metadata Inspection &amp; Tag CRUD</h2>
                <span className="text-xs text-neutral-400">Direct reading, editing, injecting, and deleting across EXIF, IPTC, and XMP</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                MetaForge parses binary chunks using WebAssembly and client-side binary parsers. Metadata is separated into distinct accordion categories:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5 text-xs">
                    <Camera className="w-4 h-4 text-emerald-400" /> EXIF Headers
                  </span>
                  <p className="text-xs text-neutral-400">
                    Camera Make, Model, LensModel, FNumber, ISOSpeedRatings, ExposureTime, DateTimeOriginal, and MakerNotes.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5 text-xs">
                    <Tag className="w-4 h-4 text-amber-400" /> IPTC Attributes
                  </span>
                  <p className="text-xs text-neutral-400">
                    Headline, Caption, CopyrightNotice, Byline (Artist), Credit, Source, City, and Keywords array.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5 text-xs">
                    <FileCode className="w-4 h-4 text-purple-400" /> XMP &amp; Dublin Core
                  </span>
                  <p className="text-xs text-neutral-400">
                    Extensible Metadata Platform packets: dc:title, dc:rights, xmp:CreatorTool, and editing history.
                  </p>
                </div>
              </div>

              {/* Step by step */}
              <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 flex flex-col gap-2.5">
                <span className="font-bold text-white text-xs uppercase tracking-wider">Step-by-Step Tag Editing Guide:</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
                    <span className="font-bold text-purple-400 font-mono">STEP 1</span>
                    <span className="font-semibold text-white">Select File</span>
                    <span className="text-neutral-400 text-[11px]">Click any image in the Queue or drag &amp; drop photos.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
                    <span className="font-bold text-purple-400 font-mono">STEP 2</span>
                    <span className="font-semibold text-white">Locate Tag</span>
                    <span className="text-neutral-400 text-[11px]">Expand IPTC or EXIF or use the instant filter bar.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
                    <span className="font-bold text-purple-400 font-mono">STEP 3</span>
                    <span className="font-semibold text-white">Click Edit</span>
                    <span className="text-neutral-400 text-[11px]">Click the pencil icon on that row to open the editor.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
                    <span className="font-bold text-purple-400 font-mono">STEP 4</span>
                    <span className="font-semibold text-white">Auto-Sync</span>
                    <span className="text-neutral-400 text-[11px]">Hit Save. Binary chunks re-sync instantly in memory.</span>
                  </div>
                </div>
              </div>

              {/* Pro Tip */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-amber-300">Pro Tip — Custom Tag Injection:</span>
                  <p className="text-neutral-400 mt-0.5">
                    Click the <strong>&quot;+ Add Tag&quot;</strong> button at the top of the Metadata Inspector to inject custom IPTC attributes (such as <code>Source</code>, <code>Credit</code>, or <code>SpecialInstructions</code>) directly into any image file.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Metadata Comparator & Live Sync */}
          <section id="compare" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <GitCompare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">2. Side-by-Side Metadata Difference Comparator</h2>
                <span className="text-xs text-neutral-400">Diff visualizer, bi-directional sync, and in-place field editing</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                When managing series of photos or client shoots, metadata discrepancies frequently happen (e.g., inconsistent copyright strings, missing titles, or accidental GPS leaks).
              </p>

              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
                <span className="font-bold text-white text-xs">Comparator Key Capabilities:</span>
                <ul className="space-y-1.5 text-neutral-300 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold shrink-0">&rarr;</span>
                    <span><strong>Visual Deviation Highlighting:</strong> Matching tags render in clean neutral slate, while differing values highlight in amber alerts.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold shrink-0">&rarr;</span>
                    <span><strong>Bi-directional Field Sync:</strong> Click <code className="text-purple-300 bg-neutral-800 px-1 rounded">Copy A &rarr; B</code> or <code className="text-blue-300 bg-neutral-800 px-1 rounded">Copy B &rarr; A</code> on Title, Alt Text, Keywords, Camera Model, Lens, or Copyright.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold shrink-0">&rarr;</span>
                    <span><strong>Direct In-Place Editing:</strong> Every field in Asset A or Asset B has a direct edit pencil icon. Fix typos immediately without leaving the comparator!</span>
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-300">Quick Studio Navigation:</span>
                  <p className="text-neutral-400 mt-0.5">
                    Click <strong>&quot;Open in Studio&quot;</strong> underneath Asset A or Asset B to instantly switch back to the main Studio Workstation with that image loaded into the active canvas.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Metadata & SEO Presets Manager */}
          <section id="presets" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">3. Metadata &amp; SEO Presets Manager</h2>
                <span className="text-xs text-neutral-400">Standardized profiles for Studios, Agencies, and E-commerce</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                Presets let you bundle attribution rules, GPS scrub preferences, and keywords into a single reusable profile:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                  <span className="font-bold text-emerald-400 text-xs">Standard Default Presets</span>
                  <p className="text-xs text-neutral-400">
                    Includes <em>SEO Web Publisher</em>, <em>Photographer Attribution</em>, <em>E-Commerce Product Catalog</em>, and <em>Social Media OPSEC</em>.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                  <span className="font-bold text-purple-400 text-xs">Custom Presets Creation</span>
                  <p className="text-xs text-neutral-400">
                    Click <strong>New Preset</strong> to define your own artist, copyright, custom tags, and automated camera serial scrub options.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-amber-300">Batch Preset Application:</span>
                  <p className="text-neutral-400 mt-0.5">
                    You can apply a preset to an individual active photo or select multiple files in the Queue to apply the preset simultaneously across an entire photoshoot!
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Privacy Shield & OPSEC Threat Sanitization */}
          <section id="privacy" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">4. Privacy Shield &amp; Threat Sanitization</h2>
                <span className="text-xs text-neutral-400">Scrubbing exact coordinates, serial fingerprints, and machine hostnames</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                Uncleaned photos contain severe physical location and digital fingerprinting vectors. MetaForge calculates a <strong>Threat Index (0 to 100)</strong> and provides 3 tiers of sanitization:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex flex-col gap-1">
                  <span className="font-bold text-rose-400 text-xs flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Strip GPS Only
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Losslessly scrubs GPS IFD table from JPEG binaries without altering colors or other EXIF tags.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col gap-1">
                  <span className="font-bold text-indigo-400 text-xs flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Sanitize for Social
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Removes GPS, camera serial numbers, and machine hostnames, but preserves Copyright and Artist attribution.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                  <span className="font-bold text-white text-xs flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> Strip 100% EXIF
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Total binary purge. Clears all APP marker segments for complete, untraceable anonymity.
                  </p>
                </div>
              </div>

              {/* OPSEC Caution Alert */}
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-rose-300">OPSEC Warning — Digital Fingerprint Correlation:</span>
                  <p className="text-neutral-400 mt-0.5">
                    Even when GPS coordinates are omitted, camera body and lens serial numbers (<code>BodySerialNumber</code>, <code>InternalSerialNumber</code>) act as persistent hardware UUIDs. Always use <strong>Sanitize for Social</strong> or <strong>Strip 100% EXIF</strong> when posting media anonymously.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 5. ComfyUI & SD Prompt Decoder */}
          <section id="ai-workflow" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">5. ComfyUI, Stable Diffusion &amp; Midjourney Prompt Decoder</h2>
                <span className="text-xs text-neutral-400">Extract positive prompts, negative prompts, seeds, and node graphs</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                Modern AI generation tools embed prompt recipes in binary chunks (such as PNG <code>tEXt</code> chunks). MetaForge automatically decodes these:
              </p>

              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 font-mono text-xs flex flex-col gap-2">
                <span className="text-purple-400 font-bold">Extracted Parameters:</span>
                <div className="space-y-1 text-neutral-300 text-[11px]">
                  <div>• <strong>Prompt:</strong> Master positive conditioning string</div>
                  <div>• <strong>Negative:</strong> Unwanted artifact and composition exclusions</div>
                  <div>• <strong>Sampling Recipe:</strong> Sampler name, Step count, CFG scale, Seed number</div>
                  <div>• <strong>Base Model:</strong> Checkpoint loader hash &amp; filename</div>
                </div>
              </div>

              {/* Sample AI JSON snippet */}
              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-black border border-neutral-800 text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-48">
                  {sampleAiPromptJson}
                </pre>
                <button
                  onClick={() => handleCopy('aiprompt', sampleAiPromptJson)}
                  className="absolute right-3 top-3 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition flex items-center gap-1 text-[10px]"
                >
                  {copiedCode === 'aiprompt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'aiprompt' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* 6. Gemini Vision AI SEO Studio */}
          <section id="gemini-seo" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">6. Dynamic AI Vision Engine (Google Gemini BYOK)</h2>
                <span className="text-xs text-neutral-400">Bring Your Own Key vision-based Alt Text, Titles, and IPTC Keyword generation</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                MetaForge includes an optional Google Gemini Vision assistant. When disabled, the application runs 100% offline. When enabled, enter your free API key from Google AI Studio:
              </p>

              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-start gap-3">
                <Key className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-white">Client-to-Google Direct Guarantee:</span>
                  <p className="text-neutral-400 mt-1">
                    Your key is saved exclusively in your browser&apos;s <code>localStorage</code>. Requests are sent directly from your browser to Google&apos;s Gemini endpoint with zero middleware logging.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                <span className="font-bold text-white block mb-1">Embedding Gemini SEO into Photos:</span>
                <p className="text-neutral-400">
                  After generating, click <strong>&quot;Write SEO Data to IPTC/EXIF Chunks&quot;</strong>. The title, alt text, and keywords will be written directly into the JPEG/PNG headers!
                </p>
              </div>
            </div>
          </section>

          {/* 7. Search & Social Card Simulator */}
          <section id="social-preview" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">7. Search &amp; Social Card Simulator</h2>
                <span className="text-xs text-neutral-400">Live preview for Google Search, Twitter/X cards, and Facebook OpenGraph</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                Search engines index images based on file naming, Alt texts, and header titles. The simulator shows how your photo looks across major web platforms before publishing.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="font-bold text-white text-xs">Google SERP Snippet</span>
                  <p className="text-xs text-neutral-400">
                    Calculates recommended Title length (50–60 characters) and displays simulated Google Search snippet format.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="font-bold text-white text-xs">Twitter / X Summary Card</span>
                  <p className="text-xs text-neutral-400">
                    Renders <code>twitter:card summary_large_image</code> preview with headline and publisher handle.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="font-bold text-white text-xs">Facebook OpenGraph Card</span>
                  <p className="text-xs text-neutral-400">
                    Simulates <code>og:title</code>, <code>og:description</code>, and 1.91:1 aspect ratio card bounds.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 8. Image Sitemap XML Builder */}
          <section id="sitemap-xml" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">8. Google Image Sitemap (XML) Builder</h2>
                <span className="text-xs text-neutral-400">Automated Google Search Central compliant XML generation</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                Google Search Central recommends image sitemaps so search crawlers can index media loaded dynamically via JavaScript:
              </p>

              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-black border border-neutral-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/gallery/shibuya-crossing</loc>
    <image:image>
      <image:loc>https://example.com/images/shibuya-crossing.jpg</image:loc>
      <image:title>Shibuya Crossing Night Street Photography</image:title>
      <image:caption>Tokyo neon crosswalk captured during rain.</image:caption>
    </image:image>
  </url>
</urlset>`}
                </pre>
                <button
                  onClick={() => handleCopy('sitemap', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n  <url>\n    <loc>https://example.com/gallery/shibuya-crossing</loc>\n    <image:image>\n      <image:loc>https://example.com/images/shibuya-crossing.jpg</image:loc>\n      <image:title>Shibuya Crossing Night Street Photography</image:title>\n      <image:caption>Tokyo neon crosswalk captured during rain.</image:caption>\n    </image:image>\n  </url>\n</urlset>`)}
                  className="absolute right-3 top-3 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition flex items-center gap-1 text-[10px]"
                >
                  {copiedCode === 'sitemap' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'sitemap' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-2.5">
                <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-cyan-300">Google Search Console Integration:</span>
                  <p className="text-neutral-400 mt-0.5">
                    Save the generated XML file as <code>image-sitemap.xml</code> in your website&apos;s root public directory and submit the URL in Google Search Console under Sitemaps for rapid indexing.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 9. Batch Queue & Bulk Operations */}
          <section id="batch-zip" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">9. Batch Queue, Bulk Renaming &amp; ZIP Export</h2>
                <span className="text-xs text-neutral-400">High-throughput processing with zero main thread freezes</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                In the Queue list, select multiple photos to unlock the Batch Operations Bar:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                  <span className="font-bold text-purple-400 text-xs">Bulk Metadata Injector</span>
                  <p className="text-xs text-neutral-400">
                    Apply standardized Copyright Notice, Artist Attribution, and Keywords (with Append or Replace mode) across all selected assets.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                  <span className="font-bold text-blue-400 text-xs">Dynamic Filename Renamer</span>
                  <p className="text-xs text-neutral-400">
                    Pattern renamer supporting <code>{'{title}'}</code>, <code>{'{date}'}</code>, <code>{'{artist}'}</code>, and <code>{'{counter}'}</code>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-indigo-300">Memory-Streamed ZIP Export:</span>
                  <p className="text-neutral-400 mt-0.5">
                    Click <strong>&quot;Download All (ZIP)&quot;</strong> to bundle all modified images into a single compressed archive without sending any data over the internet.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 10. Audit History & Snapshot Rollback */}
          <section id="history" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">10. Audit History &amp; Snapshot Rollback Engine</h2>
                <span className="text-xs text-neutral-400">Full audit trail of every manual, AI, or preset mutation</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                MetaForge automatically takes in-memory snapshots whenever tags are modified. In the Canvas top toolbar, click the <strong>Audit History (Clock)</strong> icon to view:
              </p>

              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">User</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">AI</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">Preset</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">System</span>
                </div>
                <p className="text-neutral-400">
                  Every entry displays the exact diff summary, actor, and timestamp.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5">
                <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-300">One-Click Rollback:</span>
                  <p className="text-neutral-400 mt-0.5">
                    Click <strong>Restore</strong> on any previous snapshot to instantly revert your image&apos;s EXIF, IPTC, and XMP headers back to that exact state in history.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 11. JSON Metadata Catalog Export */}
          <section id="json-catalog" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">11. JSON Metadata Catalog Export</h2>
                <span className="text-xs text-neutral-400">Single asset .json or unified batch catalog for developer APIs</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                Need to feed image metadata into a database or headless CMS? MetaForge exports structured JSON payloads:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                  <span className="font-bold text-white text-xs">Single Asset JSON</span>
                  <p className="text-xs text-neutral-400">
                    Click the <code>.json</code> icon in the Canvas top bar to download the active image&apos;s full metadata payload.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                  <span className="font-bold text-white text-xs">Unified Batch JSON Catalog</span>
                  <p className="text-xs text-neutral-400">
                    Click <strong>Export JSON</strong> in the top header or quick actions sheet to download all queued photos as a single catalog.
                  </p>
                </div>
              </div>

              {/* Sample Catalog snippet */}
              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-black border border-neutral-800 text-[11px] font-mono text-amber-300 overflow-x-auto max-h-52">
                  {sampleCatalogJson}
                </pre>
                <button
                  onClick={() => handleCopy('catalog', sampleCatalogJson)}
                  className="absolute right-3 top-3 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition flex items-center gap-1 text-[10px]"
                >
                  {copiedCode === 'catalog' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'catalog' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* 12. Canvas Zoom, Pan & Shortcuts */}
          <section id="canvas-shortcuts" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">12. Interactive Canvas, Pan/Zoom &amp; Keyboard Shortcuts</h2>
                <span className="text-xs text-neutral-400">Ergonomic gestures for desktop, tablet, and mobile</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <ZoomIn className="w-4 h-4 text-pink-400" /> Touch &amp; Mouse Controls
                  </span>
                  <ul className="text-xs text-neutral-400 space-y-1.5">
                    <li>• <strong>Zoom:</strong> Click + / - to scale between 50% and 400%</li>
                    <li>• <strong>Pan:</strong> Click and drag (or touch drag) when zoomed</li>
                    <li>• <strong>Double Tap / Double Click:</strong> Instant toggle between 100% and 200%</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Keyboard className="w-4 h-4 text-purple-400" /> Keyboard Shortcuts
                  </span>
                  <ul className="text-xs text-neutral-400 space-y-1.5 font-mono">
                    <li>• <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">&rarr;</kbd> or <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">]</kbd> Next Image</li>
                    <li>• <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">&larr;</kbd> or <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">[</kbd> Previous Image</li>
                    <li>• <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">&#8984;K</kbd> or <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">/</kbd> Command Palette</li>
                    <li>• <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">?</kbd> Open Keyboard Help</li>
                    <li>• <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">Esc</kbd> Dismiss Dialogs</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 13. Raw Hex Stream & Byte Headers */}
          <section id="hex-viewer" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Binary className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">13. Raw Hex Stream &amp; Byte Headers</h2>
                <span className="text-xs text-neutral-400">Byte-level inspection of magic numbers, APP markers, and text chunks</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                In the Center Inspector, click the <strong>Raw Hex</strong> tab to inspect the raw binary byte stream of your image.
              </p>

              <div className="p-4 rounded-xl bg-black border border-neutral-800 font-mono text-[11px] text-neutral-400 leading-relaxed overflow-x-auto">
                <div className="text-cyan-400 font-bold mb-1">Standard Magic Byte Signatures:</div>
                <div>• JPEG SOI Marker: <code className="text-emerald-400">FF D8 FF</code> (Start of Image)</div>
                <div>• EXIF Header: <code className="text-emerald-400">45 78 69 66 00 00</code> (&quot;Exif\0\0&quot;)</div>
                <div>• PNG Signature: <code className="text-emerald-400">89 50 4E 47 0D 0A 1A 0A</code> (&quot;.PNG\r\n\x1a\n&quot;)</div>
                <div>• WebP RIFF: <code className="text-emerald-400">52 49 46 46 ... 57 45 42 50</code> (&quot;RIFF....WEBP&quot;)</div>
              </div>
            </div>
          </section>

          {/* 14. Troubleshooting & FAQ Accordion */}
          <section id="troubleshooting-faq" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">14. Troubleshooting &amp; FAQ</h2>
                <span className="text-xs text-neutral-400">Answers to frequent technical and operational questions</span>
              </div>
            </div>

            <div className="space-y-3">
              {faqItems.map((item, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden transition"
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-white hover:text-purple-300 transition"
                    >
                      <span className="pr-4">{item.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-purple-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-neutral-400 leading-relaxed border-t border-neutral-800/60 bg-neutral-950/40">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* CTA Footer */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-neutral-900 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-5 mt-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Ready to Put MetaForge to Work?</h3>
              <p className="text-xs text-neutral-400 mt-1">Jump right in or load built-in sample demo images with one click.</p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition shrink-0"
            >
              Open Studio Workstation
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
