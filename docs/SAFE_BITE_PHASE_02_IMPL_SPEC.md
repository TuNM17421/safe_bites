# SafeBite Travel - Implementation Spec for Phase 02

Version: 0.1  
Date: 2026-07-08  
Target reader: Claude / coding agent / implementation engineer  
Source context: `README.md-ver_0.1.txt`, `PRD_v2.txt`, `SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`, `osm_overpass_seed_kit.zip`

---

## 0. Mission

Implement **Phase 02: Restaurant MVP** on top of the existing Phase 0/1 SafeBite Travel web/PWA.

Phase 0/1 already provides:

```text
- Next.js 15 App Router PWA
- React 19
- locale-prefixed public routes: /en, /vi
- next-intl routing
- Tailwind CSS v3 + sb-* design tokens
- Prisma 6 + PostgreSQL 16 + PostGIS
- Zod validation at API boundaries
- Zustand profile store
- TanStack Query server-state cache
- Dexie IndexedDB offline storage
- Serwist service worker
- @safebite/domain package with evaluateDishes and buildQuestionCard
- local-first onboarding/profile
- offline allergy card
- dish guide
- deterministic EN/VI question card
- admin CRUD for dishes, ingredients, dish-allergen risks
- review workflow for dish content: needs_review -> approved
- OpenMap/OSM discovery importer, currently hidden from public Phase-1 UX
- CI quality gates: typecheck, lint, test, copy:check, e2e
```

Phase 02 must convert the current dish-level product into a **restaurant decision workflow**:

```text
profile -> restaurant list -> restaurant detail -> menu item recommendation -> ask restaurant/question card
```

The product remains **risk reduction, not risk elimination**.

---

## 1. Scope Lock

### 1.1 Implement in Phase 02

Implement:

```text
- Restaurant public list page
- Restaurant public detail page
- Restaurant/menu recommendation APIs
- Restaurant readiness scoring v1
- Menu item risk classification v1
- Admin restaurant CRUD
- Admin restaurant menu item CRUD
- Admin mapping of menu item -> dish ontology
- Admin menu item allergen override/status management
- Location permission flow for “Find food near me”
- Distance sorting when user grants location
- City/district browsing when location is denied or unavailable
- Basic responsive list + map/list shell
- Source/confidence/last-checked display for restaurant and menu recommendations
- OpenMap/OSM discovery rows surfaced only with clear unverified/source labels
- Optional offline cache for last viewed restaurant detail and last restaurant search result
- Tests and e2e happy path for restaurant flow
```

### 1.2 Do not implement in Phase 02

Do **not** implement yet:

```text
- OCR
- LLM menu parser
- menu photo upload
- PDF upload
- restaurant self-onboarding public form
- post-meal feedback flow
- user accounts
- payment
- Google Places integration
- Google Maps scraping
- Google reviews/photos ingestion
- push notifications
- full restaurant portal
- complex routing/travel planner
```

Phase 02 can add schema fields that will support future OCR/feedback/onboarding, but must not expose those flows yet. Claude, resist the urge to summon an entire startup from one phase. That road leads to seven dashboards and no users.

---

## 2. Current System Constraints to Respect

### 2.1 Existing architecture

Do not rewrite the existing architecture. Extend it.

Use the current conventions:

```text
apps/web                 -> Next.js app, routes, API handlers, Prisma schema
packages/domain          -> framework-free domain logic and Zod schemas
locale public routes     -> /en/* and /vi/*
admin routes             -> /admin/*, not locale-prefixed
admin auth               -> ADMIN_TOKEN httpOnly cookie
public profile transport -> profile object sent in POST body, never in URL
client profile storage   -> IndexedDB/Zustand, no user account in Phase 02
```

### 2.2 Safety invariants

Allowed public status labels only:

```text
Suitable
Ask First
Risky
Avoid
Unknown
```

Do not introduce these as UI claims:

```text
Guaranteed Safe
100% Safe
Allergy-proof
This dish is safe.
```

Rules:

```text
- Unknown risk is never upgraded to Suitable.
- OSM/OpenMap data alone never verifies allergy suitability.
- A restaurant without menu/allergen data must not look recommended.
- Suitable always includes a confirm-with-staff caveat.
- Severe allergy profiles use stricter wording and stricter score rules.
- LLM/OCR source types may exist in enum preparation, but Phase 02 must not create LLM/OCR-derived restaurant facts.
```

### 2.3 Copy guard

The repository already has `pnpm copy:check`. Any new UI copy, seed fixture, Prisma seed label, i18n message, offline fallback, and test fixture must pass it.

If the copy guard blocks wording, rewrite the wording conservatively instead of weakening the guard. Civilization is already fragile enough.

---

## 3. Phase 02 Product Goal

### 3.1 User goal

A traveler who already has a local allergy/diet profile can:

```text
1. Tap “Find food near me” or open Restaurants.
2. See restaurants in Hanoi, sorted by distance if location is granted.
3. Understand each restaurant’s allergy-readiness class for their profile.
4. Open restaurant detail.
5. See menu items classified by risk for their profile.
6. Generate a question card for the restaurant/menu context.
7. See source, confidence, reason, last checked, and verification status.
```

### 3.2 Admin goal

An admin can:

```text
1. Review imported restaurant discovery rows.
2. Create/edit/delete restaurants.
3. Approve/reject restaurant rows.
4. Add/edit/delete menu items.
5. Map menu items to existing dish ontology.
6. Add explicit allergen status per menu item.
7. Set verification/menu/source metadata.
8. Make 30-50 restaurants available for public browsing.
9. Make at least 10-20 restaurants useful with menu items during local demo.
```

---

## 4. Phase 02 UX Scope

### 4.1 Public routes

