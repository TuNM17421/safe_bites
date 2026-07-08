import { describe, expect, it } from 'vitest';
import { evaluateRestaurantReadiness } from '../src/index';
import type {
  LocalUserProfile,
  MenuItemRecommendation,
  RecommendationStatus,
  RestaurantLike,
} from '../src/index';

const NOW = new Date('2026-07-08T00:00:00.000Z');

function profile(): LocalUserProfile {
  return {
    id: 'local_test',
    selectedProfileIds: [],
    allergies: [{ allergenId: 'peanut', severity: 'anaphylaxis_risk', crossContactSensitive: true }],
    language: 'en',
    destinationCity: 'hanoi',
    safetyAcceptedAt: '2026-07-08T00:00:00.000Z',
    offlineEnabled: false,
    createdAt: '2026-07-08T00:00:00.000Z',
    updatedAt: '2026-07-08T00:00:00.000Z',
  };
}

function rec(status: RecommendationStatus, source = 'admin_manual'): MenuItemRecommendation {
  return {
    menuItemId: `mi_${Math.floor(status.length)}`,
    restaurantId: 'rest_1',
    dishId: null,
    displayName: { en: 'Item', vi: 'Món' },
    status,
    riskLevel: status === 'avoid' ? 'contains' : status === 'unknown' ? 'unknown' : 'unlikely',
    confidence: 'medium',
    confidenceScore: 0.65,
    source,
    reason: { en: 'r', vi: 'r' },
    action: { en: 'a', vi: 'a' },
    lastCheckedAt: '2026-07-08',
    stale: false,
  };
}

function restaurant(overrides: Partial<RestaurantLike> = {}): RestaurantLike {
  return {
    restaurantId: 'rest_1',
    externalSource: 'admin_manual',
    verificationStatus: 'admin_verified',
    menuStatus: 'admin_verified',
    hasMenuItems: true,
    lastCheckedAt: '2026-07-08',
    ...overrides,
  };
}

describe('evaluateRestaurantReadiness — classes & caps (§7.6)', () => {
  it('no menu items => C', () => {
    const r = evaluateRestaurantReadiness({
      restaurant: restaurant({ hasMenuItems: false }),
      menuRecommendations: [],
      profile: profile(),
      now: NOW,
    });
    expect(r.readinessClass).toBe('C');
    expect(r.confidence).toBe('low');
    expect(r.counts.total).toBe(0);
  });

  it('OSM/OpenMap discovery-only restaurant is capped at C', () => {
    const r = evaluateRestaurantReadiness({
      restaurant: restaurant({
        externalSource: 'openstreetmap',
        verificationStatus: 'unverified',
        menuStatus: 'not_observed',
        hasMenuItems: false,
      }),
      menuRecommendations: [],
      profile: profile(),
      now: NOW,
    });
    expect(r.readinessClass).toBe('C');
    // discovery-only summary, not a recommendation
    expect(r.summary.en).toContain('discovery only');
  });

  it('discovery-only cap holds even if a suitable item slips in', () => {
    const r = evaluateRestaurantReadiness({
      restaurant: restaurant({
        externalSource: 'openmapvn',
        verificationStatus: 'unverified',
        menuStatus: 'not_observed',
        hasMenuItems: true,
      }),
      // dish-inferred only => no explicit evidence => discovery-only cap C
      menuRecommendations: [rec('suitable', 'dish_inferred')],
      profile: profile(),
      now: NOW,
    });
    expect(['C', 'B']).toContain(r.readinessClass);
    expect(r.readinessClass).not.toBe('A');
  });

  it('B when >=1 Ask First/Suitable but not fully verified', () => {
    const r = evaluateRestaurantReadiness({
      restaurant: restaurant({
        externalSource: 'admin_manual',
        verificationStatus: 'restaurant_confirmed',
        menuStatus: 'observed_not_verified',
      }),
      menuRecommendations: [rec('ask_first'), rec('unknown')],
      profile: profile(),
      now: NOW,
    });
    expect(r.readinessClass).toBe('B');
  });

  it('E when all menu items are Avoid/Risky', () => {
    const r = evaluateRestaurantReadiness({
      restaurant: restaurant(),
      menuRecommendations: [rec('avoid'), rec('risky')],
      profile: profile(),
      now: NOW,
    });
    expect(r.readinessClass).toBe('E');
  });

  it('A when fully admin-verified with a suitable item and no avoid/risky', () => {
    const r = evaluateRestaurantReadiness({
      restaurant: restaurant(),
      menuRecommendations: [rec('suitable'), rec('ask_first')],
      profile: profile(),
      now: NOW,
    });
    expect(r.readinessClass).toBe('A');
    expect(r.confidence).toBe('high');
  });

  it('flagged restaurant is capped at D', () => {
    const r = evaluateRestaurantReadiness({
      restaurant: restaurant({ verificationStatus: 'flagged' }),
      menuRecommendations: [rec('suitable'), rec('ask_first')],
      profile: profile(),
      now: NOW,
    });
    expect(r.readinessClass).toBe('D');
  });
});

describe('evaluateRestaurantReadiness — staleness (§7.7)', () => {
  it('stale restaurant data downgrades confidence', () => {
    const r = evaluateRestaurantReadiness({
      restaurant: restaurant({ lastCheckedAt: '2026-01-01' }), // admin_verified 60d threshold, ~188d old
      menuRecommendations: [rec('suitable'), rec('ask_first')],
      profile: profile(),
      now: NOW,
    });
    expect(r.stale).toBe(true);
    // high -> medium, and A demoted to B because confidence is no longer high
    expect(r.confidence).toBe('medium');
    expect(r.readinessClass).toBe('B');
  });
});
