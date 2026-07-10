'use client';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { COMPAT_BAND_VAR } from '@/lib/compat-band';
import type { IngredientRowDTO } from '@/features/restaurants/dish-ingredients-client';

// Per-ingredient traffic-light: 'avoid' (red) when the ingredient carries one of the user's
// allergens, else 'suit' (green). Pure — the profile stays on-device.
export function ingredientBand(allergenTags: string[], profileAllergenIds: string[]): 'suit' | 'avoid' {
  return allergenTags.some((tag) => profileAllergenIds.includes(tag)) ? 'avoid' : 'suit';
}

export function IngredientRow({
  item,
  lang,
  profileAllergenIds,
}: {
  item: IngredientRowDTO;
  lang: LanguageCode;
  profileAllergenIds: string[];
}) {
  const t = useTranslations('dishAtRestaurant');
  const band = ingredientBand(item.allergenTags, profileAllergenIds);
  return (
    <li className="flex items-start gap-3 border-b border-dashed border-sb-border py-3 last:border-0">
      <span
        className="mt-1.5 size-2.5 shrink-0 rounded-full"
        style={{ background: `hsl(var(${COMPAT_BAND_VAR[band]}))` }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sb-body font-semibold text-sb-fg">{item.name[lang]}</span>
        {item.note ? <span className="block text-sb-caption text-sb-muted">{item.note}</span> : null}
      </span>
      {band === 'avoid' ? (
        <span className="shrink-0 rounded-full border border-sb-status-avoid-border bg-sb-status-avoid-bg px-2 py-0.5 text-xs font-bold text-sb-status-avoid-fg">
          {t('containsYourAllergen')}
        </span>
      ) : null}
    </li>
  );
}
