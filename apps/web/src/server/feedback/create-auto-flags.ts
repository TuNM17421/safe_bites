// Persist the domain-computed severe/anaphylaxis auto-flag specs (spec §17.3) inside the
// submission transaction, plus one system audit row per flag. The caller passes the tx client so
// everything commits atomically with the FeedbackReport.

import type { FeedbackFlag, Prisma } from '@prisma/client';
import type { FeedbackFlagSpec } from '@safebite/domain';

export async function createAutoFlags(
  tx: Prisma.TransactionClient,
  reportId: string,
  specs: FeedbackFlagSpec[],
): Promise<FeedbackFlag[]> {
  const flags: FeedbackFlag[] = [];
  for (const spec of specs) {
    const flag = await tx.feedbackFlag.create({
      data: {
        reportId,
        entityType: spec.entityType,
        entityId: spec.entityId,
        restaurantId: spec.restaurantId ?? null,
        menuItemId: spec.menuItemId ?? null,
        dishId: spec.dishId ?? null,
        allergenId: spec.allergenId ?? null,
        effect: spec.effect,
        status: spec.status,
        priority: spec.priority,
        reason: spec.reason,
        publicReasonKey: spec.publicReasonKey,
        readinessCap: spec.readinessCap ?? null,
        confidenceDelta: spec.confidenceDelta ?? null,
        expiresAt: spec.expiresAt ? new Date(spec.expiresAt) : null,
      },
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
