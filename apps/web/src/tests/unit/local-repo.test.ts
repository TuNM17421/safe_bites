import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DishRecommendationCard, LocalUserProfile } from '@safebite/domain';
import { db } from '../../lib/dexie';
import {
  allergyCardRepo,
  clearAllLocalData,
  metadataRepo,
  profileRepo,
  questionCardRepo,
  savedDishRepo,
} from '../../lib/local-repo';

function profile(id = 'p1'): LocalUserProfile {
  return {
    id,
    selectedProfileIds: [],
    allergies: [],
    language: 'en',
    destinationCity: 'hanoi',
    safetyAcceptedAt: 'x',
    offlineEnabled: false,
    createdAt: 'x',
    updatedAt: 'x',
  };
}

function unknownCard(dishId = 'd1'): DishRecommendationCard {
  return {
    dishId,
    name: { en: 'Dish', vi: 'Món' },
    status: 'unknown',
    riskLevel: 'unknown',
    confidence: 'low',
    reason: { en: 'reason', vi: 'lý do' },
    action: { en: 'ask staff', vi: 'hỏi nhân viên' },
    source: 'engine',
    lastCheckedAt: '2026-07-08',
    matchedAllergens: ['soy'],
  };
}

beforeEach(async () => {
  await clearAllLocalData();
});

describe('profileRepo', () => {
  it('saves, loads the active profile, and clears it on delete', async () => {
    await profileRepo.saveProfile(profile('p1'));
    expect(await profileRepo.loadActiveProfile()).toMatchObject({ id: 'p1', destinationCity: 'hanoi' });
    await profileRepo.deleteProfile('p1');
    expect(await profileRepo.loadActiveProfile()).toBeUndefined();
  });

  it('refuses to store a profile carrying a secret-like key', async () => {
    await expect(profileRepo.saveProfile({ ...profile(), authorization: 'x' } as unknown as LocalUserProfile)).rejects.toThrow();
  });
});

describe('allergyCardRepo', () => {
  it('saves and loads by profile', async () => {
    await allergyCardRepo.saveAllergyCard({ id: 'ac1', profileId: 'p1', language: 'en', entries: [], createdAt: '1', updatedAt: '1' });
    expect((await allergyCardRepo.loadAllergyCard('p1'))?.id).toBe('ac1');
  });
});

describe('questionCardRepo', () => {
  it('tracks the latest saved card via the pointer', async () => {
    await questionCardRepo.saveLastQuestionCard({ id: 'qc1', targetLanguage: 'vi', text: 't1', sections: [], source: 'template_generated', createdAt: '1' });
    await questionCardRepo.saveLastQuestionCard({ id: 'qc2', targetLanguage: 'vi', text: 't2', sections: [], source: 'template_generated', createdAt: '2' });
    expect((await questionCardRepo.loadLastQuestionCard())?.id).toBe('qc2');
    await questionCardRepo.clearLastQuestionCard();
    expect(await questionCardRepo.loadLastQuestionCard()).toBeUndefined();
  });
});

describe('savedDishRepo — Unknown must survive a round-trip', () => {
  it('returns unknown-status cards unchanged with all evidence fields', async () => {
    await savedDishRepo.saveDish(unknownCard('d1'));
    const all = await savedDishRepo.loadSavedDishes();
    expect(all).toHaveLength(1);
    expect(all[0]?.status).toBe('unknown');
    expect(all[0]?.reason).toEqual({ en: 'reason', vi: 'lý do' });
    expect(all[0]?.action).toBeDefined();
    expect(all[0]?.source).toBe('engine');
    expect(typeof all[0]?.savedAt).toBe('string');
  });
});

describe('metadataRepo', () => {
  it('rejects secret-like keys', async () => {
    await expect(metadataRepo.setMetadata('x', { accessToken: 'y' })).rejects.toThrow();
  });
});

describe('clearAllLocalData', () => {
  it('empties every table', async () => {
    await profileRepo.saveProfile(profile());
    await savedDishRepo.saveDish(unknownCard());
    await allergyCardRepo.saveAllergyCard({ id: 'ac', profileId: 'p1', language: 'en', entries: [], createdAt: '1', updatedAt: '1' });
    await clearAllLocalData();
    expect(await db.profiles.count()).toBe(0);
    expect(await db.savedDishes.count()).toBe(0);
    expect(await db.allergyCards.count()).toBe(0);
    expect(await db.metadata.count()).toBe(0);
  });
});

describe('do-not-store discipline', () => {
  it('uses no localStorage/sessionStorage/cookie in the storage module', () => {
    const src =
      readFileSync(new URL('../../lib/dexie.ts', import.meta.url), 'utf8') +
      readFileSync(new URL('../../lib/local-repo.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });
});
