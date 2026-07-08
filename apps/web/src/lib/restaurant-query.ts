import type { Prisma } from '@prisma/client';
import { evaluateDishes, type DishRecommendationLike, type LocalUserProfile } from '@safebite/domain';
import { prisma } from './db';
import { dishCardToLike } from './restaurant-recommend';
import { dishToEvaluationInput } from './serializers';

// Shared WHERE for the PUBLIC restaurant surfaces: approved rows only (§8.1 visibility rule),
// plus the optional city/district/q/cuisine filters. `needs_review`/`rejected` are never exposed.
export function approvedRestaurantWhere(f: {
  city?: string;
  district?: string;
  q?: string;
  cuisine?: string;
}): Prisma.RestaurantWhereInput {
  const where: Prisma.RestaurantWhereInput = { reviewStatus: 'approved' };
  if (f.city) where.city = { equals: f.city, mode: 'insensitive' };
  if (f.district) where.district = { contains: f.district, mode: 'insensitive' };
  if (f.cuisine) where.cuisineNormalized = { has: f.cuisine };
  if (f.q) {
    where.OR = [
      { canonicalName: { contains: f.q, mode: 'insensitive' } },
      { nameEn: { contains: f.q, mode: 'insensitive' } },
      { nameVi: { contains: f.q, mode: 'insensitive' } },
    ];
  }
  return where;
}

// Evaluate the APPROVED dishes referenced by menu items once, keyed by dishId, so each menu
// item can reuse its mapped-dish recommendation as evidence-tier-4 inference. Unapproved or
// unmapped dishes are simply absent (evidence then falls back to explicit statuses / Unknown).
export async function loadDishRecMap(
  profile: LocalUserProfile,
  dishIds: Array<string | null | undefined>,
): Promise<Map<string, DishRecommendationLike>> {
  const map = new Map<string, DishRecommendationLike>();
  const ids = [...new Set(dishIds.filter((d): d is string => Boolean(d)))];
  if (ids.length === 0) return map;
  const dishes = await prisma.dish.findMany({
    where: { id: { in: ids }, reviewStatus: 'approved' },
    include: { allergenRisks: true },
  });
  const cards = evaluateDishes(profile, dishes.map(dishToEvaluationInput));
  for (const card of cards) map.set(card.dishId, dishCardToLike(card));
  return map;
}
