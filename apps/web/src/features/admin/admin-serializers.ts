import type { Dish, DishAllergenRisk, Ingredient } from '@prisma/client';

// Admin DTOs: expose editable fields and coerce Prisma Decimal/Date to JSON-safe values
// (Decimal -> number, Date -> ISO). Mirrors the phase-06 serializer convention (audit note #5).

export function adminDishToDTO(d: Dish) {
  return {
    id: d.id,
    canonicalNameVi: d.canonicalNameVi,
    canonicalNameEn: d.canonicalNameEn,
    aliasesVi: d.aliasesVi,
    aliasesEn: d.aliasesEn,
    dishCategory: d.dishCategory,
    cuisine: d.cuisine,
    regionTags: d.regionTags,
    mealType: d.mealType,
    descriptionVi: d.descriptionVi,
    descriptionEn: d.descriptionEn,
    commonIngredientsVi: d.commonIngredientsVi,
    commonIngredientsEn: d.commonIngredientsEn,
    possibleHiddenIngredientsVi: d.possibleHiddenIngredientsVi,
    possibleHiddenIngredientsEn: d.possibleHiddenIngredientsEn,
    calorieClass: d.calorieClass,
    spicyLevel: d.spicyLevel,
    pickyEaterFlags: d.pickyEaterFlags,
    sourceType: d.sourceType,
    sourceUrl: d.sourceUrl,
    reviewStatus: d.reviewStatus,
    notes: d.notes,
    updatedAt: d.updatedAt.toISOString(),
  };
}

export function adminIngredientToDTO(i: Ingredient) {
  return {
    id: i.id,
    canonicalNameVi: i.canonicalNameVi,
    canonicalNameEn: i.canonicalNameEn,
    ingredientCategory: i.ingredientCategory,
    aliasesVi: i.aliasesVi,
    aliasesEn: i.aliasesEn,
    majorAllergenTags: i.majorAllergenTags,
    dietaryFlags: i.dietaryFlags,
    halalRelevance: i.halalRelevance,
    hinduRelevance: i.hinduRelevance,
    veganRelevance: i.veganRelevance,
    calorieRelevance: i.calorieRelevance,
    riskNotesVi: i.riskNotesVi,
    riskNotesEn: i.riskNotesEn,
    reviewStatus: i.reviewStatus,
    updatedAt: i.updatedAt.toISOString(),
  };
}

export function adminRiskToDTO(r: DishAllergenRisk) {
  return {
    id: r.id,
    dishId: r.dishId,
    allergenId: r.allergenId,
    riskLevel: r.riskLevel,
    confidence: Number(r.confidence), // Decimal -> number (audit note #5)
    reasonVi: r.reasonVi,
    reasonEn: r.reasonEn,
    recommendedActionVi: r.recommendedActionVi,
    recommendedActionEn: r.recommendedActionEn,
    evidenceType: r.evidenceType,
    sourceType: r.sourceType,
    sourceUrl: r.sourceUrl,
    reviewStatus: r.reviewStatus,
    lastCheckedAt: r.lastCheckedAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// Readable, stable id from the English name for admin-created dishes/ingredients
// (e.g. "Bún chả" -> "bun_cha"). Non-ASCII is stripped; a unique-conflict (P2002) is
// surfaced as 409 by the route so the admin can adjust.
export function slugId(name: string, fallbackPrefix: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug.length > 0 ? slug : `${fallbackPrefix}_${Date.now()}`;
}
