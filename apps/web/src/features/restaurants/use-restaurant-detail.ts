'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LocalUserProfile } from '@safebite/domain';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { restaurantCacheRepo } from '@/lib/local-repo';
import { fetchRestaurantDetailRec, type RestaurantDetailResponse } from './restaurants-client';
import { profileHash } from './use-restaurant-recommendations';

export interface RestaurantDetailResult {
  data?: RestaurantDetailResponse;
  source: 'live' | 'saved' | null;
  isLoading: boolean;
  isError: boolean;
  notFound: boolean;
}

// Personalized detail with offline fallback (§12): persists the last viewed detail per
// restaurant+profile, and serves it (with a stale warning) when offline.
export function useRestaurantDetail(idOrSlug: string, profile: LocalUserProfile | null): RestaurantDetailResult {
  const online = useOnlineStatus();
  const fp = profile ? profileHash(profile) : 'none';
  const [saved, setSaved] = useState<RestaurantDetailResponse | null>(null);

  const query = useQuery({
    queryKey: ['restaurant-detail', idOrSlug, fp],
    enabled: Boolean(profile) && online,
    queryFn: async () => {
      const data = await fetchRestaurantDetailRec(idOrSlug, profile as LocalUserProfile);
      if (profile) await restaurantCacheRepo.saveDetail(idOrSlug, fp, data.restaurant.restaurantId, data);
      return data;
    },
  });

  useEffect(() => {
    if (online || !profile) return;
    let active = true;
    void restaurantCacheRepo.loadDetail(idOrSlug, fp).then((row) => {
      if (active && row) setSaved(row.payload as RestaurantDetailResponse);
    });
    return () => {
      active = false;
    };
  }, [online, idOrSlug, fp, profile]);

  if (!online && saved) {
    return { data: saved, source: 'saved', isLoading: false, isError: false, notFound: false };
  }

  const notFound = query.isError && (query.error as Error).message === 'restaurant_not_found';
  return {
    data: query.data,
    source: query.data ? 'live' : null,
    isLoading: query.isPending && query.fetchStatus !== 'idle',
    isError: query.isError,
    notFound,
  };
}
