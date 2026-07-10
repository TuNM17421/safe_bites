import { describe, expect, it } from 'vitest';
import { FeedbackAdminActionTypeSchema, FeedbackReportInputSchema } from '../src/feedback/schemas';

const base = {
  clientReportId: 'r1',
  restaurantId: 'rest1',
  menuItemId: 'mi1',
  city: 'hanoi',
  allergenIds: ['peanut'],
  reaction: 'not_sure' as const,
};

describe('FeedbackReportInputSchema — ingredient correction variant', () => {
  it('accepts a "contains" ingredient correction', () => {
    const p = FeedbackReportInputSchema.safeParse({
      ...base,
      correctionIngredientId: 'ing_peanut',
      correctionPresent: true,
      notes: 'uses peanut oil',
    });
    expect(p.success).toBe(true);
    if (p.success) {
      expect(p.data.correctionIngredientId).toBe('ing_peanut');
      expect(p.data.correctionPresent).toBe(true);
    }
  });

  it('accepts a "does not contain" correction with a nullable reporter', () => {
    const p = FeedbackReportInputSchema.safeParse({
      ...base,
      correctionIngredientId: 'ing_shrimp',
      correctionPresent: false,
      reporterRef: null,
    });
    expect(p.success).toBe(true);
  });

  it('still requires allergen context (reaction-path invariant preserved)', () => {
    const p = FeedbackReportInputSchema.safeParse({ ...base, allergenIds: [], correctionIngredientId: 'ing_peanut' });
    expect(p.success).toBe(false);
  });

  it('leaves the plain reaction report unchanged (correction fields absent)', () => {
    const p = FeedbackReportInputSchema.safeParse({ ...base, reaction: 'moderate' as const });
    expect(p.success).toBe(true);
    if (p.success) expect(p.data.correctionIngredientId).toBeUndefined();
  });
});

describe('FeedbackAdminActionTypeSchema', () => {
  it('includes approve_ingredient_correction', () => {
    expect(FeedbackAdminActionTypeSchema.parse('approve_ingredient_correction')).toBe('approve_ingredient_correction');
  });
});
