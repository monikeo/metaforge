'use client';

import React, { useState } from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { FileCode, Download, Copy, Check, X } from 'lucide-react';
import { saveAs } from 'file-saver';

export default function SitemapExport() {
  const { files } = useMetaForgeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [domain, setDomain] = useState('https://example.com');
  const [copied, setCopied] = useState(false);

  // Generate XML
  const generateXml = () => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    for (const f of files) {
      xml += `  <url>\n`;
      xml += `    <loc>${domain}/gallery/${encodeURIComponent(f.name.replace(/\.[^/.]+$/, ''))}</loc>\n`;
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${domain}/images/${encodeURIComponent(f.name)}</image:loc>\n`;
      if (f.seoData?.title) {
        xml += `      <image:title><![CDATA[${f.seoData.title}]]></image:title>\n`;
      }
      if (f.seoData?.caption) {
        xml += `      <image:caption><![CDATA[${f.seoData.caption}]]></image:caption>\n`;
      }
      xml += `    </image:image>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;
    return xml;
  };

  const xmlContent = generateXml();

  const handleCopy = () => {
    navigator.clipboard.writeText(xmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    saveAs(blob, 'image-sitemap.xml');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition flex items-center justify-center gap-1.5"
      >
        <FileCode className="w-3.5 h-3.5 text-blue-400" />
        Generate Google Image Sitemap XML ({files.length} images)
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-5 text-neutral-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Google Image Sitemap (XML)</h3>
                  <p className="text-xs text-neutral-400">Standard XML format for Google Search Console submission</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Base Domain Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-400">Website Base Domain URL</label>
              <input
                type="url"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="https://example.com"
                className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* XML Preview */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Generated XML Payload</span>
                <span>{files.length} indexed image entries</span>
              </div>
              <pre className="max-h-64 overflow-auto p-3 rounded-xl bg-black border border-neutral-800 font-mono text-[11px] text-neutral-300 leading-relaxed select-all">
                {xmlContent}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy XML'}
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download sitemap.xml
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