Add locale-prefixed public routes:

```text
/[locale]/restaurants
/[locale]/restaurants/[restaurantIdOrSlug]
```

Optional route if it fits current navigation architecture:

```text
/[locale]/restaurants/[restaurantIdOrSlug]/menu/[menuItemId]
```

Do not require account login.

### 4.2 Navigation

Update existing mobile bottom navigation so `Restaurants` becomes functional.

Expected primary mobile nav:

```text
Home
Dishes
Restaurants
Question Card or Scan placeholder
Allergy Card
Profile
```

If current nav already contains `Restaurants`, wire it to `/restaurants`. If current nav has no `Restaurants`, add it without breaking one-hand mobile layout.

### 4.3 Home page update

Update `/home` CTA:

```text
Primary CTA: Find food near me
Secondary CTA: Browse restaurants
Secondary CTA: Browse local dishes
Secondary CTA: Show allergy card
```

Behavior:

```text
- When user taps “Find food near me”, show a pre-permission explanation.
- Request browser geolocation only after explicit tap.
- If granted, navigate to /restaurants with location stored in in-memory/client state, not URL if possible.
- If denied, navigate to /restaurants with city/district browsing mode.
```

Acceptable fallback if preserving location outside URL becomes too complex:

```text
Use sessionStorage for lastLocation with TTL <= 30 minutes.
Do not persist exact location in IndexedDB.
Do not send location to analytics.
```

### 4.4 Restaurant list page

Route:

```text
/[locale]/restaurants
```

Required UI states:

```text
- No profile state: prompt user to finish onboarding or browse without personalization.
- Profile loaded state: show personalized readiness and menu counts.
- Location loading state.
- Location denied state.
- Empty restaurant state.
- Error state.
- Offline state.
```

Controls:

```text
- Search by restaurant name
- City filter, default Hanoi
- District filter: Hoàn Kiếm, Ba Đình, Tây Hồ, Other/Unknown
- Cuisine filter if data exists
- Sort: recommended, distance, last checked, name
- Toggle: list / map
```

Restaurant card must show:

```text
- Restaurant name
- Cuisine
- District/address summary
- Distance if available
- Allergy-readiness class: A/B/C/D/E
- Confidence: High/Medium/Low
- Counts: Suitable, Ask First, Risky, Avoid, Unknown
- Verification status
- Menu status
- Source label
- Last checked / observed date
- Short reason/summary
- CTA: View details
```

Important display rule:

```text
If a restaurant has only OSM/OpenMap discovery data and no menu/allergen data, show:
- readiness: C
- status copy: “Menu allergy data not available yet”
- source label: “Discovery data only”
- CTA still allowed, but detail page must show uncertainty clearly.
```

### 4.5 Restaurant detail page

Route:

```text
/[locale]/restaurants/[restaurantIdOrSlug]
```

Required sections:

```text
- Header: name, cuisine, address, district, distance if available
- Source and verification summary
- Allergy-readiness panel for active profile
- Safety/trust caveat
- Menu items grouped by status
- Restaurant metadata: phone/website/opening hours if available
- Map/list location panel or external map link
- Question card CTA
```

Menu item card must show:

```text
- Raw/original menu item name
- EN/VI display name where available
- Matched dish name, if mapped
- Status: Suitable / Ask First / Risky / Avoid / Unknown
- Allergen risk level
- Confidence
- Reason
- Recommended action
- Source
- Last verified / observed date
- Shared cookware/fryer notes if available
- Customization notes if available
- CTA: Ask about this item
```

When the user taps `Ask about this item`:

```text
- Generate deterministic question card using existing buildQuestionCard flow.
- Include active profile.
- Include menu item name.
- Include restaurant name if current template supports context.
- Save as last question card in IndexedDB.
- Navigate to /question-card or open existing question-card presentation route.
```

Do not send allergy profile in URL.

### 4.6 Basic map/list view

P0 implementation:

```text
- List remains primary.
- Add a “Map” tab/toggle on restaurant list.
- Map view may be a simple client-only panel using restaurant coordinates.
- If map library is not already installed, use dynamic import and keep it isolated.
- If map tiles are used, include OSM/OpenMap attribution visibly.
- If map fails to load, fall back to list with “Open in map” links.
```

Acceptable P0 fallback:

```text
If Leaflet/OpenLayers integration risks destabilizing Phase 02, implement a responsive “location panel” with address, distance, and OpenStreetMap external link. Keep the map tab shell as disabled/P1 with clear code TODO.
```

Do not use Google Maps in Phase 02.

---

## 5. Admin UX Scope

### 5.1 Admin routes

Add non-locale admin routes:

```text
/admin/restaurants
/admin/restaurants/new
/admin/restaurants/[restaurantId]
/admin/restaurants/[restaurantId]/edit
/admin/restaurants/[restaurantId]/menu
/admin/restaurants/[restaurantId]/menu/new
/admin/menu-items/[menuItemId]/edit
```

If the existing admin routing convention prefers nested pages only, adapt paths but keep the capabilities.

### 5.2 Admin restaurant list

Required columns:

```text
- Name
- City
- District
- Cuisine
- Source
- Review status
- Verification status
- Menu status
- Menu item count
- Last checked / observed
- Created/updated date
```

Filters:

```text
- review_status
- verification_status
- menu_status
- city
- district
- source
- has_menu_items
- needs_review
```

Actions:

```text
- View
- Edit
- Approve
- Reject
- Flag
- Manage menu
- Delete only if no dependent menu items, or soft-delete/archive
```

### 5.3 Admin restaurant form

Fields:

