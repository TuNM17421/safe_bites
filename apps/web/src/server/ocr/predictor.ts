import type { OcrPrediction } from '@/lib/ocr-schemas';

// Swap point for OCR/vision. The stub returns a canned "general recipe" prediction and IGNORES the
// image; a real vision provider implements the same interface with no route/UI change.
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

// The single instance the route uses. Replace with a real provider behind the same interface.
export const ocrPredictor: OcrPredictor = new StubOcrPredictor();
