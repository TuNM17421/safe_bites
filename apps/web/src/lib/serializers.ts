import type { Allergen, Dish, DishAllergenRisk, ProfileTemplate } from '@prisma/client';
import type { DishEvaluationInput, DishRiskFact, RecommendationStatus } from '@safebite/domain';

type DishWithRisks = Dish & { allergenRisks: DishAllergenRisk[] };

/** DishAllergenRisk rows -> domain DishRiskFact[] (Decimal confidence -> plain number). */
export function mapRisksToFacts(dishId: string, risks: DishAllergenRisk[]): DishRiskFact[] {
  return risks.map((r) => ({
    dishId,
    allergenId: r.allergenId,
    riskLevel: r.riskLevel,
    confidence: Number(r.confidence),
    reason: { en: r.reasonEn, vi: r.reasonVi },
    recommendedAction: { en: r.recommendedActionEn, vi: r.recommendedActionVi },
    evidenceType: r.evidenceType,
    source: r.sourceType,
    lastCheckedAt: r.lastCheckedAt.toISOString(),
  }));
}

export function dishToEvaluationInput(dish: DishWithRisks): DishEvaluationInput {
  return {
    dishId: dish.id,
    name: { en: dish.canonicalNameEn, vi: dish.canonicalNameVi },
    risks: mapRisksToFacts(dish.id, dish.allergenRisks),
    calorieClass: dish.calorieClass ?? undefined,
    spicyLevel: dish.spicyLevel ?? undefined,
    pickyEaterFlags: dish.pickyEaterFlags,
  };
}

/** Dish + risks -> public DTO (§9.4). All Decimals coerced to numbers. */
export function dishToDTO(dish: DishWithRisks) {
  return {
    id: dish.id,
    name: { en: dish.canonicalNameEn, vi: dish.canonicalNameVi },
    aliases: { en: dish.aliasesEn, vi: dish.aliasesVi },
    category: dish.dishCategory,
    cuisine: dish.cuisine,
    regionTags: dish.regionTags,
    mealType: dish.mealType,
    description: { en: dish.descriptionEn, vi: dish.descriptionVi },
    commonIngredients: { en: dish.commonIngredientsEn, vi: dish.commonIngredientsVi },
    possibleHiddenIngredients: { en: dish.possibleHiddenIngredientsEn, vi: dish.possibleHiddenIngredientsVi },
    allergenRisks: dish.allergenRisks.map((r) => ({
      allergenId: r.allergenId,
      riskLevel: r.riskLevel,
      confidence: Number(r.confidence),
      reason: { en: r.reasonEn, vi: r.reasonVi },
      action: { en: r.recommendedActionEn, vi: r.recommendedActionVi },
      evidenceType: r.evidenceType,
      source: r.sourceType,
      reviewStatus: r.reviewStatus,
      lastCheckedAt: r.lastCheckedAt.toISOString(),
    })),
    source: dish.sourceType,
    reviewStatus: dish.reviewStatus,
  };
}

export function allergenToDTO(a: Allergen) {
  return { id: a.id, name: { en: a.nameEn, vi: a.nameVi }, aliases: { en: a.aliasesEn, vi: a.aliasesVi } };
}

export function templateToDTO(t: ProfileTemplate) {
  return {
    id: t.id,
    name: { en: t.nameEn, vi: t.nameVi },
    profileType: t.profileType,
    strictness: t.strictness,
    description: { en: t.descriptionEn, vi: t.descriptionVi },
  };
}

export type RecommendationGroupKey = 'suitable' | 'askFirst' | 'risky' | 'avoid' | 'unknown';

/** Engine snake_case status -> camelCase response group key (§9.5). */
export function statusToGroupKey(status: RecommendationStatus): RecommendationGroupKey {
  return status === 'ask_first' ? 'askFirst' : status;
}
