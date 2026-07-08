import { adminCookie, clearedAdminCookie, computeAdminDigest, constantTimeEqual } from '@/lib/admin-auth';
import { loginSchema } from '@/lib/admin-schemas';
import { apiError, apiOk, parseBody } from '@/lib/api-response';
import { serverEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { token } -> set httpOnly `sbt_admin` digest cookie on match, else 401 (no cookie).
export async function POST(req: Request) {
  const parsed = await parseBody(req, loginSchema);
  if (!parsed.ok) return parsed.response;

  const [provided, expected] = await Promise.all([
    computeAdminDigest(parsed.data.token),
    computeAdminDigest(serverEnv().ADMIN_TOKEN),
  ]);
  if (!constantTimeEqual(provided, expected)) {
    return apiError('INVALID_TOKEN', 'Invalid admin token.', { status: 401 });
  }

  const res = apiOk({ ok: true });
  res.cookies.set(adminCookie(expected));
  return res;
}

// DELETE -> logout (expire the cookie).
export async function DELETE() {
  const res = apiOk({ ok: true });
  res.cookies.set(clearedAdminCookie());
  return res;
}
