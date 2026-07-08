import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { allergenStatusReplaceSchema } from '@/lib/admin-schemas';
import { adminAllergenStatusToDTO } from '@/features/admin/admin-serializers';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ menuItemId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { menuItemId } = await ctx.params;
  const rows = await prisma.menuItemAllergenStatus.findMany({
    where: { menuItemId },
    orderBy: { allergenId: 'asc' },
  });
  return apiOk(rows.map(adminAllergenStatusToDTO));
}

// PUT replaces the full allergen-status set for a menu item (§9.4 simpler form).
export async function PUT(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { menuItemId } = await ctx.params;
  const body = await parseBody(req, allergenStatusReplaceSchema);
  if (!body.ok) return body.response;

  const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId }, select: { id: true } });
  if (!menuItem) return apiError('NOT_FOUND', 'Menu item not found.', { status: 404 });

  const data = body.data.statuses.map((s) => ({
    menuItemId,
    allergenId: s.allergenId,
    riskLevel: s.riskLevel,
    confidence: s.confidence,
    source: s.source,
    reasonEn: s.reasonEn,
    reasonVi: s.reasonVi ?? null,
    lastVerifiedAt: s.lastVerifiedAt ?? null,
    verificationStatus: s.verificationStatus,
  }));

  try {
    await prisma.$transaction([
      prisma.menuItemAllergenStatus.deleteMany({ where: { menuItemId } }),
      prisma.menuItemAllergenStatus.createMany({ data }),
    ]);
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2003') {
      return apiError('VALIDATION_ERROR', 'One or more allergenId values do not exist.', { status: 400 });
    }
    throw e;
  }

  const rows = await prisma.menuItemAllergenStatus.findMany({
    where: { menuItemId },
    orderBy: { allergenId: 'asc' },
  });
  return apiOk(rows.map(adminAllergenStatusToDTO));
}
