import { apiOk } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { templateToDTO } from '@/lib/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// §9.3 — dietary profile templates for onboarding.
export async function GET() {
  const items = (await prisma.profileTemplate.findMany({ orderBy: { id: 'asc' } })).map(templateToDTO);
  return apiOk({ items });
}
