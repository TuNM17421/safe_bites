import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { dishCreateSchema, reviewStatusQuerySchema } from '@/lib/admin-schemas';
import { adminDishToDTO, slugId } from '@/features/admin/admin-serializers';
import { apiError, apiOk, parseBody, parseQuery } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const q = parseQuery(req.url, reviewStatusQuerySchema);
  if (!q.ok) return q.response;
  const where = q.data.review_status === 'all' ? {} : { reviewStatus: q.data.review_status };
  const rows = await prisma.dish.findMany({ where, orderBy: { updatedAt: 'desc' } });
  return apiOk(rows.map(adminDishToDTO));
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await parseBody(req, dishCreateSchema);
  if (!body.ok) return body.response;
  const { id, ...rest } = body.data;
  try {
    const dish = await prisma.dish.create({ data: { id: id ?? slugId(rest.canonicalNameEn, 'dish'), ...rest } });
    return apiOk(adminDishToDTO(dish), { status: 201 });
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
      return apiError('CONFLICT', 'A dish with this id already exists.', { status: 409 });
    }
    throw e;
  }
}
