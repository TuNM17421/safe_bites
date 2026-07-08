'use client';
import { create } from 'zustand';
import type { AllergyCard, LocalUserProfile } from '@safebite/domain';
import { allergyCardRepo, clearAllLocalData, profileRepo } from './local-repo';

interface ProfileState {
  profile: LocalUserProfile | null;
  allergyCard: AllergyCard | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setProfile: (profile: LocalUserProfile, card: AllergyCard) => void;
  clearAll: () => Promise<void>;
}

// App-wide active-profile store, hydrated from Dexie on mount for synchronous reads.
export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  allergyCard: null,
  hydrated: false,
  async hydrate() {
    const profile = (await profileRepo.loadActiveProfile()) ?? null;
    const allergyCard = profile ? ((await allergyCardRepo.loadAllergyCard(profile.id)) ?? null) : null;
    set({ profile, allergyCard, hydrated: true });
  },
  setProfile(profile, card) {
    set({ profile, allergyCard: card });
  },
  async clearAll() {
    await clearAllLocalData();
    set({ profile: null, allergyCard: null });
  },
}));
