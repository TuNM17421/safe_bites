// Loading placeholder for card lists (dish guide, restaurant list, scan). Shape-matched
// to a status card. Uses Tailwind `animate-pulse`, which is disabled by the global
// prefers-reduced-motion rule shipped in tokens.safebite.css. Design: ADR-UI-03.
export function SkeletonCard() {
  return (
    <div className="rounded-sb-md border border-sb-border p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-2/5 animate-pulse rounded bg-sb-surface-2" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-sb-surface-2" />
      </div>
      <div className="mt-3 h-3 w-11/12 animate-pulse rounded bg-sb-surface-2" />
      <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-sb-surface-2" />
    </div>
  );
}
