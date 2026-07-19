// Zod schemas for the admin feedback API (spec §10.1/§10.3/§10.4). Reuses the domain enum schemas
// (no parallel literals) and the domain admin-action input schema.

import { z } from 'zod';
import {
  FeedbackAdminActionInputSchema,
  FeedbackPrioritySchema,
  FeedbackReactionSchema,
  FeedbackReportStatusSchema,
} from '@safebite/domain';

const isoDateTime = z.string().datetime({ offset: true });

export const adminFeedbackListQuerySchema = z.object({
  status: FeedbackReportStatusSchema.optional(),
  priority: FeedbackPrioritySchema.optional(),
  reaction: FeedbackReactionSchema.optional(),
  restaurantId: z.string().optional(),
  menuItemId: z.string().optional(),
  allergenId: z.string().optional(),
  hasActiveFlag: z.enum(['true', 'false']).optional(),
  createdFrom: isoDateTime.optional(),
  createdTo: isoDateTime.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AdminFeedbackListQuery = z.infer<typeof adminFeedbackListQuerySchema>;

export const adminFeedbackPatchSchema = z.object({
  status: FeedbackReportStatusSchema.optional(),
  adminSummary: z.string().max(1000).nullish(),
  reviewOutcome: z.string().max(200).nullish(),
});

// Extends the domain action-input with the admin-only fields the side effects need.
export const adminFeedbackActionSchema = FeedbackAdminActionInputSchema.extend({
  confidenceDelta: z.number().nullish(),
  flagId: z.string().nullish(),
}).superRefine((val, ctx) => {
  const needsTarget = ['suppress_suitable_until_review', 'apply_confidence_downgrade', 'hide_menu_item_temporarily'];
  if (needsTarget.includes(val.actionType) && !val.target) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'This action requires a target.', path: ['target'] });
  }
  if (val.actionType === 'confirm_feedback_flag' && !val.target && !val.flagId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'confirm_feedback_flag requires a target or flagId.', path: ['target'] });
  }
});
export type AdminFeedbackAction = z.infer<typeof adminFeedbackActionSchema>;
