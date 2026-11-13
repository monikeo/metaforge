import { Flame } from 'lucide-react';

/** The MetaForge mark: one flat tile in the brand accent. Size it with width and height classes. */
export default function BrandMark({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`shrink-0 flex items-center justify-center rounded-[28%] bg-purple-500/10 border border-purple-500/30 text-purple-300 ${className}`}>
      <Flame className="w-1/2 h-1/2" strokeWidth={1.75} />
    </div>
  );
}
