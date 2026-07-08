# SafeBite Travel - Implementation Spec for Phase 0 and Phase 1

Version: 0.1  
Date: 2026-07-08  
Target reader: Codex / coding agent / implementation engineer  
Product source: `PRD_v2.txt` and `osm_overpass_seed_kit.zip`

---

## 0. Mission

Build the first web/PWA foundation for SafeBite Travel, an allergy-aware travel food assistant. The app must help users understand local dish risk, create an allergy/diet profile, generate bilingual question cards, and access the allergy card offline.

The product is risk reduction, not risk elimination.

Forbidden wording anywhere in app UI, seed output, API labels, test fixtures, or admin defaults:

```text
Guaranteed Safe
100% Safe
Allergy-proof
This dish is safe.
```

Allowed status labels:

```text
Suitable
Ask First
Risky
Avoid
Unknown
```

Default safety posture: conservative, transparent, source-aware.

---

## 1. Scope Lock

### 1.1 Implement in Phase 0

Phase 0 here means engineering foundation, not user interviews. Product discovery remains outside the codebase.

Implement:

```text
- Repo/bootstrap setup
- Web app skeleton
- PostgreSQL local dev setup
- Prisma schema and migrations
- Seed import from osm_overpass_seed_kit
- Shared domain types
- Risk engine v1 unit-tested
- API skeleton
- Basic health/config/dish/profile endpoints
- Basic CI scripts
```

### 1.2 Implement in Phase 1

Implement:

```text
- Mobile-first PWA web shell
- Web app manifest
- Service worker baseline
- Offline app shell fallback
- Local-first onboarding
- Local profile storage
- Offline allergy card in IndexedDB
- Dish guide
- Dish recommendation API + UI
- Question card generator EN/VI
- Last question card offline storage
- Basic admin CRUD for profile templates, ingredients, dishes, dish risks
```

### 1.3 Do not implement yet

```text
- Native iOS/Android
- Google Places integration
- Google Maps photo/review scraping
- Restaurant public search/list/detail UI
- Location permission flow
- Menu upload/scan/OCR/LLM
- Payment
- User account sync
- Social features
- Full restaurant portal
- Push notifications
```

Restaurant tables and import pipeline can exist in Phase 0 because the seed kit contains restaurant schemas. Public restaurant UX is Phase 2.

---

## 2. Fixed Product Decisions for Implementation

| Decision | Value |
|---|---|
| App type | Mobile-first PWA web |
| Phase 0/1 architecture | Next.js full-stack app with stable `/api/v1` boundary |
| Database | PostgreSQL, with PostGIS extension enabled for Phase 2 readiness |
| ORM | Prisma |
| Client state | Zustand |
| Client cache/fetch | TanStack Query |
| Local offline data | IndexedDB via Dexie |
| Styling | Tailwind CSS + shadcn/ui-style primitives |
| i18n | Simple dictionary-based EN/VI module for Phase 1 |
| Auth | No user account in Phase 1; admin protected by env token |
| Phase 1 dev city | `hanoi` because seed kit is Hanoi-based |
| Future pilot city | Keep config flexible for `da_nang` / `hoi_an` later |

Rationale: this gives a single deployable web app now, while preserving a clean API boundary if the backend is split into NestJS/FastAPI/Spring later. Humanity may survive one monolith if it has boundaries.

---

## 3. Repository Structure

Create this structure:

```text
safe-bite-travel/
  README.md
  package.json
  pnpm-workspace.yaml
  .env.example
  .gitignore
  docker-compose.yml
  tsconfig.base.json

  apps/
    web/
      package.json
      next.config.ts
      postcss.config.mjs
      tailwind.config.ts
      middleware.ts
      public/
        manifest.webmanifest
        icons/
          icon-192.png
          icon-512.png
        offline.html
      prisma/
        schema.prisma
        migrations/
        seed.ts
      scripts/
        import-seed.ts
        assert-no-unsafe-copy.ts
      src/
        app/
          page.tsx
          offline/page.tsx
          layout.tsx
          globals.css
          api/
            health/route.ts
            v1/
              client-config/route.ts
              profile-templates/route.ts
              allergens/route.ts
              dishes/route.ts
              dishes/[dishId]/route.ts
              recommendations/dishes/route.ts
              question-cards/route.ts
              admin/
                login/route.ts
                dishes/route.ts
                dishes/[dishId]/route.ts
                ingredients/route.ts
                ingredients/[ingredientId]/route.ts
                dish-risks/route.ts
          (app)/
            layout.tsx
            home/page.tsx
            onboarding/page.tsx
            dishes/page.tsx
            dishes/[dishId]/page.tsx
            question-card/page.tsx
            allergy-card/page.tsx
            profile/page.tsx
          admin/
            layout.tsx
            login/page.tsx
            page.tsx
            dishes/page.tsx
            ingredients/page.tsx
            dish-risks/page.tsx
        components/
          app-shell/
          common/
          safety/
          status/
        features/
          onboarding/
          allergy-card/
          dishes/
          question-card/
          admin/
        lib/
          db.ts
          env.ts
          i18n.ts
          dexie.ts
          service-worker.ts
          admin-auth.ts
          api-response.ts
        tests/
          e2e/
          unit/

  packages/
    domain/
      package.json
      src/
        types.ts
        schemas.ts
        risk-engine.ts
        question-card.ts
        constants.ts
        copy.ts
        index.ts
      tests/
        risk-engine.test.ts
        question-card.test.ts
```

Use `packages/domain` for business rules that are shared by API routes and client components.

---

## 4. Environment and Commands

### 4.1 `.env.example`

