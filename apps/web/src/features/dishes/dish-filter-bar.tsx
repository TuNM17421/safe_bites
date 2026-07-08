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
    `inline-flex min-h-sb-tap items-center rounded-full border px-4 text-sb-body-s font-semibold focus-visible:shadow-sb-focus ${on ? 'border-sb-brand bg-sb-brand-soft text-sb-brand-ink' : 'border-sb-border bg-sb-surface text-sb-fg'}`;

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
