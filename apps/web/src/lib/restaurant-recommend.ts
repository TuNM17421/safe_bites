import {
  applyFeedbackSignalsToMenuItem,
  applyFeedbackSignalsToRestaurantReadiness,
  evaluateMenuItem,
  evaluateRestaurantReadiness,
  type DishRecommendationCard,
  type DishRecommendationLike,
  type FeedbackSignal,
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

// Active feedback context threaded from the route (§11). Default = none, so callers/tests that
// omit it get byte-identical Phase-02 output (the apply-fns no-op on an empty signal set).
export interface FeedbackContext {
  signals: FeedbackSignal[];
  profileAllergenIds: string[];
  severityByAllergen: Record<string, string>;
}

const NO_FEEDBACK: FeedbackContext = { signals: [], profileAllergenIds: [], severityByAllergen: {} };

// Evaluate a restaurant's menu items and roll them up to a readiness class for the profile.
// `dishRecMap` holds pre-evaluated cards for the APPROVED dishes referenced by menu items;
// unmapped/unapproved dishes simply provide no inference (evidence falls back to Unknown).
//
// Feedback ordering (§11, corrected): readiness is computed from the BASE menu recs, THEN the two
// feedback transforms are applied independently. `applyFeedbackSignalsToMenuItem` rewrites `source`
// to the review marker, so its output must never feed the readiness evaluator (it detects evidence
// by `source`). The restaurant class reflects feedback via active `cap_restaurant_readiness` flags.
export function recommendRestaurant(
  restaurant: RestaurantWithMenu,
  dishRecMap: Map<string, DishRecommendationLike>,
  profile: LocalUserProfile,
  now: Date,
  feedback: FeedbackContext = NO_FEEDBACK,
): { recommendation: RestaurantRecommendation; menuRecommendations: MenuItemRecommendation[] } {
  const menuStatus = restaurant.menuStatus as RestaurantMenuStatus;
  const restaurantVerificationStatus = restaurant.verificationStatus as RestaurantVerificationStatus;
  const { signals, profileAllergenIds, severityByAllergen } = feedback;

  const baseMenuRecommendations = restaurant.menuItems.map((m) =>
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

  // Readiness from BASE recs (source intact), then apply the restaurant-level feedback cap.
  const baseReadiness = evaluateRestaurantReadiness({
    restaurant: toRestaurantLike(restaurant),
    menuRecommendations: baseMenuRecommendations,
    profile,
    now,
  });
  const recommendation = applyFeedbackSignalsToRestaurantReadiness({
    recommendation: baseReadiness,
    signals,
    profileAllergenIds,
    severityByAllergen,
    now,
  });

  // Per-item feedback adjustment (may rewrite status/source/confidence) — applied to base recs.
  const menuRecommendations = baseMenuRecommendations.map((rec) =>
    applyFeedbackSignalsToMenuItem({ recommendation: rec, signals, profileAllergenIds, severityByAllergen, now }),
  );

  return { recommendation, menuRecommendations };
}
