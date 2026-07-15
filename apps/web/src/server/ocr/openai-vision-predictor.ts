import 'server-only';
import { z } from 'zod';
import { ocrPredictionSchema, type OcrPrediction } from '@/lib/ocr-schemas';
import { getOpenAi, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from '@/lib/openai';
import { resolveIngredient } from '@/server/ingredients/resolve-ingredient';
import type { OcrPredictInput, OcrPredictor } from './predictor';

// Vision OCR via gpt-4o-mini. SAFETY: the model estimates a GENERAL recipe, never claims a dish is
// allergen-free, and stays conservative for the user's own allergens. Predicted ingredient names are
// resolved to real catalog ids server-side so the admin OCR review can promote them (never invented).
const SYSTEM_PROMPT = `You identify a Vietnamese/other dish from a photo and estimate its LIKELY ingredients from a GENERAL recipe — NOT this specific restaurant's recipe.
SAFETY RULES:
- NEVER claim a dish is allergen-free or definitively safe. When unsure, use "unknown" or "ask_first".
- For any ingredient that could contain one of the user's allergens, be conservative: mark "avoid" if the user lists that allergen, otherwise "ask_first".
- confidence is 0..1. Provide bilingual (EN + VI) names/notes.
- The verdict summarizes the single biggest allergen risk for THIS user (verdictAllergen = the allergen id, or null if none stands out).`;

const STATUS = ['suitable', 'ask_first', 'risky', 'avoid', 'unknown'] as const;

const VISION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dishNameEn: { type: 'string' },
    dishNameVi: { type: 'string' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nameEn: { type: 'string' },
          nameVi: { type: 'string' },
          status: { type: 'string', enum: STATUS },
          confidence: { type: 'number' },
          noteEn: { type: 'string' },
          noteVi: { type: 'string' },
        },
        required: ['nameEn', 'nameVi', 'status', 'confidence', 'noteEn', 'noteVi'],
      },
    },
    verdictStatus: { type: 'string', enum: STATUS },
    verdictAllergen: { type: ['string', 'null'] },
    verdictLabelEn: { type: 'string' },
    verdictLabelVi: { type: 'string' },
  },
  required: ['dishNameEn', 'dishNameVi', 'ingredients', 'verdictStatus', 'verdictAllergen', 'verdictLabelEn', 'verdictLabelVi'],
} as const;

const visionSchema = z.object({
  dishNameEn: z.string(),
  dishNameVi: z.string(),
  ingredients: z.array(
    z.object({
      nameEn: z.string(),
      nameVi: z.string(),
      status: z.enum(STATUS),
      confidence: z.number(),
      noteEn: z.string(),
      noteVi: z.string(),
    }),
  ),
  verdictStatus: z.enum(STATUS),
  verdictAllergen: z.string().nullable(),
  verdictLabelEn: z.string(),
  verdictLabelVi: z.string(),
});

// Sniff the image type so the data URL mime matches the bytes (canvas exports vary png/jpeg).
function dataUrl(bytes: Buffer): string {
  const mime = bytes[0] === 0x89 && bytes[1] === 0x50 ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

class OpenAiVisionPredictor implements OcrPredictor {
  async predict({ allergenIds, imageBytes }: OcrPredictInput): Promise<OcrPrediction> {
    if (!imageBytes || imageBytes.length === 0) throw new Error('no_image'); // → dispatch falls back to stub

    const completion = await getOpenAi().chat.completions.create(
      {
        model: OPENAI_MODEL,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: `User's allergens to avoid: ${allergenIds.join(', ') || '(none specified)'}` },
              { type: 'image_url', image_url: { url: dataUrl(imageBytes) } },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'ocr_prediction', strict: true, schema: VISION_JSON_SCHEMA },
        },
      },
      { timeout: OPENAI_TIMEOUT_MS },
    );

    const v = visionSchema.parse(JSON.parse(completion.choices[0]?.message?.content ?? '{}'));

    // Resolve each predicted name to a real catalog id so admin review can promote it (null = the
    // reviewer maps it manually; we never invent an id).
    const ingredients = await Promise.all(
      v.ingredients.map(async (ing) => {
        const resolved = await resolveIngredient(ing.nameEn);
        return {
          ingredientId: resolved?.id ?? null,
          name: { en: ing.nameEn, vi: ing.nameVi },
          status: ing.status,
          confidence: ing.confidence,
          note: { en: ing.noteEn, vi: ing.noteVi },
        };
      }),
    );

    // Zod-validate the final shape at the boundary (belt-and-suspenders over the strict schema).
    return ocrPredictionSchema.parse({
      dishName: { en: v.dishNameEn, vi: v.dishNameVi },
      ingredients,
      verdict: { status: v.verdictStatus, allergen: v.verdictAllergen, label: { en: v.verdictLabelEn, vi: v.verdictLabelVi } },
    });
  }
}

export const openAiVisionPredictor: OcrPredictor = new OpenAiVisionPredictor();
