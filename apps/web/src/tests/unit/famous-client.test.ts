import { describe, expect, it } from 'vitest';
import { famousResponseSchema } from '../../features/dishes/famous-client';

const validDish = {
  id: 'dish_pho_bo',
  name: { en: 'Beef phở', vi: 'Phở bò' },
  description: { en: 'Rice noodles, beef, bone broth', vi: 'Bánh phở, thịt bò, nước dùng xương' },
  commonIngredients: { en: 'Rice noodles, beef, fish sauce', vi: 'Bánh phở, thịt bò, nước mắm' },
  isFamous: true,
  featuredRank: 1,
  restaurantCount: 5,
  allergenRisks: [
    {
      allergenId: 'fish',
      riskLevel: 'possible',
      confidence: 0.6,
      reason: { en: 'Broth may use fish sauce', vi: 'Nước dùng có thể dùng nước mắm' },
      action: { en: 'Ask staff', vi: 'Hỏi nhân viên' },
      evidenceType: 'canonical_recipe',
      source: 'manual_seed',
      reviewStatus: 'approved',
      lastCheckedAt: '2026-07-10T00:00:00.000Z',
    },
  ],
};

describe('famousResponseSchema', () => {
  it('parses a valid response and strips unknown DTO fields', () => {
    const parsed = famousResponseSchema.parse({
      dishes: [{ ...validDish, cuisine: 'vietnamese', regionTags: ['hanoi'] }],
    });
    expect(parsed.dishes).toHaveLength(1);
    expect(parsed.dishes[0]).not.toHaveProperty('cuisine');
    expect(parsed.dishes[0]?.restaurantCount).toBe(5);
  });

  it('accepts null description/featuredRank and an empty risk list', () => {
    const parsed = famousResponseSchema.parse({
      dishes: [{ ...validDish, description: { en: null, vi: null }, featuredRank: null, allergenRisks: [] }],
    });
    expect(parsed.dishes[0]?.featuredRank).toBeNull();
  });

  it('rejects a response missing restaurantCount', () => {
    const { restaurantCount, ...noCount } = validDish;
    expect(restaurantCount).toBe(5);
    expect(() => famousResponseSchema.parse({ dishes: [noCount] })).toThrow();
  });
});
