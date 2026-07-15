import { z } from 'zod';

// On-device encryption at rest (AES-GCM, WebCrypto). PURE — no Dexie/storage binding, so it is
// unit-testable and the key is always passed in (device-only, never serialized here). The key
// lifecycle (non-extractable, stored as a CryptoKey object) lives in key-store.ts.

// Envelope validated with Zod at the decrypt boundary: a malformed/foreign blob fails loudly
// instead of silently decrypting to garbage. `v` gates future format changes.
export const encryptedEnvelopeSchema = z.object({
  v: z.literal(1),
  iv: z.string().min(1),
  ct: z.string().min(1),
});
export type EncryptedEnvelope = z.infer<typeof encryptedEnvelopeSchema>;

const IV_BYTES = 12; // AES-GCM standard nonce length

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// A fresh non-extractable AES-GCM key. Non-extractable ⇒ raw key material can never be read back
// out, even by our own code — it only lives as an opaque CryptoKey handle.
export function generateLocalKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<EncryptedEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { v: 1, iv: toBase64(iv), ct: toBase64(new Uint8Array(ciphertext)) };
}

export async function decryptJson<T>(key: CryptoKey, envelope: EncryptedEnvelope): Promise<T> {
  const iv = fromBase64(envelope.iv);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(envelope.ct));
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
