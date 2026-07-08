import { describe, expect, it } from 'vitest';
import { copy, evaluateMenuItem } from '../src/index';
import type {
  DishRecommendationLike,
  EvaluateMenuItemInput,
  LocalUserProfile,
  MenuItemAllergenStatusLike,
  RiskLevel,
  Severity,
} from '../src/index';

const NOW = new Date('2026-07-08T00:00:00.000Z');

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

function allergy(allergenId: string, severity: Severity, cross: boolean | 'not_sure' = false) {
  return { allergenId, severity, crossContactSensitive: cross };
}

function status(
  allergenId: string,
  riskLevel: RiskLevel,
  overrides: Partial<MenuItemAllergenStatusLike> = {},
): MenuItemAllergenStatusLike {
  return {
    allergenId,
    riskLevel,
    confidence: 0.9,
    source: 'admin_manual',
    reason: { en: `${allergenId} reason`, vi: `${allergenId} lý do` },
    lastVerifiedAt: '2026-07-08',
    verificationStatus: 'admin_verified',
    ...overrides,
  };
}

function input(overrides: Partial<EvaluateMenuItemInput> = {}): EvaluateMenuItemInput {
  return {
    menuItem: {
      menuItemId: 'mi_1',
      restaurantId: 'rest_1',
      dishId: null,
      displayName: { en: 'Item', vi: 'Món' },
      observedAt: '2026-07-08',
    },
    explicitAllergenStatuses: [],
    matchedDishRecommendation: null,
    profile: profile(),
    restaurantVerificationStatus: 'admin_verified',
    menuStatus: 'admin_verified',
    now: NOW,
    ...overrides,
  };
}

describe('evaluateMenuItem — classification (§7.4)', () => {
  it('contains => Avoid', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'mild')] }),
        explicitAllergenStatuses: [status('peanut', 'contains')],
      }),
    );
    expect(r.status).toBe('avoid');
  });

  it('likely_contains => Avoid', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'mild')] }),
        explicitAllergenStatuses: [status('peanut', 'likely_contains')],
      }),
    );
    expect(r.status).toBe('avoid');
  });

  it('possible + anaphylaxis => Risky', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'anaphylaxis_risk', true)] }),
        explicitAllergenStatuses: [status('peanut', 'possible')],
      }),
    );
    expect(r.status).toBe('risky');
  });

  it('possible + mild, not cross-contact sensitive => Ask First', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'mild', false)] }),
        explicitAllergenStatuses: [status('peanut', 'possible')],
      }),
    );
    expect(r.status).toBe('ask_first');
  });

  it('unknown risk => Unknown', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'mild')] }),
        explicitAllergenStatuses: [status('peanut', 'unknown')],
      }),
    );
    expect(r.status).toBe('unknown');
  });

  it('never returns Suitable for unknown risk (uncovered allergen, no dish mapping)', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'mild')] }),
        explicitAllergenStatuses: [],
        matchedDishRecommendation: null,
      }),
    );
    expect(r.status).toBe('unknown');
  });

  it('an uncovered allergen keeps a suitable one from winning', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'mild'), allergy('soy', 'mild')] }),
        // peanut explicitly low-risk & verified, soy has no evidence at all
        explicitAllergenStatuses: [status('peanut', 'unlikely')],
      }),
    );
    expect(r.status).toBe('unknown');
  });

  it('Suitable only when evidence is verified enough; unverified low-risk => Ask First', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'mild')] }),
        explicitAllergenStatuses: [
          status('peanut', 'unlikely', { verificationStatus: 'observed_not_verified' }),
        ],
        menuStatus: 'observed_not_verified',
      }),
    );
    expect(r.status).toBe('ask_first');
  });

  it('verified low-risk => Suitable with the confirm-with-staff caveat', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'mild')] }),
        explicitAllergenStatuses: [status('peanut', 'unlikely', { verificationStatus: 'admin_verified' })],
      }),
    );
    expect(r.status).toBe('suitable');
    expect(r.action).toEqual({ en: copy.en.suitableCaveat, vi: copy.vi.suitableCaveat });
  });
});

describe('evaluateMenuItem — evidence priority (§7.3)', () => {
  const dishRec: DishRecommendationLike = {
    dishId: 'dish_1',
    status: 'suitable',
    riskLevel: 'unlikely',
    confidence: 'medium',
    reason: { en: 'dish reason', vi: 'dish lý do' },
    action: { en: 'dish action', vi: 'dish hành động' },
    source: 'manual_seed',
    lastCheckedAt: '2026-07-08',
    matchedDishName: { en: 'Chicken rice', vi: 'Cơm gà' },
  };

  it('explicit menu-item status overrides mapped dish risk', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'mild')] }),
        explicitAllergenStatuses: [status('peanut', 'contains')], // avoid
        matchedDishRecommendation: dishRec, // would be suitable
      }),
    );
    expect(r.status).toBe('avoid');
  });

  it('mapped dish inference is used when no explicit status exists', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'anaphylaxis_risk', true)] }),
        explicitAllergenStatuses: [],
        matchedDishRecommendation: dishRec,
        menuStatus: 'observed_not_verified',
      }),
    );
    // dish-inferred + unverified can never be Suitable -> Ask First
    expect(r.status).toBe('ask_first');
    expect(r.source).toBe('dish_inferred');
    expect(r.matchedDishName).toEqual({ en: 'Chicken rice', vi: 'Cơm gà' });
  });

  it('OSM/OpenMap discovery-only evidence never verifies suitability (no facts => Unknown)', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'anaphylaxis_risk', true)] }),
        explicitAllergenStatuses: [],
        matchedDishRecommendation: null,
        restaurantVerificationStatus: 'unverified',
        menuStatus: 'not_observed',
      }),
    );
    expect(r.status).toBe('unknown');
    expect(r.confidence).toBe('low');
  });
});

describe('evaluateMenuItem — staleness (§7.7)', () => {
  it('stale explicit evidence downgrades confidence', () => {
    const r = evaluateMenuItem(
      input({
        profile: profile({ allergies: [allergy('peanut', 'mild')] }),
        // admin_manual threshold = 45 days; verified 100 days ago
        explicitAllergenStatuses: [
          status('peanut', 'contains', { lastVerifiedAt: '2026-03-01', confidence: 0.9 }),
        ],
        now: NOW,
      }),
    );
    expect(r.stale).toBe(true);
    expect(r.confidence).toBe('medium'); // high -> medium
  });
});
