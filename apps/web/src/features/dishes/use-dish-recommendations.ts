'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { LocalUserProfile } from '@safebite/domain';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { fetchRecommendations, type Recommendations } from './dishes-client';
import { loadSavedRecommendations, persistCards } from './saved-dishes';

export interface DishRecsResult {
  data?: Recommendations;
  source: 'live' | 'saved' | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

function profileHash(p: LocalUserProfile): string {
  return JSON.stringify({ ids: p.selectedProfileIds, allergies: p.allergies, lang: p.language });
}

export function useDishRecommendations(city: string, profile: LocalUserProfile | null): DishRecsResult {
  const online = useOnlineStatus();

  const query = useQuery({
    queryKey: ['recommendations', city, profile ? profileHash(profile) : 'none'],
    enabled: Boolean(profile) && online,
    queryFn: async () => {
      const data = await fetchRecommendations(city, profile as LocalUserProfile);
      await persistCards(Object.values(data.groups).flat());
      return data;
    },
  });

  const [saved, setSaved] = useState<Recommendations | undefined>(undefined);
  const [savedLoading, setSavedLoading] = useState(false);
  useEffect(() => {
    if (online || !profile) return;
    setSavedLoading(true);
    void loadSavedRecommendations(city).then((r) => {
      setSaved(r);
      setSavedLoading(false);
    });
  }, [online, profile, city]);

  if (online) {
    return {
      data: query.data,
      source: query.data ? 'live' : null,
      isLoading: query.isPending && query.fetchStatus !== 'idle',
      isError: query.isError,
      refetch: () => void query.refetch(),
    };
  }
  return { data: saved, source: saved ? 'saved' : null, isLoading: savedLoading, isError: false, refetch: () => {} };
}
