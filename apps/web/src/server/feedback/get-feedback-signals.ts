// Map an active FeedbackFlag row to a domain FeedbackSignal (spec §9.5 / §11.1). Pure — takes a
// row (no DB), selects only flag scalars (never report free-text), and coerces Date→ISO. The
// snake_case enum strings match the domain unions verbatim, so they pass through unchanged.

import type { FeedbackFlag } from '@prisma/client';
import type { FeedbackSignal, RestaurantReadinessClass } from '@safebite/domain';

export function flagRowToSignal(row: FeedbackFlag): FeedbackSignal {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    restaurantId: row.restaurantId,
    menuItemId: row.menuItemId,
    dishId: row.dishId,
    allergenId: row.allergenId,
    effect: row.effect,
    priority: row.priority,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    confidenceDelta: row.confidenceDelta,
    readinessCap: (row.readinessCap as RestaurantReadinessClass | null) ?? null,
    publicReasonKey: row.publicReasonKey,
  };
}
