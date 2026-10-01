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
  X,
  ChevronLeft
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
  const [isTabletCollapsed, setIsTabletCollapsed] = useState(true);

  const navItems: { id: AppView; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'studio', label: 'Studio Workstation', icon: Layers, count: files.length },
    { id: 'compare', label: 'Metadata Compare', icon: GitCompare },
    { id: 'presets', label: 'Presets Manager', icon: Sliders },
    { id: 'jobs', label: 'Batch Processing', icon: Cpu }
  ];

  return (
    <>
      {/* 1. DESKTOP & TABLET ADAPTIVE SIDEBAR 
          - On lg+: full width (w-60 xl:w-64)
          - On md (tablet): collapsed to icon rail (w-16) by default, expandable with toggle
      */}
      <aside 
        className={`hidden md:flex flex-col border-r border-neutral-800/80 bg-neutral-950 p-2.5 sm:p-3 shrink-0 h-[calc(100dvh-64px)] sticky top-16 select-none transition-all duration-200 z-30 ${
          isTabletCollapsed ? 'w-16 lg:w-60 xl:w-64' : 'w-60 xl:w-64'
        }`}
      >
        {/* Tablet Collapse Toggle (Visible only on md screens) */}
        <div className="hidden md:flex lg:hidden justify-end mb-2">
          <button
            onClick={() => setIsTabletCollapsed(!isTabletCollapsed)}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
            title={isTabletCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isTabletCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Command Runner Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className={`flex items-center justify-between w-full px-2.5 py-2 mb-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs text-neutral-400 hover:text-white transition group ${
            isTabletCollapsed ? 'lg:flex justify-center lg:justify-between' : 'flex'
          }`}
          title="Command Menu (⌘K)"
        >
          <span className="flex items-center gap-2">
            <Command className="w-4 h-4 text-purple-400 group-hover:scale-110 transition shrink-0" />
            <span className={isTabletCollapsed ? 'hidden lg:inline' : 'inline'}>Command Menu</span>
          </span>
          <kbd className={`px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-400 border border-neutral-700 ${
            isTabletCollapsed ? 'hidden lg:inline-block' : 'inline-block'
          }`}>
            ⌘K
          </kbd>
        </button>

        {/* Primary SaaS Navigation */}
        <div className="flex flex-col gap-1">
          <span className={`text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-2 py-1 ${
            isTabletCollapsed ? 'hidden lg:block' : 'block'
          }`}>
            Workspaces
          </span>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === '/' && currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                title={item.label}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
                } ${isTabletCollapsed ? 'lg:justify-between justify-center' : 'justify-between'}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-purple-400' : 'text-neutral-400'}`} />
                  <span className={`truncate ${isTabletCollapsed ? 'hidden lg:inline' : 'inline'}`}>
                    {item.label}
                  </span>
                </div>

                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono shrink-0 ${
                    isTabletCollapsed ? 'hidden lg:inline-block' : 'inline-block'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Documentation & Help Section */}
        <div className="flex flex-col gap-1 mt-6">
          <span className={`text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-2 py-1 ${
            isTabletCollapsed ? 'hidden lg:block' : 'block'
          }`}>
            Resources &amp; Specs
          </span>
          
          <Link
            href="/about"
            title="About Architecture"
            className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition ${
              pathname === '/about'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            } ${isTabletCollapsed ? 'lg:justify-between justify-center' : 'justify-between'}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Info className="w-4 h-4 text-purple-400 shrink-0" />
              <span className={`truncate ${isTabletCollapsed ? 'hidden lg:inline' : 'inline'}`}>
                About Architecture
              </span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-neutral-600 ${isTabletCollapsed ? 'hidden lg:inline' : 'inline'}`} />
          </Link>

          <Link
            href="/tutorial"
            title="Feature Tutorials"
            className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition ${
              pathname === '/tutorial'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            } ${isTabletCollapsed ? 'lg:justify-between justify-center' : 'justify-between'}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BookOpen className="w-4 h-4 text-pink-400 shrink-0" />
              <span className={`truncate ${isTabletCollapsed ? 'hidden lg:inline' : 'inline'}`}>
                Feature Tutorials
              </span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-neutral-600 ${isTabletCollapsed ? 'hidden lg:inline' : 'inline'}`} />
          </Link>
        </div>

        {/* Sidebar Footer Info */}
        <div className={`mt-auto pt-4 border-t border-neutral-900 flex flex-col gap-1.5 text-[11px] text-neutral-500 font-mono ${
          isTabletCollapsed ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="flex items-center justify-between">
            <span>Client Engine:</span>
            <span className="text-emerald-400 font-semibold">WASM Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Uploads:</span>
            <span className="text-neutral-300">0 KB (Local)</span>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE NATIVE BOTTOM NAVIGATION BAR (Screens < 768px) 
          - Enhanced with safe-area padding for modern iOS & Android devices
          - Min 48px touch targets for all primary tabs
      */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-800/90 px-2 pt-1 pb-safe shadow-2xl"
      >
        <div className="flex items-center justify-around h-14">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[10px] font-semibold transition touch-target-lg ${
              currentView === 'dashboard' ? 'text-purple-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setCurrentView('studio')}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[10px] font-semibold transition touch-target-lg ${
              currentView === 'studio' ? 'text-purple-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
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
            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[10px] font-semibold transition touch-target-lg ${
              currentView === 'compare' ? 'text-purple-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare</span>
          </button>

          <button
            onClick={() => setCurrentView('presets')}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[10px] font-semibold transition touch-target-lg ${
              currentView === 'presets' ? 'text-purple-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Presets</span>
          </button>

          <button
            onClick={() => setIsMobileMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[10px] font-semibold text-neutral-400 hover:text-neutral-200 transition touch-target-lg"
          >
            <Menu className="w-4 h-4" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Slide-up Sheet */}
      {isMobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-4 shadow-2xl pb-safe">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white">More Options &amp; Tools</h3>
              <button
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
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
                className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left flex flex-col gap-1.5 touch-target"
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
                className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left flex flex-col gap-1.5 touch-target"
              >
                <Command className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-white">Command Menu</span>
                <span className="text-[10px] text-neutral-400">Quick actions runner</span>
              </button>

              <Link
                href="/about"
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left flex flex-col gap-1.5 touch-target"
              >
                <Info className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-white">About &amp; Docs</span>
                <span className="text-[10px] text-neutral-400">Engine specifications</span>
              </Link>

              <Link
                href="/tutorial"
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left flex flex-col gap-1.5 touch-target"
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
