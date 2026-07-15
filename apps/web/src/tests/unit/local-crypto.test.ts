import { describe, expect, it } from 'vitest';
import {
  decryptJson,
  encryptJson,
  encryptedEnvelopeSchema,
  generateLocalKey,
} from '../../lib/crypto/local-crypto';

const profileFixture = {
  id: 'p1',
  name: 'Mai',
  selectedProfileIds: ['peanut-allergy'],
  allergies: [{ allergenId: 'ing_peanut', severity: 'severe', crossContactSensitive: true }],
  language: 'vi',
  destinationCity: 'hanoi',
  safetyAcceptedAt: '2026-07-15T00:00:00.000Z',
  offlineEnabled: true,
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
};

describe('local-crypto', () => {
  it('round-trips a profile through encrypt → decrypt', async () => {
    const key = await generateLocalKey();
    const env = await encryptJson(key, profileFixture);
    expect(env.v).toBe(1);
    // Ciphertext must not leak plaintext PII.
    expect(env.ct).not.toContain('hanoi');
    expect(env.ct).not.toContain('Mai');
    const back = await decryptJson<typeof profileFixture>(key, env);
    expect(back).toEqual(profileFixture);
  });

  it('produces a fresh IV per call (no nonce reuse)', async () => {
    const key = await generateLocalKey();
    const a = await encryptJson(key, profileFixture);
    const b = await encryptJson(key, profileFixture);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it('rejects a malformed/foreign envelope at the Zod boundary', () => {
    expect(encryptedEnvelopeSchema.safeParse({ v: 2, iv: 'x', ct: 'y' }).success).toBe(false);
    expect(encryptedEnvelopeSchema.safeParse({ iv: 'x' }).success).toBe(false);
    expect(encryptedEnvelopeSchema.safeParse({ v: 1, iv: 'aa', ct: 'bb' }).success).toBe(true);
  });

  it('fails to decrypt with a different key (AES-GCM auth tag)', async () => {
    const env = await encryptJson(await generateLocalKey(), profileFixture);
    await expect(decryptJson(await generateLocalKey(), env)).rejects.toBeTruthy();
  });
});
