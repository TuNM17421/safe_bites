import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { ocrPredictRequestSchema, type OcrPredictResponse } from '@/lib/ocr-schemas';
import { ocrPredictor } from '@/server/ocr/predictor';
import { enqueueReviewItem } from '@/server/ocr/review-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/v1/ocr — public, rate-limited dish OCR. The stub predictor returns a canned GENERAL
// recipe estimate (source=ocr, unverified); it never touches the image. `submitForReview` opts in
// to persisting an OcrReviewItem for admin review. Provenance is set server-side, never trusted.
export async function POST(req: Request) {
  if (!rateLimit(`ocr:${clientKey(req)}`)) {
    return apiError('RATE_LIMITED', 'Too many scans. Please try again shortly.', { status: 429 });
  }
  const body = await parseBody(req, ocrPredictRequestSchema);
  if (!body.ok) return body.response;

  const prediction = await ocrPredictor.predict({ allergenIds: body.data.allergenIds });
  const reviewItemId = body.data.submitForReview
    ? await enqueueReviewItem(prediction, { photo: body.data.photo, menuItemId: body.data.menuItemId })
    : null;

  const response: OcrPredictResponse = { prediction, reviewItemId };
  return apiOk(response);
}
