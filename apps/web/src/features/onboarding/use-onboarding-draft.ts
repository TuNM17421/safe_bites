'use client';
import { create } from 'zustand';
import type { LanguageCode, Severity } from '@safebite/domain';

interface DraftState {
  step: number;
  selectedProfileIds: string[];
  selectedAllergenIds: string[];
  severity: Record<string, Severity>;
  crossContact: Record<string, boolean | 'not_sure'>;
  destinationCity: string;
  language: LanguageCode;
  accepted: boolean;
  setStep: (n: number) => void;
  toggleProfile: (id: string) => void;
  toggleAllergen: (id: string) => void;
  setSeverity: (id: string, s: Severity) => void;
  setCrossContact: (id: string, v: boolean | 'not_sure') => void;
  setCity: (c: string) => void;
  setLanguage: (l: LanguageCode) => void;
  setAccepted: (a: boolean) => void;
  reset: () => void;
}

function toggle(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

const INITIAL = {
  step: 0,
  selectedProfileIds: [] as string[],
  selectedAllergenIds: [] as string[],
  severity: {} as Record<string, Severity>,
  crossContact: {} as Record<string, boolean | 'not_sure'>,
  destinationCity: 'hanoi',
  language: 'en' as LanguageCode,
  accepted: false,
};

// Transient wizard draft — never persisted, never serialized to the URL.
export const useOnboardingDraft = create<DraftState>((set) => ({
  ...INITIAL,
  setStep: (n) => set({ step: n }),
  toggleProfile: (id) => set((s) => ({ selectedProfileIds: toggle(s.selectedProfileIds, id) })),
  toggleAllergen: (id) => set((s) => ({ selectedAllergenIds: toggle(s.selectedAllergenIds, id) })),
  setSeverity: (id, sev) => set((s) => ({ severity: { ...s.severity, [id]: sev } })),
  setCrossContact: (id, v) => set((s) => ({ crossContact: { ...s.crossContact, [id]: v } })),
  setCity: (c) => set({ destinationCity: c }),
  setLanguage: (l) => set({ language: l }),
  setAccepted: (a) => set({ accepted: a }),
  reset: () => set({ ...INITIAL, severity: {}, crossContact: {}, selectedProfileIds: [], selectedAllergenIds: [] }),
}));
