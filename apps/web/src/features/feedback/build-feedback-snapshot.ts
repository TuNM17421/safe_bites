import type { LocalUserProfile } from '@safebite/domain';

interface SnapshotAllergy {
  allergenId: string;
  severity: string;
  crossContactSensitive: boolean | 'not_sure';
}

interface ProfileSnapshot {
  allergies: SnapshotAllergy[];
  dietaryProfiles: string[];
}

// Build the minimal profile snapshot (allergy ids/severity/cross-contact + dietary ids).
// NEVER include lat/lon/geo or any location data.
export function buildProfileSnapshot(
  profile: LocalUserProfile | null,
  allergenIds: string[],
): ProfileSnapshot {
  const allergies = (profile?.allergies ?? [])
    .filter((a) => allergenIds.includes(a.allergenId))
    .map((a) => ({
      allergenId: a.allergenId,
      severity: a.severity,
      crossContactSensitive: a.crossContactSensitive,
    }));

  return {
    allergies,
    dietaryProfiles: profile?.selectedProfileIds ?? [],
  };
}

export function profileAllergenIds(profile: LocalUserProfile | null): string[] {
  return profile?.allergies.map((a) => a.allergenId) ?? [];
}
