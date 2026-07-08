import 'client-only';
import Dexie, { type Table } from 'dexie';
import type {
  AllergyCard,
  DishRecommendationCard,
  LocalUserProfile,
  QuestionCardRecord,
} from '@safebite/domain';

// Structured allergy-card snapshot (bilingual entries resolved at save time for offline).
export type StoredAllergyCard = AllergyCard;

// Canonical §9.6 question-card record (see @safebite/domain).
export type StoredQuestionCard = QuestionCardRecord;

export interface SavedDish extends DishRecommendationCard {
  savedAt: string;
}

export interface MetadataRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

// Phase 08 offline restaurant cache (§12). `payload` is the exact validated API response DTO
// (already JSON-safe). `profileFingerprint` scopes a cache entry to a profile; the raw profile
// and exact location are never stored here (§12/§16).
export interface CachedRestaurantSearch {
  cacheKey: string; // `${city}:${profileFingerprint}`
  city: string;
  profileFingerprint: string;
  savedAt: string;
  expiresAt: string;
  payload: unknown;
}

export interface CachedRestaurantDetail {
  cacheKey: string; // `${idOrSlug}:${profileFingerprint}`
  restaurantId: string;
  profileFingerprint: string;
  savedAt: string;
  expiresAt: string;
  payload: unknown;
}

export const ACTIVE_PROFILE_ID = 'activeProfileId';
export const LAST_QUESTION_CARD_ID = 'lastQuestionCardId';

// Client-only IndexedDB store (spec §10). Only serialized plain-JSON DTOs are persisted
// (Decimals are already numbers, timestamps ISO strings) so offline reads reproduce API
// output exactly — including honest Unknown statuses.
export class SafeBiteDB extends Dexie {
  profiles!: Table<LocalUserProfile, string>;
  allergyCards!: Table<StoredAllergyCard, string>;
  questionCards!: Table<StoredQuestionCard, string>;
  savedDishes!: Table<SavedDish, string>;
  metadata!: Table<MetadataRow, string>;
  lastRestaurantSearch!: Table<CachedRestaurantSearch, string>;
  lastRestaurantDetail!: Table<CachedRestaurantDetail, string>;

  constructor() {
    super('safebite_pwa_v1');
    this.version(1).stores({
      profiles: 'id, destinationCity, updatedAt',
      allergyCards: 'id, profileId, language, updatedAt',
      questionCards: 'id, profileId, dishId, targetLanguage, createdAt',
      savedDishes: 'dishId, status, savedAt, lastCheckedAt',
      metadata: 'key, updatedAt',
    });
    // v2 (Phase 08): additive offline restaurant caches; existing stores/data are preserved.
    this.version(2).stores({
      lastRestaurantSearch: 'cacheKey, city, savedAt',
      lastRestaurantDetail: 'cacheKey, restaurantId, savedAt',
    });
  }
}

export const db = new SafeBiteDB();
