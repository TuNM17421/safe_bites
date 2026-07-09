import { create } from 'zustand';
import type { FeedbackReaction, FeedbackReactionTiming, StaffAnswer } from '@safebite/domain';

type Ternary = 'yes' | 'no' | 'not_sure';

export interface FeedbackDraftState {
  step: number;
  menuItemId?: string | null;
  dishId?: string | null;
  ateHere?: Ternary;
  visitedAt: string;
  allergenIds: string[];
  askedStaff?: Ternary;
  staffAnswer?: StaffAnswer;
  staffAnswerText: string;
  reaction?: FeedbackReaction;
  reactionTiming?: FeedbackReactionTiming;
  userTrustRating?: number;
  notes: string;
  setStep: (n: number) => void;
  patch: (p: Partial<FeedbackDraftState>) => void;
  toggleAllergen: (id: string) => void;
  reset: () => void;
}

function initialState() {
  return {
    step: 0,
    menuItemId: null,
    dishId: null,
    visitedAt: new Date().toISOString().slice(0, 10),
    allergenIds: [] as string[],
    staffAnswerText: '',
    notes: '',
  };
}

export const useFeedbackDraft = create<FeedbackDraftState>((set) => ({
  ...initialState(),
  setStep: (n) => set({ step: n }),
  patch: (p) => set(p),
  toggleAllergen: (id) =>
    set((s) => ({
      allergenIds: s.allergenIds.includes(id)
        ? s.allergenIds.filter((a) => a !== id)
        : [...s.allergenIds, id],
    })),
  reset: () => set(initialState()),
}));
