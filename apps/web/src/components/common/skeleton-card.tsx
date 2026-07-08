// Loading placeholder for card lists (dish guide, question card, scan). Shape-matched to a
// status card, using the branded 1200ms shimmer sweep (mock .sk). The global
// prefers-reduced-motion rule in tokens.safebite.css freezes the sweep to a static skeleton.
const bar =
  'relative overflow-hidden rounded-sb-sm bg-sb-surface-2 after:absolute after:inset-0 after:-translate-x-full after:animate-sb-shimmer after:bg-gradient-to-r after:from-transparent after:via-sb-surface/60 after:to-transparent';

export function SkeletonCard() {
  return (
    <div className="rounded-sb-md border border-sb-border p-4">
      <div className="flex items-center justify-between">
        <div className={`${bar} h-4 w-2/5`} />
        <div className={`${bar} h-6 w-24 !rounded-full`} />
      </div>
      <div className={`${bar} mt-3 h-3 w-11/12`} />
      <div className={`${bar} mt-2 h-3 w-3/4`} />
    </div>
  );
}
