// Stable vision models; legacy options remain available for existing API projects.
export const GEMINI_MODELS = [
  { id: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite (Recommended)' },
  { id: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
  { id: 'gemini-3.6-flash', label: 'gemini-3.6-flash' },
  { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash (Legacy projects)' },
  { id: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite (Legacy projects)' },
  { id: 'gemini-2.5-pro', label: 'gemini-2.5-pro (Legacy projects)' },
] as const;

export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0].id;

export function normalizeGeminiModel(value: unknown): string {
  return GEMINI_MODELS.some(model => model.id === value) ? value as string : DEFAULT_GEMINI_MODEL;
}