```text
canonical_name          required
name_vi                 optional
name_en                 optional
slug                    generated, editable by admin if needed
amenity                 restaurant/cafe/fast_food/other
cuisine_raw             optional
cuisine_normalized      optional list/string
brand                   optional
operator                optional
full_address            optional
street                  optional
housenumber             optional
ward                    optional
district                required
city                    required, default Hanoi
country                 required, default Vietnam
lat                     required for imported rows, optional for manual draft
lon                     required for imported rows, optional for manual draft
phone                   optional
website                 optional
website_menu            optional
opening_hours           optional
source_url              optional/required for OSM/OpenMap rows
source_observed_at      required
data_license            default ODbL-1.0 for OSM/OpenMap
attribution_required    boolean
external_source         openstreetmap/openmap/manual_seed/admin_manual/restaurant_submitted
review_status           needs_review/approved/rejected
verification_status     unverified/restaurant_contacted/restaurant_confirmed/admin_verified/expired/flagged
menu_status             not_observed/menu_url_available/observed_not_verified/restaurant_submitted/admin_verified
notes                   internal admin notes
```

### 5.4 Admin menu item list/form

Fields:

```text
restaurant_id           required
raw_name                required
name_vi                 optional
name_en                 optional
dish_id                 optional FK to existing approved dish
section                 optional
description_vi          optional
description_en          optional
price_amount            optional
currency                default VND
menu_source_type        official_website / website_menu_tag / user_upload / restaurant_upload / admin_manual / manual_seed
menu_source_url         optional
observed_at             required
parsed_by               manual for Phase 02
mapping_confidence      optional 0-1
menu_status             observed_not_verified / restaurant_submitted / admin_verified
ingredient_notes        optional
customization_notes     optional
shared_cookware         unknown / no / yes / possible
shared_fryer            unknown / no / yes / possible / not_applicable
can_customize           true / false / unknown
notes                   internal admin notes
```

### 5.5 Admin menu item allergen status

For each menu item, admin can add zero or more explicit allergen statuses.

Fields:

```text
menu_item_id            required
allergen_id             required
risk_level              contains / likely_contains / possible / unlikely / unknown
confidence              0-1
source                  admin_manual / restaurant_submitted / official_menu / user_report / dish_inferred
reason_en               required
reason_vi               optional
last_verified_at        optional
verification_status     observed_not_verified / restaurant_submitted / admin_verified
```

Validation:

```text
- Duplicate menu_item_id + allergen_id should be rejected or upserted explicitly.
- If risk_level is unknown, confidence must not exceed 0.5.
- If source is dish_inferred, do not write it as an explicit override unless admin intentionally confirms.
- No AI/OCR source may be created in Phase 02.
```

---

## 6. Data Model and Migration Requirements

### 6.1 First instruction for Claude

Before adding models, inspect the existing Prisma schema.

Because Phase 0/1 already has a seed importer and OpenMap discovery importer, some restaurant models may already exist. Do not duplicate models. Extend existing models with migrations.

Use this strategy:

```text
1. Inspect apps/web/prisma/schema.prisma.
2. Inspect existing scripts related to seed:openmap and restaurant import.
3. Reuse existing enums/models wherever possible.
4. Add missing columns/tables with backwards-compatible migrations.
5. Add indexes needed by Phase 02 queries.
```

### 6.2 Required logical entities

The database must support at least these logical entities:

```text
Restaurant
RestaurantExternalId or external fields on Restaurant
RestaurantMenuItem
MenuItemAllergenStatus
```

Optional but useful:

```text
RestaurantSourceAudit
RestaurantImportBatch
RestaurantReviewEvent
```

Do not overbuild audit workflow if it delays the public restaurant flow.

### 6.3 Restaurant indexes

Add indexes for:

```text
city
city + district
review_status
verification_status
menu_status
external_source + osm_id/openmap_id if available
slug unique
lat/lon or PostGIS point/geography if current schema supports it
```

If using raw PostGIS distance queries, ensure migration creates needed spatial index.

### 6.4 Menu item indexes

Add indexes for:

```text
restaurant_id
dish_id
menu_status
menu_source_type
restaurant_id + menu_status
```

### 6.5 Allergen status indexes

Add indexes/constraints for:

```text
menu_item_id
allergen_id
unique(menu_item_id, allergen_id)
source
verification_status
```

---

## 7. Domain Package Requirements

Extend `packages/domain` without framework dependencies.

### 7.1 Add domain schemas/types

Add or extend Zod schemas/types for:

```text
Restaurant
RestaurantSummary
RestaurantDetail
RestaurantSource
RestaurantReviewStatus
RestaurantVerificationStatus
RestaurantMenuStatus
RestaurantMenuItem
MenuItemAllergenStatus
RestaurantRecommendationRequest
RestaurantRecommendationResponse
RestaurantMenuRecommendation
RestaurantReadinessClass
RestaurantRecommendationCounts
GeoPoint
```

Use existing profile/allergen/dish risk types where possible.

### 7.2 Add menu item evaluator

Add pure function:

```ts
function evaluateMenuItem(input: EvaluateMenuItemInput): MenuItemRecommendation
```

Input shape:

```ts
type EvaluateMenuItemInput = {
  menuItem: RestaurantMenuItemLike;
  explicitAllergenStatuses: MenuItemAllergenStatusLike[];
  matchedDishRecommendation?: DishRecommendationLike | null;
  profile: AllergyProfileLike;
  restaurantVerificationStatus: RestaurantVerificationStatus;
  menuStatus: RestaurantMenuStatus;
  now?: Date;
};
```

Output shape:

```ts
type MenuItemRecommendation = {
  menuItemId: string;
  restaurantId: string;
  dishId?: string | null;
  displayName: LocalizedText;
  status: 'suitable' | 'ask_first' | 'risky' | 'avoid' | 'unknown';
  riskLevel: 'contains' | 'likely_contains' | 'possible' | 'unlikely' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  source: string;
  reason: LocalizedText;
  action: LocalizedText;
  lastCheckedAt?: string | null;
  stale: boolean;
  matchedDishName?: LocalizedText | null;
};
```

