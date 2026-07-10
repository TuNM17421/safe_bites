'use client';
import { ArrowLeft } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { StateView } from '@/components/common/state-view';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { IngredientActionBar } from '@/components/restaurants/ingredient-action-bar';
import { IngredientRow } from '@/components/restaurants/ingredient-row';
import { Link } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';
import { useMenuItemIngredients } from './use-menu-item-ingredients';

// v2 /restaurant/:id/dish — ingredients for a dish AT a restaurant, with provenance and the
// three human-in-the-loop actions (add / report wrong / ask owner).
export function DishAtRestaurant({
  restaurantIdOrSlug,
  menuItemId,
}: {
  restaurantIdOrSlug: string;
  menuItemId: string | null;
}) {
  const t = useTranslations('dishAtRestaurant');
  const locale = useLocale() as 'en' | 'vi';
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  const { data, isLoading, isError, online, add } = useMenuItemIngredients(menuItemId);
  const profileAllergenIds = profile?.allergies.map((a) => a.allergenId) ?? [];

  const back = (
    <Link
      href={`/restaurant/${restaurantIdOrSlug}`}
      className="inline-flex items-center gap-1 text-sb-body-s text-sb-muted hover:text-sb-fg"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {t('back')}
    </Link>
  );

  if (!menuItemId) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <StateView tone="neutral" title={t('noDish')} />
      </div>
    );
  }
  if (!hydrated || isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <SkeletonCard />
      </div>
    );
  }
  if (!online && !data) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <StateView tone="warm" title={t('offline')} />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <StateView tone="neutral" title={t('error')} />
      </div>
    );
  }

  const p = data.provenance;
  const provParts: string[] = [];
  if (p.selfDeclared) provParts.push(t('provSelfDeclared'));
  if (p.adminCount > 0) provParts.push(t('provAdmin', { count: p.adminCount }));
  if (p.userContributionCount > 0) provParts.push(t('provUser', { count: p.userContributionCount }));
  if (p.ocrCount > 0) provParts.push(t('provOcr', { count: p.ocrCount }));

  return (
    <div className="flex flex-col gap-4">
      {back}
      <header>
        <h1 className="text-sb-h1 font-bold text-sb-fg">{data.menuItem.name[locale]}</h1>
        <p className="mt-1 text-sb-body-s text-sb-muted">{t('ingredientsSubtitle')}</p>
      </header>

      <section className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
        {data.ingredients.length === 0 ? (
          <p className="text-sb-body-s text-sb-muted">{t('noIngredients')}</p>
        ) : (
          <ul className="flex flex-col">
            {data.ingredients.map((it) => (
              <IngredientRow key={it.id} item={it} lang={locale} profileAllergenIds={profileAllergenIds} />
            ))}
          </ul>
        )}
        {provParts.length > 0 ? (
          <p className="mt-3 border-t border-sb-border pt-3 text-sb-caption text-sb-muted">
            {t('provPrefix')} {provParts.join(' · ')}
          </p>
        ) : null}
      </section>

      <IngredientActionBar
        restaurantId={data.menuItem.restaurantId}
        menuItemId={data.menuItem.id}
        lang={locale}
        existingIngredientIds={data.ingredients.map((i) => i.ingredientId)}
        onAdd={(id) => add.mutate(id)}
        adding={add.isPending}
      />

      <SafetyNotice />
    </div>
  );
}
