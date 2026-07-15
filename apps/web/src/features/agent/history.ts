import type { ChatMessage, HistoryTurn } from '@/lib/agent-schemas';

// How many prior turns to replay to the model for context. Pure + testable; bounds token cost.
export const HISTORY_TURNS = 8;

export function messagesToHistory(messages: ChatMessage[]): HistoryTurn[] {
  return messages.slice(-HISTORY_TURNS).map((m) => ({ role: m.role, text: m.text }));
}
