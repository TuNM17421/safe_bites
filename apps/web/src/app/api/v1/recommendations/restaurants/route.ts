import {
  restaurantRecommendationRequestSchema,
  type ConfidenceLabel,
  type RestaurantReadinessClass,
  type RestaurantRecommendation,
} from '@safebite/domain';
import { apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { haversineMeters } from '@/lib/geo/haversine';
import { buildProfile, recommendRestaurant } from '@/lib/restaurant-recommend';
import { approvedRestaurantWhere, loadDishRecMap } from '@/lib/restaurant-query';
import {
  attributionFor,
  restaurantDisplayName,
  type RestaurantWithMenu,
} from '@/lib/restaurant-serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLASS_ORDER: Record<RestaurantReadinessClass, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
const CONF_ORDER: Record<ConfidenceLabel, number> = { high: 0, medium: 1, low: 2 };

function toListItem(r: RestaurantWithMenu, rec: RestaurantRecommendation, distanceMeters: number | null) {
  return {
    restaurantId: r.id,
    slug: r.slug,
    name: restaurantDisplayName(r),
    address: r.fullAddress,
    district: r.district,
    city: r.city,
    distanceMeters,
    cuisine: r.cuisineNormalized,
    readinessClass: rec.readinessClass,
    confidence: rec.confidence,
    counts: rec.counts,
    summary: rec.summary,
    source: rec.source,
    verificationStatus: rec.verificationStatus,
    menuStatus: rec.menuStatus,
    lastCheckedAt: rec.lastCheckedAt,
    stale: rec.stale,
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

  const restaurants = await prisma.restaurant.findMany({
    where: approvedRestaurantWhere({ city, district: filters.district, q: filters.q, cuisine: filters.cuisine }),
    include: { menuItems: { include: { allergenStatuses: true } } },
    orderBy: { id: 'asc' },
  });

  const dishRecMap = await loadDishRecMap(
    profile,
    restaurants.flatMap((r) => r.menuItems.map((m) => m.dishId)),
  );

  const items = restaurants.map((r) => {
    const { recommendation } = recommendRestaurant(r, dishRecMap, profile, now);
    const distanceMeters =
      clientLocation && r.lat !== null && r.lon !== null
        ? haversineMeters(clientLocation, { lat: Number(r.lat), lon: Number(r.lon) })
        : null;
    return toListItem(r, recommendation, distanceMeters);
  });

  const sorted = sortItems(items, filters.sort);
  const offset = cursor ? Math.max(0, Number.parseInt(cursor, 10) || 0) : 0;
  const page = sorted.slice(offset, offset + limit);
  const nextCursor = offset + limit < sorted.length ? String(offset + limit) : null;

  return apiOk({
    restaurants: page,
    nextCursor,
    attribution: attributionFor(restaurants.map((r) => r.externalSource)),
  });
}
