'use client';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { CompatRing } from '@/components/restaurants/compat-ring';
import { Link } from '@/i18n/navigation';
import type { RestaurantListItem } from '@/features/restaurants/restaurants-client';

function formatDistance(meters: number | null): string | null {
  if (meters === null) return null;
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function NearbyRow({
  item,
  lang,
  compatLabel,
}: {
  item: RestaurantListItem;
  lang: LanguageCode;
  compatLabel: string;
}) {
  const meta = [item.cuisine.join(' · '), formatDistance(item.distanceMeters)].filter(Boolean).join(' · ');
  return (
    <Link
      href={`/restaurant/${item.slug ?? item.restaurantId}`}
      className="flex items-center gap-3 border-b border-dashed border-sb-border py-3 last:border-0 focus-visible:shadow-sb-focus focus-visible:outline-none"
    >
      <CompatRing percent={item.compatibility} ariaLabel={compatLabel} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sb-body font-bold text-sb-fg">{item.name[lang]}</span>
        {meta ? <span className="block truncate text-sb-caption text-sb-muted">{meta}</span> : null}
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-sb-faint" />
    </Link>
  );
}

export function NearbyList({ items, lang }: { items: RestaurantListItem[]; lang: LanguageCode }) {
  const t = useTranslations('home');
  if (items.length === 0) {
    return <p className="px-1 py-6 text-center text-sb-body-s text-sb-muted">{t('noResults')}</p>;
  }
  return (
    <ul className="flex flex-col">
      {items.map((it) => (
        <li key={it.restaurantId}>
          <NearbyRow
            item={it}
            lang={lang}
            compatLabel={it.compatibility === null ? t('compatUnknown') : t('compatLabel', { percent: it.compatibility })}
          />
        </li>
      ))}
    </ul>
  );
}
