# Phase 03 — Database, Prisma Schema & Migrations

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §5 Database Schema (5.1 enums, 5.2 core models, 5.3 restaurant models, 5.4 ImportRun)
  - §6 Seed Import Specification (6.1 input files, 6.3–6.6 mapping — consumed by Phase 4, referenced here for the allergen-set contract)
  - §4 Environment & Commands (`.env.example`, `docker-compose.yml`, root scripts)
  - §18 P0-03 Database setup (acceptance block, lines 1679–1690)
  - §0/§13/§16 Safety constraints (forbidden copy, allowed status labels)
- Related phase files:
  - `phase-01-monorepo-and-app-foundation.md` (dependency: provides `apps/web`, root scripts, `.env.example`, `docker-compose.yml`, `/api/health` stub)
  - `phase-04-seed-kit-importer.md` (consumer: populates Ingredient/Dish/DishAllergenRisk/ProfileTemplate/Restaurant; reconciles the allergen catalog seeded here)
  - `phase-05-domain-package.md` (consumer: risk engine reads Allergen IDs; `ALLERGEN_CATALOG` re-homed to `packages/domain/src/constants.ts`)
- Kit files grounding column names:
  - `osm_overpass_seed_kit/schemas/{profiles,dishes_schema,dish_ingredients_schema,ingredients_schema,restaurants_schema,menu_items_schema,risk_rules_schema}.csv`
  - `osm_overpass_seed_kit/outputs/{starter_dishes_hanoi_sample,starter_ingredients_sample,restaurants_osm_raw}.csv`
  - `osm_overpass_seed_kit/scripts/fetch_osm_overpass_restaurants.py` (line 263: writes CSV with `encoding="utf-8-sig"` → BOM)

## Overview

- **Priority:** P0 (blocks Phase 4 importer, Phase 5 risk engine, Phase 6 API).
- **Current status:** ✅ Done — verified 2026-07-08. `pnpm db:migrate` (PostGIS + 9 tables), `pnpm db:seed` ×2 idempotent (14 allergens incl. treenut/soy), `GET /api/health` → `{status:ok, db:ok}`; typecheck + copy-check clean. Deviations: (1) **ADR-008 baked in** — datasource declares `directUrl = env("DIRECT_URL")`; `.env.example` gains `DIRECT_URL` (local = DATABASE_URL). (2) The app `.env` lives in `apps/web/.env` (where Prisma CLI + Next load it), not repo root. (3) Local-only `docker-compose.override.yml` (gitignored) publishes the DB on host **5433** because this machine already runs a host PostgreSQL 17 on 5432; committed compose stays 5432.
- **Brief description:** Author `prisma/schema.prisma` with every enum + model exactly per §5 (ProfileTemplate, Allergen, Ingredient, Dish, DishIngredient, DishAllergenRisk, Restaurant, MenuItem, ImportRun). Add a raw migration that enables PostGIS (`CREATE EXTENSION IF NOT EXISTS postgis`). Add `lib/db.ts` (Prisma singleton), a baseline `prisma/seed.ts` that seeds the canonical **Allergen catalog** (the fixed vocabulary the risk engine and every `DishAllergenRisk` FK depend on), and extend `/api/health` to verify DB connectivity. Deliver the acceptance in §18 P0-03: `docker compose up -d db` → `pnpm db:migrate` → `pnpm db:seed` → `GET /api/health` checks DB.

## Key Insights

