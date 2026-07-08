import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { apiOk, parseQuery } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { dishToDTO } from '@/lib/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  city: z.string().min(1),
  review_status: z.enum(['approved', 'needs_review', 'all']).default('approved'),
});

// §9.4 — dishes filtered by city (region_tags) and review status (default approved).
export async function GET(req: Request) {
  const parsed = parseQuery(req.url, querySchema);
  if (!parsed.ok) return parsed.response;
  const { city, review_status } = parsed.data;

  const where: Prisma.DishWhereInput = { regionTags: { has: city } };
  if (review_status !== 'all') where.reviewStatus = review_status;

  const dishes = await prisma.dish.findMany({
    where,
    include: { allergenRisks: true },
    orderBy: { id: 'asc' },
  });
  return apiOk({ items: dishes.map(dishToDTO) });
}
