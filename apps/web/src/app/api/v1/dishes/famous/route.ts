import { z } from 'zod';
import { apiOk, parseQuery } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { dishToDTO } from '@/lib/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({ city: z.string().min(1).max(80).default('hanoi') });

// v2 /famous — curated famous dishes for a city (Dish.isFamous), each with a city-scoped count of
// approved restaurants serving it (single MenuItem.dishId groupBy, no N+1). Read-only, approved
// dishes only; the per-profile traffic-light chip is derived client-side (profile stays on device).
export async function GET(req: Request) {
  const parsed = parseQuery(req.url, querySchema);
  if (!parsed.ok) return parsed.response;
  const { city } = parsed.data;

  const dishes = await prisma.dish.findMany({
    where: { isFamous: true, reviewStatus: 'approved', regionTags: { has: city } },
    include: { allergenRisks: true },
    orderBy: [{ featuredRank: 'asc' }, { canonicalNameEn: 'asc' }],
  });

  const counts = dishes.length
    ? await prisma.menuItem.groupBy({
        by: ['dishId'],
        where: { dishId: { in: dishes.map((d) => d.id) }, restaurant: { city, reviewStatus: 'approved' } },
        _count: { _all: true },
      })
    : [];
  const countMap = new Map(counts.map((c) => [c.dishId, c._count._all]));

  return apiOk({
    dishes: dishes.map((d) => ({ ...dishToDTO(d), restaurantCount: countMap.get(d.id) ?? 0 })),
  });
}
