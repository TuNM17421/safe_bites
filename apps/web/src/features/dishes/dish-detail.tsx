'use client';
import { ViewTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, EyeOff, MessageCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { StateView } from '@/components/common/state-view';
import { RecommendationCard } from '@/components/safety/recommendation-card';
import { StatusBadge } from '@/components/status/status-badge';
import { Link } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';
import { fetchDish } from './dishes-client';
import { useDishRecommendations } from './use-dish-recommendations';

// Comma-joined seed strings (e.g. "bún,đậu phụ chiên,mắm tôm") → individual chips.
const toList = (s: string | null) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);

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
          <Link
            href="/dishes"
            className="inline-flex min-h-sb-tap items-center rounded-sb-md bg-sb-primary px-4 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
          >
            {t('back')}
          </Link>
        }
      />
    );
  }

  const dish = dishQuery.data;
  const card = rec.data ? Object.values(rec.data.groups).flat().find((c) => c.dishId === dishId) : undefined;
  const common = toList(dish.commonIngredients[lang]);
  const hidden = toList(dish.possibleHiddenIngredients[lang]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link
          href="/dishes"
          aria-label={t('back')}
          className="-ml-2 grid min-h-sb-tap min-w-sb-tap place-items-center rounded-full text-sb-muted hover:bg-sb-surface-2 focus-visible:shadow-sb-focus"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <div className="min-w-0">
          <ViewTransition name={`dish-title-${dishId}`}>
            <h1 className="truncate text-sb-title font-bold text-sb-fg">{dish.name[lang]}</h1>
          </ViewTransition>
          <p className="truncate text-sb-caption text-sb-faint">{dish.name[other]}</p>
        </div>
      </div>

      {card && (
        <div className="flex justify-end">
          <StatusBadge status={card.status} />
        </div>
      )}

      {dish.description[lang] && <p className="text-sb-body-s text-sb-muted">{dish.description[lang]}</p>}

      {common.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sb-caption font-bold uppercase tracking-wide text-sb-faint">{t('commonIngredients')}</h2>
          <ul className="flex flex-wrap gap-2">
            {common.map((item) => (
              <li
                key={item}
                className="inline-flex min-h-[40px] items-center rounded-sb-sm border border-sb-border bg-sb-surface-2 px-3 text-sb-body-s text-sb-fg"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hidden.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sb-caption font-bold uppercase tracking-wide text-sb-faint">{t('hiddenIngredients')}</h2>
          <ul className="flex flex-wrap gap-2">
            {hidden.map((item) => (
              <li
                key={item}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-sb-sm border border-sb-border bg-sb-surface-2 px-3 text-sb-body-s text-sb-fg"
              >
                <EyeOff aria-hidden className="size-3.5 text-sb-faint" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {card ? <RecommendationCard card={card} lang={lang} /> : <StateView title={t('riskNotAvailable')} />}

      <Link
        href={`/question-card?dishId=${encodeURIComponent(dishId)}`}
        className="inline-flex min-h-sb-tap w-full items-center justify-center gap-2 rounded-sb-sm bg-sb-primary px-4 text-sb-body font-bold text-sb-primary-foreground focus-visible:shadow-sb-focus"
      >
        <MessageCircle aria-hidden className="size-5" />
        {t('generateQuestionCard')}
      </Link>
    </div>
  );
}
