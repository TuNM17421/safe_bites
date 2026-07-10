'use client';
import { Flame } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  evaluateDishes,
  type DishEvaluationInput,
  type EvidenceType,
  type RecommendationStatus,
} from '@safebite/domain';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { StateView } from '@/components/common/state-view';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { useProfileStore } from '@/lib/profile-store';
import { fetchFamousDishes, type FamousDish } from './famous-client';
import { FamousDishCard } from './famous-dish-card';

// Map the famous DTO into the engine's input so the chip can be evaluated on-device.
function toEvalInput(d: FamousDish): DishEvaluationInput {
  return {
    dishId: d.id,
    name: d.name,
    risks: d.allergenRisks.map((r) => ({
      dishId: d.id,
      allergenId: r.allergenId,
      riskLevel: r.riskLevel,
      confidence: r.confidence,
      reason: r.reason,
      recommendedAction: r.action,
      evidenceType: r.evidenceType as EvidenceType,
      source: r.source,
      lastCheckedAt: r.lastCheckedAt,
    })),
    pickyEaterFlags: [],
  };
}

export function FamousList() {
  const t = useTranslations('famous');
  const locale = useLocale() as 'en' | 'vi';
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  const city = profile?.destinationCity ?? 'hanoi';
  const query = useQuery({ queryKey: ['famous-dishes', city], queryFn: () => fetchFamousDishes(city) });

  const statusByDish = useMemo(() => {
    const map = new Map<string, RecommendationStatus>();
    if (profile && query.data) {
      for (const card of evaluateDishes(profile, query.data.map(toEvalInput))) map.set(card.dishId, card.status);
    }
    return map;
  }, [profile, query.data]);

  const header = (
    <header className="flex flex-col gap-1">
      <h1 className="inline-flex items-center gap-2 text-sb-h1 font-bold text-sb-fg">
        <Flame aria-hidden className="size-6 text-sb-appetite" />
        {t('screenTitle')}
      </h1>
      <p className="text-sb-body-s text-sb-muted">{t('reminder')}</p>
    </header>
  );

  if (!hydrated || query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <SkeletonCard />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <StateView tone="neutral" title={t('error')} />
      </div>
    );
  }
  const dishes = query.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {header}
      {dishes.length === 0 ? (
        <StateView tone="neutral" title={t('empty')} />
      ) : (
        <div className="flex flex-col gap-3">
          {dishes.map((d) => (
            <FamousDishCard key={d.id} dish={d} status={statusByDish.get(d.id) ?? null} lang={locale} />
          ))}
        </div>
      )}
      <SafetyNotice />
    </div>
  );
}
