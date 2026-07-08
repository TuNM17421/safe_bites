'use client';
import { useQuery } from '@tanstack/react-query';

interface Bilingual {
  en: string;
  vi: string;
}
export interface Template {
  id: string;
  name: Bilingual;
  profileType: string;
  strictness: string;
  description: Bilingual;
}
export interface Allergen {
  id: string;
  name: Bilingual;
  aliases: { en: string[]; vi: string[] };
}
export interface ClientConfig {
  supportedCities: string[];
  defaultCity: string;
  supportedLanguages: string[];
  offlineCacheTtlDays: number;
  pwaInstallEnabled: boolean;
}

async function fetchData<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as { data: T };
  return json.data;
}

export function useProfileTemplates() {
  return useQuery({
    queryKey: ['profile-templates'],
    queryFn: () => fetchData<{ items: Template[] }>('/api/v1/profile-templates'),
  });
}

export function useAllergens() {
  return useQuery({
    queryKey: ['allergens'],
    queryFn: () => fetchData<{ items: Allergen[] }>('/api/v1/allergens'),
  });
}

export function useClientConfigQuery() {
  return useQuery({
    queryKey: ['client-config'],
    queryFn: () => fetchData<ClientConfig>('/api/v1/client-config'),
  });
}