1. **PostGIS is for Phase 2 readiness only — do NOT add a geometry column now.** §5 enables the extension, but §5.3 stores restaurant location as `lat`/`lon` `Decimal(10,7)`, not a PostGIS `geography`/`geometry` type. The migration only runs `CREATE EXTENSION IF NOT EXISTS postgis;`. The `postgis/postgis:16-3.4` image (§4.2) ships the extension, so the statement succeeds; on a plain `postgres` image it would fail.
2. **Free-form `String` columns are a deliberate tolerance mechanism (audit note #4).** §5.2 types `dishCategory`, `mealType[]`, `ingredientCategory`, `probabilityLevel`, `calorieClass`, `spicyLevel`, `menuStatus`, `verificationStatus` as `String`/`String[]` — NOT Prisma enums. This is intentional: the seed's own rows violate their documented enums (`dish_category=seafood`, `meal_type` includes `dessert` — both confirmed present in `starter_dishes_hanoi_sample.csv`). Keeping these as strings lets the Phase 4 importer accept the seed without rejecting valid rows. The **only** Prisma enums are the eight in §5.1.
3. **Enum reconciliation (audit note #2) is a Phase 4 concern, but the schema must enable it.** `dish_ingredients` uses `probability_level=likely` while dishes use `likely_contains`. Because `DishIngredient.probabilityLevel` is `String` (not `RiskLevel`), the raw value imports cleanly; normalization to the canonical `{contains, likely_contains, possible, unlikely, unknown}` vocab happens at import. Only `DishAllergenRisk.riskLevel` is the strict `RiskLevel` enum, and it is generated from dish `default_*_risk` columns that already use the canonical vocab.
4. **This phase owns the allergen-set contract (audit note #3).** The baseline `seed.ts` seeds the **full canonical Allergen catalog** as a code-owned constant, NOT derived from data. Deriving from `major_allergen_tags` (§6.4) would silently omit `treenut` (not in §6.4's derived list) and would depend on whether any seed ingredient is tagged. Seeding a fixed catalog guarantees onboarding can offer `treenut`/`soy` and render an honest **Unknown** even though no seed dish carries those risk columns. Phase 4 §6.4 then reconciles (idempotent upsert against the same IDs) — no duplicate rows, no conflict.
5. **Decimal / Json field choices matter for serialization (audit note #5).** Decimal columns: `DishIngredient.confidence`, `DishAllergenRisk.confidence`, `Restaurant.{lat,lon,discoveryConfidence}`, `MenuItem.{priceAmount,mappingConfidence}`. Json columns: `Restaurant.rawTagsJson`, `ImportRun.errors`. Prisma returns Decimals as `Decimal.js` objects — every API response mapper (Phase 6+) MUST coerce them to plain `number` (via Zod response schemas / `.toNumber()`). Flag this contract here; it is not enforced in this phase (no public routes yet) but the schema is where the choice originates.
6. **BOM handling is a Phase 4 concern, not this phase (audit note #1).** The OSM fetch script writes `restaurants_osm_raw.csv` as `utf-8-sig` (BOM). The baseline `seed.ts` in THIS phase reads **no CSV files** (it seeds a hardcoded catalog), so BOM does not affect it. Recorded here so the Phase 4 importer strips the BOM.
7. **`Suitable` never applies at the DB layer.** `RecommendationStatus` (`suitable|ask_first|risky|avoid|unknown`) is a *derived* engine output (Phase 5), not a stored column. The DB stores only `RiskLevel` facts + confidence + reason/action. No forbidden copy (§16) is introduced by schema field names.
8. **Multi-source restaurant discovery is baked in now, not migrated later (ADR-007).** A second discovery source — **OpenMap.vn** (live API key in hand; field shape verified against a live Nearby response) — will feed the SAME `Restaurant` table in phase-14. To make that a zero-migration add, this phase already (a) includes `openmapvn` in the `SourceType` enum and (b) gives `Restaurant` a generic `externalId String?` column (OpenMap's stable `sid`; also reusable by `google_places`/`foursquare` later). OSM rows leave `externalId` null (they carry `osmType`/`osmId` instead). The discovery-only rails are **source-agnostic**: every restaurant row, regardless of source, defaults `verificationStatus="unverified"` and is hidden from all Phase-1 public UX. This is the ONLY deviation from §5.1/§5.3's verbatim column list — recorded as ADR-007.
9. **Datasource is Vercel/Neon-ready now (ADR-008).** The `datasource` declares `directUrl` (Neon needs a **direct** connection for `migrate`, a **pooled** one for the app runtime). Local dev sets `DIRECT_URL = DATABASE_URL` (same Docker Postgres) so it is inert locally; production (phase-15) sets Neon's pooled/direct pair. Declaring it now avoids editing the datasource block later. `.env`/`.env.example` must include `DIRECT_URL`.

## Requirements

### Functional

- `prisma/schema.prisma` declares all eight enums from §5.1 and all nine models from §5.2–5.4 with exact `@map` column names and field types as written in the spec.
- **ADR-007 delta (the only deviation from §5 verbatim):** `SourceType` additionally includes `openmapvn`; `Restaurant` additionally has `externalId String? @map("external_id")` plus `@@index([externalSource, externalId])`. Everything else matches §5 one-for-one.
- A migration enables PostGIS via `CREATE EXTENSION IF NOT EXISTS postgis;` and runs before/at table creation.
- `pnpm db:migrate` applies the schema to a fresh `postgis/postgis:16-3.4` database with no errors.
- `lib/db.ts` exports a singleton `PrismaClient` safe for Next.js dev hot-reload (no connection-pool exhaustion).
- `prisma/seed.ts` idempotently upserts the canonical Allergen catalog (14 rows: 9 allergens + 5 pseudo-allergen constraints) with bilingual `nameVi`/`nameEn`.
- `pnpm db:seed` runs `seed.ts` successfully and is re-runnable (upsert, no duplicate-key errors).
- `GET /api/health` returns `{ status: "ok", db: "ok" }` when the DB is reachable and a non-`ok` db field (with a 503 or explicit `db:"down"`) when it is not.

### Non-functional

- `schema.prisma` is the single source of truth for table structure; no hand-written table DDL except the PostGIS `CREATE EXTENSION` line.
- `seed.ts` < ~120 lines; `lib/db.ts` < ~20 lines (KISS).
- Allergen catalog defined once (DRY) — inline in `seed.ts` for this phase, flagged for extraction to `packages/domain/src/constants.ts` in Phase 5.
- `pnpm typecheck` and `pnpm copy:check` pass over all new/modified files (no forbidden §16 phrases).
- Decimal precision matches §5 exactly: `(3,2)` for confidences, `(10,7)` for lat/lon, `(12,2)` for price.

## Architecture

**System design.** Prisma is the schema authority. One `datasource db` (PostgreSQL) + one `generator client`. The PostGIS extension is enabled by a raw SQL statement prepended to the initial migration (Prisma migrations are ordered by timestamp folder name; putting the `CREATE EXTENSION` as the first statement of the `init` migration guarantees it runs before any table that might later use spatial types in Phase 2).

**Component interactions.**
```
docker compose (postgis/postgis:16-3.4)  ──DATABASE_URL──►  Prisma migrate/generate
                                                                     │
                        @prisma/client  ◄── generate ──────────────┘
                                │
        lib/db.ts (singleton) ──┼──► seed.ts        (baseline: Allergen catalog)
                                └──► /api/health     (SELECT 1 connectivity check)
                                └──► (Phase 4 importer, Phase 6 API — downstream)
```

**Data flow (this phase).** `seed.ts` → `prisma.allergen.upsert(...)` × 14 → Allergen table populated. `/api/health` → `prisma.$queryRaw` SELECT 1 → returns db status. Everything else (Ingredient/Dish/Restaurant rows) is populated by Phase 4.

**Allergen catalog contract (seeded here, consumed by Phases 4 & 5).**

| allergenId | nameEn | nameVi | kind | Dish risk column (§6.5) |
|---|---|---|---|---|
| `peanut` | Peanut | Đậu phộng | allergen | `default_peanut_risk` |
| `treenut` | Tree nut | Hạt cây | allergen | *(none — resolves Unknown; note #3)* |
| `shellfish` | Shellfish | Hải sản giáp xác | allergen | `default_shellfish_risk` |
| `fish` | Fish | Cá | allergen | `default_fish_risk` |
| `wheat` | Wheat (gluten) | Lúa mì (gluten) | allergen | `default_gluten_risk` |
| `milk` | Milk | Sữa | allergen | `default_dairy_risk` |
| `egg` | Egg | Trứng | allergen | `default_egg_risk` |
| `soy` | Soy | Đậu nành | allergen | *(none — resolves Unknown; note #3)* |
| `sesame` | Sesame | Vừng (mè) | allergen | `default_sesame_risk` |
| `pork` | Pork | Thịt heo | constraint | `default_pork_risk` |
| `beef` | Beef | Thịt bò | constraint | `default_beef_risk` |
| `alcohol` | Alcohol | Rượu/cồn | constraint | `default_alcohol_risk` |
| `high_calorie` | High calorie | Nhiều calo | constraint | *(dietary flag; not a dish risk column)* |
| `strong_smell` | Strong smell | Mùi mạnh | constraint | *(picky-eater flag; not a dish risk column)* |

> The 10 mapped columns match §6.5 exactly. `treenut`, `soy`, `high_calorie`, `strong_smell` have no dish `default_*_risk` column, so a query for those allergens yields no fact → the risk engine's conservative default returns **Unknown** (never Suitable). This is the safe-by-default behaviour required by §0/§16 and audit note #3.

## Related Code Files

### To create
- `apps/web/prisma/schema.prisma` — datasource, generator, 8 enums, 9 models (§5).
- `apps/web/prisma/migrations/<timestamp>_init/migration.sql` — Prisma-generated table DDL, hand-edited to prepend `CREATE EXTENSION IF NOT EXISTS postgis;`.
- `apps/web/prisma/migrations/migration_lock.toml` — auto-generated (`provider = "postgresql"`).
- `apps/web/src/lib/db.ts` — Prisma singleton.
- `apps/web/prisma/seed.ts` — baseline Allergen-catalog seed (idempotent).

### To modify
- `apps/web/src/app/api/health/route.ts` — add DB connectivity check (created as a stub in Phase 1/2).
- `apps/web/package.json` — add `@prisma/client` dep; `prisma` + `tsx` devDeps; `"prisma": { "seed": "tsx prisma/seed.ts" }`; ensure `prisma generate` runs on `postinstall`/`build`; add `"prisma": ...` and `db:*` filter targets if not already present.

### To delete
- None.

*(Root `package.json` `db:migrate`/`db:seed`, `.env.example` `DATABASE_URL`, and `docker-compose.yml` `db` service already exist from Phase 1 per §4 — verify, do not recreate. **Add `DIRECT_URL` to `.env`/`.env.example`** (= `DATABASE_URL` locally) for the ADR-008 `directUrl` datasource.)*

## Implementation Steps

1. **Confirm Phase 1 prerequisites.** Verify `apps/web` exists, `DATABASE_URL` is in `.env`/`.env.example` (§4.1), `docker-compose.yml` has the `postgis/postgis:16-3.4` `db` service (§4.2), and root scripts `db:migrate`/`db:seed`/`copy:check` are wired (§4.3). Start the DB: `docker compose up -d db`.
2. **Add Prisma deps to `apps/web/package.json`.** `@prisma/client` (dependency), `prisma` + `tsx` (devDependencies). Add `"prisma": { "seed": "tsx prisma/seed.ts" }`. Ensure `postinstall`/`build` runs `prisma generate`.
3. **Write `prisma/schema.prisma` datasource + generator.** Declare `directUrl` for serverless/Neon migrations (ADR-008); local dev sets `DIRECT_URL = DATABASE_URL` (same Docker), so it is inert and zero-cost locally.
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")   // pooled at prod (Neon PgBouncer)
     directUrl = env("DIRECT_URL")     // direct at prod (migrations); = DATABASE_URL locally
   }
   generator client { provider = "prisma-client-js" }
   ```
4. **Add the 8 enums verbatim from §5.1:** `LanguageCode`, `ReviewStatus`, `RiskLevel`, `RecommendationStatus`, `EvidenceType`, `SourceType`, `ProfileType`, `Strictness`. **One addition (ADR-007):** append `openmapvn` as a `SourceType` value (the second restaurant-discovery source, wired in phase-14) — the sole deviation from §5.1's list.
5. **Add the core models from §5.2** — `ProfileTemplate`, `Allergen`, `Ingredient`, `Dish`, `DishIngredient` (composite `@@id([dishId, ingredientId, ingredientRole])`), `DishAllergenRisk` (`@@unique([dishId, allergenId])`, `@@index([allergenId, riskLevel])`) — with exact `@map` names, `@db.Text`, `String[] @default([])`, and `Decimal @db.Decimal(3,2)` fields. Keep `probabilityLevel`, `dishCategory`, `mealType[]`, `ingredientCategory` as `String`/`String[]` (Key Insight 2).
6. **Add the restaurant models from §5.3** — `Restaurant` (with `rawTagsJson Json?`, `lat/lon Decimal(10,7)`, `verificationStatus String @default("unverified")`) and `MenuItem` (`priceAmount Decimal(12,2)`, `observedAt DateTime`). These are Phase-0 discovery tables only — never surfaced in Phase 1 public UX. **ADR-007 add:** give `Restaurant` a generic `externalId String? @map("external_id")` (non-OSM sources' stable id — OpenMap `sid`) and `@@index([externalSource, externalId])` for source-scoped upsert/de-dup lookups. OSM rows leave it null; do **NOT** make it `@@unique` (multiple OSM rows share `null`; app-level de-dup handles cross-source matches in phase-14).
7. **Add `ImportRun` from §5.4** — `errors Json?`, `startedAt`/`finishedAt` timestamps.
8. **Generate the migration without applying:** `pnpm --filter @safebite/web prisma migrate dev --name init --create-only`. Open the generated `migration.sql` and prepend as the very first line:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
   *(Alternative: enable Prisma's `postgresqlExtensions` preview feature and declare `extensions = [postgis]` in the datasource — rejected for KISS; the raw prepend is simpler and matches §5's explicit SQL.)*
9. **Apply the migration:** `pnpm db:migrate`. Confirm all nine tables + the extension are created against the running PostGIS container.
10. **Write `lib/db.ts` singleton.**
    ```ts
    import { PrismaClient } from "@prisma/client";
    const g = globalThis as unknown as { prisma?: PrismaClient };
    export const prisma = g.prisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== "production") g.prisma = prisma;
    ```
11. **Write `prisma/seed.ts`** — define `ALLERGEN_CATALOG` (the 14 rows from the Architecture table) and loop `prisma.allergen.upsert({ where:{id}, update:{...}, create:{...} })`. No reason/action copy → no §16 risk. Log a one-line summary (`Allergens seeded: 14`). Keep < ~120 lines.
12. **Extend `/api/health/route.ts`** — run `await prisma.$queryRaw\`SELECT 1\`` inside try/catch; return `{ status:"ok", db:"ok" }` on success, `{ status:"degraded", db:"down" }` (HTTP 503) on failure. Do not leak the DB error string to the client (log server-side only).
13. **Validate the acceptance chain:** `docker compose up -d db` → `pnpm db:migrate` → `pnpm db:seed` (twice, to prove idempotency) → `pnpm dev` → `GET /api/health` returns `db:"ok"`.
14. **Run gates:** `pnpm typecheck` and `pnpm copy:check` (assert-no-unsafe-copy) over the new files.

## Todo List

- [x] Verify Phase 1 prerequisites; `docker compose up -d db`
- [x] Add `@prisma/client`, `prisma`, `tsx` and `prisma.seed` config to `apps/web/package.json`
- [x] Write `schema.prisma` datasource + generator
- [x] Add all 8 enums from §5.1 verbatim
- [x] Add core models §5.2 (ProfileTemplate, Allergen, Ingredient, Dish, DishIngredient, DishAllergenRisk)
- [x] Add restaurant models §5.3 (Restaurant, MenuItem)
- [x] Add ImportRun §5.4
- [x] `migrate dev --create-only`; prepend `CREATE EXTENSION IF NOT EXISTS postgis;`
- [x] Apply migration (`pnpm db:migrate`) against PostGIS container
- [x] Write `lib/db.ts` singleton
- [x] Write baseline `seed.ts` with the 14-row Allergen catalog (idempotent upsert)
- [x] Extend `/api/health` with `SELECT 1` DB check
- [x] Run full acceptance chain (migrate → seed ×2 → health)
- [x] Pass `pnpm typecheck` and `pnpm copy:check`

## Success Criteria

**Definition of done** — mirrors §18 P0-03 acceptance:
```text
docker compose up -d db          works
pnpm db:migrate                  works (PostGIS extension + 9 tables created)
pnpm db:seed                     works (14 allergens; re-runnable/idempotent)
GET /api/health                  returns status ok AND db ok
```
**Additional validation:**
- `pnpm typecheck` passes; generated `@prisma/client` types resolve in `lib/db.ts`.
- `pnpm copy:check` finds zero forbidden §16 phrases in new files.
- Re-running `pnpm db:seed` produces no duplicate-key error (upsert proven).
- `schema.prisma` field/`@map`/`@db` declarations match §5 one-for-one (spot-check `DishAllergenRisk` `@@unique`/`@@index`, all `Decimal` precisions, all `Json?` fields), **plus the ADR-007 delta**: `SourceType` contains `openmapvn`, and `Restaurant.externalId` + `@@index([externalSource, externalId])` exist.
- Querying `SELECT COUNT(*) FROM "Allergen"` returns 14; `treenut` and `soy` rows exist despite no seed dish carrying their risk (note #3).

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| `CREATE EXTENSION postgis` fails on non-PostGIS image | `db:migrate` errors | Pin `postgis/postgis:16-3.4` (§4.2); `IF NOT EXISTS` makes re-runs safe. Document that a plain `postgres` image is unsupported. |
| Prisma spawns a new client per hot-reload → connection exhaustion in dev | Dev instability | `globalThis` singleton in `lib/db.ts` (Step 10). |
| Baseline seed and Phase 4 §6.4 both write Allergen → divergence/duplicates | Data drift, FK confusion | Single `ALLERGEN_CATALOG` source (extracted to `constants.ts` in Phase 5); both paths use idempotent `upsert` on the same IDs. Documented seam in Next Steps. |
| Seed's enum-violating rows (`seafood`, `dessert`) rejected at import | Phase 4 import fails | Schema types these columns as `String` (Key Insight 2) — no enum constraint to violate. |
| Decimal returned as `Decimal.js` object leaks into JSON responses | Malformed API payloads (audit note #5) | Not triggered this phase (no public routes); contract documented for Phase 6 response mappers. |
| `--create-only` migration edited incorrectly (extension line misplaced) | Migration order/table failure | Prepend as the literal first statement; verify with a fresh `docker compose down -v && up -d db` + `db:migrate`. |

## Security Considerations

- **Safety copy (§16):** Schema field names and the Allergen catalog introduce no forbidden phrases ("Guaranteed Safe", "100% Safe", "verified_safe", etc.). `RecommendationStatus.suitable` is an enum *value* for a derived engine output, never rendered as literal copy here; the "Suitable" caveat is a Phase 5/UI concern. `copy:check` gate enforced (Step 14).
- **Unknown-safety invariant (§0/§13):** The schema encodes only `RiskLevel` facts; there is no path by which a missing/`unknown` fact becomes `suitable`. Allergens with no dish risk column (`treenut`, `soy`) intentionally resolve to Unknown downstream — never hidden, never upgraded.
- **OSM discovery-only (§5.3/§6.6):** `Restaurant.verificationStatus` defaults to `"unverified"`; `externalSource`/`sourceUrl`/`dataLicense`/`attributionRequired`/`rawTagsJson` preserve provenance and license for audit. No public Phase 1 UX reads these tables. This phase only creates the tables — it does not expose them.
- **Secrets/data protection:** `DATABASE_URL` stays in `.env` (git-ignored); only `.env.example` with the placeholder credential is committed. `/api/health` must not echo DB error details or the connection string to clients (log server-side only). No `ADMIN_TOKEN`/auth surface is introduced in this phase.

## Next Steps

- **Unblocks Phase 4 (seed-kit importer):** tables + the canonical Allergen catalog now exist, so the importer can upsert Ingredient/Dish/DishAllergenRisk/ProfileTemplate/Restaurant and reconcile allergens idempotently. Phase 4 must: strip the UTF-8 BOM (note #1), normalize `likely`→`likely_contains` (note #2), and tolerate `seafood`/`dessert` (note #4).
- **Unblocks Phase 5 (domain package):** extract `ALLERGEN_CATALOG` from `seed.ts` into `packages/domain/src/constants.ts` as the single source of truth; the risk engine reads these allergen IDs. `seed.ts` and the Phase 4 importer then both import that constant (DRY).
- **Unblocks Phase 6 (API skeleton):** `/api/v1/allergens` can list the seeded catalog; response mappers must coerce `Decimal`→`number` (note #5) via Zod response schemas.
- **Unblocks Phase 14 (OpenMap restaurant discovery):** the `openmapvn` `SourceType` value + `Restaurant.externalId` column mean the phase-14 importer lands OpenMap rows with **no further migration**. Restaurants stay `verificationStatus="unverified"` and hidden from Phase-1 UX regardless of source.
- **Dependencies satisfied:** requires only Phase 1 (monorepo + app foundation providing `apps/web`, root scripts, `.env`, `docker-compose.yml`, `/api/health` stub).
