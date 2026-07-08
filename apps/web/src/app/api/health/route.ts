import { apiOk } from '@/lib/api-response';

// Liveness probe. The DB ping is wired in Phase 03; until a Prisma client exists we
// honestly report `db: "unknown"` rather than claiming an unverified "ok".
export function GET() {
  return apiOk({ status: 'ok' as const, db: 'unknown' as const });
}
