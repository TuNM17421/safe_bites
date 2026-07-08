'use client';
import { useLocale, useTranslations } from 'next-intl';
import { AllergenChip } from '@/components/safety/allergen-chip';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { Link } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';

// §12.7 — self-contained offline allergy card rendered from the Dexie-hydrated store.
// Brand-tinted card; each entry is an AllergenChip (icon + name + severity colour) with the
// VI name alongside, so EN and VI are always present for restaurant staff.
export function AllergyCardDisplay() {
  const t = useTranslations('allergyCard');
  const tSev = useTranslations('severity');
  const tCross = useTranslations('onboarding');
  const locale = useLocale();
  const hydrated = useProfileStore((s) => s.hydrated);
  const card = useProfileStore((s) => s.allergyCard);

  if (!hydrated) return <p className="text-sb-body-s text-sb-muted">…</p>;
  if (!card) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sb-body-s text-sb-muted">{t('noCard')}</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-sb-tap w-full items-center justify-center rounded-sb-md bg-sb-primary px-4 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
        >
          {t('startProfile')}
        </Link>
      </div>
    );
  }

  const crossLabel = (v: boolean | 'not_sure') =>
    v === true ? t('crossContactAvoid') : v === false ? t('crossContactOk') : tCross('notSure');
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(card.updatedAt));

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-sb-lg border border-sb-border bg-sb-brand-soft p-4 shadow-sb-e1">
        <ul className="flex flex-col divide-y divide-sb-border">
          {card.entries.map((e) => (
            <li key={e.allergenId} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <AllergenChip name={e.name.en} severity={e.severity} />
                <span className="text-sb-body-s text-sb-muted">{e.name.vi}</span>
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
