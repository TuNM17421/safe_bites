import { requireAdmin } from '@/lib/admin-auth';
import { apiOk } from '@/lib/api-response';
import { listPendingReviewItems } from '@/server/ocr/review-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/v1/admin/ocr-review — pending OCR review queue (admin only).
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return apiOk({ items: await listPendingReviewItems() });
}
