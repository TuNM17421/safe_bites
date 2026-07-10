'use client';
import { useLocale, useTranslations } from 'next-intl';
import type { AllergyCardEntry, LanguageCode } from '@safebite/domain';
import { AllergenChip } from '@/components/safety/allergen-chip';
import { SafetyNotice } from '@/components/safety/safety-notice';

// Bilingual staff allergy card, folded into /profile (v2, Phase 03). Both EN + VI names stay
// visible for restaurant staff; `dataLang` only chooses which name is emphasised (the chip).
// Lifted from the former standalone allergy-card-display.tsx.
export function ProfileAllergyCard({
  entries,
  dataLang,
  updatedAt,
}: {
  entries: AllergyCardEntry[];
  dataLang: LanguageCode;
  updatedAt: string;
}) {
  const t = useTranslations('allergyCard');
  const tSev = useTranslations('severity');
  const tCross = useTranslations('onboarding');
  const locale = useLocale();
  const other: LanguageCode = dataLang === 'en' ? 'vi' : 'en';

  const crossLabel = (v: boolean | 'not_sure') =>
    v === true ? t('crossContactAvoid') : v === false ? t('crossContactOk') : tCross('notSure');
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(updatedAt));

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-sb-lg border border-sb-border bg-sb-brand-soft p-4 shadow-sb-e1">
        <ul className="flex flex-col divide-y divide-sb-border">
          {entries.map((e) => (
            <li key={e.allergenId} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <AllergenChip name={e.name[dataLang]} severity={e.severity} />
                <span className="text-sb-body-s text-sb-muted">{e.name[other]}</span>
              </div>
              {e.severity && (
                <p className="text-sb-caption text-sb-muted">
                  {t('severity')}: {tSev(e.severity)}
                </p>
              )}
              {!e.isConstraintOnly && (
                <p className="text-sb-caption text-sb-muted">
                  {t('crossContact')}: {crossLabel(e.crossContact)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
      <SafetyNotice />
      <p className="text-center text-sb-caption text-sb-muted tabular-nums">{t('offlineMeta', { date: formattedDate })}</p>
    </div>
  );
}
