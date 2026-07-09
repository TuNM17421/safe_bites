import { describe, expect, it } from 'vitest';
import type { FeedbackFlag } from '@prisma/client';
import { flagRowToSignal } from '../../server/feedback/get-feedback-signals';

function row(over: Partial<FeedbackFlag> = {}): FeedbackFlag {
  return {
    id: 'flag_1',
    reportId: 'rep_1',
    entityType: 'restaurant',
    entityId: 'rest_1',
    restaurantId: 'rest_1',
    menuItemId: null,
    dishId: null,
    allergenId: 'peanut',
    effect: 'cap_restaurant_readiness',
    status: 'active',
    priority: 'urgent',
    reason: 'Recent severe feedback pending review for matching allergen.',
    publicReasonKey: 'feedback_under_review_severe',
    confidenceDelta: null,
    readinessCap: 'D',
    expiresAt: null,
    resolvedAt: null,
    resolvedBy: null,
    adminNote: null,
    createdAt: new Date('2026-07-09T00:00:00.000Z'),
    updatedAt: new Date('2026-07-09T00:00:00.000Z'),
    ...over,
  };
}

describe('flagRowToSignal', () => {
  it('maps a flag row to a JSON-safe FeedbackSignal (Date → ISO, flag scalars only)', () => {
    expect(flagRowToSignal(row())).toEqual({
      id: 'flag_1',
      entityType: 'restaurant',
      entityId: 'rest_1',
      restaurantId: 'rest_1',
      menuItemId: null,
      dishId: null,
      allergenId: 'peanut',
      effect: 'cap_restaurant_readiness',
      priority: 'urgent',
      status: 'active',
      createdAt: '2026-07-09T00:00:00.000Z',
      expiresAt: null,
      confidenceDelta: null,
      readinessCap: 'D',
      publicReasonKey: 'feedback_under_review_severe',
    });
  });

  it('never carries internal free-text (reason/adminNote/resolvedBy are dropped)', () => {
    const s = flagRowToSignal(row({ reason: 'internal-secret-note', adminNote: 'private-admin' }));
    const json = JSON.stringify(s);
    expect(json).not.toContain('secret');
    expect(json).not.toContain('private');
  });

  it('coerces expiresAt Date to ISO when present', () => {
    const s = flagRowToSignal(row({ expiresAt: new Date('2026-08-01T00:00:00.000Z') }));
    expect(s.expiresAt).toBe('2026-08-01T00:00:00.000Z');
  });
});
