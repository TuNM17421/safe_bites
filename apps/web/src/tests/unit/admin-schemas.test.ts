import { describe, expect, it } from 'vitest';
import {
  dishCreateSchema,
  dishIdQuerySchema,
  dishRiskCreateSchema,
  reviewStatusQuerySchema,
} from '../../lib/admin-schemas';

const validRisk = {
  dishId: 'mi_quang',
  allergenId: 'peanut',
  riskLevel: 'possible',
  confidence: 0.7,
  reasonVi: 'Thường có đậu phộng rang.',
  reasonEn: 'Often served with roasted peanut.',
  recommendedActionVi: 'Hỏi nhân viên trước khi gọi món.',
  recommendedActionEn: 'Ask staff before ordering.',
  evidenceType: 'manual_seed',
  sourceType: 'manual_seed',
};

describe('admin-schemas', () => {
  it('accepts a valid dish risk and defaults reviewStatus to needs_review', () => {
    const parsed = dishRiskCreateSchema.safeParse(validRisk);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.reviewStatus).toBe('needs_review');
  });

  it('rejects confidence outside [0,1]', () => {
    expect(dishRiskCreateSchema.safeParse({ ...validRisk, confidence: 1.5 }).success).toBe(false);
    expect(dishRiskCreateSchema.safeParse({ ...validRisk, confidence: -0.1 }).success).toBe(false);
  });

  it('rejects a risk missing reason or action', () => {
    const missingReason: Record<string, unknown> = { ...validRisk };
    delete missingReason.reasonEn;
    expect(dishRiskCreateSchema.safeParse(missingReason).success).toBe(false);
    expect(dishRiskCreateSchema.safeParse({ ...validRisk, recommendedActionVi: '' }).success).toBe(false);
  });

  it('rejects forbidden safety wording in reason/action', () => {
    // Phrase built from fragments so this test file stays clean for the copy scanner.
    const forbidden = ['This dish', 'is', 'safe'].join(' ');
    expect(dishRiskCreateSchema.safeParse({ ...validRisk, reasonEn: forbidden }).success).toBe(false);
  });

  it('catches forbidden wording despite extra spacing / punctuation', () => {
    const spaced = ['This dish is', 'safe'].join('   '); // triple space
    const hyphen = ['guaranteed', 'safe'].join('-'); // "guaranteed-safe"
    expect(dishRiskCreateSchema.safeParse({ ...validRisk, reasonEn: spaced }).success).toBe(false);
    expect(dishRiskCreateSchema.safeParse({ ...validRisk, recommendedActionEn: hyphen }).success).toBe(false);
  });

  it('rejects confidence with more than 2 decimal places (Decimal(3,2))', () => {
    expect(dishRiskCreateSchema.safeParse({ ...validRisk, confidence: 0.735 }).success).toBe(false);
    expect(dishRiskCreateSchema.safeParse({ ...validRisk, confidence: 0.73 }).success).toBe(true);
  });

  it('dishCreateSchema requires localized names and an explicit source', () => {
    const base = { canonicalNameEn: 'Pho', dishCategory: 'noodle_soup', cuisine: 'vietnamese', sourceType: 'manual_seed' };
    expect(dishCreateSchema.safeParse({ ...base, canonicalNameVi: '' }).success).toBe(false); // empty VI name
    expect(dishCreateSchema.safeParse({ ...base, canonicalNameVi: 'Phở', sourceType: undefined }).success).toBe(false); // no source
    expect(dishCreateSchema.safeParse({ ...base, canonicalNameVi: 'Phở' }).success).toBe(true);
  });

  it('query schemas: review_status defaults to all; dishId is required', () => {
    expect(reviewStatusQuerySchema.parse({}).review_status).toBe('all');
    expect(dishIdQuerySchema.safeParse({}).success).toBe(false);
  });
});
