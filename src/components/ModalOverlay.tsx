'use client';

import { useEffect, useRef, type HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';

interface Props extends HTMLAttributes<HTMLDivElement> {
  onClose: () => void;
  label: string;
  visibleWhen?: string;
}

const layers: HTMLElement[] = [];
let originalOverflow = '';
const controls = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(
  'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]'
)).filter((node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
const focusFirst = (root: HTMLElement) => (controls(root)[0] || root).focus({ preventScroll: true });

export default function ModalOverlay({ children, onClose, label, visibleWhen, ...props }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const startedOnBackdrop = useRef(false);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    const media = visibleWhen ? window.matchMedia(visibleWhen) : null;
    const update = () => { if (media && !media.matches) close.current(); };
    media?.addEventListener('change', update);
    update();
    return () => media?.removeEventListener('change', update);
  }, [visibleWhen]);

  useEffect(() => {
    const root = ref.current;
    if (!root || (visibleWhen && !window.matchMedia(visibleWhen).matches)) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!layers.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    layers.push(root);
    root.style.zIndex = String(50 + layers.length);
    const isTop = () => layers[layers.length - 1] === root;
    const frame = requestAnimationFrame(() => {
      if (isTop() && !root.contains(document.activeElement)) focusFirst(root);
    });
    const keydown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation(); close.current(); return;
      }
      if (event.key !== 'Tab') return;
      const nodes = controls(root), first = nodes[0], last = nodes[nodes.length - 1];
      if (!nodes.length) { event.preventDefault(); root.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    const focusin = (event: FocusEvent) => {
      if (isTop() && !root.contains(event.target as Node)) focusFirst(root);
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin);
      const index = layers.indexOf(root);
      if (index >= 0) layers.splice(index, 1);
      if (!layers.length) document.body.style.overflow = originalOverflow;
      const top = layers[layers.length - 1];
      if (top) {
        if (!top.contains(document.activeElement)) {
          if (previous && top.contains(previous)) previous.focus({ preventScroll: true });
          else focusFirst(top);
        }
      } else if (previous?.isConnected && previous.getClientRects().length) previous.focus({ preventScroll: true });
    };
  }, [visibleWhen]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div {...props} ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
      onPointerDown={(event) => { startedOnBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => { if (startedOnBackdrop.current && event.target === event.currentTarget) onClose(); }}>
      {children}
    </div>, document.body
  );
}
