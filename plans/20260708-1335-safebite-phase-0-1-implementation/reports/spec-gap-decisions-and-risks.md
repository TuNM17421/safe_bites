# Spec Gap, Decisions & Risks — SafeBite Travel (Phase 0/1)

Companion report to the phase plan in `plans/20260708-1335-safebite-phase-0-1-implementation/`.
Sources read: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md` (cited as §N) and `osm_overpass_seed_kit/` (README, `schemas/*.csv`, `outputs/*.csv`, `scripts/fetch_osm_overpass_restaurants.py`). ADR-007 additionally analyzed `openmap_seed_kit/` (all CSVs + `fetch_openmap_restaurants.py`) against a **live OpenMap.vn Nearby API probe**.

All kit claims below were verified against the actual files (byte-level BOM check, CSV header/enum inspection), not assumed from the audit note.

---

## Architecture Decisions (ADR-style)

### ADR-001 — i18n via next-intl (override of §2/§14), with data-vs-chrome split
- **Context.** §2 and §14 specify a "simple dictionary-based EN/VI module" (`packages/domain/src/copy.ts`). The product is bilingual at two very different layers: (a) *static UI chrome* (buttons, nav, disclaimers) and (b) *domain data* (dish names, risk reasons, recommended actions, question-card text) that arrives from the DB/domain as `Record<'en'|'vi', string>` (see `DishRiskFact.reason`, `DishRecommendationCard.name/reason/action` in §7). A flat dictionary conflates these.
- **Decision.** Adopt **next-intl** for chrome only: `useTranslations()` for static strings, messages in `apps/web/messages/{en,vi}.json`, locale routing `/en` `/vi`, and navigation via `@/i18n/navigation` (**not** `next/link`). The §14 `copy.ts` safety strings (`safetyDisclaimer`, `offlineNotice`, `suitableCaveat`, `statuses.*`) become next-intl message keys. **Bilingual domain data stays data-driven** as `Record<'en'|'vi', string>` from Prisma/domain — next-intl never touches it. Question-card `targetLanguage` is **independent** of the UI locale (a user browsing in EN can generate a VI card, per §9.6).
- **Consequences.**
  - URL now carries a *locale* segment (`/vi/onboarding`). This does **not** violate the §12.2 rule "profile data is not placed in query string" — locale is UI chrome, not profile. The profile remains local-first (IndexedDB), never in the URL. Confirm PO is comfortable with localized, shareable URLs (SEO/deep-link upside) vs a single-URL app.
  - `middleware.ts` (already in §3 structure) hosts the next-intl locale middleware; it must coexist with any future admin gate.
  - A CI check should assert domain reasons/actions are never routed through `useTranslations` (they would silently drop the non-active language).
  - Slightly heavier than a dict, but removes a whole class of "hard-coded English leaked into JSX" bugs and gives pluralization/ICU for free.

### ADR-002 — Build the monorepo in place at repo root `safe_bites/`
- **Context.** §3 draws the tree under a `safe-bite-travel/` root. The real repo is `safe_bites/` and already contains `osm_overpass_seed_kit/` and `docs/`.
- **Decision.** Build `apps/web` + `packages/domain` **alongside** the existing `osm_overpass_seed_kit/` and `docs/` at the repo root (pnpm workspaces). The seed command path is `./osm_overpass_seed_kit` (matches §4.3 / §6 and the actual directory).
- **Consequences.** `pnpm-workspace.yaml` globs `apps/*` and `packages/*`; the kit is a sibling data source, not a workspace package. `.gitignore` must cover `apps/web/.next`, `node_modules`, `.env`. The §3 path `safe-bite-travel/...` is treated as illustrative; every phase file uses real `safe_bites/`-relative paths.

### ADR-003 — Test stack: Vitest (unit) + Playwright (e2e)
- **Context.** §17.2 mandates Playwright for e2e. §17.1 lists four unit-test files but does not name a runner. Root scripts use `pnpm -r test` (§4.3).
- **Decision.** **Vitest** for unit tests (`packages/domain/tests/*`, `apps/web/src/tests/unit/*`), **Playwright** for the §17.2 happy path. Vitest chosen for native ESM/TS, Next 15/React 19 compatibility, and fast watch.
- **Consequences.** Each workspace exposes a `test` script so `pnpm -r test` fans out. Playwright lives only in `apps/web`. Domain tests run without a browser/DB (pure functions), keeping the risk-engine suite fast and deterministic (§8.5).

### ADR-004 — Service worker via Serwist
- **Context.** §11.2 permits "Serwist, Workbox, or a minimal custom service worker" with a per-resource cache table.
- **Decision.** **Serwist** (the maintained Workbox successor with first-class Next App Router support). Implements: app shell = cache-first; HTML nav = network-first → `/offline`; public config/templates/dishes = network-first short cache; recommendation API = **not** blindly cached (user opts in by saving to IndexedDB); private profile = IndexedDB only.
- **Consequences.** Avoids hand-rolling cache invalidation. `apps/web/src/lib/service-worker.ts` + a Serwist build step. Recommendation responses must be excluded from runtime caching to prevent stale allergy verdicts silently surviving offline (safety-relevant).

### ADR-005 — Admin auth: ADMIN_TOKEN via httpOnly cookie `sbt_admin`
- **Context.** §2/§9.7 — no user accounts in Phase 1; admin gated by env token.
- **Decision.** `POST /api/v1/admin/login { token }` compares to `ADMIN_TOKEN`; on match sets httpOnly, `SameSite=Lax`, `Secure` (prod) cookie `sbt_admin`. All `/admin/*` pages and `/api/v1/admin/*` routes require it (checked in `apps/web/src/lib/admin-auth.ts`, enforced in `middleware.ts` + route handlers).
- **Consequences.** No token in `localStorage` (§10.1 forbids it). Constant-time compare to avoid timing oracle. Single shared secret = no per-user audit; acceptable for a seed-admin console. Default `change-me-in-dev` (§4.1) must be overridden in any deployed env (see open questions).

### ADR-006 — Serialize Prisma `Decimal` → plain `number` at the API boundary
- **Context.** §5 stores `confidence Decimal(3,2)`, `lat/lon Decimal(10,7)`, `priceAmount Decimal(12,2)`, `mappingConfidence`, `discoveryConfidence` as Prisma `Decimal`. Raw `Decimal` objects are not JSON numbers and break `JSON.stringify`/client math (cross-cutting note 5).
- **Decision.** Every API route shapes its response through a Zod response mapper that converts `Decimal → Number(...)`. Domain types already declare `confidence: number` (§7), so the boundary is the single conversion point. The engine's `confidence` bucket (§8.4: ≥0.80 high / ≥0.55 medium / <0.55 low) reads the numeric value.
- **Consequences.** No `Decimal` ever reaches the client or Dexie. Response Zod schemas double as the serialization contract and the §9 envelope validation. One shared `toNumber()` helper (DRY) avoids per-route drift.

### ADR-007 — Multi-source restaurant discovery (OpenMap.vn alongside OSM), additive/opt-in
- **Context.** §5.1 `SourceType` and §5.3 `Restaurant` were modeled from `osm_overpass_seed_kit` (OSM-shaped: `osm_type/osm_id`, `raw_tags_json`, ODbL). The team now holds a live **OpenMap.vn** API key — a higher-quality, current Vietnam POI source (clean `region/county/locality` admin hierarchy, richer multi-value `category[]`, discrete `housenumber/street`) whose field shape was **verified against a live Nearby response**, not docs. `openmap_seed_kit` ships a differently-shaped restaurant CSV + a fetch script; its content tables (dishes/ingredients/risk_rules/dietary_profiles) are a smaller, schema-**incompatible** copy of the OSM canonical content and are **not** adopted: OpenMap dishes lack the `default_*_risk` grid the engine needs; its `dietary_profiles` lack `strictness_default`/`name_vi|en` and use a `flexible` strictness outside the `Strictness` enum; its `risk_rules` reference non-existent profiles (`profile_gluten_wheat`, `profile_egg_milk_allergy`) and contradict G7's runtime-computation decision.
- **Decision.** Treat the two kits as **different layers, not competitors**: **OSM = canonical content + free discovery; OpenMap = a second restaurant-discovery source.** Both feed the SAME `Restaurant` table, discriminated by `externalSource`. Bake the zero-cost schema hooks into **phase-03 now** (add `openmapvn` to `SourceType`; add a generic `Restaurant.externalId` for OpenMap's stable `sid`, reusable by `google_places`/`foursquare` later; `@@index([externalSource, externalId])`). The OpenMap importer is a separate **opt-in** `pnpm seed:openmap` (**phase-14**), reusing phase-04's `seed/csv.ts` + `ImportRun` + the source-agnostic discovery-only rails — **excluded** from the default `seed:kit`/CI run. **Cross-source de-dup is deferred to Phase 2** (import both tagged for now).
- **Consequences.**
  - Only Phase-01 is built, so this is a plan-time change with **zero code rework** — the schema is authored right once, no later migration.
  - Combining two discovery sources improves **coverage + POI/address metadata**, **NOT allergy safety** — both are discovery-only. The allergy-trust layer stays OSM canonical dishes + the risk engine.
  - Restaurants remain `verificationStatus="unverified"` and **hidden in all Phase-1 UX** regardless of source (§1.3). OpenMap's `phone/website` are sparse from Nearby → contact enrichment via the Place Detail API is a Phase-2 follow-up.
  - Introduces **R14** (OpenMap ToS ≠ ODbL) and **R15** (cross-source duplicates).
  - `fetch_openmap_restaurants.py` + the committed `restaurants.csv` sample were corrected to the verified field shape (30-col schema; `sid`-based id; discrete `housenumber/street`; `category[]`→cuisine; km radius; multi-city-safe admin parsing).

### ADR-008 — Production hosting & cloud storage: Vercel (app) + Neon (Postgres + PostGIS)
- **Context.** Spec/plan only fixed a **local Docker Postgres for dev** (`docker-compose` `postgis/postgis:16-3.4`, volume `safebite_pg`); no production host was chosen (deployment is outside the §21 local-run DoD). A provider decision is now made. The app is Next.js App Router **server-first (RSC + `/api` routes)** → needs a Node serverless/compute host, not static hosting. The prod DB is small, read-heavy, has **no server-side PII in Phase 1** (user profile is local-first in IndexedDB), and **must support the PostGIS extension** (phase-03 migration runs `CREATE EXTENSION postgis`).
- **Decision.** **App → Vercel** (native Next.js RSC/serverless, monorepo-aware). **DB → Neon** (serverless Postgres with PostGIS, branch-per-preview). Standard Prisma-on-serverless wiring: **pooled** connection as `DATABASE_URL` (app runtime, `?sslmode=require&pgbouncer=true`) + **direct** connection as `DIRECT_URL` (migrations, `?sslmode=require`); the `datasource` declares both (baked into phase-03 now). Co-locate Vercel functions + Neon in a **Singapore region** (closest to the Hanoi pilot users). Operationalized in **phase-15** (additive, post-P0/1). Object storage (menu photos) stays deferred to Phase 2 — provider chosen then, not now (YAGNI).
- **Consequences.**
  - Zero rework: phase-03 (not yet built) authors the `datasource` with `directUrl` from the start; local dev sets `DIRECT_URL = DATABASE_URL` (same Docker) so it is inert locally, Neon sets the pooled/direct pair.
  - Neon↔Vercel native integration auto-injects env vars + spins a **DB branch per preview deployment** (isolated preview data) — recommended.
  - Serverless connection management (R16): use the **pooled** endpoint (`pgbouncer=true`); the `lib/db.ts` singleton stays (dev hot-reload) but is not the serverless-scaling mechanism.
  - Migrations run via `prisma migrate deploy` against `DIRECT_URL` (Neon supports `CREATE EXTENSION postgis`); prod is seeded once (`db:seed` allergen catalog + `seed:kit` OSM content) against `DIRECT_URL`. `seed:openmap` stays manual/optional (ADR-007).
  - No change to the Phase-1 data model or safety rails; IndexedDB/Dexie (client) and the OpenMap opt-in importer are unaffected. Strong `ADMIN_TOKEN` in prod env (ADR-005 / open-Q4).

---

## Spec ↔ Seed-kit gaps

Verified findings. The first five map to the cross-cutting audit notes; the rest surfaced while reading both artifacts together.

### G1 — UTF-8 **BOM** (utf-8-sig) is a *latent* trap (note 1)
- **Verified.** The committed `outputs/*.csv` and `schemas/*.csv` currently have **no BOM** (first bytes are ASCII). But `scripts/fetch_osm_overpass_restaurants.py:263` opens the output with `encoding="utf-8-sig"` (comment at line 261: "utf-8-sig writes a BOM so Excel on Windows detects UTF-8"). So a freshly-fetched `outputs/restaurants_osm_raw.csv` **will** carry a BOM, while today's samples do not.
- **Impact.** A non-BOM-aware parser reads the first header as `﻿restaurant_id`, so required-column validation (§6.2) fails only *after* someone runs the fetch script — tests against the committed sample would pass and mask it.
- **Plan handling.** The importer (Phase 04) always parses with a BOM-stripping reader (`csv-parse` with `bom: true`, or strip a leading `﻿`). Add a unit fixture *with* a BOM so the guard is regression-tested (§17.1 `seed-import.test.ts`).

### G2 — Enum reconciliation at import (note 2)
- **Verified.** `schemas/dish_ingredients_schema.csv` defines `probability_level` vocab as `contains/likely/possible/unlikely/unknown` (note the bare **`likely`**), whereas dishes and the canonical `RiskLevel` (§5.1/§7) use **`likely_contains`**. Dish risk columns are named by *nutrient/allergen alias*: `default_gluten_risk` and `default_dairy_risk` — but the canonical allergen ids are **`wheat`** and **`milk`** (§6.5).
- **Plan handling.** Import-time normalization map (Phase 04, per §6.5): `likely → likely_contains`; column→allergen: `gluten→wheat`, `dairy→milk`, and the remaining 8 direct mappings. Canonical `RiskLevel = {contains, likely_contains, possible, unlikely, unknown}` is the single source of truth in `packages/domain/constants.ts`.

### G3 — tree-nut / soy allergen **coverage gap** (note 3) + Allergen-seed ordering (new)
- **Verified.** The dish sample exposes exactly **10** risk columns — `default_{peanut,shellfish,fish,pork,beef,gluten,egg,dairy,sesame,alcohol}_risk`. There is **no tree-nut and no soy** risk column on any dish. Separately, `outputs/starter_ingredients_sample.csv` (8 rows) surfaces only **6** `major_allergen_tags`: `egg, fish, milk, peanut, shellfish, wheat` — **soy and sesame never appear in an ingredient tag**, even though `schemas/ingredients_schema.csv` lists them in its enum and §6.4 says "derive Allergen rows from `major_allergen_tags`".
- **Impact (two distinct problems).**
  1. *Query-time (note 3):* users can select tree-nut/soy in onboarding, but no dish carries a fact row → the engine returns **Unknown** (never Suitable, §8.2). This is safe-by-default and correct; onboarding must still list these allergens and render an honest "Unknown", never hide them.
  2. *Import-time (new, sharper):* dishes carry `default_sesame_risk`, and §6.5 maps it to `allergen_id=sesame`. If the Allergen table is seeded *only* by deriving from ingredient tags, **`sesame` (and `soy`) rows will not exist**, so the `DishAllergenRisk → Allergen` FK insert for sesame fails (or silently drops rows).
- **Plan handling.** Phase 04 seeds the Allergen table from a **canonical constant list**, not derive-only: the 8 food allergens of §6.4 (`peanut, shellfish, fish, wheat, milk, egg, soy, sesame`) **plus** the 5 pseudo-allergens (`pork, beef, alcohol, high_calorie, strong_smell`). Allergens are inserted **before** dishes/`DishAllergenRisk` (ordering constraint). Ingredient `major_allergen_tags` may *add* aliases but is not the source of the allergen set.

### G4 — Seed data violates its own schema enums (note 4)
- **Verified.** `schemas/dishes_schema.csv` declares `dish_category` enum = `noodle/rice/street_food/dessert/drink/hotpot/grill/bakery/other`, but the sample contains **`seafood`** (`dish_cha_ca`) — not in the enum. `meal_type` is documented as `breakfast/lunch/dinner/snack/drink`, but rows include **`dessert`** (and `snack`, `drink`). 
- **Plan handling.** The Prisma models store `dishCategory` and `mealType[]` as **`String`/`String[]`, not DB enums** (§5.2), so these values persist without rejection. The importer must **tolerate** them (do not fail-fast on category/meal-type). Only truly typed enums (`RiskLevel`, `SourceType`, `ReviewStatus`) are validated. Optional: a normalization pass can bucket `seafood`→`other` for UI grouping — flagged as a PO decision, not a blocker.

### G5 — Prisma `Decimal` must not leak (note 5)
- **Verified in schema.** `confidence`, `lat`, `lon`, `priceAmount`, `mappingConfidence`, `discoveryConfidence` are all `Decimal`. Domain types (§7) already expect `number`.
- **Plan handling.** ADR-006 — response mappers convert at the boundary; no `Decimal` reaches client, Dexie, or the §9 envelope.

### G6 — Restaurants are discovery-only (safety/legal, note-adjacent)
- **Verified.** README (`## Important limitations`) and §5.3/§6.6 agree: OSM is the *discovery layer, not the trust layer*. `restaurants_osm_raw.csv` is header-only today (43 columns, 0 data rows).
- **Plan handling.** Import keeps `verification_status='unverified'` and retains `data_license`/`attribution_required`/`source_url` (§6.6). **No restaurant appears in any Phase 1 public UX** (§1.3, §12.3). The 43-column CSV maps to a **subset** of the Prisma `Restaurant` model — extras (`brand, operator, takeaway, delivery, diet_*, outdoor_seating, wheelchair`) are dropped or stashed in `rawTagsJson`.

### G7 — `*_schema.csv` inputs are **data dictionaries, not data** (new, important)
- **Verified.** §6.1 lists `schemas/dish_ingredients_schema.csv`, `schemas/risk_rules_schema.csv`, `schemas/menu_items_schema.csv` as import inputs, and §6.2 says "Importer must skip **header-only** files without failing." But these files are **not header-only** — each has a header `field,type,required,description,example` followed by one descriptive row **per field** (e.g. `dish_id | string | yes | FK to dishes | dish_bun_cha`). There are no `outputs/dish_ingredients_*.csv`, `outputs/risk_rules_*.csv`, or `outputs/menu_items_*.csv` data files in the kit.
- **Impact.** A naive importer pointed at `schemas/dish_ingredients_schema.csv` will treat metadata rows as `DishIngredient` records → either required-column validation fails (the header is `field,type,...`, not `dish_id,ingredient_id,...`) or garbage rows get inserted. The "skip header-only" rule does **not** catch them because they have body rows.
- **Plan handling.** The importer detects the data-dictionary shape — header equals `field,type,required,description,example` — and **skips the file as a schema definition** (distinct from the header-only skip). Consequently, Phase 0 seeds **no `DishIngredient` rows and no pre-baked risk rules**; `DishAllergenRisk` is generated purely from the 10 dish risk columns (§6.5), and profile risk is computed at runtime by the engine (§8). There is no `RiskRule` Prisma model in §5 — consistent with runtime computation.

### G8 — DishAllergenRisk NOT-NULL bilingual fields vs deterministic derivation
- **Verified.** §5.2 makes `reasonVi/reasonEn/recommendedActionVi/recommendedActionEn` **required** (NOT NULL). §6.5 requires deriving them deterministically (template-based, "Do not use LLM").
- **Plan handling.** The Phase 04 reason/action template must always emit **non-empty EN and VI** for every risk level — **including `unknown`** (e.g. action = "ask staff") — or inserts violate NOT NULL. Template output is also subject to the forbidden-copy guard (§16).

### G9 — Repo/path naming mismatch
- **Verified.** §3 root is `safe-bite-travel/`; actual repo is `safe_bites/`. §4.3 seed command uses `./osm_overpass_seed_kit`, which matches the real directory.
- **Plan handling.** ADR-002 (build in place). All phase files use `safe_bites/`-relative paths.

---

## Open questions for the product owner

1. **Locale in URL vs single-URL app.** ADR-001 introduces `/en` `/vi` path prefixes. Acceptable (shareable, SEO), and it does not put *profile* in the URL — but confirm the PO wants localized URLs. Also: default-locale prefix strategy — always-prefixed (`/en/...`) or as-needed (bare path = default)?
2. **Allergen menu in onboarding.** §6.4's derive-list has 8 food allergens; `schemas/ingredients_schema.csv` also enumerates `tree_nut`. No dish carries tree-nut/soy risk. Should onboarding still offer **tree-nut and soy** (resolving to honest "Unknown")? Recommendation: **yes** — hiding an allergen is worse than showing Unknown. Confirm the exact selectable-allergen list.
3. **Category/meal-type normalization.** Keep non-enum seed values (`dish_category='seafood'`, `meal_type='dessert'/'snack'/'drink'`) as-is, or normalize into the documented buckets for UI grouping? Storage tolerates them (String); this is purely a UI-taxonomy call.
4. **Weak default admin token.** `ADMIN_TOKEN="change-me-in-dev"` (§4.1). `copy:check` will not flag a weak token. Confirm the deploy runbook requires overriding it and that Phase 1 needs no stronger admin auth (e.g. IP allowlist).
5. **Offline staleness UX.** `OFFLINE_CACHE_TTL_DAYS=7` and `DishRecommendationCard.stale?` (§7). When a saved card is older than TTL, does the UI **show it with a stale warning** or **hide it**? Safety-relevant; spec implies show-with-warning (§10.2 offline copy) but does not state the TTL action.
6. **Restaurant data lifecycle.** Restaurants import in Phase 0 but are invisible in Phase 1 (§1.3). Confirm no Phase 1 surface (including admin) exposes them, and that OSM attribution ("© OpenStreetMap contributors") obligation is formally deferred to Phase 2 while license metadata is retained now.
7. **`risk_rules_schema.csv` intent.** The kit ships a *schema* for pre-baked profile risk rules (`rr_bun_cha_muslim` example) but no data and §5 has no `RiskRule` model. Confirm Phase 0 computes all profile risk at runtime (engine §8) and does **not** need a persisted risk-rules table.
8. **OpenMap.vn Terms of Service (ADR-007 / R14).** Does the held API plan permit (a) persisting OpenMap POIs in our DB, (b) displaying them in-app (Phase 2), (c) caching, and (d) what exact attribution string is required? OSM is ODbL-clear for storage; OpenMap is a commercial ToS and must be confirmed **before Phase-2 restaurant surfacing**. Also confirm whether Place Detail API calls (phone/website enrichment) are in-plan/quota.

---

## Consolidated Risk Register

| # | Risk | Phase(s) | Severity | Mitigation |
|---|------|----------|----------|------------|
| R1 | **Missing Allergen rows** (`sesame`/`soy`) break `DishAllergenRisk` FK because Allergen set is derive-only (G3) | 04 (import), 03 (schema) | High | Seed canonical allergen constant list (§6.4 + pseudo-allergens) **before** dishes; unit-test that all 10 dish-risk allergen ids resolve |
| R2 | **Schema-dictionary CSVs imported as data** — garbage rows or hard import failure (G7) | 04 | High | Detect `field,type,required,description,example` header and skip as schema-def; assert `DishIngredient`/`MenuItem` seed counts = 0 in Phase 0 test |
| R3 | **BOM latent trap** — importer breaks only after a live OSM fetch (G1) | 04 | Medium-High | Always parse with BOM-aware reader; add a BOM fixture to `seed-import.test.ts` |
| R4 | **Unknown → Suitable inversion** or forbidden-copy leaks into UI/seed/tests (§0, §8.2, §16) | 05 (engine), 04 (reason templates), all UI | Critical | Engine unit test "unknown never Suitable" (§8.5); `assert-no-unsafe-copy.ts` in CI (§16); `Suitable` always renders the caveat (§13) |
| R5 | **Prisma `Decimal` leaks** into JSON/Dexie/Zod, breaking clients & response contracts (G5) | 06 (API), 08 (Dexie) | Medium | Single `toNumber()` boundary mapper (ADR-006); Zod response schemas type these as `number` |
| R6 | **Enum drift** `likely` vs `likely_contains`, `gluten/dairy` vs `wheat/milk` (G2) | 04 | Medium | Central normalization map in `constants.ts`; reject unknown risk tokens at import (fail-fast) |
| R7 | **Seed enum violations** (`seafood`, `dessert`) rejected by an over-strict importer (G4) | 04, 03 | Medium | Store category/meal-type as `String`; validate only typed enums; tolerate the seed's own values |
| R8 | **NOT-NULL bilingual reason/action** unmet for `unknown` risk rows (G8) | 04 | Medium | Template guarantees non-empty EN+VI for every risk level incl. unknown; DB-level NOT NULL as backstop |
| R9 | **Restaurant data surfaced** in Phase 1, or attribution/license metadata dropped (G6, §1.3) | 04, all UI | High (legal/safety) | `verification_status='unverified'`; no restaurant route in Phase 1; retain `data_license`/`attribution_required`/`source_url` |
| R10 | **Chrome vs data i18n confusion** — domain reason/action routed through next-intl, dropping a language (ADR-001) | 05, 06, 09–11 | Medium | Keep domain strings as `Record<'en'|'vi',string>`; next-intl only for static keys; lint/review guard |
| R11 | **Locale URL vs "no profile in URL"** misread as a spec violation (ADR-001) | 02, 07, 09 | Low | Document that locale is chrome, profile stays in IndexedDB; confirm with PO (open Q1) |
| R12 | **Admin cookie/token weaknesses** — timing oracle, weak default, non-httpOnly (ADR-005) | 06, 12 (admin) | Medium | httpOnly + SameSite + Secure(prod); constant-time compare; runbook mandates token override |
| R13 | **Empty city / no dishes** and other empty/error states unhandled (§12.4) | 10 | Low-Medium | Implement explicit empty/offline/no-profile states per §12.4 acceptance |
| R14 | **OpenMap.vn ToS ≠ ODbL** — storing/redisplaying POIs may need a specific plan/attribution (ADR-007) | 14, Phase 2 | Medium (legal) | Conservative `dataLicense="openmapvn-terms"`/`attributionRequired=true`; preserve `sourceUrl`; confirm plan before any Phase-2 display; import (private) ≠ display |
| R15 | **Cross-source duplicates** (same place from OSM + OpenMap in the shared 3 districts) (ADR-007) | 14, Phase 2 | Low (P1) | Deferred by decision; both rows tagged `externalSource`/`externalId`; Phase-2 merge = name-normalize + haversine(<~50m); harmless while restaurants hidden |
| R16 | **Serverless Prisma on Neon** — pooled-vs-direct URL mixup, connection exhaustion, PgBouncer-incompatible migrations (ADR-008) | 15, Phase 2 | Medium | `DATABASE_URL`=pooled (`pgbouncer=true`), `DIRECT_URL`=direct for `migrate`; `datasource.directUrl` declared in phase-03; run `migrate deploy` against the direct URL only; co-locate region (Singapore) |

---

## Sequencing / critical path

Phase files in this plan: 01 Bootstrap · 02 Web Foundation+Health · 03 DB/Prisma · 04 Seed Importer · 05 Domain (risk engine + question card) · 06 API · 07 PWA Shell · 08 IndexedDB/Dexie · 09 Onboarding/Profile/Allergy Card · 10 Dish Guide UI · (11 Question-Card UI · 12 Admin CRUD · 13 Tests + copy guard — being authored).

**Hard dependencies**
- **01 → everything** (workspaces, tsconfig, lint/test scripts, `copy:check` scaffolding).
- **03 → 04** (importer needs Prisma models + `db.ts`), **03 → 06** (routes query DB).
- **04 → 06** (recommendations/dishes need seeded data), **04 → 10** (dish guide shows seeded dishes).
- **05 → 06** (API calls the risk engine + question-card builder), **05 → 08** (Dexie stores domain DTO types).
- **02 → 07** (PWA shell wraps the app layout), **02 → 08**.
- **06 + 08 → 09** (onboarding calls `profile-templates`/`allergens`, writes profile+allergy card to Dexie).
- **06 → 10** (dish guide calls `POST /recommendations/dishes`), **09 → 10** (needs active local profile).
- **06 → 11** (question-cards API) and **08 → 11** (save last card). **06 → 12** (admin APIs + ADMIN_TOKEN auth).
- **all → 13** (unit + Playwright happy path + `copy:check`), but `assert-no-unsafe-copy.ts` and CI wiring should land in **01** so the guard runs from day one.

**Critical path:** `01 → 03 → 04 → 06 → 09 → 10 → 13`. **05 (domain)** is pure TypeScript (no DB/browser) and sits on the path into 06, so develop it **in parallel** with 03/04 — it only needs 01's package scaffolding.

**Safe parallelization**
- After **01**: run **02** (web foundation), **03** (DB), and **05** (domain) concurrently — disjoint file sets.
- After **02**: **07** (PWA/Serwist) and **08** (Dexie) in parallel.
- After **06 + 08**: **09**, **10**, **11** UI features in parallel, **but** they share `components/` (StatusBadge, ConfidenceBadge, SourceBadge, SafetyNotice, RecommendationCard — §13). Assign component ownership to one phase (or land the shared component kit in 07) to avoid edit collisions.
- **12 (admin)** is independent of public UI (separate `/admin` routes + admin APIs) → parallel with 09–11.

**Longest-pole watch items:** 04 (seed importer — carries R1/R2/R3/R6/R7/R8, the densest risk cluster) and 05 (engine — carries the R4 safety invariants). Both gate 06, which gates all data-driven UI. Front-load their unit tests.
