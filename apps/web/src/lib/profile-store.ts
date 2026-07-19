'use client';
import { create } from 'zustand';
import type { AllergyCard, LocalUserProfile } from '@safebite/domain';
import { allergyCardRepo, clearAllLocalData, profileRepo } from './local-repo';

// The "session is unlocked" flag lives in sessionStorage, not memory: a biometric unlock persists
// across full-page reloads within the same tab/session but clears when the app is fully closed
// (cold open ⇒ re-authenticate). It is NOT a secret — the real protection is the device-only
// encryption key; this only drives the UX gate.
const UNLOCK_KEY = 'sb_unlocked';
const readUnlocked = (): boolean =>
  typeof window !== 'undefined' && window.sessionStorage.getItem(UNLOCK_KEY) === '1';
const persistUnlocked = (value: boolean): void => {
  if (typeof window === 'undefined') return;
  if (value) window.sessionStorage.setItem(UNLOCK_KEY, '1');
  else window.sessionStorage.removeItem(UNLOCK_KEY);
};

interface ProfileState {
  profile: LocalUserProfile | null;
  allergyCard: AllergyCard | null;
  hydrated: boolean;
  // Lock model (Phase 14): a persisted profile is encrypted at rest and starts each session LOCKED.
  // `probed` = we've cheaply checked whether one exists (no decrypt); `unlocked` = this session may
  // decrypt it (set by the /login ceremony or by finishing onboarding).
  probed: boolean;
  hasProfileOnDisk: boolean;
  unlocked: boolean;
  probe: () => Promise<void>;
  hydrate: () => Promise<void>;
  unlock: () => Promise<void>;
  setProfile: (profile: LocalUserProfile, card: AllergyCard) => void;
  clearAll: () => Promise<void>;
}

// App-wide active-profile store, hydrated from Dexie on mount for synchronous reads.
export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  allergyCard: null,
  hydrated: false,
  probed: false,
  hasProfileOnDisk: false,
  unlocked: false,
  // Existence check only — never decrypts, so the gate can run before the session is unlocked.
  // Also restores the session-unlocked flag from sessionStorage (survives reloads within a tab).
  // The store is "settled" (hydrated) when there is no profile on disk (final empty state) OR one
  // is already loaded in memory (e.g. straight after onboarding/unlock via soft nav — must NOT be
  // clobbered back to a skeleton). Only a locked, not-yet-decrypted profile stays un-hydrated.
  async probe() {
    const hasProfileOnDisk = await profileRepo.hasActiveProfile();
    const settled = !hasProfileOnDisk || get().profile !== null;
    set({ hasProfileOnDisk, unlocked: readUnlocked(), probed: true, hydrated: settled });
  },
  // Decrypts + loads the active profile into memory. Only meaningful once unlocked.
  async hydrate() {
    const profile = (await profileRepo.loadActiveProfile()) ?? null;
    const allergyCard = profile ? ((await allergyCardRepo.loadAllergyCard(profile.id)) ?? null) : null;
    set({ profile, allergyCard, hydrated: true });
  },
  // Marks the session unlocked and pulls the (decrypted) profile into memory.
  async unlock() {
    persistUnlocked(true);
    set({ unlocked: true });
    await get().hydrate();
  },
  setProfile(profile, card) {
    // Completing onboarding both creates and unlocks the profile in-session.
    persistUnlocked(true);
    set({ profile, allergyCard: card, hasProfileOnDisk: true, unlocked: true, hydrated: true, probed: true });
  },
  async clearAll() {
    await clearAllLocalData();
    persistUnlocked(false);
    set({ profile: null, allergyCard: null, hasProfileOnDisk: false, unlocked: false });
  },
}));
