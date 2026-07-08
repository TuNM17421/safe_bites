'use client';
import { useTranslations } from 'next-intl';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { Link } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';

// §12.7 — self-contained offline allergy card rendered from the Dexie-hydrated store.
export function AllergyCardDisplay() {
  const t = useTranslations('allergyCard');
  const tSev = useTranslations('severity');
  const tCross = useTranslations('onboarding');
  const hydrated = useProfileStore((s) => s.hydrated);
  const card = useProfileStore((s) => s.allergyCard);

  if (!hydrated) return <p className="text-sm text-muted-foreground">…</p>;
  if (!card) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t('noCard')}</p>
        <Link href="/onboarding" className="inline-block rounded-lg bg-foreground px-4 py-2 font-semibold text-background">
          {t('startProfile')}
        </Link>
      </div>
    );
  }

  const crossLabel = (v: boolean | 'not_sure') => (v === true ? tCross('yes') : v === false ? tCross('no') : tCross('notSure'));

  return (
    <div className="flex flex-col gap-4">
      <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{t('offlineAvailable')}</span>
      <div className="flex flex-col gap-3">
        {card.entries.map((e) => (
          <div key={e.allergenId} className="rounded-lg border border-border p-3">
            <p className="font-semibold">
              {e.name.en} · {e.name.vi}
            </p>
            {e.severity && (
              <p className="text-sm text-muted-foreground">
                {t('severity')}: {tSev(e.severity)}
              </p>
            )}
            {!e.isConstraintOnly && (
              <p className="text-sm text-muted-foreground">
                {t('crossContact')}: {crossLabel(e.crossContact)}
              </p>
            )}
          </div>
        ))}
      </div>
      <SafetyNotice />
      <p className="text-xs text-muted-foreground">
        {t('lastUpdated')}: {new Date(card.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}
