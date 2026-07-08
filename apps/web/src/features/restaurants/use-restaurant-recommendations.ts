'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LocalUserProfile } from '@safebite/domain';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { restaurantCacheRepo } from '@/lib/local-repo';
import {
  fetchRestaurantRecs,
  type ClientLocation,
  type RestaurantFilters,
  type RestaurantListResponse,
} from './restaurants-client';

// Profile is part of the cache key so switching profiles refetches (mirrors dishes).
export function profileHash(p: LocalUserProfile): string {
  return JSON.stringify({ ids: p.selectedProfileIds, allergies: p.allergies, lang: p.language });
}

export interface RestaurantRecsResult {
  data?: RestaurantListResponse;
  source: 'live' | 'saved' | null;
  savedAt?: string | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

// Server-side filters (district/cuisine/sort) drive the query; free-text search is applied
// client-side by the guide. Offline (§12): fall back to the last cached search for this
// city+profile with an explicit stale warning.
export function useRestaurantRecommendations(
  city: string,
  profile: LocalUserProfile | null,
  filters: Pick<RestaurantFilters, 'district' | 'cuisine' | 'sort'>,
  clientLocation?: ClientLocation | null,
): RestaurantRecsResult {
  const online = useOnlineStatus();
  const fp = profile ? profileHash(profile) : 'none';
  const locKey = clientLocation ? `${clientLocation.lat.toFixed(3)},${clientLocation.lon.toFixed(3)}` : 'noloc';
  const [saved, setSaved] = useState<{ data: RestaurantListResponse; savedAt: string } | null>(null);

  const query = useQuery({
    queryKey: ['restaurant-recs', city, fp, filters.district ?? '', filters.cuisine ?? '', filters.sort, locKey],
    enabled: Boolean(profile) && online,
    queryFn: async () => {
      const data = await fetchRestaurantRecs(
        city,
        profile as LocalUserProfile,
        { district: filters.district, cuisine: filters.cuisine, sort: filters.sort },
        clientLocation ?? undefined,
      );
      // Persist the latest search for offline reuse (payload is the validated DTO).
      if (profile) await restaurantCacheRepo.saveSearch(city, fp, data);
      return data;
    },
  });

  useEffect(() => {
    if (online || !profile) return;
    let active = true;
    void restaurantCacheRepo.loadSearch(city, fp).then((row) => {
      if (active && row) setSaved({ data: row.payload as RestaurantListResponse, savedAt: row.savedAt });
    });
    return () => {
      active = false;
    };
  }, [online, city, fp, profile]);

  if (!online && saved) {
    return { data: saved.data, source: 'saved', savedAt: saved.savedAt, isLoading: false, isError: false, refetch: () => {} };
  }

  return {
    data: query.data,
    source: query.data ? 'live' : null,
    savedAt: null,
    isLoading: query.isPending && query.fetchStatus !== 'idle',
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
