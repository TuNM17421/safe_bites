import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { adminFeedbackPatchSchema } from '@/lib/admin-feedback-schemas';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import {
  actionRowToDTO,
  feedbackReportCoreToDTO,
  feedbackReportRelatedDTO,
  flagRowToAdminDTO,
} from '@/features/admin/feedback/admin-feedback-serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NINETY_DAYS_MS = 90 * 86_400_000;

type Ctx = { params: Promise<{ reportId: string }> };

// GET — full review context (spec §10.2): report + restaurant/menu-item/dish/allergen metadata +
// stored recommendationSnapshot + active flags + ≤90d related reports + full action history.
export async function GET(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { reportId } = await ctx.params;

  const report = await prisma.feedbackReport.findUnique({
    where: { id: reportId },
    include: {
      restaurant: {
        select: {
          id: true, canonicalName: true, nameEn: true, nameVi: true, city: true,
          verificationStatus: true, menuStatus: true, reviewStatus: true, externalSource: true, sourceObservedAt: true,
        },
      },
      menuItem: { select: { id: true, rawName: true, nameEn: true, nameVi: true, dishId: true, menuStatus: true } },
      flags: { where: { status: 'active' }, orderBy: { createdAt: 'desc' } },
      actions: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!report) return apiError('NOT_FOUND', 'Feedback report not found.', { status: 404 });

  const dishId = report.dishId ?? report.menuItem?.dishId ?? null;
  const [dish, allergens, related] = await Promise.all([
    dishId
      ? prisma.dish.findUnique({ where: { id: dishId }, select: { id: true, canonicalNameEn: true, canonicalNameVi: true } })
      : Promise.resolve(null),
    report.allergenIds.length
      ? prisma.allergen.findMany({ where: { id: { in: report.allergenIds } }, select: { id: true, nameEn: true, nameVi: true } })
      : Promise.resolve([]),
    prisma.feedbackReport.findMany({
      where: {
        id: { not: reportId },
        createdAt: { gte: new Date(Date.now() - NINETY_DAYS_MS) },
        OR: [
          { restaurantId: report.restaurantId },
          ...(report.menuItemId ? [{ menuItemId: report.menuItemId }] : []),
          ...(report.allergenIds.length ? [{ allergenIds: { hasSome: report.allergenIds } }] : []),
        ],
      },
      select: { id: true, createdAt: true, status: true, priority: true, reaction: true, restaurantId: true, menuItemId: true, allergenIds: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return apiOk({
    report: feedbackReportCoreToDTO(report),
    restaurant: {
      id: report.restaurant.id,
      name: { en: report.restaurant.nameEn ?? report.restaurant.canonicalName, vi: report.restaurant.nameVi ?? report.restaurant.canonicalName },
      city: report.restaurant.city,
      verificationStatus: report.restaurant.verificationStatus,
      menuStatus: report.restaurant.menuStatus,
      reviewStatus: report.restaurant.reviewStatus,
      source: report.restaurant.externalSource,
      lastCheckedAt: report.restaurant.sourceObservedAt ? report.restaurant.sourceObservedAt.toISOString() : null,
    },
    menuItem: report.menuItem
      ? { id: report.menuItem.id, name: { en: report.menuItem.nameEn ?? report.menuItem.rawName, vi: report.menuItem.nameVi ?? report.menuItem.rawName }, dishId: report.menuItem.dishId, menuStatus: report.menuItem.menuStatus }
      : null,
    dish: dish ? { id: dish.id, name: { en: dish.canonicalNameEn, vi: dish.canonicalNameVi } } : null,
    allergens: allergens.map((a) => ({ id: a.id, nameEn: a.nameEn, nameVi: a.nameVi })),
    activeFlags: report.flags.map(flagRowToAdminDTO),
    relatedReports: related.map(feedbackReportRelatedDTO),
    actions: report.actions.map(actionRowToDTO),
  });
}

// PATCH — simple state change (spec §10.3): status/adminSummary/reviewOutcome only, with an audit
// row. Richer side effects go through POST .../actions.
export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { reportId } = await ctx.params;
  const body = await parseBody(req, adminFeedbackPatchSchema);
  if (!body.ok) return body.response;
  const patch = body.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.feedbackReport.findUnique({
        where: { id: reportId },
        select: { status: true, adminSummary: true, reviewOutcome: true },
      });
      if (!before) return null;
      const leavingNeedsReview = patch.status !== undefined && patch.status !== 'needs_review' && before.status === 'needs_review';
      const updated = await tx.feedbackReport.update({
        where: { id: reportId },
        data: {
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.adminSummary !== undefined ? { adminSummary: patch.adminSummary } : {}),
          ...(patch.reviewOutcome !== undefined ? { reviewOutcome: patch.reviewOutcome } : {}),
          ...(leavingNeedsReview ? { reviewedAt: new Date(), reviewedBy: 'admin' } : {}),
        },
        select: { status: true, adminSummary: true, reviewOutcome: true },
      });
      await tx.feedbackAdminAction.create({
        data: {
          reportId,
          actionType: 'add_note',
          actor: 'admin',
          note: patch.adminSummary ?? null,
          before: before as Prisma.InputJsonValue,
          after: updated as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
    if (!result) return apiError('NOT_FOUND', 'Feedback report not found.', { status: 404 });
    return apiOk({ reportId, ...result });
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return apiError('NOT_FOUND', 'Feedback report not found.', { status: 404 });
    }
    throw e;
  }
}
