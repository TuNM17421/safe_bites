import { z } from 'zod';

// Agent chat contract (v2). Frozen so a real LLM provider can replace the scripted brain with no
// route/UI change. Bot replies are DATA (bilingual conversational content), not UI chrome — the UI
// chrome (composer, buttons) uses useTranslations; the message text is picked by locale here.
const bilingual = z.object({ en: z.string(), vi: z.string() });
const statusEnum = z.enum(['suitable', 'ask_first', 'risky', 'avoid', 'unknown']);

// Prior turns sent for multi-turn context. Bounded (count + length) to cap tokens; the scripted
// brain ignores it, the OpenAI agent replays it so follow-ups ("the second one?") make sense.
export const historyTurnSchema = z.object({
  role: z.enum(['user', 'bot']),
  text: z.string().max(500),
});
export type HistoryTurn = z.infer<typeof historyTurnSchema>;

export const agentRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
  allergenIds: z.array(z.string()).max(20).default([]),
  city: z.string().max(80).default('hanoi'),
  locale: z.enum(['en', 'vi']).default('en'),
  history: z.array(historyTurnSchema).max(12).default([]),
});
export type AgentRequest = z.infer<typeof agentRequestSchema>;

export const botRestaurantSchema = z.object({
  restaurantId: z.string(),
  slug: z.string().nullable(),
  name: bilingual,
  compatibility: z.number().nullable(),
  distanceMeters: z.number().nullable(),
});
export type BotRestaurant = z.infer<typeof botRestaurantSchema>;

// A pre-filled ingredient correction the bot proposes; Confirm routes it through the phase-09
// ingredient-correction feedback path (needs_review, never auto-verified).
export const dataEditProposalSchema = z.object({
  restaurantId: z.string(),
  menuItemId: z.string(),
  menuItemName: z.string(),
  ingredientId: z.string(),
  ingredientName: bilingual,
  present: z.boolean(),
  proposedStatus: statusEnum,
  reason: bilingual,
});
export type DataEditProposal = z.infer<typeof dataEditProposalSchema>;

export const agentReplySchema = z.object({
  text: bilingual,
  restaurant: botRestaurantSchema.nullable(),
  proposal: dataEditProposalSchema.nullable(),
});
export type AgentReply = z.infer<typeof agentReplySchema>;

// A persisted chat turn (single source of truth for the ChatMessage type). `text` is already
// locale-resolved for display; `proposalSent` collapses a proposal card after it's been submitted
// so a restored transcript can't re-send it. Validated when decrypting the stored transcript.
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'bot']),
  text: z.string(),
  restaurant: botRestaurantSchema.nullish(),
  proposal: dataEditProposalSchema.nullish(),
  proposalSent: z.boolean().optional(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export const chatTranscriptSchema = z.array(chatMessageSchema);
