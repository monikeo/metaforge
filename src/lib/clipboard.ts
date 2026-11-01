import { useMetaForgeStore } from './store';

export async function copyText(value: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Older iPad browsers and restricted clipboard permissions need a fallback.
    const input = document.createElement('textarea');
    input.value = value; input.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    const previous = document.activeElement as HTMLElement | null;
    document.body.append(input); input.select();
    try {
      if (document.execCommand('copy')) return true;
    } catch { /* Show a useful error if both clipboard mechanisms fail. */ }
    finally { input.remove(); previous?.focus(); }
    useMetaForgeStore.getState().addToast({ type: 'error', title: 'Clipboard Access Denied', description: 'Allow clipboard access in your browser, or select the text and copy it manually.' });
    return false;
  }
}
