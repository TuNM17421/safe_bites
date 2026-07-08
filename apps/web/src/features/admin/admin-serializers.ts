import type {
  Dish,
  DishAllergenRisk,
  Ingredient,
  MenuItem,
  MenuItemAllergenStatus,
  Restaurant,
} from '@prisma/client';

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

export function adminAllergenStatusToDTO(s: MenuItemAllergenStatus) {
  return {
    id: s.id,
    menuItemId: s.menuItemId,
    allergenId: s.allergenId,
    riskLevel: s.riskLevel,
    confidence: Number(s.confidence), // Decimal -> number
    source: s.source,
    reasonEn: s.reasonEn,
    reasonVi: s.reasonVi,
    lastVerifiedAt: s.lastVerifiedAt ? s.lastVerifiedAt.toISOString() : null,
    verificationStatus: s.verificationStatus,
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function adminMenuItemToDTO(m: MenuItem & { allergenStatuses?: MenuItemAllergenStatus[] }) {
  return {
    id: m.id,
    restaurantId: m.restaurantId,
    dishId: m.dishId,
    rawName: m.rawName,
    nameVi: m.nameVi,
    nameEn: m.nameEn,
    section: m.section,
    descriptionVi: m.descriptionVi,
    descriptionEn: m.descriptionEn,
    priceAmount: m.priceAmount === null ? null : Number(m.priceAmount),
    currency: m.currency,
    menuSourceType: m.menuSourceType,
    menuSourceUrl: m.menuSourceUrl,
    observedAt: m.observedAt.toISOString(),
    parsedBy: m.parsedBy,
    mappingConfidence: m.mappingConfidence === null ? null : Number(m.mappingConfidence),
    menuStatus: m.menuStatus,
    ingredientNotes: m.ingredientNotes,
    customizationNotes: m.customizationNotes,
    sharedCookware: m.sharedCookware,
    sharedFryer: m.sharedFryer,
    canCustomize: m.canCustomize,
    notes: m.notes,
    allergenStatuses: m.allergenStatuses?.map(adminAllergenStatusToDTO),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function adminRestaurantToDTO(r: Restaurant & { _count?: { menuItems: number } }) {
  return {
    id: r.id,
    externalSource: r.externalSource,
    slug: r.slug,
    canonicalName: r.canonicalName,
    nameVi: r.nameVi,
    nameEn: r.nameEn,
    amenity: r.amenity,
    brand: r.brand,
    operator: r.operator,
    cuisineRaw: r.cuisineRaw,
    cuisineNormalized: r.cuisineNormalized,
    fullAddress: r.fullAddress,
    street: r.street,
    housenumber: r.housenumber,
    ward: r.ward,
    district: r.district,
    city: r.city,
    country: r.country,
    lat: r.lat === null ? null : Number(r.lat),
    lon: r.lon === null ? null : Number(r.lon),
    phone: r.phone,
    website: r.website,
    websiteMenu: r.websiteMenu,
    openingHours: r.openingHours,
    sourceUrl: r.sourceUrl,
    sourceObservedAt: r.sourceObservedAt ? r.sourceObservedAt.toISOString() : null,
    dataLicense: r.dataLicense,
    attributionRequired: r.attributionRequired,
    menuStatus: r.menuStatus,
    verificationStatus: r.verificationStatus,
    reviewStatus: r.reviewStatus,
    notes: r.notes,
    menuItemCount: r._count?.menuItems ?? null,
    createdAt: r.createdAt.toISOString(),
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
