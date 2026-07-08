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

  if (!hydrated) return <p className="text-sm text-sb-muted">…</p>;
  if (!profile) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-sb-muted">{t('noProfile')}</p>
        <Link
          href="/onboarding"
          className="inline-block rounded-sb-md bg-sb-primary px-4 py-2 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
        >
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
      <section className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
        <p className="text-xs uppercase tracking-wide text-sb-muted">{t('destinationCity')}</p>
        <p className="text-lg font-semibold text-sb-fg">{profile.destinationCity}</p>
        <p className="mt-2 text-sm text-sb-muted">
          {t('allergies')}: {profile.allergies.length} · {t('constraints')}: {profile.selectedProfileIds.length}
        </p>
      </section>
      <Link
        href="/onboarding"
        className="rounded-sb-md border border-sb-border px-4 py-3 text-center font-medium text-sb-fg focus-visible:shadow-sb-focus"
      >
        {t('restartOnboarding')}
      </Link>
      <button
        type="button"
        onClick={handleClear}
        className="rounded-sb-md border border-sb-status-avoid-border px-4 py-3 font-medium text-sb-status-avoid-fg focus-visible:shadow-sb-focus"
      >
        {t('clearData')}
      </button>
    </div>
  );
}
