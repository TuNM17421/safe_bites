import 'client-only';
import type { DishRecommendationCard, LocalUserProfile } from '@safebite/domain';
import {
  ACTIVE_PROFILE_ID,
  db,
  LAST_QUESTION_CARD_ID,
  type SavedDish,
  type StoredAllergyCard,
  type StoredQuestionCard,
} from './dexie';

const SECRET_KEY_RE = /token|secret|password|cookie|sbt_admin|authorization/i;

// Dev guard: refuse to persist token-like keys to IndexedDB (§10.1 do-not-store list).
function assertNoSecrets(value: unknown): void {
  if (process.env.NODE_ENV === 'production' || !value || typeof value !== 'object') return;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (SECRET_KEY_RE.test(key)) throw new Error(`Refusing to store secret-like key "${key}" locally.`);
  }
}

const nowIso = (): string => new Date().toISOString();

export const metadataRepo = {
  async getMetadata<T>(key: string): Promise<T | undefined> {
    const row = await db.metadata.get(key);
    return row?.value as T | undefined;
  },
  async setMetadata(key: string, value: unknown): Promise<void> {
    assertNoSecrets(value);
    await db.metadata.put({ key, value, updatedAt: nowIso() });
  },
};

export const profileRepo = {
  async saveProfile(profile: LocalUserProfile): Promise<void> {
    assertNoSecrets(profile);
    await db.transaction('rw', db.profiles, db.metadata, async () => {
      await db.profiles.put(profile);
      await db.metadata.put({ key: ACTIVE_PROFILE_ID, value: profile.id, updatedAt: nowIso() });
    });
  },
  async loadActiveProfile(): Promise<LocalUserProfile | undefined> {
    const id = await metadataRepo.getMetadata<string>(ACTIVE_PROFILE_ID);
    return id ? db.profiles.get(id) : undefined;
  },
  async getProfile(id: string): Promise<LocalUserProfile | undefined> {
    return db.profiles.get(id);
  },
  async deleteProfile(id: string): Promise<void> {
    await db.transaction('rw', db.profiles, db.metadata, async () => {
      await db.profiles.delete(id);
      const active = await db.metadata.get(ACTIVE_PROFILE_ID);
      if (active?.value === id) await db.metadata.delete(ACTIVE_PROFILE_ID);
    });
  },
};

export const allergyCardRepo = {
  async saveAllergyCard(card: StoredAllergyCard): Promise<void> {
    await db.allergyCards.put(card);
  },
  async loadAllergyCard(profileId: string): Promise<StoredAllergyCard | undefined> {
    const cards = await db.allergyCards.where('profileId').equals(profileId).sortBy('updatedAt');
    return cards.at(-1);
  },
  async deleteAllergyCard(id: string): Promise<void> {
    await db.allergyCards.delete(id);
  },
};

export const questionCardRepo = {
  async saveLastQuestionCard(card: StoredQuestionCard): Promise<void> {
    await db.transaction('rw', db.questionCards, db.metadata, async () => {
      await db.questionCards.put(card);
      await db.metadata.put({ key: LAST_QUESTION_CARD_ID, value: card.id, updatedAt: nowIso() });
    });
  },
  async loadLastQuestionCard(): Promise<StoredQuestionCard | undefined> {
    const id = await metadataRepo.getMetadata<string>(LAST_QUESTION_CARD_ID);
    return id ? db.questionCards.get(id) : undefined;
  },
  async clearLastQuestionCard(): Promise<void> {
    await db.transaction('rw', db.questionCards, db.metadata, async () => {
      const id = await metadataRepo.getMetadata<string>(LAST_QUESTION_CARD_ID);
      if (id) await db.questionCards.delete(id);
      await db.metadata.delete(LAST_QUESTION_CARD_ID);
    });
  },
};

export const savedDishRepo = {
  async saveDish(card: DishRecommendationCard): Promise<void> {
    const row: SavedDish = { ...card, savedAt: nowIso() };
    await db.savedDishes.put(row);
  },
  async getSavedDish(dishId: string): Promise<SavedDish | undefined> {
    return db.savedDishes.get(dishId);
  },
  // Returns every saved card unchanged. NEVER filters, hides, or upgrades an
  // `unknown`-status card (safety rule: Unknown must never become Suitable).
  async loadSavedDishes(): Promise<SavedDish[]> {
    return db.savedDishes.toArray();
  },
  async deleteSavedDish(dishId: string): Promise<void> {
    await db.savedDishes.delete(dishId);
  },
};

export async function clearAllLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    db.profiles,
    db.allergyCards,
    db.questionCards,
    db.savedDishes,
    db.metadata,
    async () => {
      await Promise.all([
        db.profiles.clear(),
        db.allergyCards.clear(),
        db.questionCards.clear(),
        db.savedDishes.clear(),
        db.metadata.clear(),
      ]);
    },
  );
}
