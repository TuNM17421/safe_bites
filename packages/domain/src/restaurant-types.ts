// Restaurant/menu domain types (spec §7.1). Framework-free; reuses the dish-level
// primitives (Bilingual, RiskLevel, RecommendationStatus, ConfidenceLabel, LocalUserProfile).

import type {
  Bilingual,
  ConfidenceLabel,
  LocalUserProfile,
  RecommendationStatus,
  RiskLevel,
} from './types';

export type RestaurantReviewStatus = 'needs_review' | 'approved' | 'rejected';

export type RestaurantVerificationStatus =
  | 'unverified'
  | 'restaurant_contacted'
  | 'restaurant_confirmed'
  | 'admin_verified'
  | 'expired'
  | 'flagged';

// Menu freshness/provenance (spec §5.3 menu_status + §5.4/§5.5 verification levels).
export type RestaurantMenuStatus =
  | 'not_observed'
  | 'menu_url_available'
  | 'observed_not_verified'
  | 'restaurant_submitted'
  | 'admin_verified';

// Explicit menu-item allergen evidence provenance (spec §5.5). No LLM/OCR values in Phase 02.
export type MenuItemAllergenSource =
  | 'admin_manual'
  | 'restaurant_submitted'
  | 'official_menu'
  | 'user_report'
  | 'dish_inferred';

export type MenuItemVerificationStatus =
  | 'observed_not_verified'
  | 'restaurant_submitted'
  | 'admin_verified';

export type SharedCookware = 'unknown' | 'no' | 'yes' | 'possible';
export type SharedFryer = 'unknown' | 'no' | 'yes' | 'possible' | 'not_applicable';
export type CanCustomize = 'true' | 'false' | 'unknown';

export type RestaurantReadinessClass = 'A' | 'B' | 'C' | 'D' | 'E';

export interface GeoPoint {
  lat: number;
  lon: number;
}

// ---- Evaluator inputs (structural "…Like" shapes so callers map Prisma rows to plain JSON) ----

export interface RestaurantMenuItemLike {
  menuItemId: string;
  restaurantId: string;
  dishId?: string | null;
  displayName: Bilingual;
  rawName?: string;
  sharedCookware?: SharedCookware;
  sharedFryer?: SharedFryer;
  canCustomize?: CanCustomize;
  observedAt?: string | null;
}

export interface MenuItemAllergenStatusLike {
  allergenId: string;
  riskLevel: RiskLevel;
  // Plain number 0..1 (callers must serialize Prisma Decimal first).
  confidence: number;
  source: MenuItemAllergenSource;
  reason: Bilingual;
  action?: Bilingual;
  lastVerifiedAt?: string | null;
  verificationStatus: MenuItemVerificationStatus;
}

// The mapped dish recommendation reused from the dish engine (evidence priority tier 4).
export interface DishRecommendationLike {
  dishId: string;
  status: RecommendationStatus;
  riskLevel: RiskLevel;
  confidence: ConfidenceLabel;
  reason: Bilingual;
  action: Bilingual;
  source: string;
  lastCheckedAt?: string | null;
  matchedDishName?: Bilingual | null;
  matchedAllergens?: string[];
}

export interface EvaluateMenuItemInput {
  menuItem: RestaurantMenuItemLike;
  explicitAllergenStatuses: MenuItemAllergenStatusLike[];
  matchedDishRecommendation?: DishRecommendationLike | null;
  profile: LocalUserProfile;
  restaurantVerificationStatus: RestaurantVerificationStatus;
  menuStatus: RestaurantMenuStatus;
  now?: Date;
}

export interface MenuItemRecommendation {
  menuItemId: string;
  restaurantId: string;
  dishId?: string | null;
  displayName: Bilingual;
  status: RecommendationStatus;
  riskLevel: RiskLevel;
  confidence: ConfidenceLabel;
  confidenceScore: number;
  source: string;
  reason: Bilingual;
  action: Bilingual;
  lastCheckedAt?: string | null;
  stale: boolean;
  matchedDishName?: Bilingual | null;
}

export interface RestaurantLike {
  restaurantId: string;
  externalSource: string;
  verificationStatus: RestaurantVerificationStatus;
  menuStatus: RestaurantMenuStatus;
  hasMenuItems: boolean;
  lastCheckedAt?: string | null;
}

export interface RestaurantRecommendationCounts {
  suitable: number;
  askFirst: number;
  risky: number;
  avoid: number;
  unknown: number;
  total: number;
}

export interface EvaluateRestaurantReadinessInput {
  restaurant: RestaurantLike;
  menuRecommendations: MenuItemRecommendation[];
  profile: LocalUserProfile;
  now?: Date;
}

export interface RestaurantRecommendation {
  restaurantId: string;
  readinessClass: RestaurantReadinessClass;
  confidence: ConfidenceLabel;
  counts: RestaurantRecommendationCounts;
  summary: Bilingual;
  reasons: Bilingual[];
  source: string;
  verificationStatus: string;
  menuStatus: string;
  lastCheckedAt?: string | null;
  stale: boolean;
}
