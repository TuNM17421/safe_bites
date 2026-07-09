import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_UNDER_REVIEW_SOURCE,
  applyFeedbackSignalsToMenuItem,
  applyFeedbackSignalsToRestaurantReadiness,
} from '../src/index';
import type {
  FeedbackSignal,
  MenuItemRecommendation,
  RestaurantReadinessClass,
  RestaurantRecommendation,
} from '../src/index';

const NOW = new Date('2026-07-09T00:00:00.000Z');

function signal(over: Partial<FeedbackSignal> = {}): FeedbackSignal {
  return {
    id: 'flag_1',
    entityType: 'menu_item',
    entityId: 'mi_1',
    restaurantId: 'rest_1',
    menuItemId: 'mi_1',
    dishId: null,
    allergenId: 'peanut',
    effect: 'suppress_suitable',
    priority: 'urgent',
    status: 'active',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...over,
  };
}

function menuRec(over: Partial<MenuItemRecommendation> = {}): MenuItemRecommendation {
  return {
    menuItemId: 'mi_1',
    restaurantId: 'rest_1',
    dishId: null,
    displayName: { en: 'Item', vi: 'Món' },
    status: 'suitable',
    riskLevel: 'unlikely',
    confidence: 'high',
    confidenceScore: 0.85,
    source: 'admin_manual',
    reason: { en: 'r', vi: 'r' },
    action: { en: 'a', vi: 'a' },
    lastCheckedAt: '2026-07-01',
    stale: false,
    matchedDishName: null,
    ...over,
  };
}

function restRec(over: Partial<RestaurantRecommendation> = {}): RestaurantRecommendation {
  return {
    restaurantId: 'rest_1',
    readinessClass: 'A',
    confidence: 'high',
    counts: { suitable: 1, askFirst: 0, risky: 0, avoid: 0, unknown: 0, total: 1 },
    summary: { en: 's', vi: 's' },
    reasons: [],
    source: 'admin_manual',
    verificationStatus: 'admin_verified',
    menuStatus: 'admin_verified',
    lastCheckedAt: '2026-07-01',
    stale: false,
    ...over,
  };
}

