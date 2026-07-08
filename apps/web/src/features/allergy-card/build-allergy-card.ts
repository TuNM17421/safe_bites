import type { AllergyCard, AllergyCardEntry, Bilingual, LocalUserProfile } from '@safebite/domain';

export interface NameLookup {
  allergens: Record<string, Bilingual>;
  templates: Record<string, Bilingual>;
}

// Pure builder -> self-contained bilingual snapshot for the offline allergy card (§12.7).
export function buildAllergyCard(
  profile: LocalUserProfile,
  names: NameLookup,
  id: string,
  now: string,
): AllergyCard {
  const allergyEntries: AllergyCardEntry[] = profile.allergies.map((a) => ({
    allergenId: a.allergenId,
    name: names.allergens[a.allergenId] ?? { en: a.allergenId, vi: a.allergenId },
    severity: a.severity,
    crossContact: a.crossContactSensitive,
    isConstraintOnly: false,
  }));
  const constraintEntries: AllergyCardEntry[] = profile.selectedProfileIds.map((pid) => ({
    allergenId: pid,
    name: names.templates[pid] ?? { en: pid, vi: pid },
    crossContact: 'not_sure',
    isConstraintOnly: true,
  }));
  return {
    id,
    profileId: profile.id,
    language: profile.language,
    entries: [...allergyEntries, ...constraintEntries],
    createdAt: now,
    updatedAt: now,
  };
}
