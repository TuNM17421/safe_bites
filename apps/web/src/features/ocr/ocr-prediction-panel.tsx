'use client';
import { MapPin, Sparkles, TriangleAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { OcrPredictResponse } from '@/lib/ocr-schemas';

const DOT_VAR: Record<string, string> = {
  suitable: '--sb-status-suitable-fg',
  ask_first: '--sb-status-ask-first-fg',
  risky: '--sb-status-risky-fg',
  avoid: '--sb-status-avoid-fg',
  unknown: '--sb-status-unknown-fg',
};
const CHIP: Record<string, string> = {
  suitable: 'border-sb-status-suitable-border bg-sb-status-suitable-bg text-sb-status-suitable-fg',
  ask_first: 'border-sb-status-ask-first-border bg-sb-status-ask-first-bg text-sb-status-ask-first-fg',
  risky: 'border-sb-status-risky-border bg-sb-status-risky-bg text-sb-status-risky-fg',
  avoid: 'border-sb-status-avoid-border bg-sb-status-avoid-bg text-sb-status-avoid-fg',
  unknown: 'border-sb-status-unknown-border bg-sb-status-unknown-bg text-sb-status-unknown-fg',
};

export function OcrPredictionPanel({ result, onRescan }: { result: OcrPredictResponse; onRescan: () => void }) {
  const t = useTranslations('ocr');
  const locale = useLocale() as 'en' | 'vi';
  const router = useRouter();
  const { prediction } = result;

  return (
    <div className="flex flex-col gap-3">
      <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-sb-brand-soft px-3 py-1 text-xs font-bold text-sb-brand-ink">
        <Sparkles aria-hidden className="size-3.5" />
        {t('aiTag')}
      </span>

      <div className="flex items-start gap-2 rounded-sb-sm border border-sb-status-ask-first-border bg-sb-status-ask-first-bg p-3 text-xs text-sb-status-ask-first-fg">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t('generalRecipeWarning')}
      </div>

      <h1 className="text-sb-title font-bold text-sb-fg">{t('recognized', { dish: prediction.dishName[locale] })}</h1>

      <section className="rounded-sb-md border border-sb-border bg-sb-surface p-4">
        <ul className="flex flex-col">
          {prediction.ingredients.map((ing, i) => (
            <li key={i} className="flex items-start gap-3 border-b border-dashed border-sb-border py-3 last:border-0">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: `hsl(var(${DOT_VAR[ing.status]}))` }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sb-body font-semibold text-sb-fg">{ing.name[locale]}</span>
                {ing.note ? <span className="block text-sb-caption text-sb-muted">{ing.note[locale]}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <span className={`inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-sm font-bold ${CHIP[prediction.verdict.status]}`}>
        {prediction.verdict.label[locale]}
      </span>

      <button
        type="button"
        onClick={() => router.push('/home')}
        className="inline-flex min-h-sb-tap items-center justify-center gap-2 rounded-sb-md border border-sb-border bg-sb-surface-2 px-4 font-bold text-sb-fg focus-visible:shadow-sb-focus"
      >
        <MapPin aria-hidden className="size-5" />
        {t('findRestaurants', { dish: prediction.dishName[locale] })}
      </button>
      <button type="button" onClick={onRescan} className="self-start text-sb-body-s font-bold text-sb-brand underline">
        {t('rescan')}
      </button>
    </div>
  );
}
