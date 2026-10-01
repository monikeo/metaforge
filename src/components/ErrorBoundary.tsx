'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MetaForge Component ErrorBoundary caught an exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, copied: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleCopy = () => {
    if (this.state.error) {
      navigator.clipboard.writeText(`${this.state.error.name}: ${this.state.error.message}\n${this.state.error.stack || ''}`);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col items-center text-center gap-3 animate-fade-in select-none">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="text-xs font-bold text-rose-200">
              {this.props.fallbackTitle || 'Component Render Interrupted'}
            </h4>
            <p className="text-[11px] text-neutral-400 max-w-sm leading-relaxed">
              An unexpected exception was safely contained by MetaForge. Other workstation modules remain operational.
            </p>
          </div>

          {this.state.error?.message && (
            <div className="w-full max-w-md p-2.5 rounded-xl bg-black/60 border border-neutral-800 text-[10px] font-mono text-rose-300 text-left overflow-x-auto max-h-24">
              {this.state.error.message}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={this.handleReset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 touch-press shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Component</span>
            </button>

            <button
              onClick={this.handleCopy}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition flex items-center gap-1.5 touch-press border border-neutral-700 cursor-pointer"
              title="Copy error stack trace"
            >
              {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{this.state.copied ? 'Copied' : 'Copy Stack'}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
