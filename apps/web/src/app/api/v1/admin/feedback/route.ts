import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { adminFeedbackListQuerySchema } from '@/lib/admin-feedback-schemas';
import { apiOk, parseQuery } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { feedbackReportRowToListDTO } from '@/features/admin/feedback/admin-feedback-serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEK_MS = 7 * 86_400_000;

// GET /api/v1/admin/feedback — filtered, offset-paginated list (spec §10.1). Urgent-first, then
// newest. Offset pagination matches the restaurants route (Prisma enum fields don't support keyset
// `lt`/`gt`; admin volumes are small). `meta` carries the §16.1 summary-card / nav-badge counts.
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const q = parseQuery(req.url, adminFeedbackListQuerySchema);
  if (!q.ok) return q.response;
  const f = q.data;

  const where: Prisma.FeedbackReportWhereInput = {};
  if (f.status) where.status = f.status;
  if (f.priority) where.priority = f.priority;
  if (f.reaction) where.reaction = f.reaction;
  if (f.restaurantId) where.restaurantId = f.restaurantId;
  if (f.menuItemId) where.menuItemId = f.menuItemId;
  if (f.allergenId) where.allergenIds = { has: f.allergenId };
  if (f.hasActiveFlag === 'true') where.flags = { some: { status: 'active' } };
  if (f.hasActiveFlag === 'false') where.flags = { none: { status: 'active' } };
  if (f.createdFrom || f.createdTo) {
    where.createdAt = {
      ...(f.createdFrom ? { gte: new Date(f.createdFrom) } : {}),
      ...(f.createdTo ? { lte: new Date(f.createdTo) } : {}),
    };
  }

  const offset = f.cursor ? Math.max(0, Number.parseInt(f.cursor, 10) || 0) : 0;
  const rows = await prisma.feedbackReport.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    skip: offset,
    take: f.limit + 1,
    include: {
      restaurant: { select: { id: true, canonicalName: true, nameEn: true, nameVi: true } },
      menuItem: { select: { id: true, rawName: true, nameEn: true, nameVi: true } },
      flags: { where: { status: 'active' }, select: { id: true } },
    },
  });

  const hasMore = rows.length > f.limit;
  const page = hasMore ? rows.slice(0, f.limit) : rows;
  const nextCursor = hasMore ? String(offset + f.limit) : null;

  const weekAgo = new Date(Date.now() - WEEK_MS);
  const [urgentPendingCount, needsReviewCount, inReviewCount, resolvedThisWeekCount, activeFlagCount] = await Promise.all([
    prisma.feedbackReport.count({ where: { priority: 'urgent', status: { in: ['needs_review', 'in_review'] } } }),
    prisma.feedbackReport.count({ where: { status: 'needs_review' } }),
    prisma.feedbackReport.count({ where: { status: 'in_review' } }),
    prisma.feedbackReport.count({ where: { status: 'resolved', updatedAt: { gte: weekAgo } } }),
    prisma.feedbackFlag.count({ where: { status: 'active' } }),
  ]);

  return apiOk({
    items: page.map(feedbackReportRowToListDTO),
    nextCursor,
    meta: { urgentPendingCount, needsReviewCount, inReviewCount, resolvedThisWeekCount, activeFlagCount },
  });
}
