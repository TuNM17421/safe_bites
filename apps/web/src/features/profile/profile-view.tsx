'use client';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';

// §12.8 — profile summary, restart onboarding, and a hard clear of all local + offline data.
export function ProfileView() {
  const t = useTranslations('profile');
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  const clearAll = useProfileStore((s) => s.clearAll);
  const router = useRouter();

  if (!hydrated) return <p className="text-sm text-muted-foreground">…</p>;
  if (!profile) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t('noProfile')}</p>
        <Link href="/onboarding" className="inline-block rounded-lg bg-foreground px-4 py-2 font-semibold text-background">
          {t('startProfile')}
        </Link>
      </div>
    );
  }

  async function handleClear() {
    await clearAll();
    router.replace('/onboarding');
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('destinationCity')}</p>
        <p className="text-lg font-semibold">{profile.destinationCity}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('allergies')}: {profile.allergies.length} · {t('constraints')}: {profile.selectedProfileIds.length}
        </p>
      </section>
      <Link href="/onboarding" className="rounded-lg border border-border px-4 py-3 text-center font-medium">
        {t('restartOnboarding')}
      </Link>
      <button
        type="button"
        onClick={handleClear}
        className="rounded-lg border border-status-avoid px-4 py-3 font-medium text-status-avoid"
      >
        {t('clearData')}
      </button>
    </div>
  );
}
