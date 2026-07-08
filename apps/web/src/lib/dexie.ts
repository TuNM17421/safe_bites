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

  constructor() {
    super('safebite_pwa_v1');
    this.version(1).stores({
      profiles: 'id, destinationCity, updatedAt',
      allergyCards: 'id, profileId, language, updatedAt',
      questionCards: 'id, profileId, dishId, targetLanguage, createdAt',
      savedDishes: 'dishId, status, savedAt, lastCheckedAt',
      metadata: 'key, updatedAt',
    });
  }
}

export const db = new SafeBiteDB();
