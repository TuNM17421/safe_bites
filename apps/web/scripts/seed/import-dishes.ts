import type { Prisma } from '@prisma/client';
import { field, orNull, requireColumns, splitList, type CsvRow } from './csv';
import { normalizeReview, normalizeSource } from './enums';
import { ALLERGEN_NAME_BY_ID } from './allergens';
import { buildReasonAction, normalizeRiskLevel, RISK_COLUMN_MAP } from './risk-templates';
import { newCounts, type Counts } from './types';

// dishes CSV -> Dish + one DishAllergenRisk per of the 10 §6.5 risk columns.
// dish_category / meal_type are NOT enum-validated (tolerate 'seafood'/'dessert').
export async function importDishes(
  db: Prisma.TransactionClient,
  rows: CsvRow[],
): Promise<{ dishes: Counts; risks: Counts }> {
  requireColumns(rows, ['dish_id', 'canonical_name_vi', 'canonical_name_en', 'dish_category', 'cuisine']);
  const dishes = newCounts();
  const risks = newCounts();

  for (const row of rows) {
    dishes.read++;
    const id = field(row, 'dish_id');
    if (!id) {
      dishes.skipped++;
      continue;
    }
    const data = {
      canonicalNameVi: field(row, 'canonical_name_vi'),
      canonicalNameEn: field(row, 'canonical_name_en'),
      aliasesVi: splitList(row['aliases_vi']),
      aliasesEn: splitList(row['aliases_en']),
      dishCategory: field(row, 'dish_category'),
      cuisine: field(row, 'cuisine'),
      regionTags: splitList(row['region_tags']),
      mealType: splitList(row['meal_type']),
      descriptionVi: orNull(row['description_vi']),
      descriptionEn: orNull(row['description_en']),
      commonIngredientsVi: orNull(row['common_ingredients_vi']),
      commonIngredientsEn: orNull(row['common_ingredients_en']),
      possibleHiddenIngredientsVi: orNull(row['possible_hidden_ingredients_vi']),
      possibleHiddenIngredientsEn: orNull(row['possible_hidden_ingredients_en']),
      calorieClass: orNull(row['calorie_class']),
      spicyLevel: orNull(row['spicy_level']),
      pickyEaterFlags: splitList(row['picky_eater_flags']),
      sourceType: normalizeSource(field(row, 'source_type')),
      sourceUrl: orNull(row['source_url']),
      reviewStatus: normalizeReview(field(row, 'review_status')),
      notes: orNull(row['notes']),
    };
    const exists = await db.dish.findUnique({ where: { id } });
    await db.dish.upsert({ where: { id }, update: data, create: { id, ...data } });
    if (exists) dishes.updated++;
    else dishes.inserted++;

    for (const { col, allergenId } of RISK_COLUMN_MAP) {
      risks.read++;
      const level = normalizeRiskLevel(row[col]);
      const names = ALLERGEN_NAME_BY_ID[allergenId] ?? { nameEn: allergenId, nameVi: allergenId };
      const ra = buildReasonAction(names.nameEn, names.nameVi, level);
      const riskData = {
        riskLevel: level,
        confidence: 0.7,
        reasonVi: ra.reasonVi,
        reasonEn: ra.reasonEn,
        recommendedActionVi: ra.recommendedActionVi,
        recommendedActionEn: ra.recommendedActionEn,
        evidenceType: 'manual_seed' as const,
        sourceType: 'manual_seed' as const,
        reviewStatus: 'needs_review' as const,
        lastCheckedAt: new Date(),
      };
      const existsRisk = await db.dishAllergenRisk.findUnique({
        where: { dishId_allergenId: { dishId: id, allergenId } },
      });
      await db.dishAllergenRisk.upsert({
        where: { dishId_allergenId: { dishId: id, allergenId } },
        update: riskData,
        create: { dishId: id, allergenId, ...riskData },
      });
      if (existsRisk) risks.updated++;
      else risks.inserted++;
    }
  }
  return { dishes, risks };
}
