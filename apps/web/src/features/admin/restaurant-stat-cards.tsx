// KPI summary strip for the restaurant console (Data-Dense Dashboard pattern). Counts reflect the
// CURRENT result set, so they update as filters narrow — a scannable at-a-glance ops summary above
// the table. Accent colour reinforces (never replaces) the label.
export interface AdminStat {
  label: string;
  value: number;
  tone?: 'suitable' | 'ask-first' | 'avoid' | 'default';
}

const ACCENT: Record<NonNullable<AdminStat['tone']>, string> = {
  suitable: 'text-sb-status-suitable-fg',
  'ask-first': 'text-sb-status-ask-first-fg',
  avoid: 'text-sb-status-avoid-fg',
  default: 'text-sb-fg',
};

export function RestaurantStatCards({ stats }: { stats: AdminStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-sb-md border border-sb-border bg-sb-surface p-3 shadow-sb-e1">
          <p className="text-xs font-semibold uppercase tracking-wide text-sb-faint">{s.label}</p>
          <p className={`mt-1 text-2xl font-extrabold tabular-nums ${ACCENT[s.tone ?? 'default']}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
