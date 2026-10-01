'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollProgressProps {
  showBackToTopButton?: boolean;
}

export default function ScrollProgress({ showBackToTopButton = true }: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const current = (window.scrollY / totalHeight) * 100;
        setProgress(Math.min(100, Math.max(0, current)));
        setShowTop(window.scrollY > 300);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Top Ambient Reading Progress Bar */}
      <div className="fixed top-16 left-0 right-0 h-[2.5px] bg-neutral-900/60 z-40 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-400 transition-[width] duration-75 ease-out shadow-xs shadow-purple-500/50"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTopButton && showTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-2.5 sm:p-3 rounded-2xl bg-neutral-900/95 hover:bg-neutral-800 text-white backdrop-blur-md border border-neutral-700/80 shadow-2xl transition-all duration-200 animate-slide-up flex items-center gap-1.5 text-xs font-bold touch-press cursor-pointer hover:border-purple-500/40"
          title="Back to top"
        >
          <ArrowUp className="w-4 h-4 text-purple-400" />
          <span className="hidden sm:inline font-mono">Top</span>
        </button>
      )}
    </>
  );
}
