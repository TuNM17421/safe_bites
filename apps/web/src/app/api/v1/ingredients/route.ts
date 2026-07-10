import { z } from 'zod';
import { apiOk, parseQuery } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({ q: z.string().trim().max(80).optional() });

// Public read-only ingredient search for the "Add ingredient" picker on the dish page.
export async function GET(req: Request) {
  const parsed = parseQuery(req.url, querySchema);
  if (!parsed.ok) return parsed.response;
  const q = parsed.data.q;

  const rows = await prisma.ingredient.findMany({
    where: q
      ? {
          OR: [
            { canonicalNameEn: { contains: q, mode: 'insensitive' } },
            { canonicalNameVi: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: { id: true, canonicalNameEn: true, canonicalNameVi: true },
    orderBy: { canonicalNameEn: 'asc' },
    take: 20,
  });

  return apiOk({ ingredients: rows.map((r) => ({ id: r.id, name: { en: r.canonicalNameEn, vi: r.canonicalNameVi } })) });
}
