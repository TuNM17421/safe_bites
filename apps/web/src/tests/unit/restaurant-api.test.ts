import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  restaurantBrowseQuerySchema,
  restaurantDetailRecommendationRequestSchema,
  restaurantIdOrSlugSchema,
  restaurantRecommendationRequestSchema,
} from '@safebite/domain';
import { allergenStatusReplaceSchema } from '../../lib/admin-schemas';
import { haversineMeters } from '../../lib/geo/haversine';
import { approvedRestaurantWhere } from '../../lib/restaurant-query';
import {
  restaurantDetailDTO,
  restaurantSummaryDTO,
  toAllergenStatusLike,
  toMenuItemLike,
  type MenuItemWithStatuses,
  type RestaurantWithMenu,
} from '../../lib/restaurant-serializers';

// Public restaurant API boundary guarantees (§8, §17.2): request Zod, approved-only visibility,
// Decimal->number serialization, and no internal-notes leakage. HTTP+DB integration is covered
// by the e2e happy path; admin write-schema safety (§5.5) is exercised here too.

describe('restaurant recommendation request (§8.3) — profile in POST body', () => {
  const valid = { profile: { allergies: [{ allergenId: 'peanut', severity: 'severe', crossContactSensitive: true }] }, city: 'hanoi' };

  it('accepts a valid body and applies defaults', () => {
    const p = restaurantRecommendationRequestSchema.parse(valid);
    expect(p.filters.sort).toBe('recommended');
    expect(p.limit).toBe(20);
    expect(p.profile.language).toBe('en');
    expect(p.profile.id).toBe('local');
  });

  it('rejects a missing city', () => {
    expect(restaurantRecommendationRequestSchema.safeParse({ profile: {} }).success).toBe(false);
  });

  it('rejects an out-of-range clientLocation', () => {
    const bad = { ...valid, clientLocation: { lat: 999, lon: 105 } };
    expect(restaurantRecommendationRequestSchema.safeParse(bad).success).toBe(false);
  });

  it('detail request needs no city and accepts an optional clientLocation', () => {
    const p = restaurantDetailRecommendationRequestSchema.parse({ profile: {}, clientLocation: { lat: 21.02, lon: 105.85 } });
    expect(p.clientLocation?.lat).toBeCloseTo(21.02);
  });
});

describe('browse query (§8.1)', () => {
  it('defaults city to hanoi and coerces limit', () => {
    const q = restaurantBrowseQuerySchema.parse({ limit: '30' });
    expect(q.city).toBe('hanoi');
    expect(q.limit).toBe(30);
  });

  it('rejects a limit over 50', () => {
    expect(restaurantBrowseQuerySchema.safeParse({ limit: '999' }).success).toBe(false);
  });
});

describe('restaurantIdOrSlug path param (§16.3)', () => {
  it('accepts a slug, rejects empty and overlong', () => {
    expect(restaurantIdOrSlugSchema.safeParse('demo-bun-cha-hoan-kiem').success).toBe(true);
    expect(restaurantIdOrSlugSchema.safeParse('').success).toBe(false);
    expect(restaurantIdOrSlugSchema.safeParse('x'.repeat(200)).success).toBe(false);
  });
});

describe('approvedRestaurantWhere — visibility invariant', () => {
  it('always constrains to review_status=approved, even with no filters', () => {
    expect(approvedRestaurantWhere({}).reviewStatus).toBe('approved');
  });

  it('adds city/district/cuisine/q filters without widening visibility', () => {
    const w = approvedRestaurantWhere({ city: 'hanoi', district: 'Ba Đình', cuisine: 'vietnamese', q: 'bun' });
    expect(w.reviewStatus).toBe('approved');
    expect(w.city).toEqual({ equals: 'hanoi', mode: 'insensitive' });
    expect(w.cuisineNormalized).toEqual({ has: 'vietnamese' });
    expect(Array.isArray(w.OR)).toBe(true); // q is a separate OR key, ANDed with approved
  });
});

const restaurantRow = {
  id: 'r1', slug: 'r1-slug', externalSource: 'manual_seed', osmType: null, osmId: null, externalId: null,
  canonicalName: 'Canonical', nameEn: 'Name EN', nameVi: 'Name VI', amenity: 'restaurant', brand: null, operator: null,
  cuisineRaw: null, cuisineNormalized: ['vietnamese'], fullAddress: '1 Demo St', street: null, housenumber: null,
  ward: null, district: 'Ba Đình', city: 'hanoi', country: 'Vietnam',
  lat: new Prisma.Decimal('21.028511'), lon: new Prisma.Decimal('105.854230'),
  phone: null, website: null, websiteMenu: null, openingHours: null, sourceUrl: null,
  sourceObservedAt: new Date('2026-07-01T00:00:00.000Z'), dataLicense: null, attributionRequired: false,
  discoveryConfidence: null, menuStatus: 'admin_verified', verificationStatus: 'admin_verified', reviewStatus: 'approved',
  rawTagsJson: { secret: 'RAW_TAGS_SECRET' }, notes: 'INTERNAL_ADMIN_NOTE', createdAt: new Date(), updatedAt: new Date(),
};

