import type { Prisma } from '@prisma/client';
import { field, orNull, requireColumns, splitList, type CsvRow } from './csv';
import { normalizeReview } from './enums';
import { newCounts, type Counts } from './types';

// ingredients CSV -> Ingredient (§6.4). Returns the union of major_allergen_tags
// so the orchestrator can union them into the allergen catalog before dishes import.
export async function importIngredients(
  db: Prisma.TransactionClient,
  rows: CsvRow[],
): Promise<{ counts: Counts; tags: string[] }> {
  requireColumns(rows, ['ingredient_id', 'canonical_name_vi', 'canonical_name_en', 'ingredient_category']);
  const counts = newCounts();
  const tags = new Set<string>();
  for (const row of rows) {
    counts.read++;
    const id = field(row, 'ingredient_id');
    if (!id) {
      counts.skipped++;
      continue;
    }
    const allergenTags = splitList(row['major_allergen_tags']);
    for (const t of allergenTags) tags.add(t);
    const data = {
      canonicalNameVi: field(row, 'canonical_name_vi'),
      canonicalNameEn: field(row, 'canonical_name_en'),
      ingredientCategory: field(row, 'ingredient_category'),
      aliasesVi: splitList(row['aliases_vi']),
      aliasesEn: splitList(row['aliases_en']),
      majorAllergenTags: allergenTags,
      dietaryFlags: splitList(row['dietary_flags']),
      halalRelevance: orNull(row['halal_relevance']),
      hinduRelevance: orNull(row['hindu_relevance']),
      veganRelevance: orNull(row['vegan_relevance']),
      calorieRelevance: orNull(row['calorie_relevance']),
      riskNotesVi: orNull(row['risk_notes_vi']),
      riskNotesEn: orNull(row['risk_notes_en']),
      reviewStatus: normalizeReview(field(row, 'review_status')),
    };
    const exists = await db.ingredient.findUnique({ where: { id } });
    await db.ingredient.upsert({ where: { id }, update: data, create: { id, ...data } });
    if (exists) counts.updated++;
    else counts.inserted++;
  }
  return { counts, tags: [...tags] };
}
