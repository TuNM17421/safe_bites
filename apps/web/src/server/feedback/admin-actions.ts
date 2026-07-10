// Admin action service (spec §10.4 / §17.4). Maps each FeedbackAdminActionType to its side effect
// transactionally and ALWAYS writes exactly one FeedbackAdminAction with before/after snapshots.
// Thin Prisma wrapper — no domain trust logic. `actor` is a role ('admin'|'system'), not a user
// (no per-user identity exists in Phase 03).

import type { FeedbackAdminActionType, FeedbackEntityType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { insertFeedbackFlag, type FeedbackFlagInsert } from './create-auto-flags';

export interface AdminActionTarget {
  entityType: FeedbackEntityType;
  entityId: string;
  allergenId?: string | null;
}

export interface AdminActionInput {
  reportId: string;
  actionType: FeedbackAdminActionType;
  note?: string | null;
  target?: AdminActionTarget | null;
  expiresAt?: string | null;
  confidenceDelta?: number | null;
  flagId?: string | null;
  actor?: string;
}

export type AdminActionResult =
  | { ok: true; actionId: string; createdFlagId?: string; updatedFlagId?: string }
  | { ok: false; reason: 'report_not_found' | 'invalid_target' };

type Json = Prisma.InputJsonValue;

// Build a flag-insert spec from an action target: the entityType decides which id column is set.
function flagFromTarget(
  reportId: string,
  target: AdminActionTarget,
  effect: FeedbackFlagInsert['effect'],
  opts: { reason: string; publicReasonKey?: string; priority?: FeedbackFlagInsert['priority']; confidenceDelta?: number | null; expiresAt?: string | null },
): FeedbackFlagInsert {
  return {
    reportId,
    entityType: target.entityType,
    entityId: target.entityId,
    restaurantId: target.entityType === 'restaurant' ? target.entityId : null,
    menuItemId: target.entityType === 'menu_item' ? target.entityId : null,
    dishId: target.entityType === 'dish' ? target.entityId : null,
    allergenId: target.allergenId ?? null,
    effect,
    priority: opts.priority ?? 'high',
    reason: opts.reason,
    publicReasonKey: opts.publicReasonKey ?? null,
    confidenceDelta: opts.confidenceDelta ?? null,
    expiresAt: opts.expiresAt ? new Date(opts.expiresAt) : null,
  };
}

export async function applyAdminAction(input: AdminActionInput): Promise<AdminActionResult> {
  const actor = input.actor ?? 'admin';
  const { reportId, actionType, target } = input;

  return prisma.$transaction(async (tx): Promise<AdminActionResult> => {
    const report = await tx.feedbackReport.findUnique({
      where: { id: reportId },
      include: { flags: { where: { status: 'active' } } },
    });
    if (!report) return { ok: false, reason: 'report_not_found' };

    let before: Json | undefined;
    let after: Json | undefined;
    let createdFlagId: string | undefined;
    let updatedFlagId: string | undefined;

    const setStatus = async (status: 'in_review' | 'resolved' | 'dismissed' | 'spam', review = false) => {
      before = { status: report.status };
      await tx.feedbackReport.update({
        where: { id: reportId },
        data: { status, ...(review ? { reviewedAt: new Date(), reviewedBy: actor } : {}) },
      });
      after = { status };
    };

    // Deactivate the report's active flags so recommendations stop applying them (the reco loader
    // filters flag.status='active'). Used when the report itself is invalidated (spam/dismiss).
    // `resolve_no_change` deliberately does NOT auto-clear flags — the admin clears them explicitly
    // (§6.5), so a triaged-but-valid report can keep cautioning until cleared.
    const resolveReportFlags = async () => {
      for (const f of report.flags) {
        await tx.feedbackFlag.update({ where: { id: f.id }, data: { status: 'resolved', resolvedAt: new Date(), resolvedBy: actor } });
      }
    };

    switch (actionType) {
      case 'start_review':
        await setStatus('in_review');
        break;
      case 'resolve_no_change':
        await setStatus('resolved', true);
        break;
      case 'dismiss_report':
        await setStatus('dismissed', true);
        await resolveReportFlags();
        after = { status: 'dismissed', resolvedFlagCount: report.flags.length };
        break;
      case 'mark_spam':
        await setStatus('spam', true);
        await resolveReportFlags();
        after = { status: 'spam', resolvedFlagCount: report.flags.length };
        break;
      case 'clear_feedback_flag': {
        const toClear = input.flagId ? report.flags.filter((f) => f.id === input.flagId) : report.flags;
        for (const f of toClear) {
          await tx.feedbackFlag.update({ where: { id: f.id }, data: { status: 'resolved', resolvedAt: new Date(), resolvedBy: actor } });
        }
        updatedFlagId = toClear[0]?.id;
        before = { flags: toClear.map((f) => ({ id: f.id, status: f.status })) };
        after = { flags: toClear.map((f) => ({ id: f.id, status: 'resolved' })) };
        break;
      }
      case 'confirm_feedback_flag': {
        if (input.flagId) {
          updatedFlagId = input.flagId;
          after = { flagId: input.flagId, status: 'active' };
        } else if (target) {
          const flag = await insertFeedbackFlag(tx, flagFromTarget(reportId, target, 'flag_for_review', { reason: 'Admin-confirmed feedback flag.', publicReasonKey: 'feedback_under_review' }));
          createdFlagId = flag.id;
          after = { flagId: flag.id, effect: 'flag_for_review' };
        } else {
          return { ok: false, reason: 'invalid_target' };
        }
        break;
      }
      case 'suppress_suitable_until_review': {
        if (!target) return { ok: false, reason: 'invalid_target' };
        const flag = await insertFeedbackFlag(tx, flagFromTarget(reportId, target, 'suppress_suitable', { reason: 'Admin suppressed the Suitable status until review.', publicReasonKey: 'feedback_under_review', priority: 'high', expiresAt: input.expiresAt }));
        createdFlagId = flag.id;
        after = { flagId: flag.id, effect: 'suppress_suitable' };
        break;
      }
      case 'apply_confidence_downgrade': {
        if (!target) return { ok: false, reason: 'invalid_target' };
        const flag = await insertFeedbackFlag(tx, flagFromTarget(reportId, target, 'downgrade_confidence', { reason: 'Admin applied a confidence downgrade.', publicReasonKey: 'feedback_under_review', confidenceDelta: input.confidenceDelta ?? -1 }));
        createdFlagId = flag.id;
        after = { flagId: flag.id, effect: 'downgrade_confidence' };
        break;
      }
      case 'hide_menu_item_temporarily': {
        if (!target) return { ok: false, reason: 'invalid_target' };
        const flag = await insertFeedbackFlag(tx, flagFromTarget(reportId, target, 'hide_recommendation', { reason: 'Admin hid the item recommendation until review.', publicReasonKey: 'feedback_under_review', expiresAt: input.expiresAt }));
        createdFlagId = flag.id;
        after = { flagId: flag.id, effect: 'hide_recommendation' };
        break;
      }
      case 'request_reverification': {
        before = { reviewOutcome: report.reviewOutcome };
        await tx.feedbackReport.update({ where: { id: reportId }, data: { reviewOutcome: 'reverification_requested' } });
        // Reuse the restaurant's existing review flag — never a verified source (§3 invariant).
        if (target?.entityType === 'restaurant') {
          await tx.restaurant.update({ where: { id: target.entityId }, data: { reviewStatus: 'needs_review' } });
          after = { reviewOutcome: 'reverification_requested', restaurantReviewStatus: 'needs_review' };
        } else {
          after = { reviewOutcome: 'reverification_requested' };
        }
        break;
      }
      case 'approve_ingredient_correction': {
        // First data-mutating action: apply the report's ingredient correction to the dish, then
        // resolve. Stays user_contribution/unverified — admin approval applies data, never verifies
        // the recipe. before/after snapshot the ingredient change (audit invariant for a mutation).
        const ingredientId = report.correctionIngredientId;
        if (!report.menuItemId || !ingredientId) return { ok: false, reason: 'invalid_target' };
        const key = { menuItemId_ingredientId: { menuItemId: report.menuItemId, ingredientId } };
        const existing = await tx.menuItemIngredient.findUnique({ where: key });
        before = {
          reportStatus: report.status,
          menuItemIngredient: existing
            ? { id: existing.id, source: existing.source, contributorType: existing.contributorType, verificationStatus: existing.verificationStatus }
            : null,
        };

        if (report.correctionPresent === false) {
          if (existing) await tx.menuItemIngredient.delete({ where: key });
          after = { reportStatus: 'resolved', present: false, removedMenuItemIngredientId: existing?.id ?? null };
        } else {
          const row = await tx.menuItemIngredient.upsert({
            where: key,
            update: { source: 'user_contribution', contributorType: 'user', verificationStatus: 'unverified' },
            create: { menuItemId: report.menuItemId, ingredientId, source: 'user_contribution', contributorType: 'user', verificationStatus: 'unverified' },
          });
          after = { reportStatus: 'resolved', present: true, menuItemIngredientId: row.id, source: 'user_contribution', verificationStatus: 'unverified' };
        }

        await tx.feedbackReport.update({
          where: { id: reportId },
          data: { status: 'resolved', reviewedAt: new Date(), reviewedBy: actor, reviewOutcome: 'ingredient_corrected' },
        });
        break;
      }
      case 'add_note':
        break; // audit row only
    }

    const action = await tx.feedbackAdminAction.create({
      data: {
        reportId,
        flagId: createdFlagId ?? updatedFlagId ?? null,
        actionType,
        actor,
        note: input.note ?? null,
        before,
        after,
      },
    });

    return { ok: true, actionId: action.id, ...(createdFlagId ? { createdFlagId } : {}), ...(updatedFlagId ? { updatedFlagId } : {}) };
  });
}
