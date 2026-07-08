import { apiError, apiOk } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { attributionFor, restaurantDetailDTO } from '@/lib/restaurant-serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ restaurantIdOrSlug: string }> };

// §8.2 — approved restaurant metadata + raw menu rows, no personalization. Resolves by id OR slug.
export async function GET(_req: Request, ctx: Ctx) {
  const { restaurantIdOrSlug } = await ctx.params;
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      reviewStatus: 'approved',
      OR: [{ id: restaurantIdOrSlug }, { slug: restaurantIdOrSlug }],
    },
    include: {
      menuItems: {
        include: { allergenStatuses: true },
        orderBy: [{ section: 'asc' }, { rawName: 'asc' }],
      },
    },
  });
  if (!restaurant) return apiError('NOT_FOUND', 'Restaurant not found.', { status: 404 });

  return apiOk({
    restaurant: restaurantDetailDTO(restaurant),
    attribution: attributionFor([restaurant.externalSource]),
  });
}
