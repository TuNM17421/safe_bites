import { describe, expect, it } from 'vitest';
import { buildMinimalProfileSnapshot, planFeedbackReport } from '../../server/feedback/plan-feedback-report';
import type { FeedbackReportInput } from '@safebite/domain';

// Minimal valid submission (post-parse shape — defaults already applied).
function input(over: Partial<FeedbackReportInput> = {}): FeedbackReportInput {
  return {
    clientReportId: 'web-uuid',
    restaurantId: 'rest_1',
    city: 'hanoi',
    clientPlatform: 'pwa_web',
    submissionSource: 'online',
    allergenIds: ['peanut'],
    reaction: 'none',
    ...over,
  };
}

describe('planFeedbackReport (Phase 03 pure planning)', () => {
  it('urgent priority + auto-flags for an anaphylaxis report on a menu item', () => {
    const plan = planFeedbackReport(
      input({ reaction: 'anaphylaxis_or_emergency', menuItemId: 'mi_1' }),
      { dishId: null },
    );
    expect(plan.priority).toBe('urgent');
    expect(plan.severeAutoFlagged).toBe(true);
    expect(plan.flagSpecs.some((f) => f.entityType === 'restaurant' && f.effect === 'cap_restaurant_readiness')).toBe(true);
    expect(plan.flagSpecs.some((f) => f.entityType === 'menu_item' && f.effect === 'suppress_suitable')).toBe(true);
  });

  it('no flags and low priority for a no-reaction report', () => {
    const plan = planFeedbackReport(input({ reaction: 'none' }), { dishId: null });
    expect(plan.priority).toBe('low');
    expect(plan.severeAutoFlagged).toBe(false);
    expect(plan.flagSpecs).toEqual([]);
  });

  it('uses the resolved dishId for a dish-level flag when there is no menu item', () => {
    const plan = planFeedbackReport(input({ reaction: 'severe', dishId: 'dish_1' }), { dishId: 'dish_1' });
    expect(plan.severeAutoFlagged).toBe(true);
    expect(
      plan.flagSpecs.some((f) => f.entityType === 'dish' && f.dishId === 'dish_1' && f.effect === 'flag_for_review'),
    ).toBe(true);
  });

  it('maps moderate reaction to high priority without creating flags', () => {
    const plan = planFeedbackReport(input({ reaction: 'moderate' }), { dishId: null });
    expect(plan.priority).toBe('high');
    expect(plan.flagSpecs).toEqual([]);
  });
});

describe('buildMinimalProfileSnapshot (§2.3 privacy whitelist)', () => {
  it('keeps only allergy id/severity/cross-contact + dietary ids', () => {
    const snapshot = buildMinimalProfileSnapshot(
      input({
        profileSnapshot: {
          allergies: [{ allergenId: 'peanut', severity: 'anaphylaxis_risk', crossContactSensitive: true }],
          dietaryProfiles: ['profile_muslim_halal'],
        },
      }),
    );
    expect(snapshot).toEqual({
      allergies: [{ allergenId: 'peanut', severity: 'anaphylaxis_risk', crossContactSensitive: true }],
      dietaryProfiles: ['profile_muslim_halal'],
    });
  });

  it('drops any extra keys smuggled into an allergy entry (no raw passthrough)', () => {
    const dirty = {
      ...input(),
      profileSnapshot: {
        allergies: [
          // extra keys (name, lat/lon, notes) must NOT survive into the persisted snapshot.
          { allergenId: 'peanut', severity: 'severe', crossContactSensitive: 'not_sure', lat: 21.02, notes: 'secret' },
        ],
        dietaryProfiles: [],
      },
    } as unknown as FeedbackReportInput;
    const snapshot = buildMinimalProfileSnapshot(dirty);
    expect(snapshot.allergies[0]).toEqual({ allergenId: 'peanut', severity: 'severe', crossContactSensitive: 'not_sure' });
    expect(JSON.stringify(snapshot)).not.toContain('lat');
    expect(JSON.stringify(snapshot)).not.toContain('secret');
  });

  it('returns empty arrays when no profileSnapshot is provided', () => {
    expect(buildMinimalProfileSnapshot(input())).toEqual({ allergies: [], dietaryProfiles: [] });
  });
});
