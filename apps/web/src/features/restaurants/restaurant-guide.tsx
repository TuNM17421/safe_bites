'use client';
import { useEffect, useMemo, useState } from 'react';
import { MapPinned, ShieldCheck, WifiOff } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { StateView } from '@/components/common/state-view';
import { LanguageToggle } from '@/components/common/language-toggle';
import { RestaurantCard } from '@/components/restaurants/restaurant-card';
import { RestaurantMapShell } from '@/components/restaurants/restaurant-map-shell';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { LocationPermissionPanel } from '@/features/location/location-permission-panel';
import { useGeolocation } from '@/features/location/use-geolocation';
import { Link } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';
import { RestaurantFilterBar } from './restaurant-filter-bar';
import { useRestaurantRecommendations } from './use-restaurant-recommendations';
import type { RestaurantFilters } from './restaurants-client';

export function RestaurantGuide() {
  const t = useTranslations('restaurants');
  const locale = useLocale();
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  const online = useOnlineStatus();
  const [dataLang, setDataLang] = useState<LanguageCode>(locale === 'vi' ? 'vi' : 'en');
  const [filters, setFilters] = useState<RestaurantFilters>({ sort: 'recommended' });
  const [view, setView] = useState<'list' | 'map'>('list');
  const geo = useGeolocation();

  const city = profile?.destinationCity ?? 'hanoi';
  const rec = useRestaurantRecommendations(city, profile, filters, geo.location);

  // Keep sort coherent with location: default → nearest on grant, nearest → recommended on clear.
  useEffect(() => {
    setFilters((f) => {
      if (geo.location && f.sort === 'recommended') return { ...f, sort: 'nearest' };
      if (!geo.location && f.sort === 'nearest') return { ...f, sort: 'recommended' };
      return f;
    });
  }, [geo.location]);

  // Free-text search is client-side over the fetched page (name + address).
  const results = useMemo(() => {
    const items = rec.data?.restaurants ?? [];
    const q = (filters.q ?? '').trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.name.en.toLowerCase().includes(q) ||
        r.name.vi.toLowerCase().includes(q) ||
        (r.address ?? '').toLowerCase().includes(q),
    );
  }, [rec.data, filters.q]);

  if (!hydrated) return <SkeletonCard />;

  if (!profile)
    return (
      <StateView
        icon={<MapPinned className="size-8" />}
        title={t('emptyNoProfile')}
        action={
          <Link href="/onboarding" className="inline-flex min-h-sb-tap items-center font-bold text-sb-brand underline">
            {t('startProfile')}
          </Link>
        }
      />
    );

  const header = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-sb-h2 font-bold text-sb-fg">{t('screenTitle')}</h1>
        <LanguageToggle value={dataLang} onChange={setDataLang} />
      </div>
      <p role="note" className="flex items-start gap-2 rounded-sb-md border border-sb-border bg-sb-surface-2 p-3 text-sb-body-s text-sb-muted">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t('rankedReminder')}
      </p>
      <LocationPermissionPanel status={geo.status} onRequest={geo.request} onClear={geo.clear} />
      <RestaurantFilterBar filters={filters} onChange={setFilters} showNearest={Boolean(geo.location)} />
      <div className="inline-flex self-start rounded-full border border-sb-border p-0.5">
        {(['list', 'map'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`min-h-sb-tap rounded-full px-4 text-sb-body-s font-semibold focus-visible:shadow-sb-focus focus-visible:outline-none ${
              view === v ? 'bg-sb-primary text-sb-primary-foreground' : 'text-sb-muted'
            }`}
          >
            {t(v === 'list' ? 'viewList' : 'viewMap')}
          </button>
        ))}
      </div>
    </div>
  );

  let body: React.ReactNode;
  if (!online && !rec.data) {
    body = (
      <StateView
        tone="warm"
        icon={<WifiOff className="size-8" />}
        title={t('offlineNoSaved')}
        action={
          <Link href="/allergy-card" className="inline-flex min-h-sb-tap items-center font-bold text-sb-brand underline">
            {t('showAllergyCard')}
          </Link>
        }
      />
    );
  } else if (rec.isLoading) {
    body = (
      <div className="flex flex-col gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  } else if (rec.isError) {
    body = (
      <StateView
        tone="neutral"
        title={t('error')}
        action={
          <button type="button" onClick={rec.refetch} className="inline-flex min-h-sb-tap items-center font-bold text-sb-brand underline">
            {t('retry')}
          </button>
        }
      />
    );
  } else if (results.length === 0) {
    body = <StateView tone="neutral" title={t('emptyNoResults')} />;
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {rec.source === 'saved' ? (
          <p role="status" className="flex items-start gap-2 rounded-sb-md border border-sb-status-ask-first-border bg-sb-status-ask-first-bg p-3 text-sb-body-s text-sb-status-ask-first-fg">
            <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('offlineSavedNotice')}
          </p>
        ) : null}
        <p className="text-xs text-sb-faint">{t('resultCount', { count: results.length })}</p>
        {view === 'map' ? (
          <RestaurantMapShell attribution={rec.data?.attribution ?? null} />
        ) : (
          <>
            {results.map((item) => (
              <RestaurantCard key={item.restaurantId} item={item} lang={dataLang} />
            ))}
            {rec.data?.attribution ? <p className="pt-1 text-xs text-sb-faint">{rec.data.attribution}</p> : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      {body}
    </div>
  );
}