```bash
DATABASE_URL="postgresql://safebite:safebite@localhost:5432/safebite?schema=public"
NEXT_PUBLIC_APP_NAME="SafeBite Travel"
NEXT_PUBLIC_DEFAULT_CITY="hanoi"
NEXT_PUBLIC_SUPPORTED_CITIES="hanoi,da_nang,hoi_an"
NEXT_PUBLIC_SUPPORTED_LANGUAGES="en,vi"
ADMIN_TOKEN="change-me-in-dev"
OFFLINE_CACHE_TTL_DAYS="7"
PWA_INSTALL_ENABLED="true"
```

### 4.2 `docker-compose.yml`

```yaml
services:
  db:
    image: postgis/postgis:16-3.4
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: safebite
      POSTGRES_USER: safebite
      POSTGRES_PASSWORD: safebite
    volumes:
      - safebite_pg:/var/lib/postgresql/data
volumes:
  safebite_pg:
```

### 4.3 Root commands

```json
{
  "scripts": {
    "dev": "pnpm --filter @safebite/web dev",
    "build": "pnpm --filter @safebite/web build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "db:migrate": "pnpm --filter @safebite/web prisma migrate dev",
    "db:seed": "pnpm --filter @safebite/web prisma db seed",
    "seed:kit": "pnpm --filter @safebite/web seed:kit",
    "copy:check": "pnpm --filter @safebite/web copy:check"
  }
}
```

Expected dev setup:

```bash
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm seed:kit -- --kit ./osm_overpass_seed_kit
pnpm dev
```

---

## 5. Database Schema

Use Prisma with PostgreSQL. Enable PostGIS through a raw migration:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 5.1 Required enums

```prisma
enum LanguageCode {
  en
  vi
}

enum ReviewStatus {
  needs_review
  approved
  rejected
}

enum RiskLevel {
  contains
  likely_contains
  possible
  unlikely
  unknown
}

enum RecommendationStatus {
  suitable
  ask_first
  risky
  avoid
  unknown
}

enum EvidenceType {
  manual_seed
  canonical_recipe
  menu_observed
  restaurant_verified
  user_report
  llm_inferred
}

enum SourceType {
  manual_seed
  menu_observed
  restaurant_submitted
  user_submitted
  expert_review
  openstreetmap
  google_places
  foursquare
  admin_verified
}

enum ProfileType {
  allergy
  religious
  diet
  preference
}

enum Strictness {
  low
  medium
  strict
}
```

### 5.2 Core models

Implement these Prisma models. Use exact field names where possible.

```prisma
model ProfileTemplate {
  id             String      @id @map("profile_id")
  nameVi         String      @map("profile_name_vi")
  nameEn         String      @map("profile_name_en")
  profileType    ProfileType @map("profile_type")
  strictness     Strictness  @map("strictness_default")
  descriptionVi  String?     @map("description_vi") @db.Text
  descriptionEn  String?     @map("description_en") @db.Text
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}

model Allergen {
  id          String   @id @map("allergen_id")
  nameVi      String   @map("name_vi")
  nameEn      String   @map("name_en")
  aliasesVi   String[] @default([]) @map("aliases_vi")
  aliasesEn   String[] @default([]) @map("aliases_en")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  dishRisks   DishAllergenRisk[]
}

model Ingredient {
  id                 String       @id @map("ingredient_id")
  canonicalNameVi    String       @map("canonical_name_vi")
  canonicalNameEn    String       @map("canonical_name_en")
  ingredientCategory String       @map("ingredient_category")
  aliasesVi          String[]     @default([]) @map("aliases_vi")
  aliasesEn          String[]     @default([]) @map("aliases_en")
  majorAllergenTags  String[]     @default([]) @map("major_allergen_tags")
  dietaryFlags       String[]     @default([]) @map("dietary_flags")
  halalRelevance     String?      @map("halal_relevance")
  hinduRelevance     String?      @map("hindu_relevance")
  veganRelevance     String?      @map("vegan_relevance")
  calorieRelevance   String?      @map("calorie_relevance")
  riskNotesVi        String?      @map("risk_notes_vi") @db.Text
  riskNotesEn        String?      @map("risk_notes_en") @db.Text
  reviewStatus       ReviewStatus @default(needs_review) @map("review_status")
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  dishes             DishIngredient[]
}

model Dish {
  id                          String       @id @map("dish_id")
  canonicalNameVi             String       @map("canonical_name_vi")
  canonicalNameEn             String       @map("canonical_name_en")
  aliasesVi                   String[]     @default([]) @map("aliases_vi")
  aliasesEn                   String[]     @default([]) @map("aliases_en")
  dishCategory                String       @map("dish_category")
  cuisine                     String
  regionTags                  String[]     @default([]) @map("region_tags")
  mealType                    String[]     @default([]) @map("meal_type")
  descriptionVi               String?      @map("description_vi") @db.Text
  descriptionEn               String?      @map("description_en") @db.Text
  commonIngredientsVi         String?      @map("common_ingredients_vi") @db.Text
  commonIngredientsEn         String?      @map("common_ingredients_en") @db.Text
  possibleHiddenIngredientsVi String?      @map("possible_hidden_ingredients_vi") @db.Text
  possibleHiddenIngredientsEn String?      @map("possible_hidden_ingredients_en") @db.Text
  calorieClass                String?      @map("calorie_class")
  spicyLevel                  String?      @map("spicy_level")
  pickyEaterFlags             String[]     @default([]) @map("picky_eater_flags")
  sourceType                  SourceType   @default(manual_seed) @map("source_type")
  sourceUrl                   String?      @map("source_url")
  reviewStatus                ReviewStatus @default(needs_review) @map("review_status")
  notes                       String?      @db.Text
  createdAt                   DateTime     @default(now())
  updatedAt                   DateTime     @updatedAt

  ingredients                 DishIngredient[]
  allergenRisks               DishAllergenRisk[]
}

model DishIngredient {
  dishId           String       @map("dish_id")
  ingredientId     String       @map("ingredient_id")
  ingredientRole   String       @map("ingredient_role")
  probabilityLevel String       @map("probability_level")
  confidence       Decimal      @db.Decimal(3,2)
  evidenceType     EvidenceType @map("evidence_type")
  sourceUrl        String?      @map("source_url")
  notes            String?      @db.Text

  dish             Dish         @relation(fields: [dishId], references: [id], onDelete: Cascade)
  ingredient       Ingredient   @relation(fields: [ingredientId], references: [id], onDelete: Cascade)

  @@id([dishId, ingredientId, ingredientRole])
}

model DishAllergenRisk {
  id                  String       @id @default(cuid())
  dishId              String       @map("dish_id")
  allergenId          String       @map("allergen_id")
  riskLevel           RiskLevel    @map("risk_level")
  confidence          Decimal      @db.Decimal(3,2)
  reasonVi            String       @map("reason_vi") @db.Text
  reasonEn            String       @map("reason_en") @db.Text
  recommendedActionVi String       @map("recommended_action_vi") @db.Text
  recommendedActionEn String       @map("recommended_action_en") @db.Text
  evidenceType        EvidenceType @default(manual_seed) @map("evidence_type")
  sourceType          SourceType   @default(manual_seed) @map("source_type")
  sourceUrl           String?      @map("source_url")
  reviewStatus        ReviewStatus @default(needs_review) @map("review_status")
  lastCheckedAt       DateTime     @default(now()) @map("last_checked_at")
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  dish                Dish         @relation(fields: [dishId], references: [id], onDelete: Cascade)
  allergen            Allergen     @relation(fields: [allergenId], references: [id], onDelete: Cascade)

  @@unique([dishId, allergenId])
  @@index([allergenId, riskLevel])
}
```

