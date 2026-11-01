'use client';

import React, { useState } from 'react';
import { MetaFile } from '@/lib/types';
import { Search, Globe, Share2 } from 'lucide-react';

interface SeoPreviewCardProps {
  file: MetaFile;
}

export default function SeoPreviewCard({ file }: SeoPreviewCardProps) {
  const [platform, setPlatform] = useState<'google' | 'twitter' | 'facebook'>('google');

  const title = file.seoData?.title || file.name;
  const caption = file.seoData?.caption || file.seoData?.altText || 'No descriptive caption configured yet.';
  const previewImgUrl = file.thumbnailUrl;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Globe className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white">Live Search & Social Simulator</span>
        </div>

        <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
          <button
            onClick={() => setPlatform('google')}
            className={`px-2.5 py-1 rounded-md font-medium transition ${
              platform === 'google' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Google
          </button>
          <button
            onClick={() => setPlatform('twitter')}
            className={`px-2.5 py-1 rounded-md font-medium transition ${
              platform === 'twitter' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            X (Twitter)
          </button>
          <button
            onClick={() => setPlatform('facebook')}
            className={`px-2.5 py-1 rounded-md font-medium transition ${
              platform === 'facebook' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Facebook
          </button>
        </div>
      </div>

      {/* Simulator Content */}
      <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
        {platform === 'google' && (
          <div className="flex flex-col gap-2 font-sans">
            {/* Google snippet */}
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                G
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-neutral-300 font-medium">example.com</span>
                <span className="text-[10px] text-neutral-500 break-all">https://example.com/images/{file.name}</span>
              </div>
            </div>

            <h4 className="text-sm font-medium text-blue-400 hover:underline cursor-pointer line-clamp-1">
              {title}
            </h4>

            <div className="flex gap-3 items-start">
              <div className="relative w-24 h-18 rounded-lg overflow-hidden shrink-0 bg-neutral-800 border border-neutral-700/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImgUrl}
                  alt={file.seoData?.altText || file.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 px-1 rounded bg-black/75 text-[9px] font-mono text-white">
                  {file.width && file.height ? `${file.width}×${file.height}` : 'IMG'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                {caption}
              </p>
            </div>
          </div>
        )}

        {platform === 'twitter' && (
          <div className="flex flex-col rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900/50">
            <div className="relative aspect-16/9 w-full bg-neutral-850 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImgUrl}
                alt={file.seoData?.altText || file.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 flex flex-col gap-1">
              <span className="text-[11px] text-neutral-500 uppercase font-mono">example.com</span>
              <h5 className="text-xs font-semibold text-white line-clamp-1">{title}</h5>
              <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">{caption}</p>
            </div>
          </div>
        )}

        {platform === 'facebook' && (
          <div className="flex flex-col rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900/50">
            <div className="relative aspect-1.91/1 w-full bg-neutral-850 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImgUrl}
                alt={file.seoData?.altText || file.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 bg-neutral-950 flex flex-col gap-0.5">
              <span className="text-[10px] text-neutral-500 uppercase font-mono">EXAMPLE.COM</span>
              <h5 className="text-xs font-bold text-white line-clamp-1">{title}</h5>
              <p className="text-[11px] text-neutral-400 line-clamp-1">{caption}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-500">
        <span className="flex items-center gap-1">
          <Search className="w-3 h-3" />
          Optimized for Google Image Search indexing
        </span>
        <span className="flex items-center gap-1">
          <Share2 className="w-3 h-3" />
          OpenGraph tags
        </span>
      </div>
    </div>
  );
}
