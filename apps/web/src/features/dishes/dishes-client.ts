import { z } from 'zod';
import type { LocalUserProfile } from '@safebite/domain';

const bilingual = z.object({ en: z.string(), vi: z.string() });
const nullableBilingual = z.object({ en: z.string().nullable(), vi: z.string().nullable() });

const cardSchema = z.object({
  dishId: z.string(),
  name: bilingual,
  status: z.enum(['suitable', 'ask_first', 'risky', 'avoid', 'unknown']),
  riskLevel: z.enum(['contains', 'likely_contains', 'possible', 'unlikely', 'unknown']),
  confidence: z.enum(['low', 'medium', 'high']),
  reason: bilingual,
  action: bilingual,
  source: z.string(),
  lastCheckedAt: z.string(),
  matchedAllergens: z.array(z.string()),
  stale: z.boolean().optional(),
});

const recommendationsSchema = z.object({
  city: z.string(),
  groups: z.object({
    suitable: z.array(cardSchema),
    askFirst: z.array(cardSchema),
    risky: z.array(cardSchema),
    avoid: z.array(cardSchema),
    unknown: z.array(cardSchema),
  }),
  summary: z.object({
    total: z.number(),
    suitable: z.number(),
    askFirst: z.number(),
    risky: z.number(),
    avoid: z.number(),
    unknown: z.number(),
  }),
});
export type Recommendations = z.infer<typeof recommendationsSchema>;

const dishSchema = z.object({
  id: z.string(),
  name: bilingual,
  category: z.string(),
  cuisine: z.string(),
  description: nullableBilingual,
  commonIngredients: nullableBilingual,
  possibleHiddenIngredients: nullableBilingual,
});
export type DishDetailData = z.infer<typeof dishSchema>;

export async function fetchRecommendations(city: string, profile: LocalUserProfile): Promise<Recommendations> {
  const res = await fetch('/api/v1/recommendations/dishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city,
      language: profile.language,
      profile: {
        id: profile.id,
        selectedProfileIds: profile.selectedProfileIds,
        allergies: profile.allergies,
        destinationCity: profile.destinationCity,
      },
    }),
  });
  if (!res.ok) throw new Error(`recommendations_failed_${res.status}`);
  const json = (await res.json()) as { data: unknown };
  return recommendationsSchema.parse(json.data);
}

export async function fetchDish(dishId: string): Promise<DishDetailData> {
  const res = await fetch(`/api/v1/dishes/${encodeURIComponent(dishId)}`);
  if (!res.ok) throw new Error(`dish_failed_${res.status}`);
  const json = (await res.json()) as { data: unknown };
  return dishSchema.parse(json.data);
}