### 5.3 Restaurant models for Phase 0 only

Create these tables because the seed kit contains restaurant and menu schemas. Do not expose public restaurant UX in Phase 1.

```prisma
model Restaurant {
  id                   String       @id @map("restaurant_id")
  externalSource       SourceType    @map("external_source")
  osmType              String?      @map("osm_type")
  osmId                String?      @map("osm_id")
  canonicalName        String       @map("canonical_name")
  nameVi               String?      @map("name_vi")
  nameEn               String?      @map("name_en")
  amenity              String?
  cuisineRaw           String?      @map("cuisine_raw")
  cuisineNormalized    String[]     @default([]) @map("cuisine_normalized")
  fullAddress          String?      @map("full_address")
  street               String?
  housenumber          String?
  ward                 String?
  district             String?
  city                 String
  country              String       @default("Vietnam")
  lat                  Decimal?     @db.Decimal(10,7)
  lon                  Decimal?     @db.Decimal(10,7)
  phone                String?
  website              String?
  websiteMenu          String?      @map("website_menu")
  openingHours         String?      @map("opening_hours")
  sourceUrl            String?      @map("source_url")
  sourceObservedAt     DateTime?    @map("source_observed_at")
  dataLicense          String?      @map("data_license")
  attributionRequired  Boolean      @default(false) @map("attribution_required")
  discoveryConfidence  Decimal?     @map("discovery_confidence") @db.Decimal(3,2)
  menuStatus           String       @default("not_observed") @map("menu_status")
  verificationStatus   String       @default("unverified") @map("verification_status")
  reviewStatus         ReviewStatus @default(needs_review) @map("review_status")
  rawTagsJson          Json?        @map("raw_tags_json")
  notes                String?      @db.Text
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  menuItems            MenuItem[]
}

model MenuItem {
  id                String       @id @map("menu_item_id")
  restaurantId      String       @map("restaurant_id")
  dishId            String?      @map("dish_id")
  rawName           String       @map("raw_name")
  nameVi            String?      @map("name_vi")
  nameEn            String?      @map("name_en")
  section           String?
  descriptionVi     String?      @map("description_vi") @db.Text
  descriptionEn     String?      @map("description_en") @db.Text
  priceAmount       Decimal?     @map("price_amount") @db.Decimal(12,2)
  currency          String?      @default("VND")
  menuSourceType    String       @map("menu_source_type")
  menuSourceUrl     String?      @map("menu_source_url")
  observedAt        DateTime     @map("observed_at")
  parsedBy          String       @default("manual") @map("parsed_by")
  mappingConfidence Decimal?     @map("mapping_confidence") @db.Decimal(3,2)
  menuStatus        String       @default("observed_not_verified") @map("menu_status")
  notes             String?      @db.Text
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  restaurant        Restaurant   @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
}
```

### 5.4 Import tracking

```prisma
model ImportRun {
  id           String   @id @default(cuid())
  sourceName   String
  sourcePath   String
  status       String
  rowsRead     Int      @default(0)
  rowsInserted Int      @default(0)
  rowsUpdated  Int      @default(0)
  rowsSkipped  Int      @default(0)
  errors       Json?
  startedAt    DateTime @default(now())
  finishedAt   DateTime?
}
```

---

## 6. Seed Import Specification

The seed kit path is expected at repo root:

```text
osm_overpass_seed_kit/
  schemas/
  outputs/
  queries/
  scripts/
```

### 6.1 Input files

Import these files when present:

