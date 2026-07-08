import { describe, expect, it } from 'vitest';
import { copy, evaluateDish } from '../src/index';
import type { DishEvaluationInput, DishRiskFact, LocalUserProfile, Severity } from '../src/types';

function profile(overrides: Partial<LocalUserProfile> = {}): LocalUserProfile {
  return {
    id: 'local_test',
    selectedProfileIds: [],
    allergies: [],
    language: 'en',
    destinationCity: 'hanoi',
    safetyAcceptedAt: '2026-07-08T00:00:00.000Z',
    offlineEnabled: false,
    createdAt: '2026-07-08T00:00:00.000Z',
    updatedAt: '2026-07-08T00:00:00.000Z',
    ...overrides,
  };
}

function fact(allergenId: string, riskLevel: DishRiskFact['riskLevel'], confidence = 0.7): DishRiskFact {
  return {
    dishId: 'dish_x',
    allergenId,
    riskLevel,
    confidence,
    reason: { en: `${allergenId} reason`, vi: `${allergenId} lý do` },
    recommendedAction: { en: `${allergenId} action`, vi: `${allergenId} hành động` },
    evidenceType: 'manual_seed',
    source: 'manual_seed',
    lastCheckedAt: '2026-07-08',
  };
}

function dish(risks: DishRiskFact[], extra: Partial<DishEvaluationInput> = {}): DishEvaluationInput {
  return { dishId: 'dish_x', name: { en: 'Dish', vi: 'Món' }, risks, pickyEaterFlags: [], ...extra };
}

function allergy(allergenId: string, severity: Severity, cross: boolean | 'not_sure' = false) {
  return { allergenId, severity, crossContactSensitive: cross };
}

describe('risk engine — allergy mapping (§8.2/§8.5)', () => {
  it('peanut possible + severe => risky', () => {
    const card = evaluateDish(profile({ allergies: [allergy('peanut', 'severe')] }), dish([fact('peanut', 'possible')]));
    expect(card.status).toBe('risky');
  });

  it('peanut unlikely + severe => ask_first', () => {
    const card = evaluateDish(profile({ allergies: [allergy('peanut', 'severe')] }), dish([fact('peanut', 'unlikely')]));
    expect(card.status).toBe('ask_first');
  });

  it('peanut unlikely + mild => suitable, with the caveat bound to action', () => {
    const card = evaluateDish(profile({ allergies: [allergy('peanut', 'mild')] }), dish([fact('peanut', 'unlikely')]));
    expect(card.status).toBe('suitable');
    expect(card.action).toEqual({ en: copy.en.suitableCaveat, vi: copy.vi.suitableCaveat });
  });

  it('shellfish likely_contains => avoid', () => {
    const card = evaluateDish(
      profile({ allergies: [allergy('shellfish', 'moderate')] }),
      dish([fact('shellfish', 'likely_contains')]),
    );
    expect(card.status).toBe('avoid');
  });
});

describe('risk engine — religious constraints (§8.3)', () => {
  it('muslim_halal + pork contains => avoid', () => {
    const card = evaluateDish(profile({ selectedProfileIds: ['profile_muslim_halal'] }), dish([fact('pork', 'contains')]));
    expect(card.status).toBe('avoid');
  });

  it('hindu_no_beef + beef contains => avoid', () => {
    const card = evaluateDish(profile({ selectedProfileIds: ['profile_hindu_no_beef'] }), dish([fact('beef', 'contains')]));
    expect(card.status).toBe('avoid');
  });
});

describe('risk engine — safety invariants', () => {
  it('unknown risk never returns suitable (missing fact => unknown)', () => {
    const card = evaluateDish(profile({ allergies: [allergy('peanut', 'severe')] }), dish([]));
    expect(card.status).toBe('unknown');
    expect(card.matchedAllergens).toContain('peanut');
  });

  it('unknown risk outranks a suitable evaluation', () => {
    const p = profile({ allergies: [allergy('peanut', 'mild'), allergy('soy', 'severe')] });
    const card = evaluateDish(p, dish([fact('peanut', 'unlikely')])); // no soy fact => unknown
    expect(card.status).toBe('unknown');
  });

  it('multiple profiles return the highest-ranked status', () => {
    const p = profile({ selectedProfileIds: ['profile_muslim_halal'], allergies: [allergy('peanut', 'mild')] });
    const card = evaluateDish(p, dish([fact('peanut', 'unlikely'), fact('pork', 'contains')]));
    expect(card.status).toBe('avoid'); // allergy suitable vs halal avoid => avoid
  });
});
