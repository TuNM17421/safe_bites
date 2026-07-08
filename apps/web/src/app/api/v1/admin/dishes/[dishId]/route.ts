import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { dishUpdateSchema } from '@/lib/admin-schemas';
import { adminDishToDTO } from '@/features/admin/admin-serializers';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ dishId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { dishId } = await ctx.params;
  const body = await parseBody(req, dishUpdateSchema);
  if (!body.ok) return body.response;
  try {
    const dish = await prisma.dish.update({ where: { id: dishId }, data: body.data });
    return apiOk(adminDishToDTO(dish));
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return apiError('NOT_FOUND', 'Dish not found.', { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { dishId } = await ctx.params;
  try {
    await prisma.dish.delete({ where: { id: dishId } });
    return apiOk({ ok: true });
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return apiError('NOT_FOUND', 'Dish not found.', { status: 404 });
    }
    throw e;
  }
}
