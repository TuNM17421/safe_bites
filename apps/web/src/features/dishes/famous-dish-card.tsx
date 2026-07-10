'use client';
import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LanguageCode, RecommendationStatus } from '@safebite/domain';
import { StatusBadge } from '@/components/status/status-badge';
import { Link } from '@/i18n/navigation';
import type { FamousDish } from './famous-client';

function ingredientChips(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/[,;·]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

// Lightweight famous-dish card: name + (profile-aware) status chip + VI description + ingredient
// chips + a city-scoped "N restaurants near you" link. The chip is omitted when there's no profile.
export function FamousDishCard({
  dish,
  status,
  lang,
}: {
  dish: FamousDish;
  status: RecommendationStatus | null;
  lang: LanguageCode;
}) {
  const t = useTranslations('famous');
  const chips = ingredientChips(dish.commonIngredients[lang]);
  return (
    <article className="flex flex-col gap-2 rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sb-title font-bold text-sb-fg">{dish.name[lang]}</h3>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      {dish.description[lang] ? <p className="text-sb-body-s text-sb-muted">{dish.description[lang]}</p> : null}
      {chips.length ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded-sb-sm border border-sb-border bg-sb-surface-2 px-2 py-0.5 text-xs text-sb-fg">
              {c}
            </span>
          ))}
        </div>
      ) : null}
      {dish.restaurantCount > 0 ? (
        // TODO(dish-filter): point at a dish-filtered restaurant view once one exists; the map
        // /home is the closest "find restaurants" surface today.
        <Link href="/home" className="mt-1 inline-flex items-center gap-1.5 text-sb-body-s font-bold text-sb-brand">
          <MapPin aria-hidden className="size-4" />
          {t('restaurantsNearby', { count: dish.restaurantCount })}
        </Link>
      ) : (
        <p className="mt-1 text-sb-caption text-sb-faint">{t('noRestaurantsNearby')}</p>
      )}
    </article>
  );
}