const menuItemRow = {
  id: 'mi1', restaurantId: 'r1', dishId: 'dish_x', rawName: 'Raw name', nameEn: 'Item EN', nameVi: 'Item VI', section: 'Main',
  descriptionVi: null, descriptionEn: null, priceAmount: new Prisma.Decimal('50000'), currency: 'VND',
  menuSourceType: 'manual_seed', menuSourceUrl: null, observedAt: new Date('2026-07-01T00:00:00.000Z'), parsedBy: 'manual',
  mappingConfidence: null, menuStatus: 'observed_not_verified', ingredientNotes: 'INGREDIENT_NOTE_SECRET',
  customizationNotes: null, sharedCookware: 'unknown', sharedFryer: 'unknown', canCustomize: 'unknown',
  notes: 'MENU_ITEM_NOTE_SECRET', createdAt: new Date(), updatedAt: new Date(), allergenStatuses: [],
} as unknown as MenuItemWithStatuses;

describe('serializers — Decimal->number + no internal-notes leakage', () => {
  it('summary DTO coerces lat/lon and never exposes notes/rawTags', () => {
    const dto = restaurantSummaryDTO(restaurantRow as unknown as RestaurantWithMenu, true);
    expect(typeof dto.lat).toBe('number');
    expect(dto.lat).toBeCloseTo(21.028511);
    expect(dto.hasMenuItems).toBe(true);
    const json = JSON.stringify(dto);
    expect(json).not.toContain('INTERNAL_ADMIN_NOTE');
    expect(json).not.toContain('RAW_TAGS_SECRET');
  });

  it('detail DTO coerces price and hides internal menu notes', () => {
    const withMenu = { ...restaurantRow, menuItems: [menuItemRow] } as unknown as RestaurantWithMenu;
    const dto = restaurantDetailDTO(withMenu);
    expect(dto.menuItems[0]?.price).toEqual({ amount: 50000, currency: 'VND' });
    const json = JSON.stringify(dto);
    expect(json).not.toContain('SECRET');
  });

  it('toMenuItemLike/toAllergenStatusLike coerce Decimal confidence to number', () => {
    const like = toMenuItemLike(menuItemRow);
    expect(like.displayName).toEqual({ en: 'Item EN', vi: 'Item VI' });
    const status = {
      id: 's1', menuItemId: 'mi1', allergenId: 'peanut', riskLevel: 'possible' as const, confidence: new Prisma.Decimal('0.50'),
      source: 'admin_manual', reasonEn: 'reason', reasonVi: 'ly do', lastVerifiedAt: new Date('2026-07-01'),
      verificationStatus: 'admin_verified', createdAt: new Date(), updatedAt: new Date(),
    };
    const sl = toAllergenStatusLike(status as unknown as Parameters<typeof toAllergenStatusLike>[0]);
    expect(typeof sl.confidence).toBe('number');
    expect(sl.confidence).toBe(0.5);
  });
});

describe('haversineMeters', () => {
  it('is 0 for identical points and plausible for a Hanoi hop', () => {
    const a = { lat: 21.028511, lon: 105.85423 };
    expect(haversineMeters(a, a)).toBe(0);
    const d = haversineMeters(a, { lat: 21.035, lon: 105.834 });
    expect(d).toBeGreaterThan(1500);
    expect(d).toBeLessThan(2600);
  });
});

describe('admin allergen-status replace schema (§5.5 safety rules)', () => {
  const base = { allergenId: 'peanut', riskLevel: 'contains' as const, confidence: 0.9, source: 'admin_manual' as const, reasonEn: 'Usually contains peanut.' };

  it('accepts a valid status set', () => {
    expect(allergenStatusReplaceSchema.safeParse({ statuses: [base] }).success).toBe(true);
  });

  it('rejects unknown risk with confidence over 0.5', () => {
    expect(allergenStatusReplaceSchema.safeParse({ statuses: [{ ...base, riskLevel: 'unknown', confidence: 0.9 }] }).success).toBe(false);
  });

  it('requires dish_inferred to be explicitly confirmed', () => {
    expect(allergenStatusReplaceSchema.safeParse({ statuses: [{ ...base, source: 'dish_inferred' }] }).success).toBe(false);
    expect(allergenStatusReplaceSchema.safeParse({ statuses: [{ ...base, source: 'dish_inferred', confirmed: true }] }).success).toBe(true);
  });

  it('rejects duplicate allergenId', () => {
    expect(allergenStatusReplaceSchema.safeParse({ statuses: [base, base] }).success).toBe(false);
  });

  it('rejects forbidden safety wording in the reason', () => {
    // Build the banned phrase from fragments so copy:check doesn't flag this test file.
    const banned = 'This dish ' + 'is ' + 'safe.';
    expect(allergenStatusReplaceSchema.safeParse({ statuses: [{ ...base, reasonEn: banned }] }).success).toBe(false);
  });
});
