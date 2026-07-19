import type { OcrPrediction } from '@/lib/ocr-schemas';

// Swap point for OCR/vision. The stub returns a canned "general recipe" prediction and IGNORES the
// image; the OpenAI vision provider implements the same interface with no route/UI change.
export interface OcrPredictInput {
  allergenIds: string[];
  imageBytes?: Buffer | null;
}

export interface OcrPredictor {
  predict(input: OcrPredictInput): Promise<OcrPrediction>;
}

class StubOcrPredictor implements OcrPredictor {
  async predict({ allergenIds }: OcrPredictInput): Promise<OcrPrediction> {
    const peanut = allergenIds.includes('peanut');
    return {
      dishName: { en: 'Fresh spring rolls', vi: 'Gỏi cuốn' },
      ingredients: [
        {
          ingredientId: null,
          name: { en: 'Rice paper, vermicelli, herbs, shrimp/pork', vi: 'Bánh tráng, bún, rau, tôm/thịt' },
          status: 'suitable',
          confidence: 0.82,
          note: null,
        },
        {
          ingredientId: 'ing_peanut',
          name: { en: 'Peanut sauce', vi: 'Sốt đậu phộng' },
          status: peanut ? 'avoid' : 'ask_first',
          confidence: 0.76,
          note: { en: 'Very commonly served with this dish', vi: 'Rất thường đi kèm món này' },
        },
      ],
      verdict: {
        status: peanut ? 'avoid' : 'ask_first',
        allergen: 'peanut',
        label: { en: 'Peanut: likely', vi: 'Đậu phộng: khả năng cao' },
      },
    };
  }
}

const stub = new StubOcrPredictor();

// The single instance the route uses. Dispatches to OpenAI vision when a key is configured, else the
// stub — AND on ANY OpenAI failure (timeout, rate limit, bad output). Dynamic import keeps the
// OpenAI code out of the graph when it's unused and avoids a static import cycle.
export const ocrPredictor: OcrPredictor = {
  async predict(input) {
    // Inline env check (not the @/lib/openai helper) so this module — and the stub unit test that
    // imports it — never statically pulls in the server-only OpenAI code.
    if (!process.env.OPENAI_API_KEY) return stub.predict(input);
    try {
      const { openAiVisionPredictor } = await import('./openai-vision-predictor');
      return await openAiVisionPredictor.predict(input);
    } catch {
      return stub.predict(input);
    }
  },
};
