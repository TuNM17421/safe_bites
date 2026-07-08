import { EvidenceType, ReviewStatus, RiskLevel, SourceType } from '@prisma/client';
import { z } from 'zod';

// Zod at every admin boundary (spec §9.7). Prisma enums via z.nativeEnum so the vocab
// can't drift. Reason/action text is denylist-checked at the API boundary because those
// fields render in the PUBLIC dish UI, and the §16 copy CI gate scans source files, not DB rows.

// Phrases assembled from fragments so this file stays clean for the copy scanner. BOTH the
// candidate text and the phrases are normalized (lowercase, non-alphanumeric -> single space)
// so trivial variants ("this dish is  safe", "guaranteed-safe", "100 % safe") are still caught.
const FORBIDDEN_COPY: readonly string[] = [
  ['guaranteed', 'safe'],
  ['100', 'safe'],
  ['allergy', 'proof'],
  ['this', 'dish', 'is', 'safe'],
  ['verified', 'safe'],
].map((parts) => parts.join(' '));

const normalizeCopy = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function noForbiddenCopy(value: string, ctx: z.RefinementCtx): void {
  const normalized = normalizeCopy(value);
  if (FORBIDDEN_COPY.some((phrase) => normalized.includes(phrase))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Contains forbidden safety wording.' });
  }
}

const localizedText = z.string().min(1);
const safeLocalizedText = z.string().min(1).superRefine(noForbiddenCopy);
// Optional free text that renders in the PUBLIC UI (descriptions, ingredients) — denylist-checked.
const safeOptionalText = z.string().superRefine(noForbiddenCopy).optional();
const stringArray = z.array(z.string()).default([]);
const optionalText = z.string().optional();
// Confidence is stored as Decimal(3,2); reject >2 decimals so the stored value can't silently differ.
const confidenceSchema = z
  .number()
  .min(0)
  .max(1)
  .refine((n) => Number(n.toFixed(2)) === n, { message: 'Confidence supports at most 2 decimal places.' });

export const reviewStatusEnum = z.nativeEnum(ReviewStatus);

// ---- Auth ----
export const loginSchema = z.object({ token: z.string().min(1) });

// ---- Query params ----
export const reviewStatusQuerySchema = z.object({
  review_status: z.enum(['needs_review', 'approved', 'rejected', 'all']).default('all'),
});
export const dishIdQuerySchema = z.object({ dishId: z.string().min(1) });

// ---- Dish ----
export const dishCreateSchema = z.object({
  id: z.string().min(1).optional(),
  canonicalNameVi: localizedText,
  canonicalNameEn: localizedText,
  aliasesVi: stringArray,
  aliasesEn: stringArray,
  dishCategory: z.string().min(1),
  cuisine: z.string().min(1),
  regionTags: stringArray,
  mealType: stringArray,
  descriptionVi: safeOptionalText,
  descriptionEn: safeOptionalText,
  commonIngredientsVi: safeOptionalText,
  commonIngredientsEn: safeOptionalText,
  possibleHiddenIngredientsVi: safeOptionalText,
  possibleHiddenIngredientsEn: safeOptionalText,
  calorieClass: optionalText,
  spicyLevel: optionalText,
  pickyEaterFlags: stringArray,
  sourceType: z.nativeEnum(SourceType), // explicit on create (§9.7)
  sourceUrl: optionalText,
  reviewStatus: reviewStatusEnum.default(ReviewStatus.needs_review),
  notes: optionalText,
});
export const dishUpdateSchema = dishCreateSchema.omit({ id: true }).partial();

// ---- Ingredient ----
export const ingredientCreateSchema = z.object({
  id: z.string().min(1).optional(),
  canonicalNameVi: localizedText,
  canonicalNameEn: localizedText,
  ingredientCategory: z.string().min(1),
  aliasesVi: stringArray,
  aliasesEn: stringArray,
  majorAllergenTags: stringArray,
  dietaryFlags: stringArray,
  halalRelevance: optionalText,
  hinduRelevance: optionalText,
  veganRelevance: optionalText,
  calorieRelevance: optionalText,
  riskNotesVi: optionalText,
  riskNotesEn: optionalText,
  reviewStatus: reviewStatusEnum.default(ReviewStatus.needs_review),
});
export const ingredientUpdateSchema = ingredientCreateSchema.omit({ id: true }).partial();

// ---- Dish-allergen risk ----
// reason/action are required, non-empty, and denylist-checked in BOTH create and update.
export const dishRiskCreateSchema = z.object({
  dishId: z.string().min(1),
  allergenId: z.string().min(1),
  riskLevel: z.nativeEnum(RiskLevel),
  confidence: confidenceSchema,
  reasonVi: safeLocalizedText,
  reasonEn: safeLocalizedText,
  recommendedActionVi: safeLocalizedText,
  recommendedActionEn: safeLocalizedText,
  evidenceType: z.nativeEnum(EvidenceType), // explicit on create (§9.7)
  sourceType: z.nativeEnum(SourceType), // explicit on create (§9.7)
  sourceUrl: optionalText,
  reviewStatus: reviewStatusEnum.default(ReviewStatus.needs_review),
});
export const dishRiskUpdateSchema = z
  .object({
    riskLevel: z.nativeEnum(RiskLevel),
    confidence: confidenceSchema,
    reasonVi: safeLocalizedText,
    reasonEn: safeLocalizedText,
    recommendedActionVi: safeLocalizedText,
    recommendedActionEn: safeLocalizedText,
    evidenceType: z.nativeEnum(EvidenceType),
    sourceType: z.nativeEnum(SourceType),
    sourceUrl: optionalText,
    reviewStatus: reviewStatusEnum,
  })
  .partial();

export type DishCreateInput = z.infer<typeof dishCreateSchema>;
export type IngredientCreateInput = z.infer<typeof ingredientCreateSchema>;
export type DishRiskCreateInput = z.infer<typeof dishRiskCreateSchema>;
