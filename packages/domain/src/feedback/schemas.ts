// Phase 03 feedback Zod schemas + enum types (spec §7.1, §8.1, §9.1/§9.3, §18).
// Framework-free. Enum types are inferred from their z.enum (single source of truth); the
// composite DTO types are inferred too — the app API route and client fetch layer both
// import these so the boundary shape can never drift.

import { z } from 'zod';
import { languageCodeSchema, severitySchema } from '../schemas';

// ---- Enums (snake_case, matching the Prisma enum values in phase-02) ----

export const FeedbackReactionSchema = z.enum([
  'none',
  'mild',
  'moderate',
  'severe',
  'anaphylaxis_or_emergency',
  'not_sure',
  'prefer_not_to_say',
]);
export type FeedbackReaction = z.infer<typeof FeedbackReactionSchema>;

export const FeedbackReactionTimingSchema = z.enum([
  'during_meal',
  'within_2_hours',
  'later_same_day',
  'next_day_or_later',
  'not_sure',
  'not_applicable',
]);
export type FeedbackReactionTiming = z.infer<typeof FeedbackReactionTimingSchema>;

export const StaffAnswerSchema = z.enum([
  'confirmed_no_allergen',
  'confirmed_contains_allergen',
  'confirmed_can_remove',
  'confirmed_cannot_remove',
  'kitchen_checked',
  'not_sure',
  'language_barrier',
  'no_answer',
  'other',
]);
export type StaffAnswer = z.infer<typeof StaffAnswerSchema>;

export const FeedbackPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export type FeedbackPriority = z.infer<typeof FeedbackPrioritySchema>;

export const FeedbackReportStatusSchema = z.enum([
  'needs_review',
  'in_review',
  'resolved',
  'dismissed',
  'spam',
]);
export type FeedbackReportStatus = z.infer<typeof FeedbackReportStatusSchema>;

export const FeedbackFlagEffectSchema = z.enum([
  'flag_for_review',
  'downgrade_confidence',
  'suppress_suitable',
  'cap_restaurant_readiness',
  'hide_recommendation',
]);
export type FeedbackFlagEffect = z.infer<typeof FeedbackFlagEffectSchema>;

export const FeedbackFlagStatusSchema = z.enum(['active', 'resolved', 'dismissed', 'expired']);
export type FeedbackFlagStatus = z.infer<typeof FeedbackFlagStatusSchema>;

export const FeedbackEntityTypeSchema = z.enum(['restaurant', 'menu_item', 'dish', 'ingredient']);
export type FeedbackEntityType = z.infer<typeof FeedbackEntityTypeSchema>;

export const FeedbackAdminActionTypeSchema = z.enum([
  'start_review',
  'resolve_no_change',
  'dismiss_report',
  'mark_spam',
  'confirm_feedback_flag',
  'clear_feedback_flag',
  'request_reverification',
  'apply_confidence_downgrade',
  'suppress_suitable_until_review',
  'hide_menu_item_temporarily',
  'add_note',
]);
export type FeedbackAdminActionType = z.infer<typeof FeedbackAdminActionTypeSchema>;

export const readinessCapSchema = z.enum(['A', 'B', 'C', 'D', 'E']);
export const publicReasonKeySchema = z.enum([
  'feedback_under_review',
  'feedback_under_review_severe',
  'feedback_under_review_severe_item',
]);

// ---- Shared building blocks ----

const isoDateTime = z.string().datetime({ offset: true });
const crossContactSchema = z.union([z.boolean(), z.literal('not_sure')]);

// Minimal profile snapshot (§2.3): allergy ids/severity/cross-contact + dietary ids only.
// Never the whole store, never location.
export const feedbackProfileSnapshotSchema = z.object({
  allergies: z
    .array(
      z.object({
        allergenId: z.string(),
        severity: severitySchema,
        crossContactSensitive: crossContactSchema,
      }),
    )
    .max(20)
    .default([]),
  dietaryProfiles: z.array(z.string()).max(50).default([]),
});

// Opaque snapshot of the recommendation as shown at report time (§9.1). Loose strings — do
// not re-derive; it is stored verbatim for the admin review context.
export const recommendationSnapshotSchema = z
  .object({
    restaurantReadiness: z.string().optional(),
    menuItemStatus: z.string().optional(),
    riskLevel: z.string().optional(),
    confidence: z.string().optional(),
    source: z.string().optional(),
    lastCheckedAt: z.string().optional(),
  })
  .partial();

// ---- Public submit DTO (§9.1/§9.3) ----