### 7.3 Evidence priority

Menu item recommendation must use this evidence priority:

```text
1. Explicit menu item allergen status with admin_verified source/status
2. Explicit menu item allergen status from restaurant_submitted
3. Explicit menu item allergen status from admin_manual / official_menu
4. Mapped dish recommendation from existing dish risk engine
5. Unknown
```

OSM/OpenMap tags can support restaurant discovery and cuisine/diet hints, but must not become allergy verification.

### 7.4 Menu item classification rules

For each active allergen in profile:

```text
risk_level contains        -> Avoid
risk_level likely_contains -> Avoid
risk_level possible        -> Risky for severe/anaphylaxis; Ask First for mild/moderate unless cross-contact sensitive
risk_level unlikely        -> Suitable only if restaurant/menu evidence is verified enough and cross-contact concern is not unknown for severe users
risk_level unknown         -> Unknown; action should ask staff or avoid if severe and no staff confirmation is possible
```

For multiple allergens, choose the strictest resulting status.

Strictness order:

```text
Avoid > Risky > Ask First > Unknown > Suitable
```

Note: the dish guide currently groups priority as Avoid -> Risky -> Ask First -> Unknown -> Suitable. Keep the same ordering for restaurant menu items.

### 7.5 Restaurant readiness evaluator

Add pure function:

```ts
function evaluateRestaurantReadiness(input: EvaluateRestaurantReadinessInput): RestaurantRecommendation
```

Input:

```ts
type EvaluateRestaurantReadinessInput = {
  restaurant: RestaurantLike;
  menuRecommendations: MenuItemRecommendation[];
  profile: AllergyProfileLike;
  now?: Date;
};
```

Output:

```ts
type RestaurantRecommendation = {
  restaurantId: string;
  readinessClass: 'A' | 'B' | 'C' | 'D' | 'E';
  confidence: 'high' | 'medium' | 'low';
  counts: {
    suitable: number;
    askFirst: number;
    risky: number;
    avoid: number;
    unknown: number;
    total: number;
  };
  summary: LocalizedText;
  reasons: LocalizedText[];
  source: string;
  verificationStatus: string;
  menuStatus: string;
  lastCheckedAt?: string | null;
  stale: boolean;
};
```

### 7.6 Restaurant readiness rules v1

Use deterministic rules:

```text
A:
- restaurant verification_status = admin_verified
- menu_status = admin_verified
- at least 1 menu item classified Suitable
- no Avoid/Risky items among the explicitly recommended subset for the active allergen OR clear filtering explains which items to avoid
- shared cookware/fryer is known and acceptable for the profile
- confidence high

B:
- at least 1 Suitable or Ask First item
- data source is admin_manual, restaurant_submitted, official_menu, or admin_verified
- confidence medium/high
- user still must ask first

C:
- no menu items OR mostly Unknown
- OSM/OpenMap discovery only
- insufficient allergy/menu data

D:
- most menu items are Risky/Avoid, or only weak Ask First options exist for severe profile

E:
- all relevant menu items are Avoid/Risky for the active profile
- restaurant is flagged/expired with unresolved concern
```

Hard caps:

```text
- OSM/OpenMap discovery-only restaurant: max C
- Restaurant with no menu items: max C
- Restaurant with menu items but no allergen/dish mapping: max C
- Unverified restaurant with dish-inferred menu only: max B, usually C/B depending confidence
- Expired verification: downgrade confidence and cap at B
- Flagged restaurant: max D unless admin explicitly unflags
```

### 7.7 Staleness rules

Add utility:

```ts
function isStale(lastCheckedAt: Date | null, sourceType: SourceType, now: Date): boolean
```

Suggested thresholds:

```text
admin_verified: 60 days
restaurant_submitted: 30 days
official_menu/admin_manual: 45 days
OSM/OpenMap discovery: 90 days for discovery freshness, but never for allergy verification
```

Stale data behavior:

```text
- Show stale warning.
- Downgrade confidence one level if stale.
- Do not hide restaurant solely because stale unless flagged/rejected.
```

---

## 8. Public API Requirements

All public endpoints must validate input/output with Zod.

Do not send profile id in URL. The current implementation sends the profile in POST body for recommendations. Keep that pattern.

### 8.1 Browse restaurants without profile

```http
GET /api/v1/restaurants?city=hanoi&district=hoan_kiem&q=bun&cuisine=vietnamese&limit=20&cursor=...
```

Use this for non-personalized browsing and admin/debug UI where appropriate.

Response:

```json
{
  "restaurants": [
    {
      "restaurantId": "rest_...",
      "slug": "...",
      "name": { "vi": "...", "en": "..." },
      "city": "hanoi",
      "district": "Hoàn Kiếm",
      "address": "...",
      "cuisine": ["vietnamese", "noodle"],
      "lat": 21.028511,
      "lon": 105.852345,
      "source": "openstreetmap",
      "reviewStatus": "approved",
      "verificationStatus": "unverified",
      "menuStatus": "not_observed",
      "lastCheckedAt": "2026-07-08",
      "hasMenuItems": false
    }
  ],
  "nextCursor": null,
  "attribution": "© OpenStreetMap contributors"
}
```

Visibility rules:

```text
- Return only review_status=approved by default.
- Exclude rejected rows.
- Do not show needs_review in public API unless explicit dev/admin flag exists and is protected.
```

### 8.2 Get restaurant detail without profile

```http
GET /api/v1/restaurants/{restaurantIdOrSlug}
```

