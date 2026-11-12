'use client';

import { useSyncExternalStore } from 'react';

export type LayoutMode = 'mobile' | 'tablet' | 'desktop';

// Matches Tailwind's md (48rem) and xl (80rem) breakpoints used by the workstation layouts.
const TABLET = '(min-width: 48rem)';
const DESKTOP = '(min-width: 80rem)';

function subscribe(onChange: () => void) {
  const queries = [TABLET, DESKTOP].map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener('change', onChange));
  return () => queries.forEach((query) => query.removeEventListener('change', onChange));
}
const getSnapshot = (): LayoutMode => window.matchMedia(DESKTOP).matches ? 'desktop' : window.matchMedia(TABLET).matches ? 'tablet' : 'mobile';
const getServerSnapshot = (): LayoutMode => 'desktop';

/** Mounts one workstation layout instead of three CSS-hidden copies. */
export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
