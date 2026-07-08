'use client';
import { useTranslations } from 'next-intl';
import type { DishRecommendationCard, LanguageCode } from '@safebite/domain';
import { ConfidenceMeter } from '@/components/status/confidence-badge';
import { LastCheckedBadge, SourceBadge } from '@/components/status/source-badge';
import { StatusBadge } from '@/components/status/status-badge';

// Reusable evidence block (dish list, dish detail). The Suitable caveat is baked in so no
// consumer can forget it; every card shows source / confidence / reason / action / last-checked.
export function RecommendationCard({ card, lang }: { card: DishRecommendationCard; lang: LanguageCode }) {
  const t = useTranslations('dishes');
  return (
    <article className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-sb-fg">{card.name[lang]}</h3>
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
        <ConfidenceMeter level={card.confidence} />
        <SourceBadge source={card.source} />
        <LastCheckedBadge label={t('lastChecked', { date: card.lastCheckedAt })} />
      </footer>
      {card.status === 'suitable' && (
        <p className="mt-3 rounded-xl bg-sb-surface-2 p-2.5 text-xs text-sb-muted">{t('suitableCaveat')}</p>
      )}
    </article>
  );
}
