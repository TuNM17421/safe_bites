'use client';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { StateView } from '@/components/common/state-view';
import { RecommendationCard } from '@/components/safety/recommendation-card';
import { Link } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';
import { fetchDish } from './dishes-client';
import { useDishRecommendations } from './use-dish-recommendations';

export function DishDetail({ dishId }: { dishId: string }) {
  const t = useTranslations('dishes');
  const locale = useLocale();
  const lang: LanguageCode = locale === 'vi' ? 'vi' : 'en';
  const other: LanguageCode = lang === 'vi' ? 'en' : 'vi';
  const profile = useProfileStore((s) => s.profile);

  const dishQuery = useQuery({ queryKey: ['dish', dishId], queryFn: () => fetchDish(dishId) });
  const rec = useDishRecommendations(profile?.destinationCity ?? 'hanoi', profile);

  if (dishQuery.isPending) return <SkeletonCard />;
  if (dishQuery.isError || !dishQuery.data) {
    return (
      <StateView
        title={t('error')}
        action={
          <Link href="/dishes" className="inline-block rounded-sb-md bg-sb-primary px-4 py-2 font-semibold text-sb-primary-foreground">
            {t('back')}
          </Link>
        }
      />
    );
  }

  const dish = dishQuery.data;
  const card = rec.data ? Object.values(rec.data.groups).flat().find((c) => c.dishId === dishId) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-bold text-sb-fg">{dish.name[lang]}</h1>
        <p className="text-sm text-sb-muted">{dish.name[other]}</p>
      </header>
      {dish.description[lang] && <p className="text-sm text-sb-fg">{dish.description[lang]}</p>}
      {dish.commonIngredients[lang] && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-bold text-sb-muted">{t('commonIngredients')}</h2>
          <p className="text-sm text-sb-fg">{dish.commonIngredients[lang]}</p>
        </section>
      )}
      {dish.possibleHiddenIngredients[lang] && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-bold text-sb-muted">{t('hiddenIngredients')}</h2>
          <p className="text-sm text-sb-fg">{dish.possibleHiddenIngredients[lang]}</p>
        </section>
      )}
      {card ? <RecommendationCard card={card} lang={lang} /> : <StateView title={t('riskNotAvailable')} />}
      <Link
        href={`/question-card?dishId=${encodeURIComponent(dishId)}`}
        className="rounded-sb-md bg-sb-primary px-4 py-3 text-center font-semibold text-sb-primary-foreground"
      >
        {t('generateQuestionCard')}
      </Link>
    </div>
  );
}
