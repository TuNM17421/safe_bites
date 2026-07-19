import 'client-only';
import Dexie, { type Table } from 'dexie';
import type {
  AllergyCard,
  DishRecommendationCard,
  FeedbackReportInput,
  QuestionCardRecord,
} from '@safebite/domain';
import type { EncryptedEnvelope } from './crypto/local-crypto';

// Structured allergy-card snapshot (bilingual entries resolved at save time for offline).
export type StoredAllergyCard = AllergyCard;

// Phase 14: profiles + allergy cards are encrypted at rest. Only the primary key and a non-PII
// timestamp (+ the random profileId link) stay in clear for indexing; all PII lives inside `blob`.
export interface EncryptedProfileRow {
  id: string;
  updatedAt: string;
  blob: EncryptedEnvelope;
}
export interface EncryptedAllergyCardRow {
  id: string;
  profileId: string;
  updatedAt: string;
  blob: EncryptedEnvelope;
}

// Device-only AES-GCM key, held as an opaque non-extractable CryptoKey (never raw bytes).
export interface LocalKeyRow {
  id: string;
  key: CryptoKey;
}
export const LOCAL_KEY_ID = 'local-aes-gcm';

// Agent chat transcript, encrypted at rest like the profile (it holds the user's allergy/food
// discussion). The whole rolling conversation is one blob keyed by CHAT_SESSION_ID; only the id and
// a non-PII timestamp stay in clear.
export interface EncryptedChatRow {
  id: string;
  updatedAt: string;
  blob: EncryptedEnvelope;
}
export const CHAT_SESSION_ID = 'active';

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

// Phase 03 §12.1 offline feedback queue (outbox). Stores ONLY the sync payload — the exact
// validated FeedbackReportInput — never the full profile object, geolocation, or tokens. A synced
// row is deleted (no `synced` status retained); `retryCount`/`lastError` back the failed banner.
export type PendingFeedbackStatus = 'pending' | 'syncing' | 'failed';
export interface PendingFeedbackReport {
  clientReportId: string;
  payload: FeedbackReportInput;
  createdAt: string;
  updatedAt: string;
  status: PendingFeedbackStatus;
  retryCount: number;
  lastError?: string | null;
}

export const ACTIVE_PROFILE_ID = 'activeProfileId';
export const LAST_QUESTION_CARD_ID = 'lastQuestionCardId';

// Client-only IndexedDB store (spec §10). Only serialized plain-JSON DTOs are persisted
// (Decimals are already numbers, timestamps ISO strings) so offline reads reproduce API
// output exactly — including honest Unknown statuses.
export class SafeBiteDB extends Dexie {
  profiles!: Table<EncryptedProfileRow, string>;
  allergyCards!: Table<EncryptedAllergyCardRow, string>;
  questionCards!: Table<StoredQuestionCard, string>;
  savedDishes!: Table<SavedDish, string>;
  metadata!: Table<MetadataRow, string>;
  lastRestaurantSearch!: Table<CachedRestaurantSearch, string>;
  lastRestaurantDetail!: Table<CachedRestaurantDetail, string>;
  pendingFeedbackReports!: Table<PendingFeedbackReport, string>;
  localKeys!: Table<LocalKeyRow, string>;
  chatSessions!: Table<EncryptedChatRow, string>;

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
    // v3 (Phase 03 §12.1): additive offline feedback outbox; existing stores/data are preserved.
    this.version(3).stores({
      pendingFeedbackReports: 'clientReportId, status, createdAt',
    });
    // v4 (Phase 14): encryption at rest. Drop the now-encrypted PII secondary indexes
    // (destinationCity/language) — values move inside `blob`; keep id + updatedAt (+ profileId).
    // Add the device-only key store. Additive; existing plaintext rows are read defensively.
    this.version(4).stores({
      profiles: 'id, updatedAt',
      allergyCards: 'id, profileId, updatedAt',
      localKeys: 'id',
    });
    // v5: encrypted agent chat transcript (additive; existing stores/data preserved).
    this.version(5).stores({
      chatSessions: 'id',
    });
  }
}

export const db = new SafeBiteDB();
