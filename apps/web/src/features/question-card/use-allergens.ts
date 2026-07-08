'use client';
import { useQuery } from '@tanstack/react-query';
import type { QuestionCardAllergen } from '@safebite/domain';
import { metadataRepo } from '@/lib/local-repo';

export interface AllergenMeta {
  id: string;
  name: { en: string; vi: string };
  aliases: { en: string[]; vi: string[] };
}

async function fetchAllergens(): Promise<AllergenMeta[]> {
  const res = await fetch('/api/v1/allergens');
  const json = (await res.json()) as { data: { items: AllergenMeta[] } };
  return json.data.items;
}

// Fetch the bilingual allergen catalog and mirror it into Dexie metadata so offline
// question-card regeneration still has names/aliases.
export function useAllergensMeta() {
  return useQuery({
    queryKey: ['allergens'],
    queryFn: async () => {
      const items = await fetchAllergens();
      await metadataRepo.setMetadata('allergens', items);
      return items;
    },
  });
}

export async function loadCachedAllergens(): Promise<AllergenMeta[]> {
  return (await metadataRepo.getMetadata<AllergenMeta[]>('allergens')) ?? [];
}

export function toQuestionCardAllergens(items: AllergenMeta[], allergenIds: string[]): QuestionCardAllergen[] {
  const byId = new Map(items.map((a) => [a.id, a]));
  return allergenIds.map((id) => {
    const a = byId.get(id);
    return a
      ? { id: a.id, nameEn: a.name.en, nameVi: a.name.vi, aliasesEn: a.aliases.en, aliasesVi: a.aliases.vi }
      : { id, nameEn: id, nameVi: id, aliasesEn: [], aliasesVi: [] };
  });
}