Response includes restaurant metadata and raw/menu rows, but no personalized recommendation unless profile is posted to recommendation endpoint.

### 8.3 Personalized restaurant recommendations

```http
POST /api/v1/recommendations/restaurants
```

Request:

```json
{
  "profile": {
    "allergies": [
      {
        "allergenId": "peanut",
        "severity": "anaphylaxis_risk",
        "crossContactSensitive": true
      }
    ],
    "dietaryProfiles": [],
    "city": "hanoi",
    "language": "en"
  },
  "city": "hanoi",
  "filters": {
    "district": "Hoàn Kiếm",
    "q": "bun",
    "cuisine": "vietnamese",
    "sort": "recommended"
  },
  "clientLocation": {
    "lat": 21.028511,
    "lon": 105.852345,
    "accuracyMeters": 60
  },
  "limit": 20,
  "cursor": null
}
```

Response:

```json
{
  "restaurants": [
    {
      "restaurantId": "rest_...",
      "slug": "...",
      "name": { "vi": "Bún Chả Example", "en": "Bun Cha Example" },
      "address": "12 Hang Gai, Hoan Kiem, Hanoi",
      "district": "Hoàn Kiếm",
      "city": "hanoi",
      "distanceMeters": 650,
      "cuisine": ["vietnamese", "noodle"],
      "readinessClass": "C",
      "confidence": "low",
      "counts": {
        "suitable": 0,
        "askFirst": 0,
        "risky": 0,
        "avoid": 0,
        "unknown": 0,
        "total": 0
      },
      "summary": {
        "en": "Menu allergy data is not available yet. Use this listing for discovery only and ask staff before ordering.",
        "vi": "Chưa có dữ liệu dị ứng từ thực đơn. Chỉ nên dùng thông tin này để tham khảo địa điểm và hỏi nhân viên trước khi gọi món."
      },
      "source": "openstreetmap",
      "verificationStatus": "unverified",
      "menuStatus": "not_observed",
      "lastCheckedAt": "2026-07-08",
      "stale": false
    }
  ],
  "nextCursor": null,
  "attribution": "© OpenStreetMap contributors"
}
```

### 8.4 Personalized restaurant detail recommendation

```http
POST /api/v1/recommendations/restaurants/{restaurantIdOrSlug}
```

Request:

```json
{
  "profile": { "...": "same profile payload as dish recommendations" },
  "clientLocation": { "lat": 21.028511, "lon": 105.852345, "accuracyMeters": 60 }
}
```

Response:

```json
{
  "restaurant": {
    "restaurantId": "rest_...",
    "slug": "...",
    "name": { "vi": "...", "en": "..." },
    "address": "...",
    "lat": 21.028511,
    "lon": 105.852345,
    "source": "openstreetmap",
    "verificationStatus": "unverified",
    "menuStatus": "observed_not_verified",
    "lastCheckedAt": "2026-07-08"
  },
  "recommendation": {
    "readinessClass": "B",
    "confidence": "medium",
    "counts": {
      "suitable": 1,
      "askFirst": 3,
      "risky": 1,
      "avoid": 2,
      "unknown": 0,
      "total": 7
    },
    "summary": {
      "en": "Some menu items look lower risk for this profile, but please ask staff before ordering.",
      "vi": "Một số món có vẻ ít rủi ro hơn với hồ sơ này, nhưng hãy hỏi nhân viên trước khi gọi món."
    },
    "reasons": []
  },
  "menuRecommendations": [
    {
      "menuItemId": "mi_...",
      "displayName": { "vi": "Cơm gà", "en": "Chicken rice" },
      "matchedDishName": { "vi": "Cơm gà", "en": "Chicken rice" },
      "status": "ask_first",
      "riskLevel": "unlikely",
      "confidence": "medium",
      "source": "dish_inferred",
      "reason": {
        "en": "No known peanut ingredient in the mapped dish, but restaurant preparation is not verified.",
        "vi": "Món được map chưa có thành phần đậu phộng thường gặp, nhưng quy trình chế biến của quán chưa được xác minh."
      },
      "action": {
        "en": "Ask staff about ingredients and cross-contact before ordering.",
        "vi": "Hỏi nhân viên về thành phần và nguy cơ dùng chung dụng cụ trước khi gọi món."
      },
      "lastCheckedAt": "2026-07-08",
      "stale": false
    }
  ]
}
```

---

## 9. Admin API Requirements

Admin endpoints must use existing admin cookie auth and Zod validation.

### 9.1 Restaurant CRUD

```http
GET    /api/v1/admin/restaurants
POST   /api/v1/admin/restaurants
GET    /api/v1/admin/restaurants/{restaurantId}
PATCH  /api/v1/admin/restaurants/{restaurantId}
DELETE /api/v1/admin/restaurants/{restaurantId}
```

Deletion rule:

```text
- Prefer soft delete/archive if model already supports it.
- If hard delete is implemented, block deletion when menu items exist unless cascade is explicitly intended and tested.
```

### 9.2 Restaurant review actions

```http
POST /api/v1/admin/restaurants/{restaurantId}/approve
POST /api/v1/admin/restaurants/{restaurantId}/reject
POST /api/v1/admin/restaurants/{restaurantId}/flag
```

These can be PATCH actions if current admin pattern avoids action endpoints.

### 9.3 Menu item CRUD

```http
GET    /api/v1/admin/restaurants/{restaurantId}/menu-items
POST   /api/v1/admin/restaurants/{restaurantId}/menu-items
GET    /api/v1/admin/menu-items/{menuItemId}
PATCH  /api/v1/admin/menu-items/{menuItemId}
DELETE /api/v1/admin/menu-items/{menuItemId}
```

### 9.4 Menu item allergen status CRUD

