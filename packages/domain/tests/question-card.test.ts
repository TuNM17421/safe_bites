import { describe, expect, it } from 'vitest';
import { buildQuestionCard } from '../src/index';
import type { LocalUserProfile } from '../src/types';

const peanut = {
  id: 'peanut',
  nameEn: 'peanut',
  nameVi: 'đậu phộng',
  aliasesEn: ['peanuts', 'peanut oil', 'peanut butter', 'peanut sauce'],
  aliasesVi: ['đậu phộng', 'dầu đậu phộng', 'bơ đậu phộng', 'sốt đậu phộng'],
};

const profile: LocalUserProfile = {
  id: 'local_test',
  selectedProfileIds: ['profile_peanut_allergy'],
  allergies: [{ allergenId: 'peanut', severity: 'anaphylaxis_risk', crossContactSensitive: true }],
  language: 'en',
  destinationCity: 'hanoi',
  safetyAcceptedAt: '2026-07-08T00:00:00.000Z',
  offlineEnabled: false,
  createdAt: '2026-07-08T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z',
};

const EN = `I have a severe peanut allergy.

Does this dish contain peanuts, peanut oil, peanut butter, or peanut sauce?

Is it prepared with shared cookware, cutting boards, or fryer oil used for peanut dishes?

If unsure, could you please check with the kitchen?`;

const VI = `Tôi bị dị ứng nặng với đậu phộng.

Món này có đậu phộng, dầu đậu phộng, bơ đậu phộng, hoặc sốt đậu phộng không?

Món này có dùng chung chảo, dao thớt, hoặc dầu chiên với món có đậu phộng không?

Nếu không chắc, anh/chị có thể hỏi bếp giúp tôi không?`;

describe('buildQuestionCard (§15) — severe peanut, cross-contact', () => {
  it('renders the exact EN block with four sections', () => {
    const card = buildQuestionCard({ profile, allergens: [peanut], targetLanguage: 'en' });
    expect(card.text).toBe(EN);
    expect(card.sections).toHaveLength(4);
    expect(card.sections.map((s) => s.kind)).toEqual([
      'severity_statement',
      'ingredient_question',
      'cross_contact_question',
      'kitchen_check',
    ]);
    expect(card.allergenIds).toEqual(['peanut']);
  });

  it('renders the exact VI block', () => {
    const card = buildQuestionCard({ profile: { ...profile, language: 'vi' }, allergens: [peanut], targetLanguage: 'vi' });
    expect(card.text).toBe(VI);
  });
});
