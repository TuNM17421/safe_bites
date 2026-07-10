'use client';
import dynamic from 'next/dynamic';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { LocationPermissionPanel } from '@/features/location/location-permission-panel';
import { useGeolocation } from '@/features/location/use-geolocation';
import { useRestaurantRecommendations } from '@/features/restaurants/use-restaurant-recommendations';
import type { ClientLocation, RestaurantListItem } from '@/features/restaurants/restaurants-client';
import { haversineMeters } from '@/lib/geo/haversine';
import { Link, useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';
import type { LatLng } from './map-canvas';
import { NearbyList } from './nearby-list';
import { NearbySheet } from './nearby-sheet';

// Leaf map is client + WebGL/DOM only — lazy-load with ssr:false so it stays out of the initial
// home bundle and never runs on the server.
const MapCanvas = dynamic(() => import('./map-canvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-sb-surface-2" aria-hidden />,
});

const HANOI: LatLng = [21.0285, 105.8542];
const CITY_CENTERS: Record<string, LatLng> = { hanoi: HANOI };
const cityCenter = (city: string): LatLng => CITY_CENTERS[city] ?? HANOI;

// Add a client-computed distance when the server DTO omits it (offline caches strip distance).
function withClientDistance(r: RestaurantListItem, loc: ClientLocation | null): RestaurantListItem {
  if (r.distanceMeters !== null || !loc || r.lat === null || r.lon === null) return r;
  return { ...r, distanceMeters: haversineMeters(loc, { lat: r.lat, lon: r.lon }) };
}

export function HomeMap() {
  const t = useTranslations('home');
  const locale = useLocale() as 'en' | 'vi';
  const online = useOnlineStatus();
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  const geo = useGeolocation();
  const router = useRouter();
  const [q, setQ] = useState('');

  const city = profile?.destinationCity ?? 'hanoi';
  const recs = useRestaurantRecommendations(city, profile, { sort: geo.location ? 'nearest' : 'recommended' }, geo.location);

  if (!hydrated) {
    return (
      <div className="flex-1 p-4">
        <SkeletonCard />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-3 p-6 text-center">
        <p className="text-sb-body text-sb-muted">{t('noProfile')}</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-sb-tap items-center justify-center rounded-sb-md bg-sb-primary px-4 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
        >
          {t('startProfile')}
        </Link>
      </div>
    );
  }

  const query = q.trim().toLowerCase();
  const items = (recs.data?.restaurants ?? [])
    .map((r) => withClientDistance(r, geo.location))
    .filter(
      (r) =>
        query === '' ||
        [r.name.en, r.name.vi, r.cuisine.join(' '), r.district ?? ''].join(' ').toLowerCase().includes(query),
    );

  const searchBar = (
    <label className="flex items-center gap-2 rounded-full border border-sb-border bg-sb-surface px-4 shadow-sb-e2">
      <Search aria-hidden className="size-4 text-sb-faint" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className="min-h-sb-tap min-w-0 flex-1 border-0 bg-transparent text-sb-body text-sb-fg outline-none"
      />
    </label>
  );

  // Offline: raster tiles can't load — show the saved list full-height (the shell renders the
  // stale/offline banner above).
  if (!online) {
    return (
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {searchBar}
        <p className="text-sb-caption text-sb-muted">{t('mapOffline')}</p>
        {recs.isLoading ? <SkeletonCard /> : <NearbyList items={items} lang={locale} />}
        <SafetyNotice />
      </div>
    );
  }

  const center: LatLng = geo.location ? [geo.location.lat, geo.location.lon] : cityCenter(city);

  return (
    <div className="relative flex-1 overflow-hidden min-h-[60vh]">
      <MapCanvas
        center={center}
        userLocation={geo.location}
        items={items}
        onSelect={(it) => router.push(`/restaurant/${it.slug ?? it.restaurantId}`)}
      />
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex flex-col gap-2">
        <div className="pointer-events-auto">{searchBar}</div>
        {geo.status !== 'granted' ? (
          <div className="pointer-events-auto">
            <LocationPermissionPanel status={geo.status} onRequest={geo.request} onClear={geo.clear} />
          </div>
        ) : null}
      </div>
      <NearbySheet items={items} lang={locale} />
    </div>
  );
}
