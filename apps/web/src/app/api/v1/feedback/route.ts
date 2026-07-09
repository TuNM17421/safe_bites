import { FeedbackReportInputSchema } from '@safebite/domain';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import {
  FeedbackEntityError,
  persistFeedbackReport,
  resolveEntities,
} from '@/server/feedback/create-feedback-report';
import { planFeedbackReport } from '@/server/feedback/plan-feedback-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENTITY_ERROR_MESSAGE: Record<FeedbackEntityError['reason'], string> = {
  restaurant_not_found: 'Restaurant not found.',
  menu_item_not_found: 'That menu item does not belong to this restaurant.',
  dish_not_found: 'Dish not found.',
};

// POST /api/v1/feedback — public, anonymous, idempotent post-meal feedback (spec §9.1).
export async function POST(req: Request) {
  if (!rateLimit(`feedback:${clientKey(req)}`)) {
    return apiError('RATE_LIMITED', 'Too many submissions. Please try again shortly.', { status: 429 });
  }

  const body = await parseBody(req, FeedbackReportInputSchema);
  if (!body.ok) return body.response;

  let resolved;
  try {
    resolved = await resolveEntities(body.data);
  } catch (e) {
    if (e instanceof FeedbackEntityError) {
      return apiError('NOT_FOUND', ENTITY_ERROR_MESSAGE[e.reason], { status: 404 });
    }
    throw e; // unexpected → framework 500, no internals leaked
  }

  const plan = planFeedbackReport(body.data, resolved);
  const { body: response, created } = await persistFeedbackReport(plan);
  return apiOk(response, { status: created ? 201 : 200 });
}
