import {
  compatibilityPercent,
  restaurantRecommendationRequestSchema,
  summarizeFeedbackSignals,
  type ConfidenceLabel,
  type FeedbackSignal,
  type FeedbackSummary,
  type RestaurantReadinessClass,
  type RestaurantRecommendation,
} from '@safebite/domain';
import { apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { haversineMeters } from '@/lib/geo/haversine';
import { buildProfile, recommendRestaurant } from '@/lib/restaurant-recommend';
import { approvedRestaurantWhere, loadActiveFeedbackFlags, loadDishRecMap } from '@/lib/restaurant-query';
import { flagRowToSignal } from '@/server/feedback/get-feedback-signals';
import {
  attributionFor,
  restaurantDisplayName,
  type RestaurantWithMenu,
} from '@/lib/restaurant-serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLASS_ORDER: Record<RestaurantReadinessClass, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
const CONF_ORDER: Record<ConfidenceLabel, number> = { high: 0, medium: 1, low: 2 };

function toListItem(
  r: RestaurantWithMenu,
  rec: RestaurantRecommendation,
  distanceMeters: number | null,
  feedbackSummary?: FeedbackSummary,
) {
  return {
    restaurantId: r.id,
    slug: r.slug,
    name: restaurantDisplayName(r),
    address: r.fullAddress,
    district: r.district,
    city: r.city,
    lat: r.lat === null ? null : Number(r.lat),
    lon: r.lon === null ? null : Number(r.lon),
    distanceMeters,
    cuisine: r.cuisineNormalized,
    readinessClass: rec.readinessClass,
    confidence: rec.confidence,
    counts: rec.counts,
    compatibility: compatibilityPercent(rec.counts),
    summary: rec.summary,
    source: rec.source,
    verificationStatus: rec.verificationStatus,
    menuStatus: rec.menuStatus,
    lastCheckedAt: rec.lastCheckedAt,
    stale: rec.stale,
    feedbackSummary, // undefined ⇒ omitted from JSON (backward-compatible)
  };
}

type ListItem = ReturnType<typeof toListItem>;

function sortItems(items: ListItem[], sort: string): ListItem[] {
  const arr = [...items];
  if (sort === 'nearest') {
    arr.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  } else if (sort === 'last_checked') {
    arr.sort((a, b) => (b.lastCheckedAt ?? '').localeCompare(a.lastCheckedAt ?? ''));
  } else if (sort === 'name') {
    arr.sort((a, b) => a.name.en.localeCompare(b.name.en));
  } else {
    // recommended: readiness class, then confidence, then name.
    arr.sort(
      (a, b) =>
        CLASS_ORDER[a.readinessClass] - CLASS_ORDER[b.readinessClass] ||
        CONF_ORDER[a.confidence] - CONF_ORDER[b.confidence] ||
        a.name.en.localeCompare(b.name.en),
    );
  }
  return arr;
}

// §8.3 — personalized restaurant list. Profile is in the POST body, never the URL (§16.1).
// Readiness/distance are computed in-memory (one city, tens of rows), then sorted + paginated.
export async function POST(req: Request) {
  const parsed = await parseBody(req, restaurantRecommendationRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { profile: p, city, filters, clientLocation, limit, cursor } = parsed.data;

  const profile = buildProfile(p, city);
  const now = new Date();

  // Readiness + distance are computed per-restaurant, so the whole matched set must be loaded
  // before sorting/paginating in memory. `take` is a defensive cap far above the Phase-02
  // single-city scale (§19.3: 30-50 approved rows), bounding worst-case memory / abuse.
  const restaurants = await prisma.restaurant.findMany({
    where: approvedRestaurantWhere({ city, district: filters.district, q: filters.q, cuisine: filters.cuisine }),
    include: { menuItems: { include: { allergenStatuses: true } } },
    orderBy: { id: 'asc' },
    take: 500,
  });

  const dishRecMap = await loadDishRecMap(
    profile,
    restaurants.flatMap((r) => r.menuItems.map((m) => m.dishId)),
  );

  // Active feedback flags for the whole page (restaurant-level only in the list view, §11.2).
  const profileAllergenIds = profile.allergies.map((a) => a.allergenId);
  const severityByAllergen = Object.fromEntries(profile.allergies.map((a) => [a.allergenId, a.severity]));
  const flags = await loadActiveFeedbackFlags({ restaurantIds: restaurants.map((r) => r.id) });
  const signalsByRestaurant = new Map<string, FeedbackSignal[]>();
  for (const flag of flags) {
    const signal = flagRowToSignal(flag);
    const key = signal.restaurantId ?? signal.entityId;
    signalsByRestaurant.set(key, [...(signalsByRestaurant.get(key) ?? []), signal]);
  }

  const items = restaurants.map((r) => {
    const rSignals = signalsByRestaurant.get(r.id) ?? [];
    const { recommendation } = recommendRestaurant(r, dishRecMap, profile, now, {
      signals: rSignals,
      profileAllergenIds,
      severityByAllergen,
    });
    const summary = rSignals.length ? summarizeFeedbackSignals({ signals: rSignals, profileAllergenIds, now }) : null;
    const distanceMeters =
      clientLocation && r.lat !== null && r.lon !== null
        ? haversineMeters(clientLocation, { lat: Number(r.lat), lon: Number(r.lon) })
        : null;
    return toListItem(r, recommendation, distanceMeters, summary?.hasActiveFlags ? summary : undefined);
  });

  const sorted = sortItems(items, filters.sort);
  const offset = cursor ? Math.max(0, Number.parseInt(cursor, 10) || 0) : 0;
  const page = sorted.slice(offset, offset + limit);
  const nextCursor = offset + limit < sorted.length ? String(offset + limit) : null;

  // Scope attribution to the page actually returned (ListItem.source is the restaurant's
  // externalSource), matching the §8.1 browse behaviour — so we never advertise a source
  // that isn't present on this page.
  return apiOk({
    restaurants: page,
    nextCursor,
    attribution: attributionFor(page.map((r) => r.source)),
  });
}
