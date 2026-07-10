import { summarizeIngredientProvenance } from '@safebite/domain';
import { z } from 'zod';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ menuItemId: string }> };

const menuItemIdSchema = z.string().min(1).max(200);
const addSchema = z.object({ ingredientId: z.string().min(1).max(200) }).strict();

// §5.6 — per-restaurant ingredient provenance for a menu item. The traffic-light dot is derived
// client-side from `allergenTags` vs the on-device profile (profile never leaves the device).
export async function GET(_req: Request, ctx: Ctx) {
  const parsed = menuItemIdSchema.safeParse((await ctx.params).menuItemId);
  if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid menu item id.', { status: 400 });
  const menuItemId = parsed.data;

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    select: { id: true, restaurantId: true, rawName: true, nameEn: true, nameVi: true },
  });
  if (!menuItem) return apiError('NOT_FOUND', 'Menu item not found.', { status: 404 });

  const rows = await prisma.menuItemIngredient.findMany({
    where: { menuItemId },
    include: { ingredient: { select: { canonicalNameEn: true, canonicalNameVi: true, majorAllergenTags: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return apiOk({
    menuItem: {
      id: menuItem.id,
      restaurantId: menuItem.restaurantId,
      name: { en: menuItem.nameEn ?? menuItem.rawName, vi: menuItem.nameVi ?? menuItem.rawName },
    },
    ingredients: rows.map((r) => ({
      id: r.id,
      ingredientId: r.ingredientId,
      name: { en: r.ingredient.canonicalNameEn, vi: r.ingredient.canonicalNameVi },
      allergenTags: r.ingredient.majorAllergenTags,
      note: r.note,
      source: r.source,
      contributorType: r.contributorType,
      verificationStatus: r.verificationStatus,
    })),
    provenance: summarizeIngredientProvenance(rows.map((r) => ({ contributorType: r.contributorType }))),
  });
}

// Add an ingredient (human-in-the-loop): always written as an unverified user contribution — the
// client can never elevate provenance. Idempotent on (menuItemId, ingredientId).
export async function POST(req: Request, ctx: Ctx) {
  const idParsed = menuItemIdSchema.safeParse((await ctx.params).menuItemId);
  if (!idParsed.success) return apiError('VALIDATION_ERROR', 'Invalid menu item id.', { status: 400 });
  const body = await parseBody(req, addSchema);
  if (!body.ok) return body.response;
  const menuItemId = idParsed.data;

  const [menuItem, ingredient] = await Promise.all([
    prisma.menuItem.findUnique({ where: { id: menuItemId }, select: { id: true } }),
    prisma.ingredient.findUnique({ where: { id: body.data.ingredientId }, select: { id: true } }),
  ]);
  if (!menuItem) return apiError('NOT_FOUND', 'Menu item not found.', { status: 404 });
  if (!ingredient) return apiError('NOT_FOUND', 'Ingredient not found.', { status: 404 });

  const row = await prisma.menuItemIngredient.upsert({
    where: { menuItemId_ingredientId: { menuItemId, ingredientId: body.data.ingredientId } },
    update: {},
    create: {
      menuItemId,
      ingredientId: body.data.ingredientId,
      source: 'user_contribution',
      contributorType: 'user',
      verificationStatus: 'unverified',
    },
    select: { id: true },
  });
  return apiOk({ id: row.id }, { status: 201 });
}
