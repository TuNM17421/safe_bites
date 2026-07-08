// Admin is an English-only internal island (phase-12 ADR): its messages live here and are
// handed to a fixed-locale NextIntlClientProvider, so nothing is added to the shared
// messages/{en,vi}.json (avoids colliding with the public app's i18n). Client-safe enum
// option lists live here too, so client forms never import @prisma/client.

export const adminMessages = {
  title: 'SafeBite Admin',
  nav: { dashboard: 'Dashboard', dishes: 'Dishes', ingredients: 'Ingredients', dishRisks: 'Dish risks', logout: 'Log out' },
  login: { title: 'Admin sign in', token: 'Admin token', submit: 'Sign in', error: 'Invalid admin token.' },
  dashboard: {
    title: 'Dashboard',
    dishes: 'Dishes',
    ingredients: 'Ingredients',
    dishRisks: 'Dish risks',
    needsReview: 'Needs review',
  },
  table: {
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    empty: 'No records yet.',
    create: 'New',
    filter: 'Review status',
    all: 'All',
    save: 'Save',
    cancel: 'Cancel',
    confirmDelete: 'Delete this record?',
    loading: 'Loading…',
  },
  fields: {
    nameVi: 'Name (VI)',
    nameEn: 'Name (EN)',
    category: 'Category',
    cuisine: 'Cuisine',
    source: 'Source',
    evidence: 'Evidence',
    reviewStatus: 'Review status',
    descriptionVi: 'Description (VI)',
    descriptionEn: 'Description (EN)',
    dishId: 'Dish id',
    allergenId: 'Allergen id',
    riskLevel: 'Risk level',
    confidence: 'Confidence (0–1)',
    reasonVi: 'Reason (VI)',
    reasonEn: 'Reason (EN)',
    actionVi: 'Action (VI)',
    actionEn: 'Action (EN)',
  },
} as const;

// Enum options (mirror the Prisma enums; kept client-safe as plain strings).
export const RISK_LEVELS = ['contains', 'likely_contains', 'possible', 'unlikely', 'unknown'] as const;
export const EVIDENCE_TYPES = [
  'manual_seed',
  'canonical_recipe',
  'menu_observed',
  'restaurant_verified',
  'user_report',
  'llm_inferred',
] as const;
export const SOURCE_TYPES = [
  'manual_seed',
  'menu_observed',
  'restaurant_submitted',
  'user_submitted',
  'expert_review',
  'openstreetmap',
  'openmapvn',
  'google_places',
  'foursquare',
  'admin_verified',
] as const;
export const REVIEW_STATUSES = ['needs_review', 'approved', 'rejected'] as const;
