'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { LocalUserProfile } from '@safebite/domain';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { Link } from '@/i18n/navigation';
import { profileRepo } from '@/lib/local-repo';

// /home (§12.3): profile summary (or onboarding link), destination city, CTAs, offline
// indicator, and a disabled "restaurant search — coming later" affordance.
export default function HomePage() {
  const t = useTranslations('home');
  const online = useOnlineStatus();
  const [profile, setProfile] = useState<LocalUserProfile | null | undefined>(undefined);

  useEffect(() => {
    void profileRepo.loadActiveProfile().then((p) => setProfile(p ?? null));
  }, []);

  const linkBtn = 'rounded-sb-md border border-sb-border px-4 py-3 font-medium text-sb-fg focus-visible:shadow-sb-focus';

  return (
    <div className="flex flex-col gap-5">
      {!online && <p className="text-sm text-sb-status-unknown-fg">{t('offlineIndicator')}</p>}

      {profile === null && (
        <section className="rounded-sb-md border border-sb-border bg-sb-surface-2 p-4">
          <p className="text-sm text-sb-muted">{t('noProfile')}</p>
          <Link
            href="/onboarding"
            className="mt-2 inline-block rounded-sb-md bg-sb-primary px-4 py-2 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
          >
            {t('startProfile')}
          </Link>
        </section>
      )}
      {profile && (
        <section className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
          <p className="text-xs uppercase tracking-wide text-sb-muted">{t('destinationCity')}</p>
          <p className="text-lg font-semibold text-sb-fg">{profile.destinationCity}</p>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <Link href="/dishes" className={linkBtn}>
          {t('browseDishes')}
        </Link>
        <Link href="/allergy-card" className={linkBtn}>
          {t('showAllergyCard')}
        </Link>
        <Link href="/question-card" className={linkBtn}>
          {t('generateQuestionCard')}
        </Link>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-sb-md border border-sb-border px-4 py-3 text-left font-medium text-sb-muted"
        >
          {t('restaurantSearchComingLater')}
        </button>
      </div>

      <SafetyNotice />
    </div>
  );
}