```text
schemas/profiles.csv
outputs/starter_ingredients_sample.csv
outputs/starter_dishes_hanoi_sample.csv
outputs/restaurants_osm_raw.csv
schemas/dish_ingredients_schema.csv
schemas/risk_rules_schema.csv
schemas/menu_items_schema.csv
```

The `*_schema.csv` files may be header-only. Importer must skip header-only files without failing.

### 6.2 Import rules

```text
- Use transaction per file.
- Upsert by stable id.
- Validate required columns before import.
- Print row counts.
- Store ImportRun.
- Fail fast for malformed required fields.
- Do not treat OSM rows as verified allergy data.
- Imported OSM restaurants must default to verification_status=unverified.
- Imported OSM restaurants must keep source/license/attribution metadata.
```

### 6.3 Profile import

`schemas/profiles.csv` maps to `ProfileTemplate`.

Expected imported templates from the seed kit:

```text
profile_peanut_allergy
profile_shellfish_allergy
profile_muslim_halal
profile_hindu_no_beef
profile_weight_loss
profile_picky_eater
```

### 6.4 Ingredient import

`outputs/starter_ingredients_sample.csv` maps to `Ingredient`.

Also derive default `Allergen` rows from `major_allergen_tags`:

```text
peanut
shellfish
fish
wheat
milk
egg
soy
sesame
```

Add non-allergen constraint pseudo-allergens for risk engine compatibility:

```text
pork
beef
alcohol
high_calorie
strong_smell
```

### 6.5 Dish import

`outputs/starter_dishes_hanoi_sample.csv` maps to `Dish`.

Columns like these must be normalized into `DishAllergenRisk`:

```text
default_peanut_risk      -> allergen_id=peanut
default_shellfish_risk   -> allergen_id=shellfish
default_fish_risk        -> allergen_id=fish
default_pork_risk        -> allergen_id=pork
default_beef_risk        -> allergen_id=beef
default_gluten_risk      -> allergen_id=wheat
default_egg_risk         -> allergen_id=egg
default_dairy_risk       -> allergen_id=milk
default_sesame_risk      -> allergen_id=sesame
default_alcohol_risk     -> allergen_id=alcohol
```

For each generated `DishAllergenRisk`:

```text
confidence = 0.70 for manual_seed defaults unless source is stronger
reason_en = derive from common/hidden ingredients and risk level
reason_vi = derive from common/hidden ingredients and risk level
recommended_action_en = derive from risk level
recommended_action_vi = derive from risk level
evidence_type = manual_seed
source_type = manual_seed
review_status = needs_review
```

Reason generation can be deterministic template-based in Phase 0. Do not use LLM.

### 6.6 Restaurant import

`outputs/restaurants_osm_raw.csv` maps to `Restaurant`.

Rules:

```text
- If file has only headers, importer exits cleanly.
- `external_source=openstreetmap` maps to SourceType.openstreetmap.
- `verification_status` must remain unverified unless manually changed in admin.
- `review_status` can be needs_review, approved, or rejected.
- Public Phase 1 UX must not show restaurants yet.
```

---

## 7. Domain Types

Create `packages/domain/src/types.ts`.

```ts
export type LanguageCode = "en" | "vi";

export type Severity = "mild" | "moderate" | "severe" | "anaphylaxis_risk";

export type RiskLevel =
  | "contains"
  | "likely_contains"
  | "possible"
  | "unlikely"
  | "unknown";

export type RecommendationStatus =
  | "suitable"
  | "ask_first"
  | "risky"
  | "avoid"
  | "unknown";

export type EvidenceType =
  | "manual_seed"
  | "canonical_recipe"
  | "menu_observed"
  | "restaurant_verified"
  | "user_report"
  | "llm_inferred";

export interface LocalUserProfile {
  id: string;
  name?: string;
  selectedProfileIds: string[];
  allergies: Array<{
    allergenId: string;
    severity: Severity;
    crossContactSensitive: boolean | "not_sure";
  }>;
  language: LanguageCode;
  destinationCity: string;
  safetyAcceptedAt: string;
  offlineEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DishRiskFact {
  dishId: string;
  allergenId: string;
  riskLevel: RiskLevel;
  confidence: number;
  reason: Record<LanguageCode, string>;
  recommendedAction: Record<LanguageCode, string>;
  evidenceType: EvidenceType;
  source: string;
  lastCheckedAt: string;
}

export interface DishRecommendationCard {
  dishId: string;
  name: Record<LanguageCode, string>;
  status: RecommendationStatus;
  riskLevel: RiskLevel;
  confidence: "low" | "medium" | "high";
  reason: Record<LanguageCode, string>;
  action: Record<LanguageCode, string>;
  source: string;
  lastCheckedAt: string;
  matchedAllergens: string[];
  stale?: boolean;
}
```

---

## 8. Risk Engine v1

Create `packages/domain/src/risk-engine.ts`.

### 8.1 Status severity order

```ts
const STATUS_RANK = {
  suitable: 1,
  unknown: 2,
  ask_first: 3,
  risky: 4,
  avoid: 5,
} as const;
```

When multiple profile constraints apply, return the highest-ranked status.

### 8.2 Allergy risk mapping

For `profile_type=allergy`:

| RiskLevel | Mild/Moderate | Severe/Anaphylaxis or cross-contact sensitive |
|---|---|---|
| contains | avoid | avoid |
| likely_contains | avoid | avoid |
| possible | ask_first | risky |
| unlikely | suitable | ask_first |
| unknown | unknown | unknown, action asks staff |

Do not turn `unknown` into `suitable`. This is apparently something we must state explicitly because computers obey nonsense with perfect confidence.

