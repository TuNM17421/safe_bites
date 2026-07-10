import {
  compatibilityPercent,
  restaurantDetailRecommendationRequestSchema,
  restaurantIdOrSlugSchema,
  signalTargetsMenuItem,
  summarizeFeedbackSignals,
} from '@safebite/domain';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { haversineMeters } from '@/lib/geo/haversine';
import { buildProfile, recommendRestaurant } from '@/lib/restaurant-recommend';
import { loadActiveFeedbackFlags, loadDishRecMap } from '@/lib/restaurant-query';
import { flagRowToSignal } from '@/server/feedback/get-feedback-signals';
import { attributionFor, restaurantDisplayName } from '@/lib/restaurant-serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ restaurantIdOrSlug: string }> };

// §8.4 — personalized restaurant detail: readiness + per-menu-item recommendations. Profile in
// the POST body, never the URL (§16.1). Resolves by id OR slug; approved rows only.
export async function POST(req: Request, ctx: Ctx) {
  const params = await ctx.params;
  const idParse = restaurantIdOrSlugSchema.safeParse(params.restaurantIdOrSlug);
  if (!idParse.success) return apiError('VALIDATION_ERROR', 'Invalid restaurant identifier.', { status: 400 });
  const restaurantIdOrSlug = idParse.data;
  const parsed = await parseBody(req, restaurantDetailRecommendationRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { profile: p, clientLocation } = parsed.data;

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      reviewStatus: 'approved',
      OR: [{ id: restaurantIdOrSlug }, { slug: restaurantIdOrSlug }],
    },
    include: { menuItems: { include: { allergenStatuses: true } } },
  });
  if (!restaurant) return apiError('NOT_FOUND', 'Restaurant not found.', { status: 404 });

  const profile = buildProfile(p, restaurant.city);
  const now = new Date();
  const dishRecMap = await loadDishRecMap(
    profile,
    restaurant.menuItems.map((m) => m.dishId),
  );

  // Active feedback flags for this restaurant + its menu items + mapped dishes (§11.2).
  const profileAllergenIds = profile.allergies.map((a) => a.allergenId);
  const severityByAllergen = Object.fromEntries(profile.allergies.map((a) => [a.allergenId, a.severity]));
  const flags = await loadActiveFeedbackFlags({
    restaurantIds: [restaurant.id],
    menuItemIds: restaurant.menuItems.map((m) => m.id),
    dishIds: restaurant.menuItems.map((m) => m.dishId),
  });
  const signals = flags.map(flagRowToSignal);

  const { recommendation, menuRecommendations } = recommendRestaurant(restaurant, dishRecMap, profile, now, {
    signals,
    profileAllergenIds,
    severityByAllergen,
  });

  // Aggregate, privacy-safe summaries (never raw notes): restaurant-level + per menu item.
  const restaurantSummary = signals.length ? summarizeFeedbackSignals({ signals, profileAllergenIds, now }) : null;
  const menuRecommendationsOut = menuRecommendations.map((rec) => {
    const itemSignals = signals.filter((s) =>
      signalTargetsMenuItem(s, { menuItemId: rec.menuItemId, dishId: rec.dishId, restaurantId: restaurant.id }),
    );
    const summary = itemSignals.length ? summarizeFeedbackSignals({ signals: itemSignals, profileAllergenIds, now }) : null;
    return summary?.hasActiveFlags ? { ...rec, feedbackSummary: summary } : rec;
  });

  const distanceMeters =
    clientLocation && restaurant.lat !== null && restaurant.lon !== null
      ? haversineMeters(clientLocation, { lat: Number(restaurant.lat), lon: Number(restaurant.lon) })
      : null;

  return apiOk({
    restaurant: {
      restaurantId: restaurant.id,
      slug: restaurant.slug,
      name: restaurantDisplayName(restaurant),
      address: restaurant.fullAddress,
      district: restaurant.district,
      city: restaurant.city,
      lat: restaurant.lat === null ? null : Number(restaurant.lat),
      lon: restaurant.lon === null ? null : Number(restaurant.lon),
      distanceMeters,
      cuisine: restaurant.cuisineNormalized,
      phone: restaurant.phone,
      website: restaurant.website,
      websiteMenu: restaurant.websiteMenu,
      openingHours: restaurant.openingHours,
      source: restaurant.externalSource,
      sourceUrl: restaurant.sourceUrl,
      dataLicense: restaurant.dataLicense,
      attributionRequired: restaurant.attributionRequired,
      verificationStatus: restaurant.verificationStatus,
      menuStatus: restaurant.menuStatus,
      lastCheckedAt: restaurant.sourceObservedAt ? restaurant.sourceObservedAt.toISOString() : null,
    },
    recommendation: {
      readinessClass: recommendation.readinessClass,
      confidence: recommendation.confidence,
      counts: recommendation.counts,
      compatibility: compatibilityPercent(recommendation.counts),
      summary: recommendation.summary,
      reasons: recommendation.reasons,
      stale: recommendation.stale,
      feedbackSummary: restaurantSummary?.hasActiveFlags ? restaurantSummary : undefined,
    },
    menuRecommendations: menuRecommendationsOut,
    attribution: attributionFor([restaurant.externalSource]),
  });
}
