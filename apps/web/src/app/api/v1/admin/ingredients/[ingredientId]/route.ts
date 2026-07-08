import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { ingredientUpdateSchema } from '@/lib/admin-schemas';
import { adminIngredientToDTO } from '@/features/admin/admin-serializers';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ ingredientId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { ingredientId } = await ctx.params;
  const body = await parseBody(req, ingredientUpdateSchema);
  if (!body.ok) return body.response;
  try {
    const ingredient = await prisma.ingredient.update({ where: { id: ingredientId }, data: body.data });
    return apiOk(adminIngredientToDTO(ingredient));
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return apiError('NOT_FOUND', 'Ingredient not found.', { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { ingredientId } = await ctx.params;
  try {
    await prisma.ingredient.delete({ where: { id: ingredientId } });
    return apiOk({ ok: true });
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return apiError('NOT_FOUND', 'Ingredient not found.', { status: 404 });
    }
    throw e;
  }
}
