'use client';
import { CircleUser, Languages, MapPin, Pencil, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { AllergenChip } from '@/components/safety/allergen-chip';
import { Link, useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';

function MetaChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sb-border bg-sb-surface-2 px-2.5 py-1 text-sb-caption text-sb-muted">
      {icon}
      {label}
    </span>
  );
}

// §12.8 — identity card (avatar + named allergen/dietary chips + destination/language), restart
// onboarding, and a de-emphasised, separated destructive "clear all data" action.
export function ProfileView() {
  const t = useTranslations('profile');
  const tSev = useTranslations('severity');
  const locale = useLocale() as 'en' | 'vi';
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  const card = useProfileStore((s) => s.allergyCard);
  const clearAll = useProfileStore((s) => s.clearAll);
  const router = useRouter();

  if (!hydrated) return <SkeletonCard />;
  if (!profile) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sb-body-s text-sb-muted">{t('noProfile')}</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-sb-tap w-full items-center justify-center rounded-sb-md bg-sb-primary px-4 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
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

  const entries = card?.entries ?? [];
  const allergens = entries.filter((e) => !e.isConstraintOnly);
  const dietary = entries.filter((e) => e.isConstraintOnly);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-sb-lg border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 place-items-center rounded-full bg-sb-brand-soft text-sb-title font-bold text-sb-brand"
            aria-hidden
          >
            {profile.name?.trim()?.[0]?.toUpperCase() ?? <CircleUser className="size-5" />}
          </span>
          <p className="text-sb-title font-semibold text-sb-fg">{profile.name?.trim() || t('you')}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {entries.length > 0 ? (
            <>
              {allergens.map((e) => (
                <span key={e.allergenId} className="inline-flex items-center gap-1">
                  <AllergenChip name={e.name[locale]} severity={e.severity} />
                  {e.severity && <span className="text-sb-caption text-sb-muted">· {tSev(e.severity)}</span>}
                </span>
              ))}
              {dietary.map((e) => (
                <AllergenChip key={e.allergenId} name={e.name[locale]} />
              ))}
            </>
          ) : (
            <span className="text-sb-body-s text-sb-muted">
              {t('allergies')}: {profile.allergies.length} · {t('constraints')}: {profile.selectedProfileIds.length}
            </span>
          )}
          <MetaChip icon={<MapPin aria-hidden className="size-3.5" />} label={profile.destinationCity} />
          <MetaChip icon={<Languages aria-hidden className="size-3.5" />} label={profile.language.toUpperCase()} />
        </div>
      </section>

      <Link
        href="/onboarding"
        className="inline-flex min-h-sb-tap w-full items-center justify-center gap-2 rounded-sb-md border border-sb-border bg-sb-surface font-medium text-sb-fg focus-visible:shadow-sb-focus"
      >
        <Pencil aria-hidden className="size-4" />
        {t('restartOnboarding')}
      </Link>

      <div className="mt-2 border-t border-sb-border pt-4">
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex min-h-sb-tap w-full items-center justify-center gap-2 rounded-sb-md border border-sb-status-avoid-border bg-sb-surface font-medium text-sb-status-avoid-fg focus-visible:shadow-sb-focus"
        >
          <Trash2 aria-hidden className="size-4" />
          {t('clearData')}
        </button>
      </div>
    </div>
  );
}
