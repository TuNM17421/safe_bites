import { z } from 'zod';

// Feature-local Zod + fetcher for the /famous list (mirrors dishes-client.ts). Extra DTO fields
// are stripped by the schema; allergenRisks are kept so the chip can be evaluated client-side.
const bilingual = z.object({ en: z.string(), vi: z.string() });
const nullableBilingual = z.object({ en: z.string().nullable(), vi: z.string().nullable() });

const allergenRiskSchema = z.object({
  allergenId: z.string(),
  riskLevel: z.enum(['contains', 'likely_contains', 'possible', 'unlikely', 'unknown']),
  confidence: z.number(),
  reason: bilingual,
  action: bilingual,
  evidenceType: z.string(),
  source: z.string(),
  reviewStatus: z.string(),
  lastCheckedAt: z.string(),
});

export const famousDishSchema = z.object({
  id: z.string(),
  name: bilingual,
  description: nullableBilingual,
  commonIngredients: nullableBilingual,
  isFamous: z.boolean(),
  featuredRank: z.number().nullable(),
  restaurantCount: z.number(),
  allergenRisks: z.array(allergenRiskSchema),
});

export const famousResponseSchema = z.object({ dishes: z.array(famousDishSchema) });

export type FamousDish = z.infer<typeof famousDishSchema>;

export async function fetchFamousDishes(city: string): Promise<FamousDish[]> {
  const res = await fetch(`/api/v1/dishes/famous?city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error(`famous_failed_${res.status}`);
  const json = (await res.json()) as { data: unknown };
  return famousResponseSchema.parse(json.data).dishes;
}
