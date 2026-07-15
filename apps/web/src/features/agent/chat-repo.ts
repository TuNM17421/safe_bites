import 'client-only';
import { chatTranscriptSchema, type ChatMessage } from '@/lib/agent-schemas';
import { getLocalKey } from '@/lib/crypto/key-store';
import { decryptJson, encryptJson, encryptedEnvelopeSchema } from '@/lib/crypto/local-crypto';
import { CHAT_SESSION_ID, db, type EncryptedChatRow } from '@/lib/dexie';

// Durable, ENCRYPTED-at-rest store for the rolling agent conversation (same device key as the
// profile — chat holds allergy/food discussion). One blob for the whole transcript; capped so
// storage + replayed-context tokens stay bounded. Validated with Zod on decrypt.
const MAX_STORED = 50;

export const chatRepo = {
  async save(messages: ChatMessage[]): Promise<void> {
    const row: EncryptedChatRow = {
      id: CHAT_SESSION_ID,
      updatedAt: new Date().toISOString(),
      blob: await encryptJson(await getLocalKey(), messages.slice(-MAX_STORED)),
    };
    await db.chatSessions.put(row);
  },
  async load(): Promise<ChatMessage[]> {
    const row = await db.chatSessions.get(CHAT_SESSION_ID);
    const env = encryptedEnvelopeSchema.safeParse(row?.blob);
    if (!env.success) return [];
    try {
      const parsed = chatTranscriptSchema.safeParse(await decryptJson<unknown>(await getLocalKey(), env.data));
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  },
  async clear(): Promise<void> {
    await db.chatSessions.delete(CHAT_SESSION_ID);
  },
};
