'use client';

import ModalOverlay from '@/components/ModalOverlay';

import React from 'react';
import { useMetaForge } from '@/lib/store';
import { History, X, RotateCcw, Clock, User, Bot, Sliders, Shield } from 'lucide-react';

interface MetadataHistoryModalProps {
  fileId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function MetadataHistoryModal({ fileId, isOpen, onClose }: MetadataHistoryModalProps) {
  const { files, restoreHistory, isProcessing } = useMetaForge('files', 'restoreHistory', 'isProcessing');
  const file = files.find((f) => f.id === fileId);

  if (!isOpen || !file) return null;

  const history = file.history || [];

  return (
    <ModalOverlay onClose={onClose} label="Metadata history" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl flex flex-col gap-4 max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto pb-safe sm:pb-5">
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-neutral-700/60 rounded-full mx-auto sm:hidden -mt-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Metadata Modification Audit Log</h3>
              <p className="text-xs text-neutral-400 font-mono truncate max-w-xs">{file.name}</p>
            </div>
          </div>
          <button 
            aria-label="Close metadata history"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg touch-target sm:min-h-0 sm:min-w-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* History List */}
        <div className="max-h-80 overflow-y-auto flex flex-col gap-2.5 pr-1">
          {history.length > 0 ? (
            history.map((record) => {
              let ActorIcon = User;
              let actorColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';

              if (record.actor === 'AI') {
                ActorIcon = Bot;
                actorColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
              } else if (record.actor === 'Preset') {
                ActorIcon = Sliders;
                actorColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
              } else if (record.actor === 'System') {
                ActorIcon = Shield;
                actorColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
              }

              return (
                <div
                  key={record.id}
                  className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${actorColor}`}>
                      <ActorIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{record.action}</span>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase">
                          {record.actor}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug break-words">
                        {record.diffSummary}
                      </p>
                      <span className="text-[10px] text-neutral-500 font-mono mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(record.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {record.previousRaw && (
                    <button
                      disabled={isProcessing}
                      onClick={() => {
                        void restoreHistory(file.id, record.id);
                        onClose();
                      }}
                      className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-neutral-300 hover:text-white transition touch-target sm:min-h-0 sm:min-w-0"
                      title="Rollback metadata to this snapshot"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                      Restore
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-neutral-500 text-xs">
              No historical edits recorded yet for this asset.
            </div>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}
