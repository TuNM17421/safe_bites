// Restaurant/menu Zod schemas (spec §7.1, §8). Used by the public API boundaries.
// Profile is posted in the body, never the URL (§16.1).

import { z } from 'zod';
import { allergyEntrySchema, languageCodeSchema, riskLevelSchema } from './schemas';

export const restaurantReviewStatusSchema = z.enum(['needs_review', 'approved', 'rejected']);

export const restaurantVerificationStatusSchema = z.enum([
  'unverified',
  'restaurant_contacted',
  'restaurant_confirmed',
  'admin_verified',
  'expired',
  'flagged',
]);

export const restaurantMenuStatusSchema = z.enum([
  'not_observed',
  'menu_url_available',
  'observed_not_verified',
  'restaurant_submitted',
  'admin_verified',
]);

export const menuItemAllergenSourceSchema = z.enum([
  'admin_manual',
  'restaurant_submitted',
  'official_menu',
  'user_report',
  'dish_inferred',
]);

export const menuItemVerificationStatusSchema = z.enum([
  'observed_not_verified',
  'restaurant_submitted',
  'admin_verified',
]);

export const sharedCookwareSchema = z.enum(['unknown', 'no', 'yes', 'possible']);
export const sharedFryerSchema = z.enum(['unknown', 'no', 'yes', 'possible', 'not_applicable']);
export const canCustomizeSchema = z.enum(['true', 'false', 'unknown']);
export const readinessClassSchema = z.enum(['A', 'B', 'C', 'D', 'E']);

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const clientLocationSchema = geoPointSchema.extend({
  accuracyMeters: z.number().nonnegative().optional(),
});

export const restaurantSortSchema = z.enum(['recommended', 'nearest', 'last_checked', 'name']);

// Path param for the detail endpoints — validated even though Prisma parameterizes the query,
// per §8/§16.3 ("validate path params").
export const restaurantIdOrSlugSchema = z.string().min(1).max(128);

// Partial profile posted for personalized recommendations (mirrors recommendationRequestSchema).
const recommendationProfileSchema = z.object({
  id: z.string().default('local'),
  selectedProfileIds: z.array(z.string()).max(50).default([]),
  allergies: z.array(allergyEntrySchema).max(50).default([]),
  language: languageCodeSchema.default('en'),
  destinationCity: z.string().optional(),
});

// POST /api/v1/recommendations/restaurants (§8.3).
export const restaurantRecommendationRequestSchema = z.object({
  profile: recommendationProfileSchema,
  city: z.string().min(1),
  filters: z
    .object({
      district: z.string().optional(),
      q: z.string().optional(),
      cuisine: z.string().optional(),
      sort: restaurantSortSchema.default('recommended'),
    })
    .default({ sort: 'recommended' }),
  clientLocation: clientLocationSchema.optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().nullish(),
});

// POST /api/v1/recommendations/restaurants/{id} (§8.4).
export const restaurantDetailRecommendationRequestSchema = z.object({
  profile: recommendationProfileSchema,
  clientLocation: clientLocationSchema.optional(),
});

// GET /api/v1/restaurants query (§8.1).
export const restaurantBrowseQuerySchema = z.object({
  city: z.string().min(1).default('hanoi'),
  district: z.string().optional(),
  q: z.string().optional(),
  cuisine: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().nullish(),
});

export const menuItemRiskLevelSchema = riskLevelSchema;
