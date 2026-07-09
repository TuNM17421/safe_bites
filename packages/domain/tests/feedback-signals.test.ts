import { describe, expect, it } from 'vitest';
import {
  FeedbackReportInputSchema,
  buildAutoFlagSpecs,
  feedbackSignalWeight,
  getFeedbackPriority,
  shouldAutoCreateFeedbackFlag,
  summarizeFeedbackSignals,
} from '../src/index';
import type { FeedbackReaction, FeedbackSignal } from '../src/index';

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

describe('getFeedbackPriority (§8.4)', () => {
  const cases: Array<[FeedbackReaction, string]> = [
    ['anaphylaxis_or_emergency', 'urgent'],
    ['severe', 'urgent'],
    ['moderate', 'high'],
    ['mild', 'normal'],
    ['none', 'low'],
    ['not_sure', 'normal'],
    ['prefer_not_to_say', 'normal'],
  ];
  it.each(cases)('maps %s -> %s', (reaction, expected) => {
    expect(getFeedbackPriority({ reaction })).toBe(expected);
  });
});

describe('shouldAutoCreateFeedbackFlag (§8.4)', () => {
  const base = { restaurantId: 'rest_1', allergenIds: ['peanut'] };
  it('is true only for severe/anaphylaxis', () => {
    expect(shouldAutoCreateFeedbackFlag({ ...base, reaction: 'severe' })).toBe(true);
    expect(shouldAutoCreateFeedbackFlag({ ...base, reaction: 'anaphylaxis_or_emergency' })).toBe(true);
    for (const r of ['none', 'mild', 'moderate', 'not_sure', 'prefer_not_to_say'] as FeedbackReaction[]) {
      expect(shouldAutoCreateFeedbackFlag({ ...base, reaction: r })).toBe(false);
    }
  });
});

describe('buildAutoFlagSpecs (§17.3)', () => {
  it('returns [] for non-severe reactions', () => {
    expect(buildAutoFlagSpecs({ reaction: 'mild', restaurantId: 'rest_1', allergenIds: ['peanut'] })).toEqual([]);
  });

  it('severe with menuItem => restaurant cap(D,urgent) + menu suppress(urgent), allergen-scoped', () => {
    const specs = buildAutoFlagSpecs({
      reaction: 'severe',
      restaurantId: 'rest_1',
      menuItemId: 'mi_1',
      allergenIds: ['peanut'],
    });
    expect(specs).toHaveLength(2);
    const rest = specs.find((s) => s.entityType === 'restaurant')!;
    expect(rest).toMatchObject({
      effect: 'cap_restaurant_readiness',
      readinessCap: 'D',
      priority: 'urgent',
      status: 'active',
      allergenId: 'peanut',
      publicReasonKey: 'feedback_under_review_severe',
    });
    const item = specs.find((s) => s.entityType === 'menu_item')!;
    expect(item).toMatchObject({
      effect: 'suppress_suitable',
      priority: 'urgent',
      menuItemId: 'mi_1',
      publicReasonKey: 'feedback_under_review_severe_item',
    });
  });

  it('severe with dish only => restaurant cap + dish flag_for_review(high)', () => {
    const specs = buildAutoFlagSpecs({
      reaction: 'anaphylaxis_or_emergency',
      restaurantId: 'rest_1',
      dishId: 'dish_1',
      allergenIds: ['peanut'],
    });
    expect(specs.map((s) => s.entityType).sort()).toEqual(['dish', 'restaurant']);
    const dish = specs.find((s) => s.entityType === 'dish')!;
    expect(dish).toMatchObject({ effect: 'flag_for_review', priority: 'high', dishId: 'dish_1' });
  });

  it('fans out one flag set per allergen', () => {
    const specs = buildAutoFlagSpecs({
      reaction: 'severe',
      restaurantId: 'rest_1',
      menuItemId: 'mi_1',
      allergenIds: ['peanut', 'shellfish'],
    });
    expect(specs).toHaveLength(4); // (restaurant + menu) x 2 allergens
    expect(new Set(specs.map((s) => s.allergenId))).toEqual(new Set(['peanut', 'shellfish']));
  });

  it('empty allergenIds => a single unscoped (allergenId null) flag set', () => {
    const specs = buildAutoFlagSpecs({ reaction: 'severe', restaurantId: 'rest_1', menuItemId: 'mi_1', allergenIds: [] });
    expect(specs).toHaveLength(2);
    expect(specs.every((s) => s.allergenId === null)).toBe(true);
  });
});