describe('applyFeedbackSignalsToMenuItem (§11.4/§11.5)', () => {
  it('suppresses Suitable to Risky for a severe profile allergen', () => {
    const out = applyFeedbackSignalsToMenuItem({
      recommendation: menuRec({ status: 'suitable' }),
      signals: [signal({ priority: 'urgent' })],
      profileAllergenIds: ['peanut'],
      severityByAllergen: { peanut: 'anaphylaxis_risk' },
      now: NOW,
    });
    expect(out.status).toBe('risky');
    expect(out.source).toBe(FEEDBACK_UNDER_REVIEW_SOURCE);
    expect(out.confidence).toBe('medium'); // high -> one level down
    expect(out.reason.en).toContain('under review');
  });

  it('suppresses Suitable only to Ask First for a mild/moderate profile', () => {
    const out = applyFeedbackSignalsToMenuItem({
      recommendation: menuRec({ status: 'suitable' }),
      signals: [signal({ priority: 'normal' })],
      profileAllergenIds: ['peanut'],
      severityByAllergen: { peanut: 'mild' },
      now: NOW,
    });
    expect(out.status).toBe('ask_first');
  });

  it('never upgrades toward Suitable (avoid stays avoid)', () => {
    const out = applyFeedbackSignalsToMenuItem({
      recommendation: menuRec({ status: 'avoid', riskLevel: 'contains' }),
      signals: [signal()],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(out.status).toBe('avoid');
  });

  it('keeps the hazard reason/action on an already-cautious item (finding #1)', () => {
    const hazard = { en: 'This dish contains peanut.', vi: 'Món này chứa đậu phộng.' };
    const out = applyFeedbackSignalsToMenuItem({
      recommendation: menuRec({ status: 'avoid', riskLevel: 'contains', reason: hazard, action: hazard }),
      signals: [signal()],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(out.status).toBe('avoid');
    expect(out.reason).toEqual(hazard); // not overwritten by the softer under-review copy
    expect(out.action).toEqual(hazard);
    expect(out.source).toBe(FEEDBACK_UNDER_REVIEW_SOURCE); // under-review still surfaced via source
  });

  it('keeps confidenceScore consistent with the downgraded label (finding #2)', () => {
    const out = applyFeedbackSignalsToMenuItem({
      recommendation: menuRec({ status: 'suitable', confidence: 'high', confidenceScore: 0.85 }),
      signals: [signal({ priority: 'urgent' })],
      profileAllergenIds: ['peanut'],
      severityByAllergen: { peanut: 'severe' },
      now: NOW,
    });
    expect(out.confidence).toBe('medium');
    expect(out.confidenceScore).toBeLessThan(0.8); // must not read "high" numerically
  });

  it('flips Suitable to Risky for a severe profile even when the flag is unscoped (finding #3)', () => {
    const out = applyFeedbackSignalsToMenuItem({
      recommendation: menuRec({ status: 'suitable' }),
      signals: [signal({ allergenId: null, priority: 'normal' })],
      profileAllergenIds: ['peanut'],
      severityByAllergen: { peanut: 'anaphylaxis_risk' },
      now: NOW,
    });
    expect(out.status).toBe('risky');
  });

  it('downgrade_confidence keeps status but lowers confidence', () => {
    const out = applyFeedbackSignalsToMenuItem({
      recommendation: menuRec({ status: 'ask_first', confidence: 'high' }),
      signals: [signal({ effect: 'downgrade_confidence', priority: 'normal' })],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(out.status).toBe('ask_first');
    expect(out.confidence).toBe('medium');
  });

  it('ignores resolved/expired flags (weight 0)', () => {
    const out = applyFeedbackSignalsToMenuItem({
      recommendation: menuRec({ status: 'suitable' }),
      signals: [signal({ status: 'resolved' }), signal({ status: 'expired', id: 'flag_2' })],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(out.status).toBe('suitable');
    expect(out.source).toBe('admin_manual');
  });

  it('ignores flags scoped to an allergen not in the profile', () => {
    const out = applyFeedbackSignalsToMenuItem({
      recommendation: menuRec({ status: 'suitable' }),
      signals: [signal({ allergenId: 'shellfish' })],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(out.status).toBe('suitable');
  });

  it('does not mutate the input recommendation', () => {
    const base = menuRec({ status: 'suitable' });
    applyFeedbackSignalsToMenuItem({
      recommendation: base,
      signals: [signal()],
      profileAllergenIds: ['peanut'],
      severityByAllergen: { peanut: 'severe' },
      now: NOW,
    });
    expect(base.status).toBe('suitable');
    expect(base.source).toBe('admin_manual');
  });
});

describe('applyFeedbackSignalsToRestaurantReadiness (§11.3)', () => {
  const restaurantCap = (over: Partial<FeedbackSignal> = {}) =>
    signal({
      entityType: 'restaurant',
      entityId: 'rest_1',
      menuItemId: null,
      effect: 'cap_restaurant_readiness',
      readinessCap: 'D',
      priority: 'urgent',
      ...over,
    });

  it.each(['A', 'B', 'C'] as RestaurantReadinessClass[])('caps %s to D', (cls) => {
    const out = applyFeedbackSignalsToRestaurantReadiness({
      recommendation: restRec({ readinessClass: cls }),
      signals: [restaurantCap()],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(out.readinessClass).toBe('D');
    expect(out.confidence).toBe('medium');
    expect(out.reasons.at(-1)?.en).toContain('under review');
  });

  it('keeps E as E (never raises readiness)', () => {
    const out = applyFeedbackSignalsToRestaurantReadiness({
      recommendation: restRec({ readinessClass: 'E', confidence: 'low' }),
      signals: [restaurantCap()],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(out.readinessClass).toBe('E');
  });

  it('returns the recommendation unchanged when no signal matches', () => {
    const base = restRec({ readinessClass: 'A' });
    const out = applyFeedbackSignalsToRestaurantReadiness({
      recommendation: base,
      signals: [restaurantCap({ allergenId: 'shellfish' })],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(out.readinessClass).toBe('A');
    expect(out.reasons).toHaveLength(0);
  });

  it('downgrades confidence for a restaurant-level downgrade_confidence flag without capping class', () => {
    const out = applyFeedbackSignalsToRestaurantReadiness({
      recommendation: restRec({ readinessClass: 'B', confidence: 'high' }),
      signals: [restaurantCap({ effect: 'downgrade_confidence', readinessCap: null, priority: 'normal' })],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(out.readinessClass).toBe('B'); // no cap applied
    expect(out.confidence).toBe('medium');
    expect(out.reasons.at(-1)?.en).toContain('under review');
  });
});
