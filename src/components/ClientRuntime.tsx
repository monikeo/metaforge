'use client';

import { useEffect } from 'react';
import { useMetaForgeStore } from '@/lib/store';

export default function ClientRuntime() {
  useEffect(() => {
    void useMetaForgeStore.persist.rehydrate();
    const handleRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      useMetaForgeStore.getState().addToast({ type: 'error', title: 'Action Could Not Finish', description: event.reason instanceof Error ? event.reason.message : 'Try the action again. Your original files are unchanged.' });
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (useMetaForgeStore.getState().files.length) event.preventDefault();
    };
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('beforeunload', beforeUnload);
    return () => { window.removeEventListener('unhandledrejection', handleRejection); window.removeEventListener('beforeunload', beforeUnload); };
  }, []);
  return null;
}
