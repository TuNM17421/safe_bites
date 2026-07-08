// Curated demo menu data (Phase 02, spec §10.3). DEV/DEMO ONLY — never auto-run in
// production. Restaurants are clearly-labeled synthetic demos (external_source manual_seed),
// not real businesses, so we never misrepresent a real venue's allergy handling.
//
// Allergen risk is expressed as tuples [allergenId, riskLevel, verificationStatus?]; the seed
// script builds conservative bilingual reasons from a template + the domain allergen catalog.
// riskLevel/verificationStatus values are validated the same way the admin API will validate them.

export type DemoRiskLevel = 'contains' | 'likely_contains' | 'possible' | 'unlikely' | 'unknown';
export type DemoVerification = 'observed_not_verified' | 'restaurant_submitted' | 'admin_verified';

export interface DemoAllergen {
  allergenId: string;
  riskLevel: DemoRiskLevel;
  verificationStatus?: DemoVerification; // defaults to the menu item's menuStatus-derived level
}

export interface DemoMenuItem {
  id: string;
  dishId: string | null;
  rawName: string;
  nameEn: string;
  nameVi: string;
  section?: string;
  menuStatus: DemoVerification;
  sharedCookware?: 'unknown' | 'no' | 'yes' | 'possible';
  sharedFryer?: 'unknown' | 'no' | 'yes' | 'possible' | 'not_applicable';
  canCustomize?: 'true' | 'false' | 'unknown';
  allergens: DemoAllergen[];
}

export interface DemoRestaurant {
  id: string;
  slug: string;
  canonicalName: string;
  nameEn: string;
  nameVi: string;
  cuisineRaw: string;
  cuisineNormalized: string[];
  district: string;
  city: string;
  fullAddress: string;
  lat: number;
  lon: number;
  verificationStatus: 'unverified' | 'restaurant_confirmed' | 'admin_verified';
  menuStatus: DemoVerification | 'menu_url_available';
  menuItems: DemoMenuItem[];
}

