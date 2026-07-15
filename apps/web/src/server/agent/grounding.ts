import 'server-only';
import { compatibilityPercent, type LocalUserProfile } from '@safebite/domain';
import { prisma } from '@/lib/db';
import { buildProfile, recommendRestaurant } from '@/lib/restaurant-recommend';
import { approvedRestaurantWhere, loadDishRecMap } from '@/lib/restaurant-query';
import { restaurantDisplayName } from '@/lib/restaurant-serializers';
export { resolveIngredient } from '@/server/ingredients/resolve-ingredient';

// Real, DB-grounded facts handed to the model so it can only phrase + select — never invent an
// entity. Every id the model returns is verified against this set before it reaches the user.
export interface GroundedMenuItem {
  menuItemId: string;
  name: string;
}
export interface GroundedRestaurant {
  restaurantId: string;
  slug: string | null;
  nameEn: string;
  nameVi: string;
  district: string | null;
  compatibility: number | null; // REAL % from the recommendation engine (not canned)
  menuItems: GroundedMenuItem[];
}

// Build a risk-relevant profile from just the allergen ids the chat request carries (conservative
// defaults — moderate severity, cross-contact unknown). Location/name are irrelevant to grounding.
function profileFromAllergens(allergenIds: string[], city: string): LocalUserProfile {
  return buildProfile(
    {
      id: 'agent',
      selectedProfileIds: [],
      allergies: allergenIds.map((allergenId) => ({ allergenId, severity: 'moderate', crossContactSensitive: 'not_sure' })),
      language: 'en',
    },
    city,
  );
}

// Top approved restaurants for the city ranked by REAL compatibility %, each with a few menu items
// for proposal grounding. Reuses the same engine the map/list use — one source of truth.
export async function fetchGroundedRestaurants(
  city: string,
  allergenIds: string[],
  limit = 6,
): Promise<GroundedRestaurant[]> {
  const restaurants = await prisma.restaurant.findMany({
    where: approvedRestaurantWhere({ city }),
    include: { menuItems: { include: { allergenStatuses: true } } },
    orderBy: { id: 'asc' },
    take: 50,
  });
  if (restaurants.length === 0) return [];

  const profile = profileFromAllergens(allergenIds, city);
  const now = new Date();
  const dishRecMap = await loadDishRecMap(profile, restaurants.flatMap((r) => r.menuItems.map((m) => m.dishId)));

  const items = restaurants.map((r) => {
    const { recommendation } = recommendRestaurant(r, dishRecMap, profile, now);
    const name = restaurantDisplayName(r);
    return {
      restaurantId: r.id,
      slug: r.slug,
      nameEn: name.en,
      nameVi: name.vi,
      district: r.district,
      compatibility: compatibilityPercent(recommendation.counts),
      menuItems: r.menuItems.slice(0, 6).map((m) => ({ menuItemId: m.id, name: m.nameEn ?? m.rawName })),
    };
  });

  items.sort((a, b) => (b.compatibility ?? -1) - (a.compatibility ?? -1));
  return items.slice(0, limit);
}
