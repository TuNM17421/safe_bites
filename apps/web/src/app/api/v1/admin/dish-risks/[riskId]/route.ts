import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { dishRiskUpdateSchema } from '@/lib/admin-schemas';
import { adminRiskToDTO } from '@/features/admin/admin-serializers';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ riskId: string }> };

// Editing a risk re-stamps `lastCheckedAt` so every risk row carries an honest last-checked
// timestamp (§0/§13 evidence requirement).
export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { riskId } = await ctx.params;
  const body = await parseBody(req, dishRiskUpdateSchema);
  if (!body.ok) return body.response;
  try {
    const risk = await prisma.dishAllergenRisk.update({
      where: { id: riskId },
      data: { ...body.data, lastCheckedAt: new Date() },
    });
    return apiOk(adminRiskToDTO(risk));
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return apiError('NOT_FOUND', 'Risk not found.', { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { riskId } = await ctx.params;
  try {
    await prisma.dishAllergenRisk.delete({ where: { id: riskId } });
    return apiOk({ ok: true });
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return apiError('NOT_FOUND', 'Risk not found.', { status: 404 });
    }
    throw e;
  }
}
