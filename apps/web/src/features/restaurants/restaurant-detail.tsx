'use client';
import { useState } from 'react';
import { ArrowLeft, ExternalLink, Globe, MapPin, Phone, WifiOff } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { LanguageCode, RecommendationStatus } from '@safebite/domain';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { StateView } from '@/components/common/state-view';
import { LanguageToggle } from '@/components/common/language-toggle';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { FeedbackEntryButton } from '@/components/feedback/feedback-entry-button';
import { FeedbackSummaryBanner } from '@/components/feedback/feedback-summary-banner';
import { STATUS_DISPLAY_ORDER } from '@/components/status/status-visuals';
import { MenuItemRecommendationCard } from '@/components/restaurants/menu-item-recommendation-card';
import {
  RestaurantMenuStatusBadge,
  RestaurantReadinessBadge,
  RestaurantSourceBadge,
  RestaurantVerificationBadge,
} from '@/components/restaurants/restaurant-badges';
import { ConfidenceMeter } from '@/components/status/confidence-badge';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { Link } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';
import { useRestaurantDetail } from './use-restaurant-detail';

export function RestaurantDetail({ restaurantIdOrSlug }: { restaurantIdOrSlug: string }) {
  const t = useTranslations('restaurantDetail');
  const tStatus = useTranslations('statuses');
  const tList = useTranslations('restaurants');
  const locale = useLocale();
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  const online = useOnlineStatus();
  const [dataLang, setDataLang] = useState<LanguageCode>(locale === 'vi' ? 'vi' : 'en');

  const detail = useRestaurantDetail(restaurantIdOrSlug, profile);

  const backLink = (
    <Link href="/restaurants" className="inline-flex items-center gap-1 text-sb-body-s text-sb-muted hover:text-sb-fg">
      <ArrowLeft aria-hidden className="size-4" />
      {t('back')}
    </Link>
  );

  if (!hydrated) return <SkeletonCard />;
  if (!profile)
    return (
      <div className="flex flex-col gap-3">
        {backLink}
        <StateView
          title={t('emptyNoProfile')}
          action={
            <Link href="/onboarding" className="inline-flex min-h-sb-tap items-center font-bold text-sb-brand underline">
              {t('startProfile')}
            </Link>
          }
        />
      </div>
    );
  if (detail.isLoading) return <div className="flex flex-col gap-3">{backLink}<SkeletonCard /></div>;
  if (detail.isError && !detail.data) {
    return (
      <div className="flex flex-col gap-3">
        {backLink}
        <StateView tone="neutral" title={detail.notFound ? t('notFound') : t('error')} />
      </div>
    );
  }
  // Offline with no cached detail: explicit offline state instead of an indefinite skeleton.
  if (!online && !detail.data)
    return <div className="flex flex-col gap-3">{backLink}<StateView tone="warm" title={t('offline')} /></div>;
  if (!detail.data) return <div className="flex flex-col gap-3">{backLink}<SkeletonCard /></div>;

  const { restaurant: r, recommendation: rec, menuRecommendations, attribution } = detail.data;
  const osmUrl =
    r.lat !== null && r.lon !== null
      ? `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon}`
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        {backLink}
        <LanguageToggle value={dataLang} onChange={setDataLang} />
      </div>

      {detail.source === 'saved' ? (
        <p role="status" className="flex items-start gap-2 rounded-sb-md border border-sb-status-ask-first-border bg-sb-status-ask-first-bg p-3 text-sb-body-s text-sb-status-ask-first-fg">
          <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0" />
          {tList('offlineSavedNotice')}
        </p>
      ) : null}

      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-sb-h1 font-bold text-sb-fg">{r.name[dataLang]}</h1>
        <p className="text-sb-body-s text-sb-muted">
          {[r.cuisine.join(' · '), r.address].filter(Boolean).join(' — ')}
        </p>
      </header>

      {/* Readiness panel */}
      <section className="flex flex-col gap-3 rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sb-title font-bold text-sb-fg">{t('readinessTitle')}</h2>
          <RestaurantReadinessBadge readinessClass={rec.readinessClass} />
        </div>
        <p className="text-sb-body-s text-sb-muted">{rec.summary[dataLang]}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <ConfidenceMeter level={rec.confidence} />
          <RestaurantVerificationBadge status={r.verificationStatus} />
          <RestaurantMenuStatusBadge status={r.menuStatus} />
          <RestaurantSourceBadge source={r.source} />
        </div>
        {rec.feedbackSummary?.hasActiveFlags ? <FeedbackSummaryBanner summary={rec.feedbackSummary} /> : null}
        <FeedbackEntryButton restaurantId={r.restaurantId} variant="restaurant" />
      </section>

      <SafetyNotice />

      {/* Menu items grouped by status (Avoid first, Unknown above Suitable) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sb-title font-bold text-sb-fg">{t('menuTitle')}</h2>
        {menuRecommendations.length === 0 ? (
          <p className="rounded-sb-md border border-sb-border bg-sb-surface-2 p-3 text-sb-body-s text-sb-muted">{t('noMenu')}</p>
        ) : (
          STATUS_DISPLAY_ORDER.map((status: RecommendationStatus) => {
            const group = menuRecommendations.filter((m) => m.status === status);
            if (group.length === 0) return null;
            return (
              <div key={status} className="flex flex-col gap-2">
                <h3 className="text-sb-label font-bold uppercase tracking-wide text-sb-faint">
                  {tStatus(status)} · {group.length}
                </h3>
                {group.map((m) => (
                  <MenuItemRecommendationCard key={m.menuItemId} rec={m} lang={dataLang} />
                ))}
              </div>
            );
          })
        )}
      </section>

      {/* Metadata + location */}
      <section className="flex flex-col gap-2 rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
        <h2 className="text-sb-title font-bold text-sb-fg">{t('metadataTitle')}</h2>
        <dl className="flex flex-col gap-1.5 text-sb-body-s">
          {r.phone ? (
            <a href={`tel:${r.phone}`} className="inline-flex items-center gap-2 text-sb-brand">
              <Phone aria-hidden className="size-4" /> {r.phone}
            </a>
          ) : null}
          {r.website ? (
            <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sb-brand">
              <Globe aria-hidden className="size-4" /> {t('website')} <ExternalLink aria-hidden className="size-3" />
            </a>
          ) : null}
          {r.openingHours ? (
            <span className="text-sb-muted">
              {t('openingHours')}: {r.openingHours}
            </span>
          ) : null}
          {osmUrl ? (
            <a href={osmUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sb-brand">
              <MapPin aria-hidden className="size-4" /> {t('openInMap')} <ExternalLink aria-hidden className="size-3" />
            </a>
          ) : null}
        </dl>
        {attribution ? <p className="pt-1 text-xs text-sb-faint">{attribution}</p> : null}
      </section>
    </div>
  );
}
