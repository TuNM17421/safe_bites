import { requireAdmin } from '@/lib/admin-auth';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { ocrReviewActionSchema } from '@/lib/ocr-schemas';
import { applyReviewDecision } from '@/server/ocr/review-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ itemId: string }> };

// POST — approve (promote checked ingredients → MenuItemIngredient, unverified) or reject. Admin only.
export async function POST(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { itemId } = await ctx.params;
  const body = await parseBody(req, ocrReviewActionSchema);
  if (!body.ok) return body.response;

  const result = await applyReviewDecision(itemId, body.data.decision, body.data.approvedIngredientIds, 'admin');
  if (!result) return apiError('NOT_FOUND', 'Review item not found.', { status: 404 });
  return apiOk({ status: 'ok', ...result });
}
