'use client';

import React from 'react';
import { useMetaForge } from '@/lib/store';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toasts() {
  const { toasts, removeToast } = useMetaForge('toasts', 'removeToast');

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-4 right-3 md:right-4 toast-stack z-[60] flex flex-col gap-2 w-[calc(100%-1.5rem)] max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let colorClasses = 'border-emerald-500/30 bg-emerald-950/90 text-emerald-200';
        let iconColor = 'text-emerald-400';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          colorClasses = 'border-rose-500/30 bg-rose-950/90 text-rose-200';
          iconColor = 'text-rose-400';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          colorClasses = 'border-amber-500/30 bg-amber-950/90 text-amber-200';
          iconColor = 'text-amber-400';
        } else if (toast.type === 'info') {
          Icon = Info;
          colorClasses = 'border-blue-500/30 bg-blue-950/90 text-blue-200';
          iconColor = 'text-blue-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-none flex items-start gap-2.5 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md transition-all animate-slide-up ${colorClasses}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold leading-tight">{toast.title}</h4>
              {toast.description && (
                <p className="text-[11px] opacity-85 mt-0.5 leading-snug">{toast.description}</p>
              )}
            </div>
            <button
              aria-label="Dismiss notification"
              onClick={() => removeToast(toast.id)}
              className="pointer-events-auto p-1 rounded-lg opacity-60 hover:opacity-100 transition -mr-1 -mt-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
