'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { LocalUserProfile } from '@safebite/domain';
import { Link } from '@/i18n/navigation';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { profileRepo } from '@/lib/local-repo';

// /home (§12.3): profile summary (or onboarding link), destination city, CTAs, offline
// indicator, and a disabled "restaurant search — coming later" affordance.
export default function HomePage() {
  const t = useTranslations('home');
  const tSafety = useTranslations('safety');
  const online = useOnlineStatus();
  const [profile, setProfile] = useState<LocalUserProfile | null | undefined>(undefined);

  useEffect(() => {
    void profileRepo.loadActiveProfile().then((p) => setProfile(p ?? null));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {!online && <p className="text-sm text-status-unknown">{t('offlineIndicator')}</p>}

      {profile === null && (
        <section className="rounded-lg border border-border bg-muted p-4">
          <p className="text-sm text-muted-foreground">{t('noProfile')}</p>
          <Link
            href="/onboarding"
            className="mt-2 inline-block rounded-lg bg-foreground px-4 py-2 font-semibold text-background"
          >
            {t('startProfile')}
          </Link>
        </section>
      )}
      {profile && (
        <section className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('destinationCity')}</p>
          <p className="text-lg font-semibold">{profile.destinationCity}</p>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <Link href="/dishes" className="rounded-lg border border-border px-4 py-3 font-medium">
          {t('browseDishes')}
        </Link>
        <Link href="/allergy-card" className="rounded-lg border border-border px-4 py-3 font-medium">
          {t('showAllergyCard')}
        </Link>
        <Link href="/question-card" className="rounded-lg border border-border px-4 py-3 font-medium">
          {t('generateQuestionCard')}
        </Link>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg border border-border px-4 py-3 text-left font-medium text-muted-foreground"
        >
          {t('restaurantSearchComingLater')}
        </button>
      </div>

      <p role="note" className="rounded-lg border border-border bg-safety p-3 text-sm text-safety-foreground">
        {tSafety('disclaimer')}
      </p>
    </div>
  );
}
