import 'client-only';
import Dexie, { type Table } from 'dexie';
import type { DishRecommendationCard, LanguageCode, LocalUserProfile, QuestionCard } from '@safebite/domain';

export interface StoredAllergyCard {
  id: string;
  profileId: string;
  language: LanguageCode;
  text: Record<LanguageCode, string>;
  updatedAt: string;
}

export interface StoredQuestionCard extends QuestionCard {
  id: string;
  profileId?: string;
  dishId?: string;
  createdAt: string;
}

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
