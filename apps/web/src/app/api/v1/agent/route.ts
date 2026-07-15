import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { agentReplySchema, agentRequestSchema } from '@/lib/agent-schemas';
import { getAgentReply } from '@/server/agent/agent-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/v1/agent — public, rate-limited chat. Uses the OpenAI grounded agent when a key is
// configured, else the deterministic scripted brain. The reply may carry a REAL restaurant card + a
// HITL data-edit proposal; every entity is DB-grounded and the proposal is never auto-applied.
export async function POST(req: Request) {
  if (!rateLimit(`agent:${clientKey(req)}`)) {
    return apiError('RATE_LIMITED', 'Too many messages. Please slow down.', { status: 429 });
  }
  const body = await parseBody(req, agentRequestSchema);
  if (!body.ok) return body.response;

  const reply = await getAgentReply({
    message: body.data.message,
    allergenIds: body.data.allergenIds,
    city: body.data.city,
  });
  return apiOk(agentReplySchema.parse(reply));
}
