import { ALLERGEN_CATALOG } from '@safebite/domain';
import type { Prisma } from '@prisma/client';

export interface AllergenRow {
  id: string;
  nameEn: string;
  nameVi: string;
}

// Reuse the canonical catalog (single source of truth in @safebite/domain) rather than
// a duplicate list. It already contains the §6.4 canonical allergens + pseudo-allergens
// (14 rows incl. tree-nut/soy, which have no dish risk column and resolve to Unknown).
export const ALLERGEN_NAME_BY_ID: Record<string, { nameEn: string; nameVi: string }> =
  Object.fromEntries(ALLERGEN_CATALOG.map((a) => [a.id, { nameEn: a.nameEn, nameVi: a.nameVi }]));

function titleCase(id: string): string {
  return id
    .split(/[_\s]+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

/** Canonical catalog unioned with any extra allergen tags observed in ingredients. */
export function deriveAllergenRows(extraTags: string[]): AllergenRow[] {
  const rows: AllergenRow[] = ALLERGEN_CATALOG.map((a) => ({ id: a.id, nameEn: a.nameEn, nameVi: a.nameVi }));
  const known = new Set(rows.map((r) => r.id));
  for (const tag of extraTags) {
    if (tag && !known.has(tag)) {
      known.add(tag);
      rows.push({ id: tag, nameEn: titleCase(tag), nameVi: titleCase(tag) });
    }
  }
  return rows;
}

export async function upsertAllergens(db: Prisma.TransactionClient, rows: AllergenRow[]): Promise<number> {
  for (const a of rows) {
    await db.allergen.upsert({
      where: { id: a.id },
      update: { nameEn: a.nameEn, nameVi: a.nameVi },
      create: { id: a.id, nameEn: a.nameEn, nameVi: a.nameVi },
    });
  }
  return rows.length;
}
