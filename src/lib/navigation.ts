import type { AppView } from './types';

export const WORKSPACE_VIEWS = ['studio', 'dashboard', 'compare', 'presets', 'jobs'] as const;

export function workspaceView(value: string | null | undefined): AppView {
  if (value === 'batch') return 'jobs';
  return WORKSPACE_VIEWS.includes(value as typeof WORKSPACE_VIEWS[number]) ? value as AppView : 'studio';
}

export function workspaceHref(view: AppView): string {
  const resolved = workspaceView(view);
  return resolved === 'studio' ? '/' : `/?view=${resolved}`;
}
