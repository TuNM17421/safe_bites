import 'server-only';
import { z } from 'zod';
import type { AgentReply, BotRestaurant, DataEditProposal } from '@/lib/agent-schemas';
import { getOpenAi, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from '@/lib/openai';
import { isFlaggedContent } from '@/server/ai/moderation';
import { fetchGroundedRestaurants, resolveIngredient, type GroundedRestaurant } from './grounding';

// Safety-first system prompt. The app only SUGGESTS; humans confirm. The model may phrase + select
// from grounded data but must never assert a food is safe, never invent entities, and never give
// medical advice. Every id it returns is verified against the grounded set afterwards.
const SYSTEM_PROMPT = `You are SafeBite's assistant for travelers in Vietnam managing food allergies.
CRITICAL SAFETY RULES — never break these:
- The app only SUGGESTS. NEVER state a dish or restaurant is definitively safe/allergen-free. ALWAYS tell the user to confirm ingredients and preparation with restaurant staff before ordering.
- Only reference restaurants and menu items present in the provided grounded JSON. NEVER invent names, ids, dishes, or facts. If nothing fits, say so honestly.
- To surface a place, set restaurantId to one of the grounded restaurant ids (or null).
- If the user reports an ingredient a restaurant told them about (e.g. "they fry in peanut oil"), you MAY propose a data correction: set proposal with a menuItemId from the grounded data, the ingredient name, present (true if the dish contains it), a conservative proposedStatus, and a short reason. This is only a proposal — a human admin reviews it; nothing is auto-applied.
- Never give medical advice. For a severe reaction, tell the user to seek emergency care.
- Reply in BOTH English (replyEn) and Vietnamese (replyVi): warm, concise, practical.`;

// Strict structured-output schema (what the model must return).
const DECISION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    replyEn: { type: 'string' },
    replyVi: { type: 'string' },
    restaurantId: { type: ['string', 'null'] },
    proposal: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        menuItemId: { type: 'string' },
        ingredientName: { type: 'string' },
        present: { type: 'boolean' },
        proposedStatus: { type: 'string', enum: ['suitable', 'ask_first', 'risky', 'avoid', 'unknown'] },
        reasonEn: { type: 'string' },
        reasonVi: { type: 'string' },
      },
      required: ['menuItemId', 'ingredientName', 'present', 'proposedStatus', 'reasonEn', 'reasonVi'],
    },
  },
  required: ['replyEn', 'replyVi', 'restaurantId', 'proposal'],
} as const;

const decisionSchema = z.object({
  replyEn: z.string(),
  replyVi: z.string(),
  restaurantId: z.string().nullable(),
  proposal: z
    .object({
      menuItemId: z.string(),
      ingredientName: z.string(),
      present: z.boolean(),
      proposedStatus: z.enum(['suitable', 'ask_first', 'risky', 'avoid', 'unknown']),
      reasonEn: z.string(),
      reasonVi: z.string(),
    })
    .nullable(),
});

const SAFE_TEXT = {
  en: "I can help you find nearby places and note ingredients — always confirm with staff before ordering.",
  vi: 'Mình có thể giúp tìm quán gần đây và ghi nhận nguyên liệu — luôn hỏi lại nhân viên trước khi gọi món nhé.',
};

// Verify the model's restaurant choice against the grounded set — never surface an invented entity.
function hydrateRestaurant(id: string | null, grounded: GroundedRestaurant[]): BotRestaurant | null {
  if (!id) return null;
  const g = grounded.find((r) => r.restaurantId === id);
  if (!g) return null;
  return {
    restaurantId: g.restaurantId,
    slug: g.slug,
    name: { en: g.nameEn, vi: g.nameVi },
    compatibility: g.compatibility, // REAL % from the engine
    distanceMeters: null, // chat has no location — honest null, not a canned distance
  };
}

// Build a proposal ONLY if the menu item is grounded AND the ingredient resolves to a real catalog
// id (the HITL correction needs a valid id). Otherwise drop it — no invented corrections.
async function hydrateProposal(
  p: z.infer<typeof decisionSchema>['proposal'],
  grounded: GroundedRestaurant[],
): Promise<DataEditProposal | null> {
  if (!p) return null;
  const r = grounded.find((g) => g.menuItems.some((m) => m.menuItemId === p.menuItemId));
  const mi = r?.menuItems.find((m) => m.menuItemId === p.menuItemId);
  if (!r || !mi) return null;
  const ing = await resolveIngredient(p.ingredientName);
  if (!ing) return null;
  return {
    restaurantId: r.restaurantId,
    menuItemId: mi.menuItemId,
    menuItemName: mi.name,
    ingredientId: ing.id,
    ingredientName: { en: ing.nameEn, vi: ing.nameVi },
    present: p.present,
    proposedStatus: p.proposedStatus,
    reason: { en: p.reasonEn, vi: p.reasonVi },
  };
}

export async function openAiAgentReply(input: {
  message: string;
  allergenIds: string[];
  city: string;
}): Promise<AgentReply> {
  // Input guardrail: refuse abusive/harmful content up front.
  if (await isFlaggedContent(input.message)) {
    return { text: SAFE_TEXT, restaurant: null, proposal: null };
  }

  const grounded = await fetchGroundedRestaurants(input.city, input.allergenIds);

  const completion = await getOpenAi().chat.completions.create(
    {
      model: OPENAI_MODEL,
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `Grounded data (JSON). Only use these:\n${JSON.stringify(grounded)}` },
        { role: 'user', content: input.message },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'agent_decision', strict: true, schema: DECISION_JSON_SCHEMA },
      },
    },
    { timeout: OPENAI_TIMEOUT_MS },
  );

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const decision = decisionSchema.parse(JSON.parse(raw));

  let text = { en: decision.replyEn, vi: decision.replyVi };
  // Output guardrail: never let flagged model text reach the user.
  if (await isFlaggedContent(`${text.en}\n${text.vi}`)) text = SAFE_TEXT;

  return {
    text,
    restaurant: hydrateRestaurant(decision.restaurantId, grounded),
    proposal: await hydrateProposal(decision.proposal, grounded),
  };
}
