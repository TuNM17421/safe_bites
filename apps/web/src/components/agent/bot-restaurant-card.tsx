'use client';
import { ChevronRight, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CompatRing } from '@/components/restaurants/compat-ring';
import { Link } from '@/i18n/navigation';
import type { BotRestaurant } from '@/lib/agent-schemas';

// A REAL restaurant surfaced inside a bot reply. Reuses CompatRing and links into the real
// /restaurant/[slug] detail — the bot never invents an entity that doesn't exist in the DB.
export function BotRestaurantCard({ restaurant, lang }: { restaurant: BotRestaurant; lang: 'en' | 'vi' }) {
  const t = useTranslations('agent');
  const href = `/restaurant/${restaurant.slug ?? restaurant.restaurantId}`;
  const km = restaurant.distanceMeters === null ? null : (restaurant.distanceMeters / 1000).toFixed(1);
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-sb-md border border-sb-border bg-sb-surface p-3 shadow-sb-e1 focus-visible:shadow-sb-focus focus-visible:outline-none"
    >
      <CompatRing
        percent={restaurant.compatibility}
        size="md"
        ariaLabel={
          restaurant.compatibility === null
            ? t('matchUnknown')
            : t('matchLabel', { percent: restaurant.compatibility })
        }
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sb-body font-bold text-sb-fg">{restaurant.name[lang]}</h3>
        {km ? (
          <p className="mt-0.5 inline-flex items-center gap-1 text-sb-caption text-sb-muted">
            <MapPin aria-hidden className="size-3.5" />
            {t('distanceKm', { km })}
          </p>
        ) : null}
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-sb-brand" />
    </Link>
  );
}
