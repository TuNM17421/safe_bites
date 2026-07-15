import 'server-only';
import { prisma } from '@/lib/db';

// Resolve a free-text ingredient name (EN or VI) to a REAL catalog ingredient. Used to ground both
// agent proposals and OCR predictions in valid ids — a null result means "not in the catalog", so
// callers never fabricate an id (HITL corrections / OCR promotions need a real one).
export async function resolveIngredient(
  name: string,
): Promise<{ id: string; nameEn: string; nameVi: string } | null> {
  const q = name.trim();
  if (!q) return null;
  const ing = await prisma.ingredient.findFirst({
    where: {
      OR: [
        { canonicalNameEn: { contains: q, mode: 'insensitive' } },
        { canonicalNameVi: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, canonicalNameEn: true, canonicalNameVi: true },
  });
  return ing ? { id: ing.id, nameEn: ing.canonicalNameEn, nameVi: ing.canonicalNameVi } : null;
}
