import { describe, expect, it } from 'vitest';
import { compatibilityPercent, summarizeIngredientProvenance } from '../src/restaurant-compatibility';
import type { RestaurantRecommendationCounts } from '../src/restaurant-types';

const counts = (p: Partial<RestaurantRecommendationCounts>): RestaurantRecommendationCounts => ({
  suitable: 0,
  askFirst: 0,
  risky: 0,
  avoid: 0,
  unknown: 0,
  total: 0,
  ...p,
});

describe('compatibilityPercent', () => {
  it('returns null when nothing is rated', () => {
    expect(compatibilityPercent(counts({}))).toBeNull();
    expect(compatibilityPercent(counts({ unknown: 5, total: 5 }))).toBeNull();
  });

  it('is 100 when every rated item is suitable', () => {
    expect(compatibilityPercent(counts({ suitable: 4, total: 4 }))).toBe(100);
  });

  it('is 0 when every rated item is risky/avoid', () => {
    expect(compatibilityPercent(counts({ avoid: 2, risky: 1, total: 3 }))).toBe(0);
  });

  it('weights ask-first at half and excludes unknown from the denominator', () => {
    // (2*1 + 2*0.5) / 4 rated = 75%; the 3 unknowns do not count.
    expect(compatibilityPercent(counts({ suitable: 2, askFirst: 2, unknown: 3, total: 7 }))).toBe(75);
  });
});

describe('summarizeIngredientProvenance', () => {
  it('rolls contributor types into a summary and ignores unknown types', () => {
    const s = summarizeIngredientProvenance([
      { contributorType: 'restaurant' },
      { contributorType: 'user' },
      { contributorType: 'user' },
      { contributorType: 'admin' },
      { contributorType: 'ocr' },
      { contributorType: 'mystery' },
    ]);
    expect(s).toEqual({ selfDeclared: true, userContributionCount: 2, adminCount: 1, ocrCount: 1 });
  });

  it('defaults to no provenance for an empty list', () => {
    expect(summarizeIngredientProvenance([])).toEqual({
      selfDeclared: false,
      userContributionCount: 0,
      adminCount: 0,
      ocrCount: 0,
    });
  });
});
