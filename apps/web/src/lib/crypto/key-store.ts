import 'client-only';
import { db, LOCAL_KEY_ID } from '../dexie';
import { generateLocalKey } from './local-crypto';

// Binds the device key to IndexedDB. The CryptoKey is stored as an opaque non-extractable object
// (structured-clone), so it survives reloads without ever exposing raw key material. Lost key ⇒
// the encrypted profile is unrecoverable by design; re-onboarding recovers (device-only posture).
let cached: CryptoKey | null = null;

export async function getLocalKey(): Promise<CryptoKey> {
  if (cached) return cached;
  const existing = await db.localKeys.get(LOCAL_KEY_ID);
  if (existing) {
    cached = existing.key;
    return cached;
  }
  const key = await generateLocalKey();
  await db.localKeys.put({ id: LOCAL_KEY_ID, key });
  cached = key;
  return key;
}