export const FeedbackReportInputSchema = z
  .object({
    clientReportId: z.string().min(1).max(200),
    restaurantId: z.string().min(1),
    menuItemId: z.string().nullish(),
    dishId: z.string().nullish(),
    city: z.string().min(1),
    locale: languageCodeSchema.nullish(),
    clientPlatform: z.string().max(50).default('pwa_web'),
    submissionSource: z.enum(['online', 'offline_synced']).default('online'),
    offlineCreatedAt: isoDateTime.nullish(),

    profileSnapshot: feedbackProfileSnapshotSchema.optional(),
    allergenIds: z.array(z.string()).max(10).default([]),
    recommendationSnapshot: recommendationSnapshotSchema.nullish(),

    ateHere: z.boolean().nullish(),
    visitedAt: isoDateTime.nullish(),
    askedStaff: z.boolean().nullish(),
    staffAnswer: StaffAnswerSchema.nullish(),
    staffAnswerText: z.string().max(500).nullish(),

    reaction: FeedbackReactionSchema,
    reactionTiming: FeedbackReactionTimingSchema.nullish(),
    userTrustRating: z.number().int().min(1).max(5).nullish(),
    notes: z.string().max(500).nullish(),
  })
  .superRefine((val, ctx) => {
    // §9.3: at least one of profileSnapshot(allergies) / allergenIds must be present so the
    // report can be interpreted against an allergen.
    const hasAllergenIds = val.allergenIds.length > 0;
    const hasSnapshot = (val.profileSnapshot?.allergies.length ?? 0) > 0;
    if (!hasAllergenIds && !hasSnapshot) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide profileSnapshot.allergies or allergenIds.',
        path: ['allergenIds'],
      });
    }

    // §9.3 limits: visitedAt cannot be >30 days in the future or >180 days in the past.
    if (val.visitedAt) {
      const t = Date.parse(val.visitedAt);
      if (!Number.isNaN(t)) {
        const now = Date.now();
        const DAY = 86_400_000;
        if (t - now > 30 * DAY) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'visitedAt cannot be more than 30 days in the future.',
            path: ['visitedAt'],
          });
        } else if (now - t > 180 * DAY) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'visitedAt cannot be more than 180 days in the past.',
            path: ['visitedAt'],
          });
        }
      }
    }
  });
export type FeedbackReportInput = z.infer<typeof FeedbackReportInputSchema>;

export const FeedbackReportResponseSchema = z.object({
  reportId: z.string(),
  clientReportId: z.string(),
  status: FeedbackReportStatusSchema,
  priority: FeedbackPrioritySchema,
  severeAutoFlagged: z.boolean(),
  activeFlagIds: z.array(z.string()).optional(),
  createdAt: z.string(),
});
export type FeedbackReportResponse = z.infer<typeof FeedbackReportResponseSchema>;

// ---- Admin action DTO (§10.4) ----

export const FeedbackAdminActionInputSchema = z.object({
  actionType: FeedbackAdminActionTypeSchema,
  note: z.string().max(1000).nullish(),
  target: z
    .object({
      entityType: FeedbackEntityTypeSchema,
      entityId: z.string().min(1),
      allergenId: z.string().nullish(),
    })
    .optional(),
  expiresAt: isoDateTime.nullish(),
});
export type FeedbackAdminActionInput = z.infer<typeof FeedbackAdminActionInputSchema>;

// ---- Flag / signal / summary shapes (validated at the persistence + response boundary) ----

export const FeedbackFlagSchema = z.object({
  id: z.string(),
  reportId: z.string().nullish(),
  entityType: FeedbackEntityTypeSchema,
  entityId: z.string(),
  restaurantId: z.string().nullish(),
  menuItemId: z.string().nullish(),
  dishId: z.string().nullish(),
  allergenId: z.string().nullish(),
  effect: FeedbackFlagEffectSchema,
  status: FeedbackFlagStatusSchema,
  priority: FeedbackPrioritySchema,
  reason: z.string(),
  publicReasonKey: z.string().nullish(),
  confidenceDelta: z.number().nullish(),
  readinessCap: readinessCapSchema.nullish(),
  expiresAt: isoDateTime.nullish(),
  createdAt: z.string(),
});

export const FeedbackSignalSchema = z.object({
  id: z.string(),
  entityType: FeedbackEntityTypeSchema,
  entityId: z.string(),
  restaurantId: z.string().nullish(),
  menuItemId: z.string().nullish(),
  dishId: z.string().nullish(),
  allergenId: z.string().nullish(),
  effect: FeedbackFlagEffectSchema,
  priority: FeedbackPrioritySchema,
  status: FeedbackFlagStatusSchema.optional(),
  createdAt: z.string(),
  expiresAt: z.string().nullish(),
  confidenceDelta: z.number().nullish(),
  readinessCap: readinessCapSchema.nullish(),
  publicReasonKey: z.string().nullish(),
});

export const FeedbackSummarySchema = z.object({
  hasActiveFlags: z.boolean(),
  highestPriority: FeedbackPrioritySchema.optional(),
  pendingReviewCount: z.number().int(),
  recentReportCount: z.number().int(),
  lastReportAt: z.string().nullish(),
  publicMessageKey: publicReasonKeySchema.optional(),
});
