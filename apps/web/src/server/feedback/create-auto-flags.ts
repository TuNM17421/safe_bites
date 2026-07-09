// Persist feedback flags inside a transaction. `insertFeedbackFlag` is the single flag-create
// used by both the severe auto-flag path (§17.3) and admin actions (§10.4) — DRY. `createAutoFlags`
// wraps it for submission, adding one system audit row per flag.

import type { FeedbackFlag, Prisma } from '@prisma/client';
import type {
  FeedbackEntityType,
  FeedbackFlagEffect,
  FeedbackFlagSpec,
  FeedbackPriority,
} from '@safebite/domain';

export interface FeedbackFlagInsert {
  reportId?: string | null;
  entityType: FeedbackEntityType;
  entityId: string;
  restaurantId?: string | null;
  menuItemId?: string | null;
  dishId?: string | null;
  allergenId?: string | null;
  effect: FeedbackFlagEffect;
  priority?: FeedbackPriority;
  reason: string;
  publicReasonKey?: string | null;
  readinessCap?: string | null;
  confidenceDelta?: number | null;
  expiresAt?: Date | null;
}

export async function insertFeedbackFlag(tx: Prisma.TransactionClient, spec: FeedbackFlagInsert): Promise<FeedbackFlag> {
  return tx.feedbackFlag.create({
    data: {
      reportId: spec.reportId ?? null,
      entityType: spec.entityType,
      entityId: spec.entityId,
      restaurantId: spec.restaurantId ?? null,
      menuItemId: spec.menuItemId ?? null,
      dishId: spec.dishId ?? null,
      allergenId: spec.allergenId ?? null,
      effect: spec.effect,
      status: 'active',
      priority: spec.priority ?? 'normal',
      reason: spec.reason,
      publicReasonKey: spec.publicReasonKey ?? null,
      readinessCap: spec.readinessCap ?? null,
      confidenceDelta: spec.confidenceDelta ?? null,
      expiresAt: spec.expiresAt ?? null,
    },
  });
}

export async function createAutoFlags(
  tx: Prisma.TransactionClient,
  reportId: string,
  specs: FeedbackFlagSpec[],
): Promise<FeedbackFlag[]> {
  const flags: FeedbackFlag[] = [];
  for (const spec of specs) {
    const flag = await insertFeedbackFlag(tx, {
      reportId,
      entityType: spec.entityType,
      entityId: spec.entityId,
      restaurantId: spec.restaurantId ?? null,
      menuItemId: spec.menuItemId ?? null,
      dishId: spec.dishId ?? null,
      allergenId: spec.allergenId ?? null,
      effect: spec.effect,
      priority: spec.priority,
      reason: spec.reason,
      publicReasonKey: spec.publicReasonKey,
      readinessCap: spec.readinessCap ?? null,
      confidenceDelta: spec.confidenceDelta ?? null,
      expiresAt: spec.expiresAt ? new Date(spec.expiresAt) : null,
    });
    // System audit row (contract reconciliation #2): confirm_feedback_flag, actor='system'.
    await tx.feedbackAdminAction.create({
      data: {
        reportId,
        flagId: flag.id,
        actionType: 'confirm_feedback_flag',
        actor: 'system',
        note: `Auto-created on a severe report: ${spec.effect} (${spec.entityType}).`,
        after: {
          effect: spec.effect,
          entityType: spec.entityType,
          entityId: spec.entityId,
          allergenId: spec.allergenId ?? null,
        },
      },
    });
    flags.push(flag);
  }
  return flags;
}
