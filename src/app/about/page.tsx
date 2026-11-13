import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Cpu,
  Sparkles,
  Lock,
  FileCode,
  Globe,
  Layers,
  Zap,
  Database,
  ExternalLink,
  MapPinOff,
  Eye,
  Camera,
  ServerOff,
  Clock,
  HardDrive
} from 'lucide-react';

import ScrollProgress from '@/components/ScrollExperience/ScrollProgress';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-models';
import BrandMark from '@/components/BrandMark';

const buildYear = new Date().getFullYear();

export const metadata = {
  title: 'About & Technical Architecture — MetaForge',
  description: 'Deep technical overview of MetaForge dual-engine architecture, browser metadata core, Google Gemini BYOK vision layer, and privacy threat model.'
};

export default function AboutPage() {
  const supportedFormats = [
    { format: 'JPEG / JPG', read: 'EXIF, IPTC, XMP, GPS, MakerNotes', write: 'Native EXIF and Unicode XMP editing', status: 'Full Read/Write' },
    { format: 'PNG', read: 'tEXt, zTXt, iTXt (ComfyUI / SD prompts), EXIF', write: 'XMP editing and lossless text chunk removal', status: 'Full Read/Write' },
    { format: 'WebP', read: 'EXIF, XMP, VP8/VP8X container headers', write: 'XMP editing and metadata chunk removal', status: 'Read + Write' },
    { format: 'TIFF', read: 'Multi-IFD EXIF, GPS, Baseline tags', write: 'In-memory parse & JSON telemetry export', status: 'Full Read' },
    { format: 'AVIF', read: 'ISO BMFF box headers, EXIF/XMP payloads', write: 'Client-side container decode', status: 'Full Read' },
    { format: 'HEIC / HEIF', read: 'EXIF where supported by the browser and parser', write: 'PNG sanitization when browser decoding is available', status: 'Browser dependent' }
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      <ScrollProgress />
      
      {/* Top Navbar */}
      <nav aria-label="Site" className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between pt-safe">
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 group shrink-0">
          <BrandMark className="w-8 h-8" />
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-bold tracking-wider text-white uppercase">METAFORGE</span>
            <span className="hidden sm:block text-[10px] text-neutral-400 font-mono -mt-1">ARCHITECTURE & DOCS</span>
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
            href="/tutorial"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition touch-target sm:min-h-0 sm:min-w-0"
          >
            <span className="hidden sm:inline">Tutorial Guide</span>
            <span className="sm:hidden">Guide</span>
          </Link>

          <a
            href="https://vercel.com/new"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition shadow-md"
          >
            Deploy to Vercel
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="outline-none flex-1 w-full min-w-0 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-12 sm:gap-16 pb-safe">
        
        {/* Hero Section */}
        <section className="flex flex-col gap-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-medium w-fit mx-auto sm:mx-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Image Metadata & SEO Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Inspect. Clean. Enrich. Publish.
          </h1>

          <p className="text-base sm:text-lg text-neutral-400 max-w-3xl leading-relaxed">
            MetaForge is a desktop-grade, privacy-first digital asset workstation engineered directly in the browser. It combines high-throughput client-side binary parsing with dynamic Google Gemini Vision intelligence—eliminating cloud storage costs and physical privacy leaks.
          </p>
        </section>

        {/* The Core Problem & Dual-Engine Solution */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-neutral-400" />
              The &quot;ExifTool + Vercel&quot; Reality Audit
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Why legacy server-side metadata tools fail in modern edge and serverless architectures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* The Old Bottleneck */}
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-rose-500/20 flex flex-col gap-3">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <ServerOff className="w-4 h-4" />
                Legacy Paradigm (ExifTool / Serverful)
              </span>
              <ul className="text-xs text-neutral-300 space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span><strong>Perl Dependency:</strong> Standard ExifTool requires Perl binaries, which do not ship in standard AWS Lambda/Vercel Node.js runtime images.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span><strong>Bandwidth & Cold Starts:</strong> Transferring gigabytes of multi-megapixel photos to a server creates massive latency, bandwidth costs, and Lambda timeout crashes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span><strong>Privacy Hazard:</strong> Users are forced to upload personal photos, travel shots, and confidential media to a remote third-party cloud.</span>
                </li>
              </ul>
            </div>

            {/* The MetaForge Dual-Engine Solution */}
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-purple-500/30 flex flex-col gap-3">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-purple-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                MetaForge Dual-Engine Architecture
              </span>
              <ul className="text-xs text-purple-200/90 space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span><strong>Engine A (In-Browser Client Core):</strong> Employs JavaScript, <code>exifr</code>, <code>piexifjs</code>, and HTML5 Canvas inside browser memory. 100% zero-upload execution.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span><strong>Engine B (Dynamic AI BYOK):</strong> Google Gemini Vision (<code>{DEFAULT_GEMINI_MODEL}</code> by default) runs client-to-API with zero server relay. When disabled, image analysis requests are not sent. Local tools work after the app loads.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span><strong>Zero Server Cost on Vercel:</strong> Operates as pure static Next.js assets on Vercel CDN. Metadata processing requires no backend image service. Hosting and optional AI usage remain subject to provider limits.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Performance & Latency Telemetry Benchmark */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Local Processing &amp; Limits
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Local processing avoids image uploads to the hosting server. Speed depends on image size, device memory, and format.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Parse &amp; Extract Latency
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-1">
                Device dependent
              </div>
              <span className="text-[11px] text-neutral-500">Parsing and writing run locally in JavaScript</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Bandwidth Ingestion Cost
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
                0 Bytes
              </div>
              <span className="text-[11px] text-neutral-500">Zero file upload to backend hosting</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Batch Scheduling
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-400 mt-1">
                Sequential
              </div>
              <span className="text-[11px] text-neutral-500">Per-file progress and failures are reported</span>
            </div>
          </div>
        </section>

        {/* Deep Feature Specifications */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-neutral-400" />
              Engine Specifications &amp; Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Low-level parsing capabilities across standard raster and AI generation formats.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Spec Card 1 */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Camera className="w-4 h-4" /> EXIF &amp; Camera Telemetry
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Reads EXIF and camera metadata. Supported JPEG fields can be edited; structural and binary fields are read-only. TIFF is available for inspection and JSON export.
              </p>
            </div>

            {/* Spec Card 2 */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <MapPinOff className="w-4 h-4" /> GPS &amp; Spatial Sanitization
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Detects Latitude, Longitude, Altitude, and Geo-timestamps. Features lossless binary insertion removal (<code>piexifjs</code>) or canvas-level absolute sanitization.
              </p>
            </div>

            {/* Spec Card 3 */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Cpu className="w-4 h-4" /> ComfyUI &amp; SD Workflows
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Decodes PNG <code>tEXt</code>, <code>zTXt</code>, and <code>iTXt</code> chunks to uncover positive prompts, negative prompts, samplers, seed numbers, and base checkpoint models.
              </p>
            </div>

            {/* Spec Card 4 */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Gemini Vision SEO
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Analyzes image visual compositions to generate high-ranking SEO headlines, WCAG-compliant screen-reader Alt Texts, editorial captions, and IPTC tag arrays.
              </p>
            </div>

            {/* Spec Card 5 */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Globe className="w-4 h-4" /> Google Image Sitemaps
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Compiles multi-image catalogs into standard XML image sitemaps ready for immediate submission to Google Search Console to maximize web crawler indexing.
              </p>
            </div>

            {/* Spec Card 6 */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-neutral-300 font-bold text-xs uppercase tracking-wider">
                <FileCode className="w-4 h-4 text-cyan-400" /> Raw Hex &amp; Chunk Stream
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Direct hex viewer with offset pointers, byte patterns, and ASCII string decoding for validating file headers, magic bytes, and custom metadata streams.
              </p>
            </div>
          </div>
        </section>

        {/* Supported File Formats Matrix */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-neutral-400" />
              Supported Formats &amp; Standards Matrix
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Comprehensive breakdown of file containers, standard metadata blocks, and write capabilities.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">File Format</th>
                  <th className="px-4 py-3">Parse &amp; Read Telemetry</th>
                  <th className="px-4 py-3">In-Memory Mutation Engine</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {supportedFormats.map((row) => (
                  <tr key={row.format} className="hover:bg-neutral-850/50 transition">
                    <td className="px-4 py-3 font-bold font-mono text-white">{row.format}</td>
                    <td className="px-4 py-3 text-neutral-400">{row.read}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-neutral-300">{row.write}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Privacy Threat Model */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              The Metadata Privacy Threat Model
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Why unstripped photos are an active threat to personal safety and operational security.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
                <MapPinOff className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Physical Location &amp; Stalking Hazards</h4>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Smartphone and modern DSLR photos store GPS coordinates with precision down to a few centimeters. Anyone downloading an unstripped photo can determine your exact residential address or daily routine.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Cross-Image Hardware Serial Fingerprinting</h4>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Camera bodies and lenses write unique factory serial numbers (<code>BodySerialNumber</code>, <code>CameraSerialNumber</code>) into EXIF headers. Data brokers can correlate anonymous photos uploaded under different pseudonyms to a single physical device.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Operating System &amp; Machine Hostname Leaks</h4>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Editing programs frequently save <code>HostComputer</code> (e.g., &quot;John-MacBook-Pro-16&quot;) and full local directory paths in XMP history, revealing your operating system build and internal file structure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col gap-1.5">
              <h3 className="text-xs font-bold text-white">Are my photos uploaded to any server?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Local parsing, editing, cleaning, and ZIP packaging run in your browser. If you explicitly run Gemini analysis, an image preview is sent directly to Google.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col gap-1.5">
              <h3 className="text-xs font-bold text-white">Where is my Google Gemini API key stored?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Your API key is saved in this browser&apos;s unencrypted <code>localStorage</code>. Clear it on shared devices. It is sent directly to Google&apos;s API endpoint over HTTPS and never passes through any proxy or database.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col gap-1.5">
              <h3 className="text-xs font-bold text-white">Can I edit individual EXIF tags?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Supported fields can be edited, deleted, and copied. Structural fields and individual GPS values are read-only; use Remove GPS to remove the complete location safely.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col gap-1.5">
              <h3 className="text-xs font-bold text-white">Does stripping GPS reduce visual quality?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                JPEG GPS removal usually preserves the compressed pixels. Secondary metadata and thumbnails are also removed to avoid duplicate locations. Full cleaning of rotated JPEGs may re-encode pixels to preserve orientation. Other formats may be converted to PNG.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="p-8 rounded-3xl bg-neutral-900/60 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-white">Ready to inspect and enrich your images?</h3>
            <p className="text-xs sm:text-sm text-neutral-400">
              Drag and drop any photo to begin instant in-browser inspection.
            </p>
          </div>

          <Link
            href="/"
            className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl transition shrink-0"
          >
            Launch MetaForge Studio
          </Link>
        </section>

        {/* Footer */}
        <footer className="border-t border-neutral-800 pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>© {buildYear} MetaForge Studio. Released under the MIT License.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white transition">Studio</Link>
            <Link href="/about" className="hover:text-white transition">Architecture</Link>
            <Link href="/tutorial" className="hover:text-white transition">Tutorial</Link>
            <a href="https://github.com/monikeo/metaforge" target="_blank" rel="noreferrer" className="hover:text-white transition">GitHub</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
