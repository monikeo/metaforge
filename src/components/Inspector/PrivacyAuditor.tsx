'use client';

import React from 'react';
import { useMetaForgeStore } from '@/lib/store';
import { 
  ShieldAlert, 
  ShieldCheck, 
  MapPin, 
  Cpu, 
  Laptop, 
  User, 
  Trash2, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';

interface PrivacyAuditorProps {
  fileId: string;
}

export default function PrivacyAuditor({ fileId }: PrivacyAuditorProps) {
  const { files, stripGps, sanitizeForSocial, stripAllMetadata } = useMetaForgeStore();
  const file = files.find((f) => f.id === fileId);

  if (!file) return null;

  const report = file.privacyReport;
  const isHighRisk = report.riskLevel === 'HIGH';
  const isClean = report.score === 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
      {/* Risk Gauge Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${
            isClean
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : isHighRisk
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {isClean ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Privacy Risk Auditor</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isClean
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : isHighRisk
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {report.riskLevel} THREAT
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              {isClean
                ? 'Zero location or hardware identifiers detected'
                : `${report.issues.length} sensitive metadata vector(s) detected`}
            </p>
          </div>
        </div>

        {/* Threat Score Pill */}
        <div className="text-right">
          <span className="text-xs font-mono text-neutral-400">Threat Index</span>
          <div className={`text-xl font-black font-mono ${
            isClean ? 'text-emerald-400' : isHighRisk ? 'text-rose-400' : 'text-amber-400'
          }`}>
            {report.score} / 100
          </div>
        </div>
      </div>

      {/* Score Progress Bar */}
      <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
        <div
          className={`h-full transition-all duration-500 ${
            isClean ? 'bg-emerald-500' : isHighRisk ? 'bg-rose-500' : 'bg-amber-500'
          }`}
          style={{ width: `${Math.max(report.score, isClean ? 100 : 5)}%` }}
        />
      </div>

      {/* Issues List */}
      <div className="flex flex-col gap-2">
        {report.issues.map((issue) => {
          let Icon = ShieldAlert;
          if (issue.category === 'GPS') Icon = MapPin;
          else if (issue.category === 'DEVICE') Icon = Cpu;
          else if (issue.category === 'SOFTWARE') Icon = Laptop;
          else if (issue.category === 'PERSONAL') Icon = User;

          return (
            <div
              key={issue.id}
              className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                issue.severity === 'HIGH'
                  ? 'bg-rose-950/20 border-rose-500/20 text-rose-200'
                  : issue.severity === 'MEDIUM'
                  ? 'bg-amber-950/20 border-amber-500/20 text-amber-200'
                  : 'bg-neutral-950/50 border-neutral-800 text-neutral-300'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <Icon className={`w-4 h-4 ${
                  issue.severity === 'HIGH'
                    ? 'text-rose-400'
                    : issue.severity === 'MEDIUM'
                    ? 'text-amber-400'
                    : 'text-neutral-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white truncate">{issue.title}</span>
                  <span className="text-[10px] font-mono opacity-60 uppercase">{issue.severity}</span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{issue.description}</p>
                <div className="mt-1 font-mono text-[10px] px-2 py-0.5 rounded bg-black/40 inline-block text-neutral-300 truncate max-w-full">
                  {issue.tagKey}: {String(issue.value)}
                </div>
              </div>
            </div>
          );
        })}

        {isClean && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>This image is clean of physical coordinates and serial number fingerprints.</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-neutral-800">
        {report.hasGps && (
          <button
            onClick={() => stripGps(file.id)}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition flex items-center justify-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" />
            Strip GPS Only
          </button>
        )}

        <button
          onClick={() => sanitizeForSocial(file.id)}
          className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Sanitize for Social Media
        </button>

        <button
          onClick={() => stripAllMetadata(file.id)}
          className="py-2 px-3 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
          Strip 100% EXIF
        </button>
      </div>
    </div>
  );
}
