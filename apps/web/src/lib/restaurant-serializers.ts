import type { MenuItem, MenuItemAllergenStatus, Restaurant } from '@prisma/client';
import type {
  MenuItemAllergenStatusLike,
  RestaurantLike,
  RestaurantMenuItemLike,
  RestaurantMenuStatus,
  RestaurantVerificationStatus,
} from '@safebite/domain';

export type MenuItemWithStatuses = MenuItem & { allergenStatuses: MenuItemAllergenStatus[] };
export type RestaurantWithMenu = Restaurant & { menuItems: MenuItemWithStatuses[] };

const num = (d: unknown) => (d === null || d === undefined ? null : Number(d));
const iso = (d: Date | null) => (d ? d.toISOString() : null);

function bilingualName(nameEn: string | null, nameVi: string | null, fallback: string) {
  return { en: nameEn ?? fallback, vi: nameVi ?? fallback };
}

export function restaurantDisplayName(r: Restaurant) {
  return bilingualName(r.nameEn, r.nameVi, r.canonicalName);
}

// ---- Public DTOs ----

// §8.1 list summary — non-personalized, JSON-safe (Decimal -> number, Date -> ISO). Internal
// admin `notes` are never exposed.
export function restaurantSummaryDTO(r: Restaurant, hasMenuItems: boolean) {
  return {
    restaurantId: r.id,
    slug: r.slug,
    name: bilingualName(r.nameEn, r.nameVi, r.canonicalName),
    city: r.city,
    district: r.district,
    address: r.fullAddress,
    cuisine: r.cuisineNormalized,
    lat: num(r.lat),
    lon: num(r.lon),
    source: r.externalSource,
    reviewStatus: r.reviewStatus,
    verificationStatus: r.verificationStatus,
    menuStatus: r.menuStatus,
    lastCheckedAt: iso(r.sourceObservedAt),
    hasMenuItems,
  };
}

export function menuItemRawDTO(m: MenuItemWithStatuses) {
  return {
    menuItemId: m.id,
    dishId: m.dishId,
    displayName: bilingualName(m.nameEn, m.nameVi, m.rawName),
    rawName: m.rawName,
    section: m.section,
    price: m.priceAmount === null ? null : { amount: Number(m.priceAmount), currency: m.currency },
    menuStatus: m.menuStatus,
    sharedCookware: m.sharedCookware,
    sharedFryer: m.sharedFryer,
    canCustomize: m.canCustomize,
    observedAt: iso(m.observedAt),
    allergenStatusCount: m.allergenStatuses.length,
  };
}

// §8.2 detail — metadata + raw menu rows, no personalization.
export function restaurantDetailDTO(r: RestaurantWithMenu) {
  return {
    restaurantId: r.id,
    slug: r.slug,
    name: bilingualName(r.nameEn, r.nameVi, r.canonicalName),
    canonicalName: r.canonicalName,
    amenity: r.amenity,
    cuisine: r.cuisineNormalized,
    address: r.fullAddress,
    district: r.district,
    city: r.city,
    country: r.country,
    lat: num(r.lat),
    lon: num(r.lon),
    phone: r.phone,
    website: r.website,
    websiteMenu: r.websiteMenu,
    openingHours: r.openingHours,
    source: r.externalSource,
    sourceUrl: r.sourceUrl,
    dataLicense: r.dataLicense,
    attributionRequired: r.attributionRequired,
    verificationStatus: r.verificationStatus,
    menuStatus: r.menuStatus,
    reviewStatus: r.reviewStatus,
    lastCheckedAt: iso(r.sourceObservedAt),
    menuItems: r.menuItems.map(menuItemRawDTO),
  };
}

// ---- Domain "…Like" mappers (feed the pure evaluators) ----

export function toRestaurantLike(r: RestaurantWithMenu): RestaurantLike {
  return {
    restaurantId: r.id,
    externalSource: r.externalSource,
    verificationStatus: r.verificationStatus as RestaurantVerificationStatus,
    menuStatus: r.menuStatus as RestaurantMenuStatus,
    hasMenuItems: r.menuItems.length > 0,
    lastCheckedAt: iso(r.sourceObservedAt),
  };
}

export function toMenuItemLike(m: MenuItemWithStatuses): RestaurantMenuItemLike {
  return {
    menuItemId: m.id,
    restaurantId: m.restaurantId,
    dishId: m.dishId,
    displayName: bilingualName(m.nameEn, m.nameVi, m.rawName),
    rawName: m.rawName,
    sharedCookware: (m.sharedCookware as RestaurantMenuItemLike['sharedCookware']) ?? undefined,
    sharedFryer: (m.sharedFryer as RestaurantMenuItemLike['sharedFryer']) ?? undefined,
    canCustomize: (m.canCustomize as RestaurantMenuItemLike['canCustomize']) ?? undefined,
    observedAt: iso(m.observedAt),
  };
}

export function toAllergenStatusLike(s: MenuItemAllergenStatus): MenuItemAllergenStatusLike {
  return {
    allergenId: s.allergenId,
    riskLevel: s.riskLevel,
    confidence: Number(s.confidence),
    source: s.source as MenuItemAllergenStatusLike['source'],
    reason: { en: s.reasonEn, vi: s.reasonVi ?? s.reasonEn },
    lastVerifiedAt: iso(s.lastVerifiedAt),
    verificationStatus: s.verificationStatus as MenuItemAllergenStatusLike['verificationStatus'],
  };
}

// ---- Attribution (§8.1) ----
const ATTRIBUTION: Record<string, string> = {
  openstreetmap: '© OpenStreetMap contributors',
  openmapvn: '© OpenMap.vn',
};

export function attributionFor(sources: Iterable<string>): string | null {
  const parts = new Set<string>();
  for (const s of sources) if (ATTRIBUTION[s]) parts.add(ATTRIBUTION[s]);
  return parts.size ? [...parts].join(' · ') : null;
}
