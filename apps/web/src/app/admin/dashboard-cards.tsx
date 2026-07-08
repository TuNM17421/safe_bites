'use client';
import { useTranslations } from 'next-intl';

export interface DashboardCounts {
  dishes: number;
  ingredients: number;
  dishRisks: number;
  needsReview: number;
}

export function DashboardCards({ counts }: { counts: DashboardCounts }) {
  const t = useTranslations('admin');
  const tiles = [
    { label: t('dashboard.dishes'), n: counts.dishes },
    { label: t('dashboard.ingredients'), n: counts.ingredients },
    { label: t('dashboard.dishRisks'), n: counts.dishRisks },
    { label: t('dashboard.needsReview'), n: counts.needsReview, warn: true },
  ];
  return (
    <section>
      <h1 className="mb-4 text-xl font-bold">{t('dashboard.title')}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
            <div className={`text-2xl font-extrabold tabular-nums ${tile.warn ? 'text-sb-status-ask-first-fg' : 'text-sb-fg'}`}>
              {tile.n}
            </div>
            <div className="mt-1 text-xs text-sb-muted">{tile.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
