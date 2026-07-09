import { requireAdmin } from '@/lib/admin-auth';
import { adminFeedbackActionSchema } from '@/lib/admin-feedback-schemas';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { applyAdminAction } from '@/server/feedback/admin-actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ reportId: string }> };

// POST /api/v1/admin/feedback/[reportId]/actions — apply an admin action with side effects
// (spec §10.4). Every action writes an audit row via applyAdminAction.
export async function POST(req: Request, ctx: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { reportId } = await ctx.params;
  const body = await parseBody(req, adminFeedbackActionSchema);
  if (!body.ok) return body.response;

  const result = await applyAdminAction({
    reportId,
    actionType: body.data.actionType,
    note: body.data.note,
    target: body.data.target,
    expiresAt: body.data.expiresAt,
    confidenceDelta: body.data.confidenceDelta,
    flagId: body.data.flagId,
    actor: 'admin',
  });

  if (!result.ok) {
    if (result.reason === 'report_not_found') return apiError('NOT_FOUND', 'Feedback report not found.', { status: 404 });
    return apiError('VALIDATION_ERROR', 'This action requires a valid target.', { status: 400 });
  }

  return apiOk({
    actionId: result.actionId,
    reportId,
    ...(result.createdFlagId ? { createdFlagId: result.createdFlagId } : {}),
    ...(result.updatedFlagId ? { updatedFlagId: result.updatedFlagId } : {}),
    status: 'ok',
  });
}
