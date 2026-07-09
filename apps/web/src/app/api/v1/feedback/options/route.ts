import { z } from 'zod';
import { apiError, apiOk, parseQuery } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { approvedRestaurantWhere } from '@/lib/restaurant-query';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const optionsQuerySchema = z.object({ restaurantId: z.string().min(1) });

// GET /api/v1/feedback/options?restaurantId= — public metadata for the feedback form (spec §9.4).
// Approved restaurants only; returns names + menu items + the allergen catalog. No internal
// confidence/verification data, no allergen statuses.
export async function GET(req: Request) {
  const q = parseQuery(req.url, optionsQuerySchema);
  if (!q.ok) return q.response;

  const restaurant = await prisma.restaurant.findFirst({
    where: { ...approvedRestaurantWhere({}), id: q.data.restaurantId },
    select: {
      id: true,
      canonicalName: true,
      nameEn: true,
      nameVi: true,
      city: true,
      menuItems: {
        select: { id: true, rawName: true, nameEn: true, nameVi: true, dishId: true },
        orderBy: { rawName: 'asc' },
      },
    },
  });
  if (!restaurant) return apiError('NOT_FOUND', 'Restaurant not found.', { status: 404 });

  // MenuItem.dishId is a loose scalar (no Prisma relation) — resolve dish names in one batch query.
  const dishIds = [...new Set(restaurant.menuItems.map((m) => m.dishId).filter((d): d is string => Boolean(d)))];
  const dishes = dishIds.length
    ? await prisma.dish.findMany({
        where: { id: { in: dishIds } },
        select: { id: true, canonicalNameEn: true, canonicalNameVi: true },
      })
    : [];
  const dishNameById = new Map(dishes.map((d) => [d.id, d.canonicalNameEn ?? d.canonicalNameVi]));

  const allergens = await prisma.allergen.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, nameEn: true, nameVi: true },
  });

  return apiOk({
    restaurant: {
      id: restaurant.id,
      name: restaurant.nameEn ?? restaurant.nameVi ?? restaurant.canonicalName,
      city: restaurant.city,
    },
    menuItems: restaurant.menuItems.map((m) => ({
      id: m.id,
      name: m.nameEn ?? m.nameVi ?? m.rawName,
      dishId: m.dishId,
      dishName: m.dishId ? (dishNameById.get(m.dishId) ?? null) : null,
    })),
    allergens: allergens.map((a) => ({ id: a.id, nameEn: a.nameEn, nameVi: a.nameVi })),
  });
}