export const DEMO_RESTAURANTS: DemoRestaurant[] = [
  {
    id: 'rest_demo_bun_cha',
    slug: 'demo-bun-cha-hoan-kiem',
    canonicalName: 'Demo Bún Chả Hoàn Kiếm',
    nameEn: 'Demo Bun Cha (Hoan Kiem)',
    nameVi: 'Demo Bún Chả Hoàn Kiếm',
    cuisineRaw: 'vietnamese;noodle',
    cuisineNormalized: ['vietnamese', 'noodle'],
    district: 'Hoàn Kiếm',
    city: 'hanoi',
    fullAddress: '1 Demo Street, Hoàn Kiếm, Hà Nội',
    lat: 21.028511,
    lon: 105.852345,
    verificationStatus: 'admin_verified',
    menuStatus: 'admin_verified',
    menuItems: [
      {
        id: 'mi_demo_bun_cha',
        dishId: 'dish_bun_cha',
        rawName: 'Bún chả',
        nameEn: 'Grilled pork with rice noodles',
        nameVi: 'Bún chả',
        section: 'Main',
        menuStatus: 'admin_verified',
        sharedFryer: 'possible',
        canCustomize: 'true',
        allergens: [
          { allergenId: 'fish', riskLevel: 'contains' },
          { allergenId: 'peanut', riskLevel: 'possible' },
          { allergenId: 'soy', riskLevel: 'possible' },
          { allergenId: 'wheat', riskLevel: 'unlikely' },
        ],
      },
      {
        id: 'mi_demo_nem_ran',
        dishId: 'dish_nem_ran',
        rawName: 'Nem rán',
        nameEn: 'Fried spring rolls',
        nameVi: 'Nem rán',
        section: 'Starter',
        menuStatus: 'admin_verified',
        sharedFryer: 'yes',
        canCustomize: 'false',
        allergens: [
          { allergenId: 'egg', riskLevel: 'contains' },
          { allergenId: 'shellfish', riskLevel: 'possible' },
          { allergenId: 'wheat', riskLevel: 'possible' },
        ],
      },
    ],
  },
  {
    id: 'rest_demo_pho',
    slug: 'demo-pho-ba-dinh',
    canonicalName: 'Demo Phở Ba Đình',
    nameEn: 'Demo Pho (Ba Dinh)',
    nameVi: 'Demo Phở Ba Đình',
    cuisineRaw: 'vietnamese;noodle;soup',
    cuisineNormalized: ['vietnamese', 'noodle'],
    district: 'Ba Đình',
    city: 'hanoi',
    fullAddress: '2 Demo Street, Ba Đình, Hà Nội',
    lat: 21.035,
    lon: 105.834,
    verificationStatus: 'restaurant_confirmed',
    menuStatus: 'observed_not_verified',
    menuItems: [
      {
        id: 'mi_demo_pho_bo',
        dishId: 'dish_pho_bo',
        rawName: 'Phở bò',
        nameEn: 'Beef pho',
        nameVi: 'Phở bò',
        section: 'Main',
        menuStatus: 'observed_not_verified',
        canCustomize: 'true',
        allergens: [
          { allergenId: 'fish', riskLevel: 'contains' },
          { allergenId: 'soy', riskLevel: 'possible' },
        ],
      },
      {
        id: 'mi_demo_pho_ga',
        dishId: 'dish_pho_ga',
        rawName: 'Phở gà',
        nameEn: 'Chicken pho',
        nameVi: 'Phở gà',
        section: 'Main',
        menuStatus: 'observed_not_verified',
        canCustomize: 'true',
        allergens: [{ allergenId: 'fish', riskLevel: 'possible' }],
      },
    ],
  },
  {
    id: 'rest_demo_banh_mi',
    slug: 'demo-banh-mi-hoan-kiem',
    canonicalName: 'Demo Bánh Mì Hoàn Kiếm',
    nameEn: 'Demo Banh Mi (Hoan Kiem)',
    nameVi: 'Demo Bánh Mì Hoàn Kiếm',
    cuisineRaw: 'vietnamese;sandwich',
    cuisineNormalized: ['vietnamese', 'sandwich'],
    district: 'Hoàn Kiếm',
    city: 'hanoi',
    fullAddress: '3 Demo Street, Hoàn Kiếm, Hà Nội',
    lat: 21.031,
    lon: 105.849,
    verificationStatus: 'unverified',
    menuStatus: 'observed_not_verified',
    menuItems: [
      {
        id: 'mi_demo_banh_mi',
        dishId: 'dish_banh_mi',
        rawName: 'Bánh mì thập cẩm',
        nameEn: 'Vietnamese baguette sandwich',
        nameVi: 'Bánh mì thập cẩm',
        section: 'Main',
        menuStatus: 'observed_not_verified',
        canCustomize: 'true',
        allergens: [
          { allergenId: 'wheat', riskLevel: 'contains' },
          { allergenId: 'egg', riskLevel: 'possible' },
          { allergenId: 'milk', riskLevel: 'possible' },
        ],
      },
    ],
  },
  {
    id: 'rest_demo_ca_phe',
    slug: 'demo-ca-phe-tay-ho',
    canonicalName: 'Demo Cà Phê Tây Hồ',
    nameEn: 'Demo Coffee (Tay Ho)',
    nameVi: 'Demo Cà Phê Tây Hồ',
    cuisineRaw: 'coffee_shop',
    cuisineNormalized: ['cafe'],
    district: 'Tây Hồ',
    city: 'hanoi',
    fullAddress: '4 Demo Street, Tây Hồ, Hà Nội',
    lat: 21.058,
    lon: 105.82,
    verificationStatus: 'restaurant_confirmed',
    menuStatus: 'observed_not_verified',
    menuItems: [
      {
        id: 'mi_demo_egg_coffee',
        dishId: 'dish_egg_coffee',
        rawName: 'Cà phê trứng',
        nameEn: 'Egg coffee',
        nameVi: 'Cà phê trứng',
        section: 'Drinks',
        menuStatus: 'observed_not_verified',
        canCustomize: 'false',
        allergens: [
          { allergenId: 'egg', riskLevel: 'contains' },
          { allergenId: 'milk', riskLevel: 'contains' },
        ],
      },
      {
        id: 'mi_demo_ca_phe_sua_da',
        dishId: 'dish_ca_phe_sua_da',
        rawName: 'Cà phê sữa đá',
        nameEn: 'Iced coffee with condensed milk',
        nameVi: 'Cà phê sữa đá',
        section: 'Drinks',
        menuStatus: 'observed_not_verified',
        canCustomize: 'true',
        allergens: [{ allergenId: 'milk', riskLevel: 'contains' }],
      },
    ],
  },
  {
    id: 'rest_demo_cha_ca',
    slug: 'demo-cha-ca-hoan-kiem',
    canonicalName: 'Demo Chả Cá Hoàn Kiếm',
    nameEn: 'Demo Cha Ca (Hoan Kiem)',
    nameVi: 'Demo Chả Cá Hoàn Kiếm',
    cuisineRaw: 'vietnamese;seafood',
    cuisineNormalized: ['vietnamese', 'seafood'],
    district: 'Hoàn Kiếm',
    city: 'hanoi',
    fullAddress: '5 Demo Street, Hoàn Kiếm, Hà Nội',
    lat: 21.034,
    lon: 105.85,
    verificationStatus: 'admin_verified',
    menuStatus: 'observed_not_verified',
    menuItems: [
      {
        id: 'mi_demo_cha_ca',
        dishId: 'dish_cha_ca',
        rawName: 'Chả cá Lã Vọng',
        nameEn: 'Turmeric dill fish',
        nameVi: 'Chả cá Lã Vọng',
        section: 'Main',
        menuStatus: 'observed_not_verified',
        sharedCookware: 'possible',
        canCustomize: 'false',
        allergens: [
          { allergenId: 'fish', riskLevel: 'contains' },
          { allergenId: 'shellfish', riskLevel: 'possible' },
          { allergenId: 'peanut', riskLevel: 'possible' },
        ],
      },
    ],
  },
];
