'use client';

import ModalOverlay from '@/components/ModalOverlay';

import React, { useState } from 'react';
import { useMetaForge, useMetaForgeStore } from '@/lib/store';
import { FileCode, Download, Copy, Check, X } from 'lucide-react';
import { buildImageSitemap } from '@/lib/sitemap';
import { copyText } from '@/lib/clipboard';
import { saveAs } from 'file-saver';

export default function SitemapExport() {
  const { files } = useMetaForge('files');
  const [isOpen, setIsOpen] = useState(false);
  const [domain, setDomain] = useState('https://example.com');
  const [copied, setCopied] = useState(false);

  // Only build the XML while the dialog is open.
  let xmlContent = '', validationError = '';
  if (isOpen) {
    try { xmlContent = buildImageSitemap(domain, files); }
    catch (error) { validationError = error instanceof Error ? error.message : 'Invalid website URL.'; }
  }
  const handleCopy = async () => {
    if (!xmlContent) return;
    setCopied(await copyText(xmlContent));
    setTimeout(() => setCopied(false), 2000);
  };
  const handleDownload = () => {
    if (!xmlContent) return;
    try { saveAs(new Blob([xmlContent], { type: 'application/xml;charset=utf-8' }), 'image-sitemap.xml'); }
    catch { useMetaForgeStore.getState().addToast({ type: 'error', title: 'Sitemap Download Failed', description: 'Try downloading again.' }); }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={files.length === 0}
        className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-200 border border-neutral-700 transition flex items-center justify-center gap-1.5 touch-target sm:min-h-0 sm:min-w-0"
      >
        <FileCode className="w-3.5 h-3.5 text-blue-400" />
        Generate Google Image Sitemap XML ({files.length} images)
      </button>

      {isOpen && (
        <ModalOverlay onClose={() => setIsOpen(false)} label="Image sitemap" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
          <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-5 text-neutral-100 flex flex-col gap-4 max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto pb-safe sm:pb-5">
            {/* Mobile Pull Handle */}
            <div className="w-12 h-1.5 bg-neutral-700/60 rounded-full mx-auto sm:hidden -mt-1 shrink-0" />

            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Google Image Sitemap (XML)</h3>
                  <p className="text-xs text-neutral-400">Standard XML format for Google Search Console submission</p>
                </div>
              </div>
              <button
                aria-label="Close image sitemap"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg touch-target sm:min-h-0 sm:min-w-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Base Domain Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-400">Website Base Domain URL</label>
              <input
                type="url"
                aria-label="Website base URL"
                aria-invalid={!!validationError}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="https://example.com"
                className="px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono min-h-[40px] sm:min-h-0"
              />
            </div>

            {validationError && <p role="alert" className="text-xs text-rose-300">{validationError}</p>}
            <p className="text-xs text-neutral-400">These URLs assume /gallery/ pages and /images/ assets on your website. Publish the images at those paths before submitting the sitemap.</p>
            {/* XML Preview */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Generated XML Payload</span>
                <span className="font-mono">{files.length} indexed image entries</span>
              </div>
              <pre className="max-h-56 sm:max-h-64 overflow-auto p-3 rounded-xl bg-black border border-neutral-800 font-mono text-[11px] text-neutral-300 leading-relaxed select-all">
                {xmlContent}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                disabled={!xmlContent}
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition flex items-center gap-1.5 touch-target sm:min-h-0 sm:min-w-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy XML'}
              </button>
              <button
                disabled={!xmlContent}
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 touch-target sm:min-h-0 sm:min-w-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download sitemap.xml
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}
