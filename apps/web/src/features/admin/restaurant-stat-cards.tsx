// KPI summary strip for the restaurant console (Data-Dense Dashboard pattern). Counts are GLOBAL
// totals (stable), so a card doubles as a filter shortcut: click to narrow the table to that subset,
// click again to clear. Accent colour reinforces (never replaces) the label; the active card is
// outlined + aria-pressed for keyboard/SR users.
export interface AdminStat {
  label: string;
  value: number;
  tone?: 'suitable' | 'ask-first' | 'avoid' | 'default';
  onClick?: () => void;
  active?: boolean;
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
      {stats.map((s) => {
        const body = (
          <>
            <span className="text-xs font-semibold uppercase tracking-wide text-sb-faint">{s.label}</span>
            <span className={`mt-1 block text-2xl font-extrabold tabular-nums ${ACCENT[s.tone ?? 'default']}`}>{s.value}</span>
          </>
        );
        const base = 'block rounded-sb-md border bg-sb-surface p-3 text-left shadow-sb-e1';
        return s.onClick ? (
          <button
            key={s.label}
            type="button"
            onClick={s.onClick}
            aria-pressed={s.active ?? false}
            className={`${base} transition-colors hover:bg-sb-surface-2 focus-visible:shadow-sb-focus focus-visible:outline-none ${s.active ? 'border-sb-primary ring-1 ring-sb-primary' : 'border-sb-border'}`}
          >
            {body}
          </button>
        ) : (
          <div key={s.label} className={`${base} border-sb-border`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
