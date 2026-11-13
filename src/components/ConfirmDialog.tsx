'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import ModalOverlay from '@/components/ModalOverlay';

interface ConfirmDialogProps {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** A safer alternative offered next to the destructive action, such as downloading first. */
  alternative?: ReactNode;
}

/** Destructive confirmation. Cancel is first in the DOM, so it receives the initial focus. */
export default function ConfirmDialog({ title, description, confirmLabel, onConfirm, onCancel, alternative }: ConfirmDialogProps) {
  return (
    <ModalOverlay onClose={onCancel} label={title} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl flex flex-col gap-4 pb-safe sm:pb-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-neutral-800">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 touch-target sm:min-h-0 sm:min-w-0">
            Cancel
          </button>
          {alternative}
          <button type="button" onClick={onConfirm} className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 touch-target sm:min-h-0 sm:min-w-0">
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
