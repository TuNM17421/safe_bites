import {
  evaluateMenuItem,
  evaluateRestaurantReadiness,
  type DishRecommendationCard,
  type DishRecommendationLike,
  type LocalUserProfile,
  type MenuItemRecommendation,
  type RestaurantMenuStatus,
  type RestaurantRecommendation,
  type RestaurantVerificationStatus,
} from '@safebite/domain';
import { toAllergenStatusLike, toMenuItemLike, toRestaurantLike, type RestaurantWithMenu } from './restaurant-serializers';

// Partial recommendation-request profile.
interface PartialProfile {
  id: string;
  selectedProfileIds: string[];
  allergies: LocalUserProfile['allergies'];
  language: LocalUserProfile['language'];
  destinationCity?: string;
}

// Fill a full LocalUserProfile from the posted partial (the client only sends the risk-relevant
// fields; the rest are inert for evaluation). Profile never comes from the URL (§16.1).
export function buildProfile(p: PartialProfile, city: string): LocalUserProfile {
  return {
    id: p.id,
    selectedProfileIds: p.selectedProfileIds,
    allergies: p.allergies,
    language: p.language,
    destinationCity: p.destinationCity ?? city,
    safetyAcceptedAt: '',
    offlineEnabled: false,
    createdAt: '',
    updatedAt: '',
  };
}

// Approved mapped-dish card -> evidence-tier-4 inference input for a menu item.
export function dishCardToLike(card: DishRecommendationCard): DishRecommendationLike {
  return {
    dishId: card.dishId,
    status: card.status,
    riskLevel: card.riskLevel,
    confidence: card.confidence,
    reason: card.reason,
    action: card.action,
    source: card.source,
    lastCheckedAt: card.lastCheckedAt,
    matchedDishName: card.name,
    matchedAllergens: card.matchedAllergens,
  };
}

// Evaluate a restaurant's menu items and roll them up to a readiness class for the profile.
// `dishRecMap` holds pre-evaluated cards for the APPROVED dishes referenced by menu items;
// unmapped/unapproved dishes simply provide no inference (evidence falls back to Unknown).
export function recommendRestaurant(
  restaurant: RestaurantWithMenu,
  dishRecMap: Map<string, DishRecommendationLike>,
  profile: LocalUserProfile,
  now: Date,
): { recommendation: RestaurantRecommendation; menuRecommendations: MenuItemRecommendation[] } {
  const menuStatus = restaurant.menuStatus as RestaurantMenuStatus;
  const restaurantVerificationStatus = restaurant.verificationStatus as RestaurantVerificationStatus;

  const menuRecommendations = restaurant.menuItems.map((m) =>
    evaluateMenuItem({
      menuItem: toMenuItemLike(m),
      explicitAllergenStatuses: m.allergenStatuses.map(toAllergenStatusLike),
      matchedDishRecommendation: m.dishId ? (dishRecMap.get(m.dishId) ?? null) : null,
      profile,
      restaurantVerificationStatus,
      menuStatus,
      now,
    }),
  );

  const recommendation = evaluateRestaurantReadiness({
    restaurant: toRestaurantLike(restaurant),
    menuRecommendations,
    profile,
    now,
  });

  return { recommendation, menuRecommendations };
}
