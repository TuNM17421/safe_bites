import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { agentReplySchema, agentRequestSchema } from '@/lib/agent-schemas';
import { scriptAgentReply } from '@/server/agent/script-agent-reply';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/v1/agent — public, rate-limited, scripted chat. The reply may carry a real restaurant
// card + a data-edit proposal. The scripted brain is the only swap point for a future LLM provider.
export async function POST(req: Request) {
  if (!rateLimit(`agent:${clientKey(req)}`)) {
    return apiError('RATE_LIMITED', 'Too many messages. Please slow down.', { status: 429 });
  }
  const body = await parseBody(req, agentRequestSchema);
  if (!body.ok) return body.response;

  const reply = await scriptAgentReply({
    message: body.data.message,
    allergenIds: body.data.allergenIds,
    city: body.data.city,
  });
  return apiOk(agentReplySchema.parse(reply));
}
