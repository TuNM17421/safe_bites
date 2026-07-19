import 'server-only';
import OpenAI from 'openai';

// Single OpenAI client + capability gate. The key is server-only (never NEXT_PUBLIC, never logged).
// When it's absent every AI feature falls back to its deterministic stub, so the app runs unchanged.
let client: OpenAI | null = null;

export function isOpenAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAi(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// gpt-4o-mini: chat + vision in one model, cheap enough for demo scale. Swap here to upgrade.
export const OPENAI_MODEL = 'gpt-4o-mini';
export const OPENAI_TIMEOUT_MS = 20_000;
