import { restaurantBrowseQuerySchema } from '@safebite/domain';
import { apiOk, parseQuery } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { approvedRestaurantWhere } from '@/lib/restaurant-query';
import { attributionFor, restaurantSummaryDTO } from '@/lib/restaurant-serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// §8.1 — non-personalized browse. Approved rows only; id-cursor pagination; OSM/OpenMap
// attribution surfaced. No profile/allergen anywhere in the query (§16.1).
export async function GET(req: Request) {
  const q = parseQuery(req.url, restaurantBrowseQuerySchema);
  if (!q.ok) return q.response;
  const { city, district, q: search, cuisine, limit, cursor } = q.data;

  const where = approvedRestaurantWhere({ city, district, q: search, cuisine });
  const rows = await prisma.restaurant.findMany({
    where,
    include: { _count: { select: { menuItems: true } } },
    orderBy: { id: 'asc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  const restaurants = page.map((r) => restaurantSummaryDTO(r, r._count.menuItems > 0));
  const attribution = attributionFor(page.map((r) => r.externalSource));

  return apiOk({ restaurants, nextCursor, attribution });
}
