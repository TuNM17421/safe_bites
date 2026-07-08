'use client';
import { IdCard, MapPin, MessageCircle, UtensilsCrossed, Wifi, WifiOff } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { Link } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';

// /home (§12.3): greeting hero (destination + allergen chips + connection pill), primary
// "browse dishes" CTA + icon-led quick actions, and a disabled restaurant-search affordance.
export default function HomePage() {
  const t = useTranslations('home');
  const tSev = useTranslations('severity');
  const locale = useLocale() as 'en' | 'vi';
  const online = useOnlineStatus();
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  const allergyCard = useProfileStore((s) => s.allergyCard);

  const primaryBtn =
    'flex min-h-sb-tap w-full items-center justify-center gap-2 rounded-sb-sm bg-sb-primary px-4 text-sb-body font-bold text-sb-primary-foreground shadow-sb-e1 focus-visible:shadow-sb-focus';
  const ghostBtn =
    'flex min-h-sb-tap w-full items-center justify-center gap-2 rounded-sb-sm border border-sb-border bg-sb-surface-2 px-4 text-sb-body font-bold text-sb-fg focus-visible:shadow-sb-focus';
  const metaChip =
    'inline-flex items-center gap-1.5 rounded-full border border-sb-border bg-sb-surface-2 px-2.5 py-1 text-sb-caption text-sb-muted';

  if (!hydrated)
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
      </div>
    );

  const connectionPill = (
    <span className={`${metaChip} ${online ? 'text-sb-status-suitable-fg' : 'text-sb-status-ask-first-fg'}`}>
      {online ? <Wifi aria-hidden className="size-3.5" /> : <WifiOff aria-hidden className="size-3.5" />}
      {online ? t('online') : t('offline')}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-sb-md border border-sb-border bg-gradient-to-b from-sb-brand-soft to-sb-surface p-5 shadow-sb-e2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-sb-title text-sb-fg">
            {profile?.name ? t('greetingNamed', { name: profile.name }) : profile ? t('greeting') : t('welcome')}
          </h1>
          {connectionPill}
        </div>
        {profile ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {allergyCard?.entries
              .filter((e) => !e.isConstraintOnly)
              .map((e) => (
                <span key={e.allergenId} className={metaChip}>
                  {e.name[locale]}
                  {e.severity ? ` · ${tSev(e.severity)}` : ''}
                </span>
              ))}
            <span className={metaChip}>
              <MapPin aria-hidden className="size-3.5 text-sb-faint" />
              <span className="capitalize">{profile.destinationCity}</span>
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sb-body-s text-sb-muted">{t('noProfile')}</p>
        )}
      </section>

      <div className="flex flex-col gap-3">
        {profile ? (
          <>
            <Link href="/dishes" className={primaryBtn}>
              <UtensilsCrossed aria-hidden className="size-5" />
              {t('browseDishes')}
            </Link>
            <Link href="/allergy-card" className={ghostBtn}>
              <IdCard aria-hidden className="size-5" />
              {t('showAllergyCard')}
            </Link>
            <Link href="/question-card" className={ghostBtn}>
              <MessageCircle aria-hidden className="size-5" />
              {t('generateQuestionCard')}
            </Link>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="flex min-h-sb-tap w-full cursor-not-allowed items-center justify-center gap-2 rounded-sb-sm bg-sb-primary px-4 text-sb-body font-bold text-sb-primary-foreground opacity-50"
            >
              <MapPin aria-hidden className="size-5" />
              {t('restaurantSearchComingLater')}
            </button>
          </>
        ) : (
          <Link href="/onboarding" className={primaryBtn}>
            {t('startProfile')}
          </Link>
        )}
      </div>

      <SafetyNotice />
    </div>
  );
}
