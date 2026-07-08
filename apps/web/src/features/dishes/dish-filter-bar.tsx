'use client';
import { useTranslations } from 'next-intl';
import type { RecommendationStatus } from '@safebite/domain';
import { GROUP_KEY, STATUS_DISPLAY_ORDER } from '@/components/status/status-visuals';
import type { Recommendations } from './dishes-client';

export type Filter = 'all' | RecommendationStatus;

export function DishFilterBar({
  summary,
  active,
  onChange,
}: {
  summary: Recommendations['summary'];
  active: Filter;
  onChange: (f: Filter) => void;
}) {
  const t = useTranslations('dishes');
  const tStatus = useTranslations('statuses');
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-semibold ${on ? 'border-sb-primary bg-sb-primary text-sb-primary-foreground' : 'border-sb-border text-sb-muted'}`;

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onChange('all')} className={chip(active === 'all')}>
        {t('filterAll')} ({summary.total})
      </button>
      {STATUS_DISPLAY_ORDER.map((s) => {
        const count = summary[GROUP_KEY[s]];
        if (count === 0) return null;
        return (
          <button key={s} type="button" onClick={() => onChange(s)} className={chip(active === s)}>
            {tStatus(s)} ({count})
          </button>
        );
      })}
    </div>
  );
}
