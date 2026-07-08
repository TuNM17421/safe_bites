'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { LanguageToggle } from '@/components/common/language-toggle';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { StateView } from '@/components/common/state-view';
import { Link } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';
import { DishFilterBar, type Filter } from './dish-filter-bar';
import { DishGroupList } from './dish-group-list';
import { useDishRecommendations } from './use-dish-recommendations';

const EMPTY_SUMMARY = { total: 0, suitable: 0, askFirst: 0, risky: 0, avoid: 0, unknown: 0 };
const primaryBtn = 'inline-block rounded-sb-md bg-sb-primary px-4 py-2 font-semibold text-sb-primary-foreground';

export function DishGuide() {
  const t = useTranslations('dishes');
  const locale = useLocale();
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  const [filter, setFilter] = useState<Filter>('all');
  const [dataLang, setDataLang] = useState<LanguageCode>(locale === 'vi' ? 'vi' : 'en');

  const rec = useDishRecommendations(profile?.destinationCity ?? 'hanoi', profile);

  if (!hydrated) return <SkeletonCard />;
  if (!profile) {
    return (
      <StateView
        title={t('emptyNoProfile')}
        action={
          <Link href="/onboarding" className={primaryBtn}>
            {t('startProfile')}
          </Link>
        }
      />
    );
  }

  const empty = rec.data && rec.data.summary.total === 0 && !rec.isLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <LanguageToggle value={dataLang} onChange={setDataLang} />
      </div>
      <DishFilterBar summary={rec.data?.summary ?? EMPTY_SUMMARY} active={filter} onChange={setFilter} />

      {rec.isLoading && (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {rec.isError && (
        <StateView
          title={t('error')}
          action={
            <button type="button" onClick={rec.refetch} className={primaryBtn}>
              {t('retry')}
            </button>
          }
        />
      )}
      {empty &&
        (rec.source === 'saved' ? (
          <StateView
            icon={<Search className="size-8" />}
            title={t('offlineNoSaved')}
            action={
              <Link href="/allergy-card" className={primaryBtn}>
                {t('showAllergyCard')}
              </Link>
            }
          />
        ) : (
          <StateView icon={<Search className="size-8" />} title={t('emptyNotSeeded')} />
        ))}
      {rec.data && rec.data.summary.total > 0 && (
        <DishGroupList groups={rec.data.groups} filter={filter} lang={dataLang} />
      )}
    </div>
  );
}