### 8.3 Religious/diet/preference mapping

For `profile_muslim_halal`:

```text
pork contains/likely_contains -> avoid
pork possible/unknown -> ask_first
alcohol contains/likely_contains -> avoid
alcohol possible/unknown -> ask_first
```

For `profile_hindu_no_beef`:

```text
beef contains/likely_contains -> avoid
beef possible/unknown -> ask_first
```

For `profile_weight_loss`:

```text
calorie_class=high -> ask_first
calorie_class=medium -> suitable
calorie_class=low -> suitable
calorie_class=unknown -> unknown
```

For `profile_picky_eater`:

```text
picky_eater_flags includes strong_smell, fermented_sauce, offal_possible, strong_broth -> ask_first
spicy_level=high -> ask_first
otherwise -> suitable
```

### 8.4 Confidence mapping

```text
>= 0.80 -> high
>= 0.55 -> medium
< 0.55 -> low
unknown risk -> low
```

### 8.5 Required unit tests

Test cases:

```text
- peanut allergy + dish with default_peanut_risk=possible + severe => risky
- peanut allergy + dish with default_peanut_risk=unlikely + severe => ask_first
- peanut allergy + dish with default_peanut_risk=unlikely + mild => suitable
- shellfish allergy + dish with likely_contains => avoid
- muslim_halal + dish_pork contains => avoid
- hindu_no_beef + pho_bo beef contains => avoid
- unknown risk never returns suitable
- multiple profiles return the highest-ranked status
```

---

## 9. API Specification

All API responses should use this envelope:

```ts
export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId?: string;
    generatedAt: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

Use Zod validation for request body/query params.

### 9.1 Health

```http
GET /api/health
```

Response:

```json
{
  "data": {
    "status": "ok",
    "db": "ok"
  },
  "meta": {
    "generatedAt": "2026-07-08T00:00:00.000Z"
  }
}
```

### 9.2 Client config

```http
GET /api/v1/client-config
```

Response:

```json
{
  "data": {
    "supportedCities": ["hanoi", "da_nang", "hoi_an"],
    "defaultCity": "hanoi",
    "supportedLanguages": ["en", "vi"],
    "offlineCacheTtlDays": 7,
    "pwaInstallEnabled": true
  }
}
```

### 9.3 Profile templates

```http
GET /api/v1/profile-templates
```

Response:

```json
{
  "data": {
    "items": [
      {
        "id": "profile_peanut_allergy",
        "name": { "vi": "Dị ứng đậu phộng", "en": "Peanut allergy" },
        "profileType": "allergy",
        "strictness": "strict",
        "description": {
          "vi": "Tránh đậu phộng, dầu/sốt đậu phộng, và hỏi về dùng chung dụng cụ.",
          "en": "Avoid peanut, peanut oil/sauce, and ask about shared cookware."
        }
      }
    ]
  }
}
```

### 9.4 Dishes

```http
GET /api/v1/dishes?city=hanoi&review_status=approved|needs_review|all
GET /api/v1/dishes/{dishId}
```

Public default should return `approved` first. During dev, allow `review_status=all`.

Dish response must include:

```text
id
name vi/en
aliases vi/en
category
cuisine
region tags
meal type
description vi/en
common ingredients vi/en
possible hidden ingredients vi/en
allergen risks
source
review status
```

### 9.5 Dish recommendations

Use POST for Phase 1 because the local profile is not persisted server-side.

```http
POST /api/v1/recommendations/dishes
Content-Type: application/json
```

Request:

```json
{
  "city": "hanoi",
  "language": "en",
  "profile": {
    "id": "local_abc",
    "selectedProfileIds": ["profile_peanut_allergy"],
    "allergies": [
      {
        "allergenId": "peanut",
        "severity": "anaphylaxis_risk",
        "crossContactSensitive": true
      }
    ],
    "destinationCity": "hanoi"
  }
}
```

Response:

```json
{
  "data": {
    "city": "hanoi",
    "groups": {
      "suitable": [],
      "askFirst": [],
      "risky": [],
      "avoid": [],
      "unknown": []
    },
    "summary": {
      "total": 12,
      "suitable": 2,
      "askFirst": 5,
      "risky": 3,
      "avoid": 2,
      "unknown": 0
    }
  }
}
```

Every dish recommendation card must include:

```text
Dish name
Status
Allergen/diet risk
Confidence
Reason
Action
Source
Last checked
```

### 9.6 Question card

```http
POST /api/v1/question-cards
Content-Type: application/json
```

Request:

```json
{
  "profile": {
    "selectedProfileIds": ["profile_peanut_allergy"],
    "allergies": [
      {
        "allergenId": "peanut",
        "severity": "anaphylaxis_risk",
        "crossContactSensitive": true
      }
    ],
    "language": "en",
    "destinationCity": "hanoi"
  },
  "dishId": "dish_bun_cha",
  "targetLanguage": "vi",
  "offlineCache": true
}
```

Response:

```json
{
  "data": {
    "id": "qc_...",
    "targetLanguage": "vi",
    "source": "template_generated",
    "createdAt": "2026-07-08T00:00:00.000Z",
    "text": "Tôi bị dị ứng nặng với đậu phộng...",
    "sections": [
      {
        "kind": "severity_statement",
        "text": "Tôi bị dị ứng nặng với đậu phộng."
      },
      {
        "kind": "ingredient_question",
        "text": "Món này có đậu phộng, dầu đậu phộng, bơ đậu phộng, hoặc sốt đậu phộng không?"
      },
      {
        "kind": "cross_contact_question",
        "text": "Món này có dùng chung chảo, dao thớt, hoặc dầu chiên với món có đậu phộng không?"
      },
      {
        "kind": "kitchen_check",
        "text": "Nếu không chắc, anh/chị có thể hỏi bếp giúp tôi không?"
      }
    ]
  }
}
```

Do not use LLM for Phase 1 question cards. Use deterministic templates.

### 9.7 Admin APIs

Admin endpoints require admin auth.

Authentication:

```text
POST /api/v1/admin/login with { token }
If token matches ADMIN_TOKEN, set httpOnly cookie `sbt_admin`.
All /admin pages and /api/v1/admin routes require this cookie.
```

Minimum admin routes:

```http
GET    /api/v1/admin/dishes
POST   /api/v1/admin/dishes
PATCH  /api/v1/admin/dishes/{dishId}
DELETE /api/v1/admin/dishes/{dishId}

