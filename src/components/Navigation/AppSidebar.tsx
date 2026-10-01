'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMetaForgeStore } from '@/lib/store';
import { AppView } from '@/lib/types';
import { 
  LayoutDashboard, 
  Layers, 
  GitCompare, 
  Sliders, 
  Cpu, 
  Info, 
  BookOpen, 
  Command, 
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

export default function AppSidebar() {
  const pathname = usePathname();
  const { 
    currentView, 
    setCurrentView, 
    files, 
    setIsCommandPaletteOpen 
  } = useMetaForgeStore();

  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  const navItems: { id: AppView; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'studio', label: 'Studio Workstation', icon: Layers, count: files.length },
    { id: 'compare', label: 'Metadata Compare', icon: GitCompare },
    { id: 'presets', label: 'Presets Manager', icon: Sliders },
    { id: 'jobs', label: 'Batch Processing', icon: Cpu }
  ];

  return (
    <>
      {/* 1. DESKTOP & TABLET PERSISTENT SIDEBAR */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r border-neutral-800 bg-neutral-950 p-3 shrink-0 h-[calc(100vh-64px)] sticky top-16 select-none">
        
        {/* Command Runner Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center justify-between w-full px-3 py-2 mb-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs text-neutral-400 hover:text-white transition group"
        >
          <span className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition" />
            <span>Command Menu</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-400 border border-neutral-700">
            ⌘K
          </kbd>
        </button>

        {/* Primary SaaS Navigation */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-2 py-1">
            Workspaces
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === '/' && currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.count !== undefined && item.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Documentation & Help Section */}
        <div className="flex flex-col gap-1 mt-6">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-2 py-1">
            Resources &amp; Specs
          </span>
          
          <Link
            href="/about"
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
              pathname === '/about'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-purple-400" />
              <span>About Architecture</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
          </Link>

          <Link
            href="/tutorial"
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
              pathname === '/tutorial'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-pink-400" />
              <span>Feature Tutorials</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
          </Link>
        </div>

        {/* Sidebar Footer Info */}
        <div className="mt-auto pt-4 border-t border-neutral-900 flex flex-col gap-1.5 text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center justify-between">
            <span>Client Engine:</span>
            <span className="text-emerald-400">WASM Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Uploads:</span>
            <span className="text-neutral-300">0 KB (Local)</span>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE NATIVE BOTTOM NAVIGATION BAR (Screens < 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 px-2 py-1.5 flex items-center justify-around h-16 shadow-2xl">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[10px] font-semibold transition ${
            currentView === 'dashboard' ? 'text-purple-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setCurrentView('studio')}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[10px] font-semibold transition ${
            currentView === 'studio' ? 'text-purple-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="relative">
            <Layers className="w-4 h-4" />
            {files.length > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-purple-600 text-white rounded-full text-[9px] flex items-center justify-center font-mono">
                {files.length}
              </span>
            )}
          </div>
          <span>Studio</span>
        </button>

        <button
          onClick={() => setCurrentView('compare')}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[10px] font-semibold transition ${
            currentView === 'compare' ? 'text-purple-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          <span>Compare</span>
        </button>

        <button
          onClick={() => setCurrentView('presets')}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[10px] font-semibold transition ${
            currentView === 'presets' ? 'text-purple-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Presets</span>
        </button>

        <button
          onClick={() => setIsMobileMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[10px] font-semibold text-neutral-400 hover:text-neutral-200 transition"
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </div>

      {/* Mobile "More" Slide-up Sheet */}
      {isMobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white">More Options &amp; Tools</h3>
              <button
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setCurrentView('jobs');
                  setIsMobileMoreOpen(false);
                }}
                className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-left flex flex-col gap-1.5"
              >
                <Cpu className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold text-white">Batch Queue</span>
                <span className="text-[10px] text-neutral-400">Processing jobs monitor</span>
              </button>

              <button
                onClick={() => {
                  setIsCommandPaletteOpen(true);
                  setIsMobileMoreOpen(false);
                }}
                className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-left flex flex-col gap-1.5"
              >
                <Command className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-white">Command Menu</span>
                <span className="text-[10px] text-neutral-400">Quick actions runner</span>
              </button>

              <Link
                href="/about"
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-left flex flex-col gap-1.5"
              >
                <Info className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-white">About &amp; Docs</span>
                <span className="text-[10px] text-neutral-400">Engine specifications</span>
              </Link>

              <Link
                href="/tutorial"
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-left flex flex-col gap-1.5"
              >
                <BookOpen className="w-5 h-5 text-pink-400" />
                <span className="font-semibold text-white">Feature Guides</span>
                <span className="text-[10px] text-neutral-400">Step-by-step tutorials</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
