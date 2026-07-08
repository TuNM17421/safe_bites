import { describe, expect, it } from 'vitest';
import { buildQuestionCard, type LocalUserProfile, type QuestionCardAllergen } from '@safebite/domain';
import {
  questionCardResponseSchema,
  regenQuestionCard,
  toQuestionCardRecord,
} from '../../features/question-card/question-card-client';

const profile: LocalUserProfile = {
  id: 'local_test',
  selectedProfileIds: ['profile_peanut_allergy'],
  allergies: [{ allergenId: 'peanut', severity: 'severe', crossContactSensitive: true }],
  language: 'en',
  destinationCity: 'hanoi',
  safetyAcceptedAt: '2026-07-08T00:00:00.000Z',
  offlineEnabled: true,
  createdAt: '2026-07-08T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z',
};

const allergens: QuestionCardAllergen[] = [
  { id: 'peanut', nameVi: 'đậu phộng', nameEn: 'peanut', aliasesVi: ['đậu phộng', 'dầu đậu phộng'], aliasesEn: ['peanut', 'peanut oil'] },
];

const META = { id: 'qc_1', profileId: profile.id, createdAt: '2026-07-08T00:00:00.000Z' };

describe('question-card-client', () => {
  it('toQuestionCardRecord maps a domain card + meta into the §9.6 record shape', () => {
    const card = buildQuestionCard({ profile, allergens, targetLanguage: 'vi' });
    const record = toQuestionCardRecord(card, META);

    expect(record.id).toBe('qc_1');
    expect(record.profileId).toBe(profile.id);
    expect(record.source).toBe('template_generated');
    expect(record.targetLanguage).toBe('vi');
    expect(record.text).toBe(card.text);
    expect(record.sections).toEqual(card.sections);
    // The response fields still satisfy the §9.6 schema (client fields are additive; Zod strips them).
    expect(() => questionCardResponseSchema.parse(record)).not.toThrow();
  });

  it('carries dishId when supplied', () => {
    const card = buildQuestionCard({ profile, allergens, targetLanguage: 'vi', dishName: { en: 'Mì Quảng', vi: 'Mì Quảng' } });
    const record = toQuestionCardRecord(card, { ...META, dishId: 'mi_quang' });
    expect(record.dishId).toBe('mi_quang');
  });

  it('regenQuestionCard is deterministic and byte-identical to the domain builder (§15)', () => {
    const a = regenQuestionCard({ profile, allergens, targetLanguage: 'vi' }, META);
    const b = regenQuestionCard({ profile, allergens, targetLanguage: 'vi' }, META);
    expect(a).toEqual(b);
    expect(a.text).toBe(buildQuestionCard({ profile, allergens, targetLanguage: 'vi' }).text);
    // Profile-driven card: a severe peanut allergy always yields the severity + peanut question line.
    expect(a.text).toMatch(/^Tôi bị dị ứng .* với đậu phộng\./);
    expect(a.sections.some((s) => s.kind === 'cross_contact_question')).toBe(true);
  });

  it('is questions only — the card never asserts a dish is acceptable', () => {
    const record = regenQuestionCard({ profile, allergens, targetLanguage: 'en' }, META);
    // Every rendered line is a statement of the allergy or a question to staff (ends with "?").
    const questionLines = record.sections.filter((s) => s.kind !== 'severity_statement');
    expect(questionLines.every((s) => s.text.trimEnd().endsWith('?'))).toBe(true);
  });
});
