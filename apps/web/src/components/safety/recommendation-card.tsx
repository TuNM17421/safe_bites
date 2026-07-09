'use client';
import { ViewTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { DishRecommendationCard, LanguageCode } from '@safebite/domain';
import { ConfidenceMeter } from '@/components/status/confidence-badge';
import { AllergenBadge, LastCheckedBadge, SavedBadge, SourceBadge } from '@/components/status/source-badge';
import { StatusBadge } from '@/components/status/status-badge';

// Reusable evidence block (dish list, dish detail). The Suitable caveat is baked in so no
// consumer can forget it; every card shows source / confidence / reason / action / last-checked.
// `showSubtitle` (dish list) leads with the native VI name + the translated subtitle; the
// dish-detail page keeps its own bilingual header and opts out.
export function RecommendationCard({
  card,
  lang,
  showSubtitle = false,
  morphName,
}: {
  card: DishRecommendationCard;
  lang: LanguageCode;
  showSubtitle?: boolean;
  morphName?: string;
}) {
  const t = useTranslations('dishes');
  const title = showSubtitle ? card.name.vi : card.name[lang];
  const heading = <h3 className="text-sb-title font-bold text-sb-fg">{title}</h3>;
  return (
    <article className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {morphName ? <ViewTransition name={morphName}>{heading}</ViewTransition> : heading}
          {showSubtitle && lang === 'en' && <p className="mt-0.5 text-sb-body-s text-sb-muted">{card.name.en}</p>}
        </div>
        <StatusBadge status={card.status} />
      </header>
      <dl className="mt-3 grid gap-1.5 border-t border-sb-border pt-3 text-[13px] text-sb-fg">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 font-semibold text-sb-muted">{t('reason')}</dt>
          <dd>{card.reason[lang]}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 font-semibold text-sb-muted">{t('action')}</dt>
          <dd>{card.action[lang]}</dd>
        </div>
      </dl>
      <footer className="mt-3 flex flex-wrap items-center gap-2">
        {card.matchedAllergens.length > 0 && <AllergenBadge label={t(`risk.${card.riskLevel}`)} />}
        <ConfidenceMeter level={card.confidence} />
        <SourceBadge source={card.source} />
        <LastCheckedBadge label={t('lastChecked', { date: card.lastCheckedAt })} />
        {card.stale && <SavedBadge label={t('savedOffline')} />}
      </footer>
      {card.status === 'suitable' && (
        <p className="mt-3 rounded-xl bg-sb-surface-2 p-2.5 text-xs text-sb-muted">{t('suitableCaveat')}</p>
      )}
    </article>
  );
}
