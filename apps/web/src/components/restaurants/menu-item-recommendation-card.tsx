'use client';
import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { ConfidenceMeter } from '@/components/status/confidence-badge';
import { LastCheckedBadge } from '@/components/status/source-badge';
import { StatusBadge } from '@/components/status/status-badge';
import { Link } from '@/i18n/navigation';
import type { MenuRecommendation } from '@/features/restaurants/restaurants-client';
import { RestaurantSourceBadge } from './restaurant-badges';

export function MenuItemRecommendationCard({ rec, lang }: { rec: MenuRecommendation; lang: LanguageCode }) {
  const t = useTranslations('menuItemCard');
  return (
    <article className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sb-body-l font-bold text-sb-fg">{rec.displayName[lang]}</h4>
          {rec.matchedDishName ? (
            <p className="mt-0.5 text-xs text-sb-faint">
              {t('matchedDish')}: {rec.matchedDishName[lang]}
            </p>
          ) : null}
        </div>
        <StatusBadge status={rec.status} />
      </div>

      <dl className="mt-3 space-y-1.5 border-t border-sb-border pt-3 text-[13px]">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold text-sb-muted">{t('reason')}</dt>
          <dd className="text-sb-fg">{rec.reason[lang]}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold text-sb-muted">{t('action')}</dt>
          <dd className="text-sb-fg">{rec.action[lang]}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ConfidenceMeter level={rec.confidence} />
        <RestaurantSourceBadge source={rec.source} />
        {rec.stale ? (
          <LastCheckedBadge label={t('stale')} />
        ) : rec.lastCheckedAt ? (
          <LastCheckedBadge label={rec.lastCheckedAt.slice(0, 10)} />
        ) : null}
      </div>

      <Link
        href={`/question-card?menuItemId=${encodeURIComponent(rec.menuItemId)}`}
        className="mt-3 inline-flex min-h-sb-tap items-center gap-2 rounded-sb-sm border border-sb-border bg-sb-surface-2 px-4 text-sb-body-s font-bold text-sb-fg focus-visible:shadow-sb-focus focus-visible:outline-none"
      >
        <MessageCircle aria-hidden className="size-4" />
        {t('askAboutItem')}
      </Link>
    </article>
  );
}
