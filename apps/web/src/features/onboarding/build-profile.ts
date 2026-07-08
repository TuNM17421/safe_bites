import type { LocalUserProfile, Severity } from '@safebite/domain';

export interface ProfileDraft {
  selectedProfileIds: string[];
  selectedAllergenIds: string[];
  severity: Record<string, Severity>;
  crossContact: Record<string, boolean | 'not_sure'>;
  destinationCity: string;
  language: 'en' | 'vi';
}

// Draft -> LocalUserProfile (§7). Allergens become allergies[]; non-allergy templates
// stay in selectedProfileIds for the engine's religious/diet/preference rules.
export function buildProfile(draft: ProfileDraft, id: string, now: string): LocalUserProfile {
  return {
    id,
    selectedProfileIds: draft.selectedProfileIds,
    allergies: draft.selectedAllergenIds.map((allergenId) => ({
      allergenId,
      severity: draft.severity[allergenId] ?? 'moderate',
      crossContactSensitive: draft.crossContact[allergenId] ?? 'not_sure',
    })),
    language: draft.language,
    destinationCity: draft.destinationCity,
    safetyAcceptedAt: now,
    offlineEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
}
