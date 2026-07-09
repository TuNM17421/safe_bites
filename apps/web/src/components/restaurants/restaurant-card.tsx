'use client';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { ConfidenceMeter } from '@/components/status/confidence-badge';
import { LastCheckedBadge } from '@/components/status/source-badge';
import { Link } from '@/i18n/navigation';
import type { RestaurantListItem } from '@/features/restaurants/restaurants-client';
import {
  RestaurantDistanceLabel,
  RestaurantMenuStatusBadge,
  RestaurantReadinessBadge,
  RestaurantSourceBadge,
  RestaurantVerificationBadge,
} from './restaurant-badges';

const COUNTS: Array<{ key: keyof RestaurantListItem['counts']; status: string }> = [
  { key: 'suitable', status: 'suitable' },
  { key: 'askFirst', status: 'ask_first' },
  { key: 'risky', status: 'risky' },
  { key: 'avoid', status: 'avoid' },
  { key: 'unknown', status: 'unknown' },
];

export function RestaurantCard({ item, lang }: { item: RestaurantListItem; lang: LanguageCode }) {
  const t = useTranslations('restaurantCard');
  const tStatus = useTranslations('statuses');
  const href = `/restaurants/${item.slug ?? item.restaurantId}`;
  const nonZeroCounts = COUNTS.filter(({ key }) => item.counts[key] > 0);

  return (
    <Link
      href={href}
      className="block rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1 focus-visible:shadow-sb-focus focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sb-title font-bold text-sb-fg">{item.name[lang]}</h3>
          <p className="mt-0.5 text-sb-body-s text-sb-muted">
            {[item.cuisine.join(' · '), item.district].filter(Boolean).join(' — ')}
          </p>
        </div>
        <RestaurantReadinessBadge readinessClass={item.readinessClass} />
      </div>

      <p className="mt-3 text-[13px] text-sb-muted">{item.summary[lang]}</p>

      {item.counts.total > 0 ? (
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-sb-muted">
          {nonZeroCounts.map(({ key, status }) => (
            <span key={key}>
              <b className="text-sb-fg">{item.counts[key]}</b> {tStatus(status)}
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-2 text-xs text-sb-muted">{t('menuDataNotAvailable')}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <RestaurantDistanceLabel meters={item.distanceMeters} />
        <ConfidenceMeter level={item.confidence} />
        <RestaurantVerificationBadge status={item.verificationStatus} />
        <RestaurantMenuStatusBadge status={item.menuStatus} />
        <RestaurantSourceBadge source={item.source} />
        {/* Stale = freshness, not offline: show a Clock chip with a "may be out of date" label. */}
        {item.stale ? (
          <LastCheckedBadge label={t('stale')} />
        ) : item.lastCheckedAt ? (
          <LastCheckedBadge label={item.lastCheckedAt.slice(0, 10)} />
        ) : null}
      </div>

      <span className="mt-3 inline-flex items-center gap-1 text-sb-body-s font-bold text-sb-brand">
        {t('viewDetails')}
        <ChevronRight aria-hidden className="size-4" />
      </span>
    </Link>
  );
}
