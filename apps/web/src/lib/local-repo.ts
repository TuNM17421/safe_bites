import 'client-only';
import { localUserProfileSchema, type DishRecommendationCard, type FeedbackReportInput, type LocalUserProfile } from '@safebite/domain';
import {
  ACTIVE_PROFILE_ID,
  db,
  LAST_QUESTION_CARD_ID,
  type CachedRestaurantDetail,
  type CachedRestaurantSearch,
  type EncryptedAllergyCardRow,
  type EncryptedProfileRow,
  type PendingFeedbackReport,
  type PendingFeedbackStatus,
  type SavedDish,
  type StoredAllergyCard,
  type StoredQuestionCard,
} from './dexie';
import { getLocalKey } from './crypto/key-store';
import { decryptJson, encryptJson, encryptedEnvelopeSchema } from './crypto/local-crypto';

const SECRET_KEY_RE = /token|secret|password|cookie|sbt_admin|authorization/i;

// Dev guard: refuse to persist token-like keys to IndexedDB (§10.1 do-not-store list).
function assertNoSecrets(value: unknown): void {
  if (process.env.NODE_ENV === 'production' || !value || typeof value !== 'object') return;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (SECRET_KEY_RE.test(key)) throw new Error(`Refusing to store secret-like key "${key}" locally.`);
  }
}

const nowIso = (): string => new Date().toISOString();

// A stored row is either a Phase-14 encrypted envelope row or (on installs predating v4) a legacy
// plaintext object. `blob` presence discriminates the two so old rows keep reading until re-saved.
function isEncrypted(row: unknown): row is { blob: unknown } {
  return !!row && typeof row === 'object' && 'blob' in row;
}

// Decrypt an encrypted row's blob, then re-validate the plaintext with a domain schema before it
// re-enters typed state — a foreign/corrupt blob fails Zod loudly instead of returning garbage.
async function decryptProfileRow(row: unknown): Promise<LocalUserProfile | undefined> {
  if (!row) return undefined;
  if (!isEncrypted(row)) return row as LocalUserProfile; // legacy plaintext
  const env = encryptedEnvelopeSchema.parse(row.blob);
  const plain = await decryptJson<unknown>(await getLocalKey(), env);
  return localUserProfileSchema.parse(plain);
}

async function decryptAllergyRow(row: unknown): Promise<StoredAllergyCard | undefined> {
  if (!row) return undefined;
  if (!isEncrypted(row)) return row as StoredAllergyCard; // legacy plaintext
  const env = encryptedEnvelopeSchema.parse(row.blob);
  return decryptJson<StoredAllergyCard>(await getLocalKey(), env);
}

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
    const row: EncryptedProfileRow = {
      id: profile.id,
      updatedAt: profile.updatedAt,
      blob: await encryptJson(await getLocalKey(), profile),
    };
    await db.transaction('rw', db.profiles, db.metadata, async () => {
      await db.profiles.put(row);
      await db.metadata.put({ key: ACTIVE_PROFILE_ID, value: profile.id, updatedAt: nowIso() });
    });
  },
  async loadActiveProfile(): Promise<LocalUserProfile | undefined> {
    const id = await metadataRepo.getMetadata<string>(ACTIVE_PROFILE_ID);
    return id ? decryptProfileRow(await db.profiles.get(id)) : undefined;
  },
  // Cheap existence check for the lock gate — never decrypts (no key needed to know a profile exists).
  async hasActiveProfile(): Promise<boolean> {
    const id = await metadataRepo.getMetadata<string>(ACTIVE_PROFILE_ID);
    return id ? (await db.profiles.get(id)) != null : false;
  },
  async getProfile(id: string): Promise<LocalUserProfile | undefined> {
    return decryptProfileRow(await db.profiles.get(id));
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
    const row: EncryptedAllergyCardRow = {
      id: card.id,
      profileId: card.profileId,
      updatedAt: card.updatedAt,
      blob: await encryptJson(await getLocalKey(), card),
    };
    await db.allergyCards.put(row);
  },
  async loadAllergyCard(profileId: string): Promise<StoredAllergyCard | undefined> {
    const rows = await db.allergyCards.where('profileId').equals(profileId).sortBy('updatedAt');
    return decryptAllergyRow(rows.at(-1));
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

// Offline restaurant cache (§12). Keyed by profile fingerprint; never stores the raw profile or
// exact location. Always surfaced with a stale/offline warning by the UI.
const RESTAURANT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const restaurantCacheRepo = {
  async saveSearch(city: string, profileFingerprint: string, payload: unknown): Promise<void> {
    const now = Date.now();
    await db.lastRestaurantSearch.put({
      cacheKey: `${city}:${profileFingerprint}`,
      city,
      profileFingerprint,
      savedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + RESTAURANT_CACHE_TTL_MS).toISOString(),
      payload,
    });
  },
  async loadSearch(city: string, profileFingerprint: string): Promise<CachedRestaurantSearch | undefined> {
    const row = await db.lastRestaurantSearch.get(`${city}:${profileFingerprint}`);
    if (row && Date.parse(row.expiresAt) < Date.now()) {
      await db.lastRestaurantSearch.delete(row.cacheKey);
      return undefined;
    }
    return row;
  },
  async saveDetail(idOrSlug: string, profileFingerprint: string, restaurantId: string, payload: unknown): Promise<void> {
    const now = Date.now();
    await db.lastRestaurantDetail.put({
      cacheKey: `${idOrSlug}:${profileFingerprint}`,
      restaurantId,
      profileFingerprint,
      savedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + RESTAURANT_CACHE_TTL_MS).toISOString(),
      payload,
    });
  },
  async loadDetail(idOrSlug: string, profileFingerprint: string): Promise<CachedRestaurantDetail | undefined> {
    const row = await db.lastRestaurantDetail.get(`${idOrSlug}:${profileFingerprint}`);
    if (row && Date.parse(row.expiresAt) < Date.now()) {
      await db.lastRestaurantDetail.delete(row.cacheKey);
      return undefined;
    }
    return row;
  },
};

