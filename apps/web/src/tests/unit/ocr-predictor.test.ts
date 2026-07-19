import { describe, expect, it } from 'vitest';
import { ocrPredictionSchema } from '../../lib/ocr-schemas';
import { ocrPredictor } from '../../server/ocr/predictor';

describe('ocrPredictor (stub)', () => {
  it('returns a Zod-valid canned prediction behind the interface', async () => {
    const p = await ocrPredictor.predict({ allergenIds: [] });
    expect(ocrPredictionSchema.safeParse(p).success).toBe(true);
    expect(p.dishName.vi).toBe('Gỏi cuốn');
    expect(p.ingredients.some((i) => i.ingredientId === 'ing_peanut')).toBe(true);
  });

  it('escalates the peanut verdict for a peanut-allergic profile', async () => {
    const none = await ocrPredictor.predict({ allergenIds: [] });
    const peanut = await ocrPredictor.predict({ allergenIds: ['peanut'] });
    expect(none.verdict.status).toBe('ask_first');
    expect(peanut.verdict.status).toBe('avoid');
  });
});
