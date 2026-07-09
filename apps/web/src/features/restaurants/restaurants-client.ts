import { FeedbackSummarySchema, type LocalUserProfile } from '@safebite/domain';
import { z } from 'zod';

// Feature-local fetchers + response Zod (mirrors dishes-client.ts). Each fetcher unwraps the
// `{ data }` envelope and validates before returning. Profile is always POSTed in the body.

const bilingual = z.object({ en: z.string(), vi: z.string() });
const counts = z.object({
  suitable: z.number(),
  askFirst: z.number(),
  risky: z.number(),
  avoid: z.number(),
  unknown: z.number(),
  total: z.number(),
});
const readinessClass = z.enum(['A', 'B', 'C', 'D', 'E']);
const confidence = z.enum(['high', 'medium', 'low']);
const status = z.enum(['suitable', 'ask_first', 'risky', 'avoid', 'unknown']);
const riskLevel = z.enum(['contains', 'likely_contains', 'possible', 'unlikely', 'unknown']);

const listItemSchema = z.object({
  restaurantId: z.string(),
  slug: z.string().nullable(),
  name: bilingual,
  address: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string(),
  distanceMeters: z.number().nullable(),
  cuisine: z.array(z.string()),
  readinessClass,
  confidence,
  counts,
  summary: bilingual,
  source: z.string(),
  verificationStatus: z.string(),
  menuStatus: z.string(),
  lastCheckedAt: z.string().nullable(),
  stale: z.boolean(),
  feedbackSummary: FeedbackSummarySchema.optional(),
});

const listResponseSchema = z.object({
  restaurants: z.array(listItemSchema),
  nextCursor: z.string().nullable(),
  attribution: z.string().nullable(),
});

const menuRecSchema = z.object({
  menuItemId: z.string(),
  restaurantId: z.string(),
  dishId: z.string().nullable().optional(),
  displayName: bilingual,
  status,
  riskLevel,
  confidence,
  confidenceScore: z.number(),
  source: z.string(),
  reason: bilingual,
  action: bilingual,
  lastCheckedAt: z.string().nullable().optional(),
  stale: z.boolean(),
  matchedDishName: bilingual.nullable().optional(),
  feedbackSummary: FeedbackSummarySchema.optional(),
});

const detailResponseSchema = z.object({
  restaurant: z.object({
    restaurantId: z.string(),
    slug: z.string().nullable(),
    name: bilingual,
    address: z.string().nullable(),
    district: z.string().nullable(),
    city: z.string(),
    lat: z.number().nullable(),
    lon: z.number().nullable(),
    distanceMeters: z.number().nullable(),
    cuisine: z.array(z.string()),
    phone: z.string().nullable(),
    website: z.string().nullable(),
    websiteMenu: z.string().nullable(),
    openingHours: z.string().nullable(),
    source: z.string(),
    sourceUrl: z.string().nullable(),
    dataLicense: z.string().nullable(),
    attributionRequired: z.boolean(),
    verificationStatus: z.string(),
    menuStatus: z.string(),
    lastCheckedAt: z.string().nullable(),
  }),
  recommendation: z.object({
    readinessClass,
    confidence,
    counts,
    summary: bilingual,
    reasons: z.array(bilingual),
    stale: z.boolean(),
    feedbackSummary: FeedbackSummarySchema.optional(),
  }),
  menuRecommendations: z.array(menuRecSchema),
  attribution: z.string().nullable(),
});

export type RestaurantListItem = z.infer<typeof listItemSchema>;
export type RestaurantListResponse = z.infer<typeof listResponseSchema>;
export type MenuRecommendation = z.infer<typeof menuRecSchema>;
export type RestaurantDetailResponse = z.infer<typeof detailResponseSchema>;

export type RestaurantSort = 'recommended' | 'nearest' | 'last_checked' | 'name';
export interface RestaurantFilters {
  district?: string;
  q?: string;
  cuisine?: string;
  sort: RestaurantSort;
}
export interface ClientLocation {
  lat: number;
  lon: number;
  accuracyMeters?: number;
}

function profileBody(profile: LocalUserProfile) {
  return {
    id: profile.id,
    selectedProfileIds: profile.selectedProfileIds,
    allergies: profile.allergies,
    language: profile.language,
    destinationCity: profile.destinationCity,
  };
}

export async function fetchRestaurantRecs(
  city: string,
  profile: LocalUserProfile,
  filters: RestaurantFilters,
  clientLocation?: ClientLocation,
): Promise<RestaurantListResponse> {
  const res = await fetch('/api/v1/recommendations/restaurants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: profileBody(profile),
      city,
      filters: {
        district: filters.district || undefined,
        q: filters.q || undefined,
        cuisine: filters.cuisine || undefined,
        sort: filters.sort,
      },
      ...(clientLocation ? { clientLocation } : {}),
      // Single-city scale (§19.3: 30-50 approved). Fetch the max page so client-side search
      // covers the whole set (no cursor paging in Phase 07); server caps at 50.
      limit: 50,
    }),
  });
  if (!res.ok) throw new Error(`restaurant_recs_failed_${res.status}`);
  const json = (await res.json()) as { data: unknown };
  return listResponseSchema.parse(json.data);
}

export async function fetchRestaurantDetailRec(
  idOrSlug: string,
  profile: LocalUserProfile,
  clientLocation?: ClientLocation,
): Promise<RestaurantDetailResponse> {
  const res = await fetch(`/api/v1/recommendations/restaurants/${encodeURIComponent(idOrSlug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: profileBody(profile), ...(clientLocation ? { clientLocation } : {}) }),
  });
  if (res.status === 404) throw new Error('restaurant_not_found');
  if (!res.ok) throw new Error(`restaurant_detail_failed_${res.status}`);
  const json = (await res.json()) as { data: unknown };
  return detailResponseSchema.parse(json.data);
}
