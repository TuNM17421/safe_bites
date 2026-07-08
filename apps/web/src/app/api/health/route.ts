import { apiOk } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// Liveness + DB connectivity probe. On DB failure return a degraded envelope with
// HTTP 503; the underlying error is logged server-side only (never leaked to clients).
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return apiOk({ status: 'ok' as const, db: 'ok' as const });
  } catch (error) {
    console.error('[health] database check failed:', error);
    return apiOk({ status: 'degraded' as const, db: 'down' as const }, { status: 503 });
  }
}
