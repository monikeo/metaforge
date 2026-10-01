import React from 'react';
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
  Key
} from 'lucide-react';

export const metadata = {
  title: 'Feature Tutorials & User Guide — MetaForge',
  description: 'Complete step-by-step master guide and technical walkthrough for every feature and tool inside MetaForge.'
};

export default function TutorialPage() {
  const sections = [
    { id: 'inspection', title: '1. Metadata Inspection & Tag CRUD', icon: FileText, color: 'text-blue-400' },
    { id: 'privacy', title: '2. Privacy Shield & Sanitization', icon: ShieldAlert, color: 'text-rose-400' },
    { id: 'ai-workflow', title: '3. ComfyUI & SD Prompt Decoder', icon: Cpu, color: 'text-purple-400' },
    { id: 'gemini-seo', title: '4. Gemini Vision SEO & Tagging', icon: Sparkles, color: 'text-amber-400' },
    { id: 'social-preview', title: '5. Search & Social Simulator', icon: Globe, color: 'text-emerald-400' },
    { id: 'sitemap-xml', title: '6. Image Sitemap (XML) Builder', icon: FileCode, color: 'text-cyan-400' },
    { id: 'batch-zip', title: '7. Batch Queue & ZIP Export', icon: Download, color: 'text-indigo-400' },
    { id: 'canvas-shortcuts', title: '8. Canvas Zoom & Shortcuts', icon: Keyboard, color: 'text-pink-400' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/85 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
              <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-white uppercase">METAFORGE</span>
            <span className="text-[10px] text-neutral-400 font-mono -mt-1">FEATURE MASTER GUIDE</span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Studio</span>
            <span className="sm:hidden">Studio</span>
          </Link>
          <Link
            href="/about"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition"
          >
            About &amp; Docs
          </Link>
        </div>
      </nav>

      {/* Main Content Layout with Sidebar TOC on Desktop */}
      <div className="flex-1 max-w-[1500px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT STICKY NAVIGATION (Table of Contents) */}
        <aside className="lg:col-span-3 lg:sticky lg:top-24 h-fit flex flex-col gap-3">
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2.5">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>Feature Directory</span>
            </div>

            <nav className="flex flex-col gap-1 text-xs">
              {sections.map((sec) => {
                const Icon = sec.icon;
                return (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${sec.color}`} />
                    <span className="truncate">{sec.title}</span>
                  </a>
                );
              })}
            </nav>

            <div className="mt-2 pt-3 border-t border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span>100% In-Memory Privacy</span>
              </div>
              <Link
                href="/"
                className="w-full py-2 rounded-xl text-xs font-semibold text-center bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm"
              >
                Launch Studio
              </Link>
            </div>
          </div>
        </aside>

        {/* RIGHT TUTORIAL CONTENT (col-span-9) */}
        <main className="lg:col-span-9 flex flex-col gap-12 sm:gap-16">
          
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-neutral-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-medium w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Comprehensive Practical Reference</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              MetaForge Feature Guide &amp; Technical Manual
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Every tool in MetaForge operates entirely in your browser without sending your pictures to a remote server. Learn how to inspect, clean, enrich, and export your digital assets with maximum precision.
            </p>
          </div>

          {/* 1. Metadata Inspection & Tag CRUD */}
          <section id="inspection" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">1. Deep Metadata Inspection &amp; Tag CRUD</h2>
                <span className="text-xs text-neutral-400">File Info, EXIF, IPTC, XMP, GPS, and MakerNotes</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                MetaForge parses binary chunks using a combination of WebAssembly and native memory parsers (<code>exifr</code> and <code>piexifjs</code>). It categorizes metadata into structured blocks:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-400" /> EXIF &amp; Camera Hardware
                  </span>
                  <p className="text-xs text-neutral-400">
                    Camera Make/Model, Shutter Speed, F-Number (Aperture), ISO Speed, Lens Specification, and Original Capture Timestamps.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-400" /> IPTC &amp; Dublin Core
                  </span>
                  <p className="text-xs text-neutral-400">
                    Headline, Caption/Description, Copyright Notice, Creator/Artist attribution, Credit, and Keyword arrays.
                  </p>
                </div>
              </div>

              <h3 className="text-xs font-bold text-white uppercase tracking-wider pt-2">How to Use:</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-neutral-300">
                <li><strong>Select an image:</strong> Click any file in the left queue. The accordion tree will populate instantly.</li>
                <li><strong>Copy any value:</strong> Hover over any tag row and click the <code className="text-neutral-200 bg-neutral-800 px-1.5 py-0.5 rounded">Copy</code> icon.</li>
                <li><strong>Edit a tag:</strong> Click the <code className="text-purple-300 bg-neutral-800 px-1.5 py-0.5 rounded">Edit</code> pencil icon to open the Tag Editor modal. Modify the string, number, or JSON object and hit Save.</li>
                <li><strong>Delete a tag:</strong> Click the <code className="text-rose-300 bg-neutral-800 px-1.5 py-0.5 rounded">Trash</code> icon to immediately purge that specific entry from memory.</li>
              </ol>
            </div>
          </section>

          {/* 2. Privacy Shield & Threat Sanitization */}
          <section id="privacy" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">2. Privacy Shield &amp; Threat Sanitization</h2>
                <span className="text-xs text-neutral-400">Threat Index, GPS Scrubbing, Serial Masking</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                Every uploaded image is audited against real-world operational security (OPSEC) vectors. The <strong>Threat Index (0 to 100)</strong> scores the exposure:
              </p>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-200 flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">CRITICAL THREAT (GPS Coordinates):</span>
                    <p className="mt-0.5 opacity-80">
                      Latitude/Longitude coordinates reveal exact physical capture coordinates. MetaForge links to Google Maps for verification and provides 1-click removal.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">MEDIUM THREAT (Hardware Serials &amp; Hostnames):</span>
                    <p className="mt-0.5 opacity-80">
                      <code>CameraSerialNumber</code>, <code>BodySerialNumber</code>, and <code>HostComputer</code> allow trackers to correlate photos across different websites to a single owner.
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-bold text-white uppercase tracking-wider pt-2">Sanitization Modes:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="font-bold text-rose-300 text-xs block mb-1">Strip GPS Only</span>
                  <p className="text-[11px] text-neutral-400">
                    Losslessly empties the GPS IFD table from JPEG binaries without modifying other camera tags or pixel colors.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="font-bold text-indigo-300 text-xs block mb-1">Sanitize for Social</span>
                  <p className="text-[11px] text-neutral-400">
                    Strips GPS, serial numbers, hostnames, and software, but safely retains Copyright and Creator attribution.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="font-bold text-neutral-200 text-xs block mb-1">Strip 100% EXIF</span>
                  <p className="text-[11px] text-neutral-400">
                    Total binary purge. Clears all APP marker segments or renders via offscreen canvas for complete anonymity.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. ComfyUI & SD Prompt Decoder */}
          <section id="ai-workflow" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">3. ComfyUI, Stable Diffusion &amp; Midjourney Prompt Decoder</h2>
                <span className="text-xs text-neutral-400">Instant extraction from PNG tEXt/iTXt chunks</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                AI image generators embed generation metadata inside PNG text chunks or EXIF UserComments. MetaForge reads these binary structures directly:
              </p>

              <div className="p-4 rounded-xl bg-neutral-900 border border-purple-500/30 flex flex-col gap-2 font-mono text-xs">
                <div className="text-purple-400 font-bold">Auto-Decoded Parameters:</div>
                <ul className="space-y-1 text-neutral-300 text-[11px]">
                  <li>• <strong>Positive Prompt:</strong> Extracted from CLIPTextEncode nodes or parameter strings</li>
                  <li>• <strong>Negative Prompt:</strong> Filtered from negative conditioning branches</li>
                  <li>• <strong>Hyperparameters:</strong> Sampler name, Step count, CFG scale, and Seed number</li>
                  <li>• <strong>Model Checkpoint:</strong> Checkpoint loader filename and hash</li>
                </ul>
              </div>

              <p className="text-xs text-neutral-400">
                You can copy individual prompts or inspect the entire raw JSON graph by clicking <em>&quot;Inspect Raw Workflow Graph&quot;</em> in the AI Workflow tab.
              </p>
            </div>
          </section>

          {/* 4. Gemini Vision SEO */}
          <section id="gemini-seo" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">4. Dynamic AI Vision Engine (Google Gemini BYOK)</h2>
                <span className="text-xs text-neutral-400">Vision-based Alt Text, Titles, and IPTC Keyword generation</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                MetaForge features an optional, toggleable AI layer. When toggled <strong>OFF</strong>, the application is 100% offline with zero network requests. When toggled <strong>ON</strong>, you can configure your free Google Gemini API key:
              </p>

              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start gap-3">
                <Key className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-300">
                  <span className="font-bold text-white">Bring Your Own Key (BYOK) Security:</span>
                  <p className="mt-1 text-neutral-400">
                    Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 underline">Google AI Studio</a>. Your key is saved exclusively in your browser&apos;s <code>localStorage</code>. All API requests travel directly from your browser to Google&apos;s endpoints.
                  </p>
                </div>
              </div>

              <h3 className="text-xs font-bold text-white uppercase tracking-wider pt-2">How to Generate &amp; Save:</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-neutral-300">
                <li>Toggle <strong>AI ENABLED</strong> in the top header.</li>
                <li>Click <strong>Analyze with Gemini</strong> in the right-hand panel.</li>
                <li>Review the generated <em>SEO Title</em>, <em>Accessible Alt Text</em>, and <em>Keyword Pills</em>.</li>
                <li>Click <strong>Write SEO Data to IPTC/EXIF Chunks</strong> to embed the text directly into the image file.</li>
              </ol>
            </div>
          </section>

          {/* 5. Search & Social Simulator */}
          <section id="social-preview" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">5. Search &amp; Social Card Simulator</h2>
                <span className="text-xs text-neutral-400">Google Image Search, Twitter/X, and Facebook OpenGraph</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                Visual search engines like Google Images index visual media based on surrounding context and embedded metadata. The live simulator displays how your image appears when crawled:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                  <span className="font-bold text-blue-400 block mb-1">Google Search</span>
                  <p className="text-[11px] text-neutral-400">Simulates title truncations at 65 characters and displays resolution badges.</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                  <span className="font-bold text-neutral-200 block mb-1">Twitter / X Card</span>
                  <p className="text-[11px] text-neutral-400">16:9 large image card preview with title and domain headline.</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                  <span className="font-bold text-indigo-400 block mb-1">Facebook Card</span>
                  <p className="text-[11px] text-neutral-400">1.91:1 aspect ratio feed representation for link sharing.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Image Sitemap XML Builder */}
          <section id="sitemap-xml" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">6. Google Image Sitemap (XML) Builder</h2>
                <span className="text-xs text-neutral-400">Automated Google Search Central XML specification</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                Submitting an image sitemap helps Google discover images that may be loaded via JavaScript or dynamic frameworks.
              </p>

              <pre className="p-3.5 rounded-xl bg-black border border-neutral-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/gallery/tokyo-night</loc>
    <image:image>
      <image:loc>https://example.com/images/tokyo-night.jpg</image:loc>
      <image:title>Shibuya Crossing at Night</image:title>
      <image:caption>Vibrant rain-slicked Tokyo street photography.</image:caption>
    </image:image>
  </url>
</urlset>`}
              </pre>

              <p className="text-xs text-neutral-400">
                Click <strong>Generate Google Image Sitemap XML</strong> at the bottom of the right panel, configure your domain name, and download <code>image-sitemap.xml</code>.
              </p>
            </div>
          </section>

          {/* 7. Batch Queue & ZIP Export */}
          <section id="batch-zip" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">7. Batch Queue &amp; Multi-file ZIP Export</h2>
                <span className="text-xs text-neutral-400">Multi-threaded in-memory processing</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <p>
                Process dozens of photos in a single session without UI freezes:
              </p>

              <ul className="space-y-2 text-xs text-neutral-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Strip All GPS:</strong> Detects every photo in the queue containing GPS coordinates and sanitizes them in parallel.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Sanitize All for Social:</strong> Strips hardware serials and software metadata from all queued photos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Export All (ZIP):</strong> Bundles all modified files into a compressed ZIP file using <code>JSZip</code> directly in memory.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 8. Canvas Zoom, Pan & Shortcuts */}
          <section id="canvas-shortcuts" className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-2">
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">8. Interactive Canvas, Gestures &amp; Shortcuts</h2>
                <span className="text-xs text-neutral-400">Touch panning, double-tap zoom, and keyboard navigation</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <ZoomIn className="w-4 h-4 text-pink-400" /> Mouse &amp; Touch Controls
                  </span>
                  <ul className="text-xs text-neutral-400 space-y-1.5">
                    <li>• <strong>Zoom:</strong> Click + / - to scale between 50% and 400%</li>
                    <li>• <strong>Pan:</strong> Click and drag (or touch and drag) when zoomed</li>
                    <li>• <strong>Double Tap / Double Click:</strong> Instantly toggle between 100% and 200% zoom</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Keyboard className="w-4 h-4 text-purple-400" /> Keyboard Shortcuts
                  </span>
                  <ul className="text-xs text-neutral-400 space-y-1.5 font-mono">
                    <li>• <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">→</kbd> or <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">]</kbd> Next Image</li>
                    <li>• <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">←</kbd> or <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">[</kbd> Previous Image</li>
                    <li>• <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">?</kbd> Open Shortcuts Guide</li>
                    <li>• <kbd className="text-neutral-200 bg-neutral-800 px-1 rounded">Esc</kbd> Close Active Modals</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Footer */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-neutral-900 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-5 mt-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Experience MetaForge in Action</h3>
              <p className="text-xs text-neutral-400 mt-1">Jump right in or test with instant built-in sample images.</p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition shrink-0"
            >
              Open Studio Now
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
