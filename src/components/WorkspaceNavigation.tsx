'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMetaForgeStore } from '@/lib/store';
import { workspaceView } from '@/lib/navigation';

function syncWorkspaceFromLocation() {
  useMetaForgeStore.setState({
    ...(window.location.pathname === '/' ? { currentView: workspaceView(new URL(window.location.href).searchParams.get('view')) } : {}),
    isCommandPaletteOpen: false,
    isAiSettingsOpen: false,
  });
}

export default function WorkspaceNavigation() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  // URLs, links, reloads, and browser Back/Forward share one workspace state.
  useEffect(() => {
    syncWorkspaceFromLocation();
  }, [pathname, search]);

  // Safari can restore the URL before Next's search-parameter subscription updates.
  // Read the browser URL directly for history traversal and back/forward-cache restores.
  useEffect(() => {
    window.addEventListener('popstate', syncWorkspaceFromLocation);
    window.addEventListener('pageshow', syncWorkspaceFromLocation);
    return () => {
      window.removeEventListener('popstate', syncWorkspaceFromLocation);
      window.removeEventListener('pageshow', syncWorkspaceFromLocation);
    };
  }, []);

  return null;
}
