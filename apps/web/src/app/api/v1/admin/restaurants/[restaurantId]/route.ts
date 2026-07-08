import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { restaurantUpdateSchema } from '@/lib/admin-schemas';
import { adminRestaurantToDTO } from '@/features/admin/admin-serializers';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ restaurantId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { restaurantId } = await ctx.params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: { _count: { select: { menuItems: true } } },
  });
  if (!restaurant) return apiError('NOT_FOUND', 'Restaurant not found.', { status: 404 });
  return apiOk(adminRestaurantToDTO(restaurant));
}

// PATCH covers edit and the review actions (approve/reject/flag) as status transitions (§9.2).
export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { restaurantId } = await ctx.params;
  const body = await parseBody(req, restaurantUpdateSchema);
  if (!body.ok) return body.response;
  try {
    const restaurant = await prisma.restaurant.update({ where: { id: restaurantId }, data: body.data });
    return apiOk(adminRestaurantToDTO(restaurant));
  } catch (e) {
    const code = (e as Prisma.PrismaClientKnownRequestError).code;
    if (code === 'P2025') return apiError('NOT_FOUND', 'Restaurant not found.', { status: 404 });
    if (code === 'P2002') return apiError('CONFLICT', 'Slug already in use.', { status: 409 });
    throw e;
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { restaurantId } = await ctx.params;
  // Block hard delete when menu items exist (§9.1) — admin must remove/reassign menu first.
  const menuCount = await prisma.menuItem.count({ where: { restaurantId } });
  if (menuCount > 0) {
    return apiError('CONFLICT', 'Cannot delete a restaurant that still has menu items.', { status: 409 });
  }
  try {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    return apiOk({ ok: true });
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return apiError('NOT_FOUND', 'Restaurant not found.', { status: 404 });
    }
    throw e;
  }
}
