import { z } from 'zod';
import {
  buildQuestionCard,
  type Bilingual,
  type LanguageCode,
  type LocalUserProfile,
  type QuestionCard,
  type QuestionCardAllergen,
} from '@safebite/domain';

// Canonical persisted/rendered question-card record: the §9.6 API response shape plus the
// client-attached `profileId` + optional `dishId`. One mapper feeds both the online (POST)
// and offline/instant-toggle (domain regen) paths so the two are byte-identical (§15).

const sectionSchema = z.object({
  kind: z.enum(['severity_statement', 'ingredient_question', 'cross_contact_question', 'kitchen_check']),
  text: z.string(),
});

export const questionCardResponseSchema = z.object({
  id: z.string(),
  targetLanguage: z.enum(['en', 'vi']),
  source: z.string(),
  createdAt: z.string(),
  text: z.string(),
  sections: z.array(sectionSchema),
});
export type QuestionCardResponse = z.infer<typeof questionCardResponseSchema>;

// The API envelope (§9) wraps the payload under `data`; extra keys (meta) are ignored.
const envelopeSchema = z.object({ data: questionCardResponseSchema });

export interface QuestionCardRecord extends QuestionCardResponse {
  profileId: string;
  dishId?: string;
}

export interface FetchQuestionCardBody {
  profile: {
    id: string;
    selectedProfileIds: string[];
    allergies: LocalUserProfile['allergies'];
    language: LanguageCode;
    destinationCity?: string;
  };
  dishId?: string;
  menuItemId?: string;
  targetLanguage: LanguageCode;
}

// Online path (§9.6): the server is authoritative for `id` / `source` / `createdAt`.
export async function fetchQuestionCard(body: FetchQuestionCardBody): Promise<QuestionCardRecord> {
  const res = await fetch('/api/v1/question-cards', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, offlineCache: true }),
  });
  if (!res.ok) throw new Error(`question-card request failed: ${res.status}`);
  const { data } = envelopeSchema.parse(await res.json());
  return { ...data, profileId: body.profile.id, dishId: body.dishId };
}

// Pure mapper: deterministic domain card + explicit meta -> record shape (testable; no clock/uuid inside).
export function toQuestionCardRecord(
  card: QuestionCard,
  meta: { id: string; profileId: string; dishId?: string; source?: string; createdAt: string },
): QuestionCardRecord {
  return {
    id: meta.id,
    profileId: meta.profileId,
    dishId: meta.dishId,
    targetLanguage: card.targetLanguage,
    source: meta.source ?? 'template_generated',
    createdAt: meta.createdAt,
    text: card.text,
    sections: card.sections,
  };
}

// Offline / EN<->VI toggle path: same domain fn the API calls -> identical output (§15 determinism).
export function regenQuestionCard(
  input: {
    profile: LocalUserProfile;
    allergens: QuestionCardAllergen[];
    targetLanguage: LanguageCode;
    dishName?: Bilingual;
  },
  meta: { id: string; profileId: string; dishId?: string; createdAt: string },
): QuestionCardRecord {
  const card = buildQuestionCard(input);
  return toQuestionCardRecord(card, { ...meta, source: 'template_generated' });
}