```http
GET   /api/v1/admin/menu-items/{menuItemId}/allergen-statuses
PUT   /api/v1/admin/menu-items/{menuItemId}/allergen-statuses
PATCH /api/v1/admin/menu-items/{menuItemId}/allergen-statuses/{statusId}
DELETE /api/v1/admin/menu-items/{menuItemId}/allergen-statuses/{statusId}
```

Simpler acceptable implementation:

```http
PUT /api/v1/admin/menu-items/{menuItemId}/allergen-statuses
```

with full replacement array.

---

## 10. Seed and Import Requirements

### 10.1 Existing importer

The README states an OpenMap discovery importer already exists. Use it instead of creating a separate parallel importer.

Claude must:

```text
1. Inspect scripts behind `pnpm seed:openmap`.
2. Inspect whether restaurant rows are already persisted.
3. Make imported rows visible in /admin/restaurants.
4. Keep imported discovery rows hidden from public unless review_status=approved.
5. Preserve source metadata and attribution.
```

### 10.2 OSM/OpenMap data policy

For imported discovery rows:

```text
external_source = openstreetmap or openmap, according to current importer
verification_status = unverified
menu_status = not_observed or menu_url_available
review_status = needs_review by default
source_url/source_observed_at/data_license/attribution_required must be stored
```

Do not infer allergy status from:

```text
- cuisine tag
- restaurant name
- website/menu URL existence
- diet:vegetarian / diet:vegan / diet:halal tags
- map category
```

### 10.3 Demo/local seed for menu items

Add a dev-only/manual seed script if needed:

```bash
pnpm seed:restaurant-demo-menu
```

Purpose:

```text
- Attach a small curated set of menu items to 5-10 approved demo restaurants.
- Map those menu items to existing dish ontology.
- Use menu_source_type=manual_seed or admin_manual.
- Use menu_status=observed_not_verified unless actually verified by admin.
- Use conservative reasons and source labels.
```

Do not randomly assign real dishes to real restaurants in production seed. Randomized fake menu data is useful for demos and tests, but poisonous for user trust. Humanity already has enough fake certainty.

If a demo menu seed is added, ensure it is clearly named and never run automatically in production deployment.

---

## 11. Location and Distance Requirements

### 11.1 Permission timing

Only request browser location when user taps:

```text
Find food near me
Use my location
Sort by distance
```

Do not request location on initial page load.

### 11.2 Permission copy

Before browser prompt, show copy like:

```text
We use your location only to sort nearby food places on this device.
Your allergy profile is not added to the URL.
You can browse by city instead.
```

Translate to Vietnamese.

### 11.3 Distance calculation

Preferred:

```text
Use PostGIS distance query when clientLocation is included in POST body.
```

Acceptable fallback:

```text
Fetch city restaurants and compute approximate distance server-side or client-side using Haversine.
```

Do not store exact user location in the database.

### 11.4 Sorting

Supported sort modes:

```text
recommended
nearest
last_checked
name
```

Default sort:

```text
recommended when profile exists
nearest when user explicitly grants location and chooses nearest
name when no profile/location context exists
```

---

## 12. Offline Requirements

Phase 02 offline support is P1 but should be included if it fits the current Dexie pattern.

Add Dexie stores:

```text
lastRestaurantSearch
lastRestaurantDetail
```

Each cached object must include:

```text
cacheKey
profileHash or profileFingerprint if needed, not raw profile if avoidable
city
restaurantId optional
savedAt
expiresAt
payload
```

Offline behavior:

```text
- /restaurants offline: show last cached restaurant search if available.
- /restaurants/[id] offline: show last cached detail if available.
- Always show offline/stale warning.
- If no cached restaurant data exists, show CTA to allergy card and dish guide.
```

Offline copy:

```text
You are offline.
Showing saved restaurant information only.
Menus and preparation methods may have changed.
Please confirm with staff before ordering.
```

Do not cache exact location long term.

---

## 13. i18n Requirements

All new public copy must support EN and VI.

Add message namespaces such as:

```text
restaurants.*
restaurantDetail.*
restaurantCard.*
menuItemCard.*
locationPermission.*
adminRestaurants.*
adminMenuItems.*
```

For data display:

```text
- Use name_vi/name_en if present.
- Fall back to canonical_name/raw_name.
- Keep existing EN/VI data toggle behavior if available.
```

Do not place allergy profile values in URL-localized route params.

---

## 14. UI Component Requirements

Reuse existing design system tokens and components.

Add components:

```text
RestaurantCard
RestaurantReadinessBadge
RestaurantSourceBadge
RestaurantVerificationBadge
RestaurantMenuStatusBadge
RestaurantDistanceLabel
RestaurantFilterBar
RestaurantListEmptyState
RestaurantMapShell
MenuItemRecommendationCard
MenuItemStatusBadge
LocationPermissionPanel
AdminRestaurantTable
AdminRestaurantForm
AdminMenuItemTable
AdminMenuItemForm
AdminMenuItemAllergenStatusEditor
```

Accessibility:

```text
- Status must not rely on color only.
- Badges need text labels.
- Buttons must be keyboard accessible.
- Map/list toggle must be accessible.
- Forms must have labels and error messages.
```

Responsive behavior:

```text
Mobile: single-column cards, sticky filter summary if useful
Tablet: two-column list/detail where sensible
Desktop: wider list + map/detail panel optional
Admin: table-first desktop layout, usable on tablet
```

---

## 15. Question Card Integration

Existing `buildQuestionCard` is deterministic and works offline.

Phase 02 should add restaurant/menu context without breaking existing question-card behavior.

Options:

