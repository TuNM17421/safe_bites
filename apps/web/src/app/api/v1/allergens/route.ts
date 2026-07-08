import { apiOk } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { allergenToDTO } from '@/lib/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bilingual allergen catalog (used by onboarding + question-card generation).
export async function GET() {
  const items = (await prisma.allergen.findMany({ orderBy: { id: 'asc' } })).map(allergenToDTO);
  return apiOk({ items });
}
