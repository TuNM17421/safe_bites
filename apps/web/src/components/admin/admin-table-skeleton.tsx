// Table loading skeleton (UX: show a skeleton, not a bare "Loading…" line, for >300ms waits).
// Mirrors the table's bordered rows so there's no layout jump when real data arrives. Decorative →
// aria-hidden; the surrounding region announces status.
const SHIMMER =
  'relative overflow-hidden rounded-sb-sm bg-sb-surface-2 after:absolute after:inset-0 after:-translate-x-full after:animate-sb-shimmer after:bg-gradient-to-r after:from-transparent after:via-sb-surface/60 after:to-transparent';

export function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-sb-md border border-sb-border shadow-sb-e1" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-sb-border px-3 py-3.5 last:border-0">
          <div className={`h-4 w-1/4 ${SHIMMER}`} />
          <div className={`h-4 w-16 ${SHIMMER}`} />
          <div className={`h-5 w-24 ${SHIMMER}`} />
          <div className={`hidden h-5 w-20 sm:block ${SHIMMER}`} />
          <div className={`ml-auto h-8 w-24 ${SHIMMER}`} />
        </div>
      ))}
    </div>
  );
}