GET    /api/v1/admin/ingredients
POST   /api/v1/admin/ingredients
PATCH  /api/v1/admin/ingredients/{ingredientId}
DELETE /api/v1/admin/ingredients/{ingredientId}

GET    /api/v1/admin/dish-risks?dishId=...
POST   /api/v1/admin/dish-risks
PATCH  /api/v1/admin/dish-risks/{riskId}
DELETE /api/v1/admin/dish-risks/{riskId}
```

Admin create/update forms must validate:

```text
- localized names exist
- dish risk has reason_vi and reason_en
- dish risk has recommended_action_vi and recommended_action_en
- confidence is 0-1
- source/evidence fields are explicit
```

---

## 10. Client Storage and Offline Specification

Create `apps/web/src/lib/dexie.ts`.

Dexie database name:

```text
safebite_pwa_v1
```

Tables:

```ts
profiles: "id, destinationCity, updatedAt"
allergyCards: "id, profileId, language, updatedAt"
questionCards: "id, profileId, dishId, targetLanguage, createdAt"
savedDishes: "dishId, status, savedAt, lastCheckedAt"
metadata: "key, updatedAt"
```

### 10.1 What to store locally

Allowed:

```text
- active local profile
- allergy card text
- last generated question card
- saved dish recommendation cards
- UI preferences
- offline cache metadata
```

Do not store:

```text
- access tokens in localStorage
- profile data in URL
- private API responses without intentional cache strategy
- Google Maps restricted content
```

### 10.2 Offline behavior

If offline:

```text
- App shell should load after first visit.
- Allergy card page should work.
- Last question card should work.
- Dish guide can show saved dish data only if available.
- New recommendation fetch should show offline message.
```

Offline copy:

```text
You are offline.
Showing saved information only.
Please confirm with restaurant staff before ordering.
```

---

## 11. PWA Requirements

### 11.1 Manifest

`public/manifest.webmanifest`:

```json
{
  "name": "SafeBite Travel",
  "short_name": "SafeBite",
  "description": "Travel food assistant for allergy-aware dish guidance and restaurant questions.",
  "start_url": "/home",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Icons can be placeholder generated assets in Phase 1.

### 11.2 Service worker

Use Serwist, Workbox, or a minimal custom service worker.

Cache strategy:

| Resource | Strategy |
|---|---|
| App shell/static assets | Cache first |
| HTML navigation | Network first, fallback `/offline` |
| Public config/profile templates/dishes | Network first with short cache |
| Private/local profile | IndexedDB only |
| Recommendation API | Do not blindly cache; user can save selected result to IndexedDB |

### 11.3 Install education

Show install prompt education only after one of:

```text
- onboarding completed
- question card generated
- second session
```

Do not block core flows with install UI.

---

## 12. UI Routes and Acceptance Criteria

### 12.1 `/`

Landing page.

Must show:

```text
- App positioning
- No install required
- CTA: Start allergy profile
- CTA: Browse dish guide
- Safety note: app cannot guarantee food safety
```

### 12.2 `/onboarding`

Multi-step flow:

```text
1. Choose profile templates/allergens
2. Set severity for allergy profiles
3. Set cross-contact sensitivity
4. Choose destination city
5. Choose language
6. Accept safety disclaimer
7. Save local profile and offline allergy card
```

Acceptance:

```text
- User can finish without account.
- Profile saved to IndexedDB.
- Allergy card generated and saved.
- User is redirected to `/home`.
- Profile data is not placed in query string.
```

Required disclaimer:

```text
This app helps you understand possible allergy risks.
It cannot guarantee food safety.
Always confirm ingredients and preparation with restaurant staff before ordering.
```

### 12.3 `/home`

Must show:

```text
- Active profile summary
- Destination city
- CTA Browse local dishes
- CTA Show allergy card
- CTA Generate question card
- Offline indicator if offline
```

Do not show restaurant search CTA as core until Phase 2. It can be disabled with “Coming later”.

### 12.4 `/dishes`

Must show:

```text
- Filter/group by status
- Dish cards with status, confidence, reason, action, source, last checked
- Language toggle EN/VI
- Safety reminder
```

Empty/error states:

```text
- No profile yet -> link to onboarding
- No dishes found -> explain city not seeded yet
- Offline -> show saved dishes if any, otherwise show allergy card CTA
```

### 12.5 `/dishes/[dishId]`

Must show:

```text
- Dish names EN/VI
- Description
- Common ingredients
- Possible hidden ingredients
- Risk per active profile
- Source/confidence/reason/action
- CTA Generate question card
```

### 12.6 `/question-card`

Must support:

```text
- Generate from active profile
- Optional dish context
- EN/VI toggle
- Large text mode
- Fullscreen-ish mobile display
- Copy text button
- Save to IndexedDB
- Offline display of last saved question card
```

### 12.7 `/allergy-card`

Must show:

```text
- Active allergies/constraints
- Severity
- Cross-contact sensitivity
- English and Vietnamese text
- Safety disclaimer
- Offline availability label
- Last updated timestamp
```

### 12.8 `/profile`

Must support:

```text
- View active profile
- Edit by returning to onboarding
- Clear local profile and offline data
```

### 12.9 `/admin`

Minimum admin UI:

```text
- Login with ADMIN_TOKEN
- Dashboard summary counts
- Dishes table
- Ingredients table
- Dish risks table
- Create/edit/delete forms
- review_status filter
```

Admin UI can be desktop-first but must not be completely broken on mobile.

---

## 13. Components

Implement reusable components:

```text
SafetyNotice
OfflineBanner
StatusBadge
ConfidenceBadge
SourceBadge
RecommendationCard
DishCard
QuestionCardDisplay
AllergyCardDisplay
BottomNav
AppHeader
LanguageToggle
InstallEducationCard
AdminDataTable
```

Status visual priority:

```text
Avoid > Risky > Ask First > Unknown > Suitable
```

Never color or word `Suitable` as guaranteed safe. The card copy should say:

```text
This looks lower risk for your profile, but please confirm with staff before ordering.
```

---

## 14. i18n Copy Keys

Create `apps/web/src/lib/i18n.ts` or `packages/domain/src/copy.ts`.

Minimum keys:

```ts
export const copy = {
  en: {
    safetyDisclaimer: "This app helps you understand possible allergy risks. It cannot guarantee food safety. Always confirm ingredients and preparation with restaurant staff before ordering.",
    offlineNotice: "You are offline. Showing saved information only. Please confirm with restaurant staff before ordering.",
    suitableCaveat: "This looks lower risk for your profile, but please confirm with staff before ordering.",
    statuses: {
      suitable: "Suitable",
      ask_first: "Ask First",
      risky: "Risky",
      avoid: "Avoid",
      unknown: "Unknown"
    }
  },
  vi: {
    safetyDisclaimer: "Ứng dụng giúp bạn hiểu các rủi ro dị ứng có thể có. Ứng dụng không thể đảm bảo an toàn thực phẩm. Luôn xác nhận thành phần và cách chế biến với nhân viên nhà hàng trước khi gọi món.",
    offlineNotice: "Bạn đang ngoại tuyến. Chỉ hiển thị thông tin đã lưu. Vui lòng xác nhận với nhân viên nhà hàng trước khi gọi món.",
    suitableCaveat: "Món này có vẻ rủi ro thấp hơn với hồ sơ của bạn, nhưng hãy xác nhận với nhân viên trước khi gọi món.",
    statuses: {
      suitable: "Phù hợp hơn",
      ask_first: "Hỏi trước",
      risky: "Rủi ro",
      avoid: "Nên tránh",
      unknown: "Chưa rõ"
    }
  }
};
```

---

## 15. Question Card Templates

Implement deterministic template function:

```ts
buildQuestionCard(input: {
  profile: LocalUserProfile;
  allergens: Array<{ id: string; nameVi: string; nameEn: string; aliasesVi: string[]; aliasesEn: string[] }>;
  targetLanguage: "en" | "vi";
  dishName?: { vi: string; en: string };
}): QuestionCard
```

For severe peanut allergy in Vietnamese, expected output includes:

```text
Tôi bị dị ứng nặng với đậu phộng.

Món này có đậu phộng, dầu đậu phộng, bơ đậu phộng, hoặc sốt đậu phộng không?

Món này có dùng chung chảo, dao thớt, hoặc dầu chiên với món có đậu phộng không?

Nếu không chắc, anh/chị có thể hỏi bếp giúp tôi không?
```

For English:

```text
I have a severe peanut allergy.

Does this dish contain peanuts, peanut oil, peanut butter, or peanut sauce?

Is it prepared with shared cookware, cutting boards, or fryer oil used for peanut dishes?

If unsure, could you please check with the kitchen?
```

---

## 16. Copy Safety Guard

Implement `scripts/assert-no-unsafe-copy.ts`.

Scan these folders:

```text
apps/web/src
packages/domain/src
apps/web/prisma
```

Fail if any forbidden phrase appears case-insensitively:

```text
guaranteed safe
100% safe
allergy-proof
allergy proof
this dish is safe
verified_safe
```

Exception: the denylist file itself can contain the forbidden terms.

Add to CI:

```bash
pnpm copy:check
```

---

## 17. Tests

### 17.1 Unit tests

Required:

```text
packages/domain/tests/risk-engine.test.ts
packages/domain/tests/question-card.test.ts
apps/web/src/tests/unit/seed-import.test.ts
apps/web/src/tests/unit/api-validation.test.ts
```

### 17.2 E2E tests

Use Playwright.

Required happy path:

```text
1. Visit /
2. Click Start allergy profile
3. Select Peanut allergy
4. Select Anaphylaxis risk
5. Select cross-contact yes
6. Select Hanoi
7. Accept disclaimer
8. Land on /home
9. Open /dishes
10. See at least one Ask First/Risky/Avoid card
11. Open question card
12. Copy/save card
13. Open allergy card
14. Confirm offline available label exists
```

### 17.3 Manual PWA QA

```text
- Lighthouse: no critical PWA issue
- Reload after first visit with network offline: app shell loads
- Allergy card accessible offline
- Last question card accessible offline
- Install UI does not appear on first page load
- iOS Safari layout check
- Android Chrome layout check
```

---

## 18. Phase 0 Task Breakdown for Codex

### P0-01 Bootstrap repository

Implement repo structure, workspace config, base lint/typecheck/test scripts.

Acceptance:

```text
pnpm install succeeds
pnpm typecheck succeeds
pnpm lint succeeds
```

### P0-02 Create Next.js app foundation

Implement `apps/web` with App Router, Tailwind, base layout, landing page, health route.

Acceptance:

```text
pnpm dev starts app
GET / renders landing page
GET /api/health returns status ok
```

### P0-03 Database setup

Implement Prisma schema, PostGIS migration, DB client, seed script.

Acceptance:

```text
docker compose up -d db works
pnpm db:migrate works
pnpm db:seed works
GET /api/health checks DB
```

### P0-04 Seed kit importer

Implement `scripts/import-seed.ts`.

Acceptance:

```text
pnpm seed:kit -- --kit ./osm_overpass_seed_kit works
Profiles imported: 6
Ingredients imported: > 0
Dishes imported: > 0
DishAllergenRisk generated: dishes * supported risk columns
Header-only files are skipped cleanly
```

### P0-05 Domain package

Implement types, risk engine, question card generator skeleton.

Acceptance:

```text
risk-engine unit tests pass
question-card unit tests pass
No LLM dependency exists
```

### P0-06 API skeleton

Implement:

```text
GET /api/v1/client-config
GET /api/v1/profile-templates
GET /api/v1/allergens
GET /api/v1/dishes
GET /api/v1/dishes/[dishId]
POST /api/v1/recommendations/dishes
POST /api/v1/question-cards
```

Acceptance:

```text
All routes return validated envelope responses
Bad inputs return 400 with useful error
Recommendation API returns grouped results
Question card API returns deterministic EN/VI template output
```

---

## 19. Phase 1 Task Breakdown for Codex

### P1-01 PWA web shell

Implement manifest, app layout, bottom nav, app header, offline page, service worker baseline.

Acceptance:

```text
Manifest is served
App has mobile bottom navigation
Offline fallback page exists
Install education does not block first visit
```

### P1-02 IndexedDB local storage

Implement Dexie schema and repository functions.

Acceptance:

```text
Can save/load/delete local profile
Can save/load allergy card
Can save/load last question card
Can clear all local data
```

### P1-03 Onboarding flow

Implement `/onboarding`.

Acceptance:

```text
User can create local profile without account
User must accept safety disclaimer
Profile saved to IndexedDB
Allergy card generated and saved
Redirect to /home
```

### P1-04 Allergy card

Implement `/allergy-card`.

Acceptance:

```text
Shows profile constraints EN/VI
Shows severity and cross-contact
Shows safety disclaimer
Works from IndexedDB without network
Shows last updated timestamp
```

### P1-05 Dish guide UI

Implement `/dishes` and `/dishes/[dishId]`.

Acceptance:

```text
Uses active local profile
Calls recommendation API
Displays grouped status cards
Each card has source/confidence/reason/action/last checked
No forbidden safe wording
```

### P1-06 Question card UI

Implement `/question-card`.

Acceptance:

```text
Can generate from profile
Can include selected dish context
Supports EN/VI toggle
Supports large text mode
Supports copy button
Saves last card to IndexedDB
Last saved card visible offline
```

### P1-07 Profile page

Implement `/profile`.

Acceptance:

```text
Shows active profile
Can clear local profile and offline data
Can restart onboarding
```

### P1-08 Admin CRUD

Implement minimal admin.

Acceptance:

```text
Admin login works with ADMIN_TOKEN
Dishes table + edit works
Ingredients table + edit works
Dish risk table + edit works
Validation prevents risk without reason/action
```

### P1-09 Tests and safety guard

Acceptance:

```text
pnpm test passes
pnpm lint passes
pnpm typecheck passes
pnpm copy:check passes
Playwright happy path passes
```

---

## 20. Codex Handoff Prompt

Use this prompt when asking Codex to implement:

```text
You are implementing Phase 0 and Phase 1 of SafeBite Travel from SAFE_BITE_PHASE_0_1_IMPL_SPEC.md.

Implement only the requested scope. Do not add menu scan, Google Places, map UI, payment, native app, account sync, or restaurant public search UI.

Use Next.js App Router, TypeScript, PostgreSQL, Prisma, Tailwind, Zustand, TanStack Query, Dexie, and a domain package for shared business rules.

Hard constraints:
- Never use copy implying guaranteed safety.
- Recommendation cards must always show source, confidence, reason, action, and last checked.
- User profile is local-first in Phase 1 and must not be stored in URL query params.
- Question card generation is deterministic template-based, not LLM-based.
- OSM restaurant data is discovery-only and never allergy verification.
- Unknown risk must never become Suitable.

Work in batches:
1. Bootstrap repo and web app.
2. Add DB schema, migrations, seed/import scripts.
3. Add domain risk engine and question card generator with tests.
4. Add API routes.
5. Add PWA shell, Dexie storage, onboarding, allergy card, dish guide, question card UI.
6. Add admin CRUD.
7. Add tests, copy safety check, and README.

After each batch, run typecheck, lint, tests, and fix errors before continuing.
```

---

## 21. Final Definition of Done

Phase 0 + 1 is complete when:

```text
- App runs locally with one command sequence from README.
- Seed kit imports profiles, ingredients, dishes, and generated dish risk rows.
- User can onboard without account.
- Allergy card is saved and visible offline.
- User can browse dish recommendations by profile.
- User can generate EN/VI question card.
- Last question card is visible offline.
- Admin can edit dishes, ingredients, and dish risks.
- Every risk has source/confidence/reason/action.
- No forbidden safety copy appears in codebase.
- Basic unit and E2E tests pass.
```
