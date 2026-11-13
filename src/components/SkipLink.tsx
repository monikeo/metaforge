'use client';

/** First tab stop on every page. Moves focus into the main landmark without adding a hash to the URL. */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      onClick={(event) => {
        const target = document.getElementById('main-content');
        if (!target) return;
        event.preventDefault();
        target.focus();
        target.scrollIntoView({ block: 'start' });
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-purple-600 focus:text-white focus:text-sm focus:font-semibold focus:shadow-2xl"
    >
      Skip to main content
    </a>
  );
}
