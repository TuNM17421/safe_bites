'use client';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { ConfidenceMeter } from '@/components/status/confidence-badge';
import { FeedbackUnderReviewBadge } from '@/components/feedback/feedback-under-review-badge';
import { LastCheckedBadge } from '@/components/status/source-badge';
import { StatusBadge } from '@/components/status/status-badge';
import { Link } from '@/i18n/navigation';
import type { MenuRecommendation } from '@/features/restaurants/restaurants-client';
import { RestaurantSourceBadge } from './restaurant-badges';

// v2: the whole card links to the dish-at-restaurant page (ingredients + provenance + the
// ask/report actions). No nested interactive controls — they live on the dish page.
export function MenuItemRecommendationCard({ rec, lang }: { rec: MenuRecommendation; lang: LanguageCode }) {
  const t = useTranslations('menuItemCard');
  return (
    <Link
      href={`/restaurant/${rec.restaurantId}/dish?menuItemId=${encodeURIComponent(rec.menuItemId)}`}
      className="block rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1 focus-visible:shadow-sb-focus focus-visible:outline-none"
    >
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

      <p className="mt-2 text-[13px] text-sb-muted">{rec.reason[lang]}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ConfidenceMeter level={rec.confidence} />
        <RestaurantSourceBadge source={rec.source} />
        {rec.stale ? (
          <LastCheckedBadge label={t('stale')} />
        ) : rec.lastCheckedAt ? (
          <LastCheckedBadge label={rec.lastCheckedAt.slice(0, 10)} />
        ) : null}
        {rec.feedbackSummary?.hasActiveFlags ? <FeedbackUnderReviewBadge /> : null}
      </div>

      <span className="mt-3 inline-flex items-center gap-1 text-sb-body-s font-bold text-sb-brand">
        {t('viewIngredients')}
        <ChevronRight aria-hidden className="size-4" />
      </span>
    </Link>
  );
}
