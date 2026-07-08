import { z } from 'zod';

export const languageCodeSchema = z.enum(['en', 'vi']);
export const severitySchema = z.enum(['mild', 'moderate', 'severe', 'anaphylaxis_risk']);
export const riskLevelSchema = z.enum(['contains', 'likely_contains', 'possible', 'unlikely', 'unknown']);
export const recommendationStatusSchema = z.enum(['suitable', 'ask_first', 'risky', 'avoid', 'unknown']);
export const evidenceTypeSchema = z.enum([
  'manual_seed',
  'canonical_recipe',
  'menu_observed',
  'restaurant_verified',
  'user_report',
  'llm_inferred',
]);

const bilingualSchema = z.object({ en: z.string(), vi: z.string() });

export const localUserProfileSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  selectedProfileIds: z.array(z.string()),
  allergies: z.array(
    z.object({
      allergenId: z.string(),
      severity: severitySchema,
      crossContactSensitive: z.union([z.boolean(), z.literal('not_sure')]),
    }),
  ),
  language: languageCodeSchema,
  destinationCity: z.string(),
  safetyAcceptedAt: z.string(),
  offlineEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const dishRiskFactSchema = z.object({
  dishId: z.string(),
  allergenId: z.string(),
  riskLevel: riskLevelSchema,
  // Reject raw Prisma Decimal — callers must serialize to a plain number first.
  confidence: z.number().min(0).max(1),
  reason: bilingualSchema,
  recommendedAction: bilingualSchema,
  evidenceType: evidenceTypeSchema,
  source: z.string(),
  lastCheckedAt: z.string(),
});

export const dishEvaluationInputSchema = z.object({
  dishId: z.string(),
  name: bilingualSchema,
  risks: z.array(dishRiskFactSchema),
  calorieClass: z.string().optional(),
  spicyLevel: z.string().optional(),
  pickyEaterFlags: z.array(z.string()),
});

export const questionCardInputSchema = z.object({
  profile: localUserProfileSchema,
  allergens: z.array(
    z.object({
      id: z.string(),
      nameVi: z.string(),
      nameEn: z.string(),
      aliasesVi: z.array(z.string()),
      aliasesEn: z.array(z.string()),
    }),
  ),
  targetLanguage: languageCodeSchema,
  dishName: bilingualSchema.optional(),
});