// Phase 03 §12 offline feedback outbox. Stores ONLY the sync payload (FeedbackReportInput) — no
// full profile, no geolocation, no tokens. Keyed by clientReportId so a re-tap of the same draft
// overwrites (never duplicates) and a re-flush is deduped server-side.
export const pendingFeedbackRepo = {
  async save(payload: FeedbackReportInput): Promise<PendingFeedbackReport> {
    const now = nowIso();
    const row: PendingFeedbackReport = {
      clientReportId: payload.clientReportId,
      payload,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      retryCount: 0,
      lastError: null,
    };
    assertNoSecrets(row);
    await db.pendingFeedbackReports.put(row);
    return row;
  },
  async list(statuses?: PendingFeedbackStatus[]): Promise<PendingFeedbackReport[]> {
    const rows = await db.pendingFeedbackReports.orderBy('createdAt').toArray();
    return statuses ? rows.filter((r) => statuses.includes(r.status)) : rows;
  },
  async count(): Promise<number> {
    return db.pendingFeedbackReports.count();
  },
  async markSyncing(clientReportId: string): Promise<void> {
    await db.pendingFeedbackReports.update(clientReportId, { status: 'syncing', updatedAt: nowIso() });
  },
  async markFailed(clientReportId: string, error: string): Promise<void> {
    const row = await db.pendingFeedbackReports.get(clientReportId);
    await db.pendingFeedbackReports.update(clientReportId, {
      status: 'failed',
      retryCount: (row?.retryCount ?? 0) + 1,
      lastError: error.slice(0, 300),
      updatedAt: nowIso(),
    });
  },
  async delete(clientReportId: string): Promise<void> {
    await db.pendingFeedbackReports.delete(clientReportId);
  },
};

export async function clearAllLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.profiles, db.allergyCards, db.questionCards, db.savedDishes, db.metadata, db.lastRestaurantSearch, db.lastRestaurantDetail, db.pendingFeedbackReports, db.chatSessions],
    async () => {
      await Promise.all([
        db.profiles.clear(),
        db.allergyCards.clear(),
        db.questionCards.clear(),
        db.savedDishes.clear(),
        db.metadata.clear(),
        db.lastRestaurantSearch.clear(),
        db.lastRestaurantDetail.clear(),
        db.pendingFeedbackReports.clear(),
        db.chatSessions.clear(),
      ]);
    },
  );
}
