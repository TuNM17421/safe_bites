import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { dishRiskFactSchema, questionCardRequestSchema, recommendationRequestSchema } from '@safebite/domain';
import { mapRisksToFacts } from '../../lib/serializers';

// Public-boundary Zod + serializer guarantees (§9). Admin write-schema validation
// (review_status vocab, dish-risk needs reason/action, forbidden-copy refinement) is owned by
// admin-schemas.test.ts (phase-12) — not duplicated here.

describe('recommendationRequestSchema (§9.5)', () => {
  const validBody = {
    city: 'hanoi',
    profile: { allergies: [{ allergenId: 'peanut', severity: 'severe', crossContactSensitive: true }] },
  };

  it('accepts a valid body and applies defaults (language, profile ids)', () => {
    const parsed = recommendationRequestSchema.parse(validBody);
    expect(parsed.city).toBe('hanoi');
    expect(parsed.language).toBe('en');
    expect(parsed.profile.id).toBe('local');
    expect(parsed.profile.selectedProfileIds).toEqual([]);
  });

  it('rejects a missing city', () => {
    expect(recommendationRequestSchema.safeParse({ profile: {} }).success).toBe(false);
  });

  it('rejects a malformed profile (allergies not an array)', () => {
    const bad = { city: 'hanoi', profile: { allergies: 'peanut' } };
    expect(recommendationRequestSchema.safeParse(bad).success).toBe(false);
  });
});

describe('questionCardRequestSchema (§9.6)', () => {
  it('accepts a valid body', () => {
    const parsed = questionCardRequestSchema.parse({ profile: {}, targetLanguage: 'vi' });
    expect(parsed.targetLanguage).toBe('vi');
    expect(parsed.profile.language).toBe('en');
  });

  it('rejects a missing targetLanguage and a bad language code', () => {
    expect(questionCardRequestSchema.safeParse({ profile: {} }).success).toBe(false);
    expect(questionCardRequestSchema.safeParse({ profile: {}, targetLanguage: 'fr' }).success).toBe(false);
  });
});

describe('Decimal -> number serialization (note #5)', () => {
  it('mapRisksToFacts coerces Prisma Decimal confidence to a plain number', () => {
    const row = {
      allergenId: 'peanut',
      riskLevel: 'contains',
      confidence: new Prisma.Decimal('0.70'),
      reasonEn: 'Contains peanut.',
      reasonVi: 'Có đậu phộng.',
      recommendedActionEn: 'Ask staff.',
      recommendedActionVi: 'Hỏi nhân viên.',
      evidenceType: 'manual_seed',
      sourceType: 'manual_seed',
      lastCheckedAt: new Date('2026-07-08T00:00:00.000Z'),
    };

    const [fact] = mapRisksToFacts('dish_pho_bo', [row] as unknown as Parameters<typeof mapRisksToFacts>[1]);
    expect(typeof fact?.confidence).toBe('number');
    expect(fact?.confidence).toBe(0.7);
    // The serialized fact must satisfy the domain schema, which rejects a raw Decimal.
    expect(dishRiskFactSchema.safeParse(fact).success).toBe(true);
  });
});
