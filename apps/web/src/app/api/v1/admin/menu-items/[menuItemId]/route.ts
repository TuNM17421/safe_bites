import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { menuItemUpdateSchema } from '@/lib/admin-schemas';
import { adminMenuItemToDTO } from '@/features/admin/admin-serializers';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ menuItemId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { menuItemId } = await ctx.params;
  const item = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: { allergenStatuses: { orderBy: { allergenId: 'asc' } } },
  });
  if (!item) return apiError('NOT_FOUND', 'Menu item not found.', { status: 404 });
  return apiOk(adminMenuItemToDTO(item));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { menuItemId } = await ctx.params;
  const body = await parseBody(req, menuItemUpdateSchema);
  if (!body.ok) return body.response;
  try {
    const item = await prisma.menuItem.update({ where: { id: menuItemId }, data: body.data });
    return apiOk(adminMenuItemToDTO(item));
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return apiError('NOT_FOUND', 'Menu item not found.', { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { menuItemId } = await ctx.params;
  try {
    // Allergen statuses cascade on delete (FK onDelete: Cascade).
    await prisma.menuItem.delete({ where: { id: menuItemId } });
    return apiOk({ ok: true });
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return apiError('NOT_FOUND', 'Menu item not found.', { status: 404 });
    }
    throw e;
  }
}