```text
Option A, preferred:
- Extend buildQuestionCard input with optional context:
  restaurantName?: LocalizedText
  menuItemName?: LocalizedText
  dishName?: LocalizedText

Option B:
- Keep buildQuestionCard unchanged.
- Prepend context in UI only before saving the last question card.
```

The generated card should include:

```text
- Active allergen/severity statement
- Specific menu item name if provided
- Ingredient question
- Cross-contact question
- Please check with kitchen phrase
- Restaurant name context if helpful
```

Do not use LLM for Phase 02 question cards.

---

## 16. Security and Privacy Requirements

### 16.1 No profile in URL

Never use:

```text
/restaurants?allergen=peanut&severity=anaphylaxis
```

Use:

```text
POST body for recommendation APIs
client state for active profile
```

### 16.2 Admin auth

Use existing admin cookie auth.

Do not create user auth in Phase 02.

### 16.3 Input validation

Every API route must validate:

```text
- path params
- query params
- request body
- response shape where current pattern supports it
```

### 16.4 Source integrity

Admin UI must make source and verification status visible. A restaurant discovered via map data must not be confused with restaurant-confirmed data.

---

## 17. Testing Requirements

### 17.1 Unit tests in packages/domain

Add unit tests for:

```text
- evaluateMenuItem maps contains -> Avoid
- evaluateMenuItem maps likely_contains -> Avoid
- evaluateMenuItem maps possible -> Risky for anaphylaxis profile
- evaluateMenuItem maps possible -> Ask First for mild profile if not cross-contact sensitive
- evaluateMenuItem maps unknown -> Unknown
- evaluateMenuItem never returns Suitable for unknown risk
- explicit menu item status overrides mapped dish risk when higher evidence priority
- mapped dish inference is used when no explicit menu item status exists
- OSM/OpenMap discovery-only evidence never verifies allergy suitability
- evaluateRestaurantReadiness returns C for restaurant with no menu items
- evaluateRestaurantReadiness caps OSM/OpenMap discovery-only restaurant at C
- evaluateRestaurantReadiness returns B when restaurant has at least one Ask First/Suitable menu item but is not fully verified
- evaluateRestaurantReadiness returns E when all menu items are Avoid/Risky
- stale data downgrades confidence
```

### 17.2 API tests

Add tests for:

```text
- GET /api/v1/restaurants returns only approved restaurants by default
- POST /api/v1/recommendations/restaurants accepts profile in body
- POST /api/v1/recommendations/restaurants does not accept allergy profile in query
- POST /api/v1/recommendations/restaurants/{id} returns menu recommendations
- Admin restaurant CRUD requires auth
- Admin menu item CRUD requires auth
- Invalid enum/status values return 400
```

### 17.3 E2E happy path

Extend Playwright happy path:

```text
1. migrate + seed + seed:kit + approve seed content
2. seed or approve at least one restaurant
3. seed or create at least one menu item mapped to a dish
4. open /en
5. complete onboarding with peanut/anaphylaxis/cross-contact profile
6. go to /restaurants
7. see restaurant cards with readiness class and source labels
8. open restaurant detail
9. see menu recommendations with status/reason/source/confidence
10. click Ask about this item
11. question card appears with menu item/restaurant context or at least profile context
12. copy guard passes
```

### 17.4 Manual QA checklist

Add to README or docs:

```text
- Restaurants page works without location.
- Location prompt appears only after user action.
- Location denied still shows city browsing.
- OSM/OpenMap rows display source attribution.
- Discovery-only restaurants are not shown as verified.
- Restaurant detail with no menu data shows Unknown/C state.
- Menu item cards show reason/source/confidence/last checked.
- Suitable cards include confirm-with-staff caveat.
- Offline restaurant page shows stale/saved warning if cached.
- Admin can approve/reject restaurants.
- Admin can add menu item and map it to dish.
- Admin can add allergen status to menu item.
```

---

## 18. Quality Gates

