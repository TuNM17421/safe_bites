// Admin feedback DTOs (spec §10.1/§10.2). These are ADMIN-ONLY: the detail DTO intentionally
// exposes internal notes/staffAnswerText/profileSnapshot (§6.6). This module must never be
// imported by a public route/serializer. All Date→ISO, Decimal→number.

import type { FeedbackAdminAction, FeedbackFlag, FeedbackReport } from '@prisma/client';

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const bilingual = (en: string | null, vi: string | null, fallback: string) => ({ en: en ?? fallback, vi: vi ?? fallback });

type RestaurantRef = { id: string; canonicalName: string; nameEn: string | null; nameVi: string | null };
type MenuItemRef = { id: string; rawName: string; nameEn: string | null; nameVi: string | null };

type ReportListRow = FeedbackReport & {
  restaurant: RestaurantRef;
  menuItem: MenuItemRef | null;
  flags: { id: string }[];
};

export function feedbackReportRowToListDTO(r: ReportListRow) {
  return {
    id: r.id,
    clientReportId: r.clientReportId,
    createdAt: r.createdAt.toISOString(),
    status: r.status,
    priority: r.priority,
    reaction: r.reaction,
    restaurant: { id: r.restaurant.id, name: bilingual(r.restaurant.nameEn, r.restaurant.nameVi, r.restaurant.canonicalName) },
    menuItem: r.menuItem ? { id: r.menuItem.id, name: bilingual(r.menuItem.nameEn, r.menuItem.nameVi, r.menuItem.rawName) } : null,
    allergenIds: r.allergenIds,
    askedStaff: r.askedStaff,
    hasActiveFlags: r.flags.length > 0,
    // v2 ingredient-correction context surfaced on the /admin/reports queue.
    notes: r.notes,
    reporterRef: r.reporterRef,
    correctionIngredientId: r.correctionIngredientId,
    correctionPresent: r.correctionPresent,
  };
}

// Trimmed shape for the "related reports" list on the detail page.
export function feedbackReportRelatedDTO(r: Pick<FeedbackReport, 'id' | 'createdAt' | 'status' | 'priority' | 'reaction' | 'restaurantId' | 'menuItemId' | 'allergenIds'>) {
  return {
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    status: r.status,
    priority: r.priority,
    reaction: r.reaction,
    restaurantId: r.restaurantId,
    menuItemId: r.menuItemId,
    allergenIds: r.allergenIds,
  };
}

// Full report core — ADMIN ONLY (includes internal free-text + snapshots).
export function feedbackReportCoreToDTO(r: FeedbackReport) {
  return {
    id: r.id,
    clientReportId: r.clientReportId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    city: r.city,
    locale: r.locale,
    submissionSource: r.submissionSource,
    offlineCreatedAt: iso(r.offlineCreatedAt),
    restaurantId: r.restaurantId,
    menuItemId: r.menuItemId,
    dishId: r.dishId,
    allergenIds: r.allergenIds,
    profileSnapshot: r.profileSnapshot,
    recommendationSnapshot: r.recommendationSnapshot,
    ateHere: r.ateHere,
    visitedAt: iso(r.visitedAt),
    askedStaff: r.askedStaff,
    staffAnswer: r.staffAnswer,
    staffAnswerText: r.staffAnswerText,
    reaction: r.reaction,
    reactionTiming: r.reactionTiming,
    userTrustRating: r.userTrustRating,
    notes: r.notes,
    status: r.status,
    priority: r.priority,
    severeAutoFlagged: r.severeAutoFlagged,
    reviewedAt: iso(r.reviewedAt),
    reviewedBy: r.reviewedBy,
    reviewOutcome: r.reviewOutcome,
    adminSummary: r.adminSummary,
  };
}

export function flagRowToAdminDTO(f: FeedbackFlag) {
  return {
    id: f.id,
    reportId: f.reportId,
    entityType: f.entityType,
    entityId: f.entityId,
    restaurantId: f.restaurantId,
    menuItemId: f.menuItemId,
    dishId: f.dishId,
    allergenId: f.allergenId,
    effect: f.effect,
    status: f.status,
    priority: f.priority,
    reason: f.reason,
    publicReasonKey: f.publicReasonKey,
    readinessCap: f.readinessCap,
    confidenceDelta: f.confidenceDelta,
    expiresAt: iso(f.expiresAt),
    createdAt: f.createdAt.toISOString(),
    resolvedAt: iso(f.resolvedAt),
    resolvedBy: f.resolvedBy,
  };
}

export function actionRowToDTO(a: FeedbackAdminAction) {
  return {
    id: a.id,
    actionType: a.actionType,
    actor: a.actor,
    note: a.note,
    flagId: a.flagId,
    before: a.before,
    after: a.after,
    createdAt: a.createdAt.toISOString(),
  };
}
