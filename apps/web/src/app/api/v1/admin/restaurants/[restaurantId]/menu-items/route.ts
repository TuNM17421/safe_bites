import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { menuItemCreateSchema } from '@/lib/admin-schemas';
import { adminMenuItemToDTO, slugId } from '@/features/admin/admin-serializers';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ restaurantId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { restaurantId } = await ctx.params;
  const rows = await prisma.menuItem.findMany({
    where: { restaurantId },
    include: { allergenStatuses: { orderBy: { allergenId: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  });
  return apiOk(rows.map(adminMenuItemToDTO));
}

export async function POST(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { restaurantId } = await ctx.params;
  const body = await parseBody(req, menuItemCreateSchema);
  if (!body.ok) return body.response;
  const { id, observedAt, ...rest } = body.data;
  try {
    const item = await prisma.menuItem.create({
      data: {
        ...rest,
        id: id ?? slugId(rest.rawName, 'mi'),
        restaurantId,
        observedAt: observedAt ?? new Date(),
      },
    });
    return apiOk(adminMenuItemToDTO(item), { status: 201 });
  } catch (e) {
    const code = (e as Prisma.PrismaClientKnownRequestError).code;
    if (code === 'P2002') return apiError('CONFLICT', 'A menu item with this id already exists.', { status: 409 });
    if (code === 'P2003') return apiError('NOT_FOUND', 'Restaurant not found.', { status: 404 });
    throw e;
  }
}
