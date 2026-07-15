import { z } from 'zod';

// OCR predict contract (v2). Frozen so a real vision provider can replace the stub predictor with
// no route/UI change. The traffic-light `status` uses the engine vocabulary; the per-user dot is
// derived client-side. Photo is an optional bounded base64 data URL (only sent when submitting for
// admin review); the predict path itself stores nothing.
const bilingual = z.object({ en: z.string(), vi: z.string() });
const statusEnum = z.enum(['suitable', 'ask_first', 'risky', 'avoid', 'unknown']);

export const ocrPredictRequestSchema = z.object({
  locale: z.enum(['en', 'vi']).default('en'),
  allergenIds: z.array(z.string()).max(20).default([]),
  submitForReview: z.boolean().default(false),
  menuItemId: z.string().max(200).nullish(),
  photo: z.string().max(900_000).nullish(),
});
export type OcrPredictRequest = z.infer<typeof ocrPredictRequestSchema>;

export const ocrIngredientSchema = z.object({
  ingredientId: z.string().nullable(),
  name: bilingual,
  status: statusEnum,
  confidence: z.number(),
  note: bilingual.nullable(),
});

export const ocrPredictionSchema = z.object({
  dishName: bilingual,
  ingredients: z.array(ocrIngredientSchema),
  verdict: z.object({ status: statusEnum, allergen: z.string().nullable(), label: bilingual }),
});
export type OcrPrediction = z.infer<typeof ocrPredictionSchema>;

export const ocrPredictResponseSchema = z.object({
  prediction: ocrPredictionSchema,
  reviewItemId: z.string().nullable(),
});
export type OcrPredictResponse = z.infer<typeof ocrPredictResponseSchema>;

// Admin decision on a single reviewed item.
export const ocrReviewActionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  approvedIngredientIds: z.array(z.string()).max(50).default([]),
});
export type OcrReviewAction = z.infer<typeof ocrReviewActionSchema>;
