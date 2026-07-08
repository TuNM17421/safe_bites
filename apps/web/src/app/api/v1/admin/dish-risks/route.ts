import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { dishIdQuerySchema, dishRiskCreateSchema, reviewStatusQuerySchema } from '@/lib/admin-schemas';
import { adminRiskToDTO } from '@/features/admin/admin-serializers';
import { apiError, apiOk, parseBody, parseQuery } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const listQuerySchema = dishIdQuerySchema.merge(reviewStatusQuerySchema);

// GET requires ?dishId= (§9.7): a dish's risks, newest first.
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const q = parseQuery(req.url, listQuerySchema);
  if (!q.ok) return q.response;
  const where = {
    dishId: q.data.dishId,
    ...(q.data.review_status === 'all' ? {} : { reviewStatus: q.data.review_status }),
  };
  const rows = await prisma.dishAllergenRisk.findMany({ where, orderBy: { updatedAt: 'desc' } });
  return apiOk(rows.map(adminRiskToDTO));
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await parseBody(req, dishRiskCreateSchema);
  if (!body.ok) return body.response;
  try {
    const risk = await prisma.dishAllergenRisk.create({ data: { ...body.data, lastCheckedAt: new Date() } });
    return apiOk(adminRiskToDTO(risk), { status: 201 });
  } catch (e) {
    const code = (e as Prisma.PrismaClientKnownRequestError).code;
    if (code === 'P2002') {
      return apiError('CONFLICT', 'A risk for this dish + allergen already exists.', { status: 409 });
    }
    if (code === 'P2003') {
      return apiError('NOT_FOUND', 'Dish or allergen not found.', { status: 404 });
    }
    throw e;
  }
}