describe('feedbackSignalWeight (§8.4 decay)', () => {
  it('non-active signals contribute zero', () => {
    for (const status of ['resolved', 'dismissed', 'expired'] as const) {
      expect(feedbackSignalWeight({ createdAt: '2026-07-08', now: NOW, priority: 'high', status })).toBe(0);
    }
  });

  it('active urgent never decays', () => {
    expect(feedbackSignalWeight({ createdAt: '2024-01-01', now: NOW, priority: 'urgent' })).toBe(1);
  });

  it('decays non-severe signals by age', () => {
    expect(feedbackSignalWeight({ createdAt: '2026-07-01', now: NOW, priority: 'normal' })).toBe(1); // 8d
    expect(feedbackSignalWeight({ createdAt: '2026-05-01', now: NOW, priority: 'normal' })).toBe(0.7); // ~69d
    expect(feedbackSignalWeight({ createdAt: '2026-02-01', now: NOW, priority: 'normal' })).toBe(0.4); // ~159d
    expect(feedbackSignalWeight({ createdAt: '2025-06-01', now: NOW, priority: 'normal' })).toBe(0.15); // >180d
  });
});

describe('summarizeFeedbackSignals (§18)', () => {
  it('reports no active flags for an empty/mismatched set', () => {
    const s = summarizeFeedbackSignals({ signals: [], profileAllergenIds: ['peanut'], now: NOW });
    expect(s).toEqual({ hasActiveFlags: false, pendingReviewCount: 0, recentReportCount: 0, lastReportAt: null });
  });

  it('ignores signals whose allergen is not in the profile', () => {
    const s = summarizeFeedbackSignals({
      signals: [signal({ allergenId: 'shellfish' })],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(s.hasActiveFlags).toBe(false);
  });

  it('surfaces urgent item suppression as feedback_under_review_severe_item', () => {
    const s = summarizeFeedbackSignals({
      signals: [signal({ effect: 'suppress_suitable', priority: 'urgent' })],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(s.hasActiveFlags).toBe(true);
    expect(s.highestPriority).toBe('urgent');
    expect(s.pendingReviewCount).toBe(1);
    expect(s.publicMessageKey).toBe('feedback_under_review_severe_item');
  });

  it('falls back to feedback_under_review for non-severe caps', () => {
    const s = summarizeFeedbackSignals({
      signals: [
        signal({ entityType: 'restaurant', effect: 'flag_for_review', priority: 'normal', createdAt: '2026-06-20' }),
      ],
      profileAllergenIds: ['peanut'],
      now: NOW,
    });
    expect(s.publicMessageKey).toBe('feedback_under_review');
  });
});

describe('FeedbackReportInputSchema (§9.3 validation)', () => {
  const valid = { clientReportId: 'web-uuid', restaurantId: 'rest_1', city: 'hanoi', reaction: 'none', allergenIds: ['peanut'] };

  it('parses a minimal valid report and applies defaults', () => {
    const parsed = FeedbackReportInputSchema.parse(valid);
    expect(parsed.submissionSource).toBe('online');
    expect(parsed.clientPlatform).toBe('pwa_web');
    expect(parsed.allergenIds).toEqual(['peanut']);
  });

  it('requires reaction', () => {
    const { reaction, ...noReaction } = valid;
    void reaction;
    expect(FeedbackReportInputSchema.safeParse(noReaction).success).toBe(false);
  });

  it('rejects notes over 500 chars', () => {
    expect(FeedbackReportInputSchema.safeParse({ ...valid, notes: 'x'.repeat(501) }).success).toBe(false);
  });

  it('rejects more than 10 allergenIds', () => {
    const ids = Array.from({ length: 11 }, (_, i) => `a${i}`);
    expect(FeedbackReportInputSchema.safeParse({ ...valid, allergenIds: ids }).success).toBe(false);
  });

  it('requires at least one of profileSnapshot.allergies / allergenIds', () => {
    expect(FeedbackReportInputSchema.safeParse({ ...valid, allergenIds: [] }).success).toBe(false);
    const withSnapshot = {
      ...valid,
      allergenIds: [],
      profileSnapshot: { allergies: [{ allergenId: 'peanut', severity: 'severe', crossContactSensitive: true }] },
    };
    expect(FeedbackReportInputSchema.safeParse(withSnapshot).success).toBe(true);
  });

  const DAY = 86_400_000;
  it('rejects visitedAt more than 30 days in the future', () => {
    const future = new Date(Date.now() + 40 * DAY).toISOString();
    expect(FeedbackReportInputSchema.safeParse({ ...valid, visitedAt: future }).success).toBe(false);
  });

  it('rejects visitedAt more than 180 days in the past', () => {
    const past = new Date(Date.now() - 200 * DAY).toISOString();
    expect(FeedbackReportInputSchema.safeParse({ ...valid, visitedAt: past }).success).toBe(false);
  });

  it('accepts a recent visitedAt', () => {
    const recent = new Date(Date.now() - 2 * DAY).toISOString();
    expect(FeedbackReportInputSchema.safeParse({ ...valid, visitedAt: recent }).success).toBe(true);
  });
});