Phase 02 is done only if these pass:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm copy:check
pnpm test:e2e
pnpm build
```

If e2e requires a seeded restaurant/menu, update CI seed flow explicitly.

Do not bypass tests by marking restaurant tests as skipped. Future-you is not going to be grateful for that tiny betrayal.

---

## 19. Acceptance Criteria

### 19.1 Public user acceptance

```text
- User can open /restaurants after onboarding.
- User can browse Hanoi restaurants without granting location.
- User can tap Find food near me and grant location to see distance sorting.
- If location is denied, app still works via city/district browsing.
- User can open restaurant detail.
- Restaurant detail shows readiness, confidence, reason, source, verification, last checked.
- Restaurant detail shows menu item risk classifications when menu items exist.
- User can generate question card from a restaurant/menu item context.
- App never claims food is guaranteed safe.
```

### 19.2 Admin acceptance

```text
- Admin can view imported OpenMap/OSM restaurant rows.
- Admin can approve/reject restaurant rows.
- Admin can create/edit/delete restaurants.
- Admin can add/edit/delete menu items.
- Admin can map menu items to existing dishes.
- Admin can add allergen statuses to menu items.
- Admin can set review_status, verification_status, menu_status.
```

### 19.3 Data acceptance

```text
- 30-50 approved restaurants can be made visible for Hanoi local demo.
- Restaurant records include source metadata.
- OSM/OpenMap records remain discovery-only unless manually upgraded.
- Menu items include source, observed_at, and status.
- Menu item recommendations include evidence/reason.
```

### 19.4 Safety acceptance

```text
- Unknown risk is never Suitable.
- OSM/OpenMap discovery-only restaurant is max readiness C.
- No restaurant is A unless admin_verified/menu admin_verified and cross-contact assumptions are explicit enough.
- Severe allergy profile receives stricter recommendation wording.
- Suitable menu item still tells user to confirm with staff.
```

---

## 20. Suggested Implementation Order for Claude

Implement in this order:

```text
1. Inspect current Prisma schema, route conventions, admin patterns, domain types.
2. Add/extend domain types for restaurant/menu/readiness.
3. Add domain evaluators and unit tests.
4. Add/extend Prisma schema and migration.
5. Wire existing OpenMap/OSM importer rows into Restaurant model if not already wired.
6. Add admin restaurant APIs.
7. Add admin restaurant pages.
8. Add admin menu item APIs.
9. Add admin menu item pages.
10. Add public restaurant browse API.
11. Add public restaurant recommendation APIs.
12. Add public /restaurants page.
13. Add public restaurant detail page.
14. Add location permission flow.
15. Add question-card integration from menu item context.
16. Add optional Dexie offline cache for last restaurant data.
17. Add e2e restaurant happy path.
18. Update README with Phase 02 capabilities and QA checklist.
19. Run quality gates.
```

Do not start with map rendering. Start with schema/domain/API/admin, then public UX. The map is decorative until the recommendation contract works, which is apparently a lesson every product team must tattoo onto its collective forehead.

---

## 21. File/Directory Touch Points

Likely touch points; adjust to actual codebase:

```text
packages/domain/src/*
packages/domain/src/restaurant*.ts
packages/domain/src/menu*.ts
packages/domain/src/recommendation*.ts
packages/domain/src/*.test.ts

apps/web/prisma/schema.prisma
apps/web/prisma/migrations/*
apps/web/scripts/*restaurant*.ts
apps/web/src/app/api/v1/restaurants/*
apps/web/src/app/api/v1/recommendations/restaurants/*
apps/web/src/app/api/v1/admin/restaurants/*
apps/web/src/app/api/v1/admin/menu-items/*
apps/web/src/app/[locale]/restaurants/page.tsx
apps/web/src/app/[locale]/restaurants/[restaurantIdOrSlug]/page.tsx
apps/web/src/app/admin/restaurants/*
apps/web/src/components/restaurants/*
apps/web/src/features/restaurants/*
apps/web/src/features/location/*
apps/web/src/lib/db/*
apps/web/src/lib/validation/*
apps/web/src/messages/en.json
apps/web/src/messages/vi.json
apps/web/tests/e2e/*
README.md
```

---

## 22. Open Decisions for TuNM

Default choices for Phase 02 unless changed:

```text
Pilot/dev city: Hanoi
Public city choices: Hanoi only in Phase 02 UI, keep config flexible
Map: list-first; map shell/light map is P1 within Phase 02
Google Places: no
Restaurant rows: show only approved rows publicly
Menu data: admin/manual only
Feedback: Phase 03
OCR/menu scan: Phase 04
Restaurant self-onboarding: Phase 05
```

---

## 23. Claude Handoff Prompt

Copy this block into Claude:

```text
You are implementing SafeBite Travel Phase 02: Restaurant MVP.

First read:
- README.md
- docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md
- PRD_v2.txt if present
- this Phase 02 implementation spec

Current system:
- Next.js 15 App Router PWA
- React 19
- Prisma 6 + PostgreSQL/PostGIS
- next-intl locale routes /en and /vi
- admin routes under /admin using ADMIN_TOKEN httpOnly cookie
- @safebite/domain has evaluateDishes and buildQuestionCard
- profile is local-first in browser; recommendation APIs receive profile in POST body, never URL
- dish guide/question card/offline allergy card/admin dish/ingredient/risk CRUD already exist
- OpenMap/OSM discovery importer exists but restaurant data is hidden from Phase-1 public UX

Implement only Phase 02:
- Restaurant public list route
- Restaurant public detail route
- Restaurant browse API
- Restaurant recommendation API with profile in POST body
- Menu item recommendation logic
- Restaurant readiness scoring v1
- Admin restaurant CRUD
- Admin menu item CRUD
- Admin mapping menu item -> dish
- Admin menu item allergen status editor
- Location permission flow triggered only by user action
- Distance sorting if location is granted
- City/district browsing if location is denied
- Basic list/map shell, list-first
- Tests and e2e restaurant happy path
- README update

Do not implement:
- OCR
- LLM parsing
- menu upload
- restaurant self-onboarding
- post-meal feedback
- user accounts
- Google Places
- Google Maps scraping
- payments
- push notifications

Safety invariants:
- Allowed status labels only: Suitable, Ask First, Risky, Avoid, Unknown.
- Unknown risk is never Suitable.
- OSM/OpenMap discovery-only data never verifies allergy suitability.
- Discovery-only restaurant max readiness C.
- Suitable cards still need confirm-with-staff caveat.
- Severe allergy profile uses stricter logic.
- Do not weaken copy:check.

Before coding:
1. Inspect existing Prisma schema and importer. Do not duplicate models if restaurant models already exist.
2. Inspect current admin patterns and reuse them.
3. Inspect current i18n routing/messages and follow the same style.
4. Inspect @safebite/domain types and extend them without framework dependencies.

Quality gate must pass:
pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check && pnpm test:e2e && pnpm build
```

---

## 24. Phase 02 Completion Summary Template

When Phase 02 is done, update README `Status` section with:

```text
Phase 02 implemented: restaurant browse/detail, admin restaurant/menu management,
restaurant recommendation API, menu item risk classification, readiness scoring,
location-triggered distance sorting, and restaurant-source trust display.

Restaurant data remains discovery/source-aware. OSM/OpenMap rows are not treated as allergy verification.
```

Also update `What it does` with:

```text
- Restaurant guide (/restaurants) — per-profile restaurant readiness, source/confidence, distance when allowed, and menu item recommendations.
- Admin restaurant/menu console — review imported restaurant rows, manage menu items, map menu items to dishes, and maintain menu allergen statuses.
```
