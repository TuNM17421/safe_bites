'use client';
import { useQuery } from '@tanstack/react-query';
import type { LocalUserProfile } from '@safebite/domain';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { fetchRestaurantRecs, type RestaurantFilters, type RestaurantListResponse } from './restaurants-client';

// Profile is part of the cache key so switching profiles refetches (mirrors dishes).
function profileHash(p: LocalUserProfile): string {
  return JSON.stringify({ ids: p.selectedProfileIds, allergies: p.allergies, lang: p.language });
}

export interface RestaurantRecsResult {
  data?: RestaurantListResponse;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

// Server-side filters (district/cuisine/sort) drive the query; free-text search is applied
// client-side by the guide so it doesn't refetch on every keystroke.
export function useRestaurantRecommendations(
  city: string,
  profile: LocalUserProfile | null,
  filters: Pick<RestaurantFilters, 'district' | 'cuisine' | 'sort'>,
): RestaurantRecsResult {
  const online = useOnlineStatus();
  const query = useQuery({
    queryKey: [
      'restaurant-recs',
      city,
      profile ? profileHash(profile) : 'none',
      filters.district ?? '',
      filters.cuisine ?? '',
      filters.sort,
    ],
    enabled: Boolean(profile) && online,
    queryFn: () =>
      fetchRestaurantRecs(city, profile as LocalUserProfile, {
        district: filters.district,
        cuisine: filters.cuisine,
        sort: filters.sort,
      }),
  });

  return {
    data: query.data,
    isLoading: query.isPending && query.fetchStatus !== 'idle',
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
