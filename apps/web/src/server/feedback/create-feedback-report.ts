// Feedback submission persistence (spec §9.1/§9.3, §17.2). Entity resolution + the idempotent,
// transactional write. The pure planning lives in `plan-feedback-report.ts`; trust logic in the
// domain. Nothing here echoes raw user text and no geolocation is ever stored (§2.3).

import type { FeedbackFlag, FeedbackReport, Prisma } from '@prisma/client';
import type { FeedbackReportInput } from '@safebite/domain';
import { prisma } from '@/lib/db';
import { approvedRestaurantWhere } from '@/lib/restaurant-query';
import { createAutoFlags } from './create-auto-flags';
import { buildMinimalProfileSnapshot, type FeedbackReportPlan, type ResolvedEntities } from './plan-feedback-report';

export interface FeedbackReportResponseBody {
  reportId: string;
  clientReportId: string;
  status: string;
  priority: string;
  severeAutoFlagged: boolean;
  activeFlagIds?: string[];
  createdAt: string;
}

/** Entity-resolution failure; the route maps this to a 404 without leaking internals. */
export class FeedbackEntityError extends Error {
  constructor(public readonly reason: 'restaurant_not_found' | 'menu_item_not_found' | 'dish_not_found') {
    super(reason);
    this.name = 'FeedbackEntityError';
  }
}

/** Verify referenced records exist + belong together (approved restaurant only) and derive dishId. */
export async function resolveEntities(input: FeedbackReportInput): Promise<ResolvedEntities> {
  const restaurant = await prisma.restaurant.findFirst({
    where: { ...approvedRestaurantWhere({}), id: input.restaurantId },
    select: { id: true },
  });
  if (!restaurant) throw new FeedbackEntityError('restaurant_not_found');

  let dishId: string | null = null;

  if (input.menuItemId) {
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: input.menuItemId, restaurantId: input.restaurantId },
      select: { dishId: true },
    });
    if (!menuItem) throw new FeedbackEntityError('menu_item_not_found');
    // The menu item's mapping is authoritative — a client-supplied dishId is ignored for a
    // menu-item report so a mismatched dish can never be persisted against the item.
    dishId = menuItem.dishId ?? null;
  } else if (input.dishId) {
    dishId = input.dishId;
  }

  if (dishId) {
    const dish = await prisma.dish.findUnique({ where: { id: dishId }, select: { id: true } });
    if (!dish) throw new FeedbackEntityError('dish_not_found');
  }

  return { dishId };
}

function toJsonOrUndefined(value: unknown): Prisma.InputJsonValue | undefined {
  return value == null ? undefined : (value as Prisma.InputJsonValue);
}

function toReportResponse(report: FeedbackReport, flags: FeedbackFlag[]): FeedbackReportResponseBody {
  const activeFlagIds = flags.filter((f) => f.status === 'active').map((f) => f.id);
  const body: FeedbackReportResponseBody = {
    reportId: report.id,
    clientReportId: report.clientReportId,
    status: report.status,
    priority: report.priority,
    severeAutoFlagged: report.severeAutoFlagged,
    createdAt: report.createdAt.toISOString(),
  };
  if (activeFlagIds.length) body.activeFlagIds = activeFlagIds;
  return body;
}

/**
 * Idempotent transactional write. If the `clientReportId` already exists (or races to a P2002),
 * the existing report is returned unchanged — no duplicate report or flags. Severe/anaphylaxis
 * plans create active flags + system audit rows atomically.
 */
export async function persistFeedbackReport(
  plan: FeedbackReportPlan,
): Promise<{ body: FeedbackReportResponseBody; created: boolean }> {
  const { input, resolved, priority, severeAutoFlagged, flagSpecs } = plan;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.feedbackReport.findUnique({
        where: { clientReportId: input.clientReportId },
        include: { flags: true },
      });
      if (existing) return { body: toReportResponse(existing, existing.flags), created: false };

      const report = await tx.feedbackReport.create({
        data: {
          clientReportId: input.clientReportId,
          city: input.city,
          locale: input.locale ?? null,
          clientPlatform: input.clientPlatform,
          submissionSource: input.submissionSource,
          offlineCreatedAt: input.offlineCreatedAt ? new Date(input.offlineCreatedAt) : null,
          restaurantId: input.restaurantId,
          menuItemId: input.menuItemId ?? null,
          dishId: resolved.dishId,
          allergenIds: input.allergenIds,
          profileSnapshot: buildMinimalProfileSnapshot(input) as unknown as Prisma.InputJsonValue,
          recommendationSnapshot: toJsonOrUndefined(input.recommendationSnapshot),
          ateHere: input.ateHere ?? null,
          visitedAt: input.visitedAt ? new Date(input.visitedAt) : null,
          askedStaff: input.askedStaff ?? null,
          staffAnswer: input.staffAnswer ?? null,
          staffAnswerText: input.staffAnswerText ?? null,
          reaction: input.reaction,
          reactionTiming: input.reactionTiming ?? null,
          userTrustRating: input.userTrustRating ?? null,
          notes: input.notes ?? null,
          reporterRef: input.reporterRef ?? null,
          correctionIngredientId: input.correctionIngredientId ?? null,
          correctionPresent: input.correctionPresent ?? null,
          status: 'needs_review',
          priority,
          severeAutoFlagged,
        },
      });

      const flags = flagSpecs.length ? await createAutoFlags(tx, report.id, flagSpecs) : [];
      return { body: toReportResponse(report, flags), created: true };
    });
  } catch (e) {
    // Idempotency race: a concurrent submit won the unique clientReportId. Re-read + return it.
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
      const existing = await prisma.feedbackReport.findUnique({
        where: { clientReportId: input.clientReportId },
        include: { flags: true },
      });
      if (existing) return { body: toReportResponse(existing, existing.flags), created: false };
    }
    throw e;
  }
}
