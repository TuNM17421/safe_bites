# Phase 04 — Seed-kit Importer

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md` §6 (Seed Import Specification, all of 6.1–6.6), §18 P0-04 (acceptance), §5.2–5.4 (Prisma models this phase writes), §16 (copy safety guard), §17.1 (`apps/web/src/tests/unit/seed-import.test.ts`).
- Depends on: `phase-03-database-prisma-schema.md` (P0-03 — Prisma schema, PostGIS migration, `apps/web/src/lib/db.ts` client, enums). This phase cannot run until those models + client exist.
- Consumed by: `phase-05-domain-package.md` (risk engine reads `DishAllergenRisk` / `Allergen`), `phase-06-api-skeleton.md` (dishes/recommendations/allergens routes read seeded data).
- Kit files (real column sources, all read and grounded):
  - `osm_overpass_seed_kit/schemas/profiles.csv` (6 profile rows → `ProfileTemplate`)
  - `osm_overpass_seed_kit/outputs/starter_ingredients_sample.csv` (8 ingredient rows → `Ingredient`; `major_allergen_tags` feeds §6.4 allergen derivation)
  - `osm_overpass_seed_kit/outputs/starter_dishes_hanoi_sample.csv` (11 dish rows, 10 `default_*_risk` columns → `Dish` + `DishAllergenRisk`)
  - `osm_overpass_seed_kit/outputs/restaurants_osm_raw.csv` (header-only now → skip cleanly; `fetch_osm_overpass_restaurants.py` writes it as `utf-8-sig` with ODbL defaults)
  - `osm_overpass_seed_kit/schemas/{dish_ingredients,risk_rules,menu_items}_schema.csv` (schema-definition / header-only → skip cleanly)

## Overview

- **Priority:** P0 (blocks all read APIs and the risk engine — nothing renders without seeded dishes/risks).
- **Current status:** Not started.
- **Brief description:** Implement `apps/web/scripts/import-seed.ts`, runnable via `pnpm seed:kit -- --kit ./osm_overpass_seed_kit`. It parses the kit CSVs (BOM-aware), upserts `ProfileTemplate`, `Ingredient`, `Dish`, `Restaurant` by stable id, derives the canonical + pseudo `Allergen` set (§6.4), and normalizes the 10 dish `default_*_risk` columns into `DishAllergenRisk` rows with deterministic template reasons/actions (§6.5). One transaction per file, per-file `ImportRun` tracking, header-only files skipped cleanly.

## Key Insights

- **BOM is load-bearing (audit note #1).** The kit writes CSVs as `utf-8-sig`. Without BOM stripping, the first header becomes `﻿profile_id`, so required-column validation fails on the *first* file and the whole import dies. Parse with `csv-parse/sync` using `{ bom: true }` (or strip a leading `﻿`). This is the single highest-risk detail of the phase.
- **Enum reconciliation happens here, not in the schema (audit note #2).** Dish risk columns use the canonical `RiskLevel` vocab `{contains, likely_contains, possible, unlikely, unknown}` and already match — but `dish_ingredients_schema.csv` documents `likely` (not `likely_contains`). Ship one `normalizeRiskLevel()` that maps `likely → likely_contains` defensively, so future `dish_ingredients` data can't smuggle an off-vocab value. Column→allergen aliasing: `default_gluten_risk → wheat`, `default_dairy_risk → milk`.
- **Seed data violates its own enums — tolerate, don't reject (audit note #4).** `dish_cha_ca` has `dish_category=seafood`; `dish_egg_coffee` has `meal_type` including `dessert`. The Prisma schema stores `dishCategory` as `String` and `mealType` as `String[]`, so these are *valid* — the importer must NOT hard-validate category/meal_type against an enum. "Malformed required field" (fail-fast, §6.2) means only missing id / empty required text, not off-list category values.
- **Allergen coverage gap is intentional and safe (audit note #3).** Dishes expose only 10 risk columns — **no tree-nut, no soy**. §6.4 still derives `soy` + `sesame` allergen rows, so those `Allergen` rows exist but no `DishAllergenRisk` references them → the risk engine (phase 5) resolves them to `unknown`. Onboarding still offers these allergens; we never hide them. So: seed the **fixed** §6.4 allergen list (not just tags present in the CSV), else `soy`/`sesame` rows would be missing.
- **Restaurants are discovery-only.** `verification_status` stays `"unverified"`, `review_status=needs_review`, and license/attribution (`ODbL-1.0`, `attribution_required=true`) are preserved (§6.6). Restaurants are NEVER shown in Phase 1 public UX. The live file is header-only now, so the importer records a clean skip.
- **`*_schema.csv` are field-definition files, not data.** Their header is `field,type,required,description,example`. Detect by the `_schema.csv` suffix and skip cleanly (record `status=skipped`, `rowsRead=0`) — do not route them to an entity importer expecting entity columns.
- **Deterministic, no LLM (§6.5).** Reasons/actions come from a small template table keyed by `(allergen, riskLevel)`; confidence is a flat `0.70`; every generated row carries `source`, `confidence`, `reason`, `action`, `last-checked` (satisfies the standing "every risk row must carry…" rule via `sourceType`, `confidence`, `reason*`, `recommendedAction*`, `lastCheckedAt`).

## Requirements

### Functional

1. CLI entry `import-seed.ts` accepting `--kit <path>` (default `./osm_overpass_seed_kit`), invoked by `pnpm seed:kit -- --kit ./osm_overpass_seed_kit`.
2. Import, in FK-safe order: profiles → ingredients → **derive allergens** → dishes (+ dish-allergen-risks) → restaurants → skip the three `*_schema.csv`.
3. One `prisma.$transaction` per file; upsert by stable id (idempotent re-runs).
4. Validate required columns (post-BOM-strip) before importing a file; fail fast on missing required id/text fields; record the failure in `ImportRun`.
5. Derive `Allergen` rows: fixed §6.4 canonical set `{peanut, shellfish, fish, wheat, milk, egg, soy, sesame}` **plus** pseudo-allergens `{pork, beef, alcohol, high_calorie, strong_smell}`, unioned with any extra `major_allergen_tags` seen in ingredients. Each gets bilingual `nameVi/nameEn`.
6. For each dish, generate one `DishAllergenRisk` per of the 10 `default_*_risk` columns (→ 11×10 = 110 rows) with normalized `riskLevel`, `confidence=0.70`, deterministic bilingual `reason`/`recommendedAction`, `evidenceType=manual_seed`, `sourceType=manual_seed`, `reviewStatus=needs_review`. Upsert by `(dishId, allergenId)`.
7. Restaurants → `externalSource=openstreetmap`, `verificationStatus="unverified"`, preserve `dataLicense`/`attributionRequired`; if header-only, skip cleanly.
8. Print per-file row counts (read/inserted/updated/skipped) and a final summary matching the P0-04 acceptance strings.
9. Persist one `ImportRun` per processed file with counts, status, timing, and any errors.

### Non-functional

- BOM-safe (`utf-8-sig`), UTF-8 Vietnamese preserved.
- Idempotent: second run updates in place, produces no duplicates.
- Each impl file < ~200 lines (KISS) — split per-entity importers into `scripts/seed/`.
- No LLM, no network. Pure local transform + Prisma.
- No forbidden safety copy in any generated string (§16 gate must pass on generated reasons/actions).
- Decimal fields written as numbers (`confidence`, `lat`, `lon`, `discovery_confidence`) — parse CSV strings to `number` before `create` (audit note #5; response serialization is a downstream concern).

## Architecture

**System design.** A thin CLI orchestrator drives a fixed manifest of `(file, importer)`; each importer is a pure `parse → validate → map → upsert-in-transaction` unit sharing common CSV + allergen + template helpers. Business rules the risk engine also needs (the RiskLevel vocab) live in `packages/domain`; importer-only concerns (template copy, allergen seed set) live beside the script to avoid premature coupling (YAGNI/DRY balance).

```
import-seed.ts (orchestrator, arg parse, ImportRun, summary)
   └─ seed/csv.ts            parseCsv(path) → {header, rows}   [bom:true]  + requireColumns()
   └─ seed/allergens.ts      ALLERGEN_SEED (13) + deriveAllergens(ingredientTags)
   └─ seed/risk-templates.ts normalizeRiskLevel(), RISK_COLUMN_MAP, buildReasonAction()
   └─ seed/import-profiles.ts
   └─ seed/import-ingredients.ts
   └─ seed/import-dishes.ts  (dishes + DishAllergenRisk)
   └─ seed/import-restaurants.ts
uses apps/web/src/lib/db.ts (prisma client from phase 3)
```

**Component interactions.** Orchestrator opens the kit dir, resolves each file path, calls its importer inside `prisma.$transaction`, collects an `ImportRun` record, writes it, prints counts. `import-dishes.ts` depends on `Allergen` rows already existing (FK), so allergen derivation runs before it.

**Data flow (dish example).**
```
CSV row → normalize multi-value cols (split "," → string[]) → upsert Dish
        → for each RISK_COLUMN_MAP entry:
             raw = row[col]; level = normalizeRiskLevel(raw)
             {reasonEn,reasonVi,actionEn,actionVi} = buildReasonAction(allergen, level, hiddenHint)
             upsert DishAllergenRisk (dishId, allergenId) with confidence 0.70, manual_seed, needs_review, lastCheckedAt=now
```

## Related Code Files

### To create
- `apps/web/scripts/import-seed.ts` — CLI orchestrator, arg parse, manifest, `ImportRun`, summary print.
- `apps/web/scripts/seed/csv.ts` — `parseCsv()` (BOM-aware), `requireColumns()`, `splitList()`, `toNumber()`.
- `apps/web/scripts/seed/allergens.ts` — `ALLERGEN_SEED` (8 canonical + 5 pseudo, bilingual names), `deriveAllergens()`, `upsertAllergens()`.
- `apps/web/scripts/seed/risk-templates.ts` — `RISK_COLUMN_MAP` (10 col→allergen), `normalizeRiskLevel()`, `buildReasonAction()` deterministic bilingual templates.
- `apps/web/scripts/seed/import-profiles.ts` — profiles.csv → `ProfileTemplate`.
- `apps/web/scripts/seed/import-ingredients.ts` — ingredients CSV → `Ingredient`.
- `apps/web/scripts/seed/import-dishes.ts` — dishes CSV → `Dish` + `DishAllergenRisk`.
- `apps/web/scripts/seed/import-restaurants.ts` — OSM restaurants CSV (43-col schema) → `Restaurant` (`externalSource=openstreetmap`, unverified, header-only-safe). Keep it **source-specific**; the differently-shaped OpenMap restaurant CSV gets a sibling `import-openmap-restaurants.ts` in **phase-14** that reuses `seed/csv.ts` + `ImportRun` + the same discovery-only rails. Write the shared helpers (`csv.ts`, ImportRun handling) source-agnostic so phase-14 imports them unchanged (DRY).
- `apps/web/src/tests/unit/seed-import.test.ts` — unit tests (§17.1) for pure helpers.

### To modify
- `apps/web/package.json` — add `"seed:kit": "tsx scripts/import-seed.ts"`; add devDeps `csv-parse`, `tsx` (if not already added in phase 2/3).

### To delete
- None.

## Implementation Steps

1. **Add tooling.** Add `csv-parse` + `tsx` to `apps/web` devDeps and the `seed:kit` script (§4.3). Confirm root `seed:kit` already delegates via `pnpm --filter @safebite/web seed:kit`.
2. **CSV helper (`seed/csv.ts`).** `parseCsv(path)` → `csv-parse/sync` with `{ bom: true, columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }`. Add `requireColumns(header, [...])` (throws listing missing), `splitList(v)` (comma-split → trimmed non-empty `string[]`; `"" → []`), `toNumber(v)` (`""/undefined → null`).
3. **Allergen seed (`seed/allergens.ts`).** Define `ALLERGEN_SEED`: 8 canonical (`peanut, shellfish, fish, wheat, milk, egg, soy, sesame`) + 5 pseudo (`pork, beef, alcohol, high_calorie, strong_smell`) each `{id, nameVi, nameEn}`. `deriveAllergens(tags)` = union of seed ids with any extra ingredient tags (extra tags get a fallback title-cased name). `upsertAllergens()` upserts all in one transaction. Run **after** ingredients, **before** dishes.
4. **Risk templates (`seed/risk-templates.ts`).** `RISK_COLUMN_MAP` = the 10 §6.5 pairs (`default_gluten_risk→wheat`, `default_dairy_risk→milk`, etc.). `normalizeRiskLevel(raw)` maps to `RiskLevel` enum (`likely→likely_contains`, unknown/blank/off-vocab → `unknown`). `buildReasonAction(allergenNameEn/Vi, level, hiddenHintEn/Vi)` returns 4 strings from a per-level template — honest `unknown` copy, no forbidden phrases, no `Suitable` label (that's the engine's job). Illustrative:
   ```ts
   // level 'contains'
   reasonEn: `This dish typically contains ${allergenEn}.`
   actionEn: `Ask staff for a version without ${allergenEn}, or choose another dish.`
   // level 'unknown'
   reasonEn: `We do not have reliable data on ${allergenEn} for this dish.`
   actionEn: `Treat as unknown and ask staff directly before ordering.`
   ```
5. **Profiles importer.** Require `profile_id, profile_name_vi, profile_name_en, profile_type, strictness_default`. Map to `ProfileTemplate` (upsert by `id`). Expect 6 rows (§6.3).
6. **Ingredients importer.** Require `ingredient_id, canonical_name_vi, canonical_name_en, ingredient_category`. `splitList()` for `aliases_*`, `major_allergen_tags`, `dietary_flags`. Upsert `Ingredient`. Return the union of all `major_allergen_tags` for step 3.
7. **Dishes importer.** Require `dish_id, canonical_name_vi, canonical_name_en, dish_category, cuisine`. `splitList()` for `aliases_*`, `region_tags`, `meal_type`, `picky_eater_flags`. **Do not** validate `dish_category`/`meal_type` values (tolerate `seafood`/`dessert`). Upsert `Dish`. Then for each `RISK_COLUMN_MAP` entry build + upsert a `DishAllergenRisk` by `(dishId, allergenId)`; hidden-ingredient hint = first token of `possible_hidden_ingredients_en/vi` when present.
8. **Restaurants importer (OSM-shaped).** If no data rows → skip cleanly (`status=skipped`). Else require `restaurant_id, canonical_name, city`; map `external_source→SourceType.openstreetmap`; force `verificationStatus="unverified"`; `toNumber()` for `lat/lon/discovery_confidence`; preserve `data_license`, `attribution_required` (`"true"→true`); parse `raw_tags_json` to JSON if present; upsert `Restaurant`. This importer only handles the OSM 43-col schema; the OpenMap CSV (different columns, `externalSource=openmapvn`) is intentionally **out of scope here** and handled in phase-14 — keep this file from branching on source.
9. **Orchestrator + ImportRun.** Build the ordered manifest; skip any `*_schema.csv` (suffix match) and any missing/header-only file cleanly. Wrap each importer in `prisma.$transaction`; on success/failure write one `ImportRun` (`sourceName`, `sourcePath`, `status`, `rowsRead/Inserted/Updated/Skipped`, `errors`, `startedAt/finishedAt`). Print per-file counts + the P0-04 summary lines. Non-zero exit if any file fails required-column/malformed validation.
10. **Unit tests (`seed-import.test.ts`).** Cover pure helpers: BOM strip yields clean first header; `normalizeRiskLevel('likely')==='likely_contains'` and unknown fallback; `RISK_COLUMN_MAP` has 10 entries mapping gluten→wheat, dairy→milk; `deriveAllergens` always includes soy+sesame+5 pseudo; `buildReasonAction` output contains no forbidden phrase and no `Suitable` label; `splitList('a,b')` / `splitList('')`.

## Todo List

- [ ] Add `csv-parse` + `tsx` devDeps and `seed:kit` script to `apps/web/package.json`
- [ ] Implement `seed/csv.ts` with BOM-aware parse + `requireColumns` + `splitList` + `toNumber`
- [ ] Implement `seed/allergens.ts` (13-row seed + derive + upsert)
- [ ] Implement `seed/risk-templates.ts` (column map, normalizeRiskLevel, buildReasonAction)
- [ ] Implement `seed/import-profiles.ts`
- [ ] Implement `seed/import-ingredients.ts` (returns allergen tag union)
- [ ] Implement `seed/import-dishes.ts` (Dish + 10 DishAllergenRisk per dish)
- [ ] Implement `seed/import-restaurants.ts` (unverified, header-only-safe)
- [ ] Implement `import-seed.ts` orchestrator + ImportRun + summary + schema-file skip
- [ ] Write `apps/web/src/tests/unit/seed-import.test.ts` and make it pass
- [ ] Run `pnpm seed:kit -- --kit ./osm_overpass_seed_kit`; verify acceptance counts
- [ ] Run `pnpm copy:check` — no forbidden copy in generated reasons/actions

## Success Criteria

Mirrors §18 P0-04 acceptance:

- `pnpm seed:kit -- --kit ./osm_overpass_seed_kit` runs clean (exit 0).
- **Profiles imported: 6.**
- **Ingredients imported: > 0** (8 in current sample).
- **Dishes imported: > 0** (11 in current sample).
- **DishAllergenRisk generated = dishes × supported risk columns = 11 × 10 = 110.**
- **Header-only / `*_schema.csv` files skipped cleanly** (restaurants + the 3 schema files → `status=skipped`, no error).
- Validation to run: re-run the command → counts move from inserted to updated, no duplicates (idempotent); `SELECT count(*) FROM "DishAllergenRisk"` = 110; every `Allergen` in `{peanut,shellfish,fish,wheat,milk,egg,soy,sesame,pork,beef,alcohol,high_calorie,strong_smell}` (13); each `DishAllergenRisk` has non-empty `reason_en/vi`, `recommended_action_en/vi`, `confidence=0.70`, `last_checked_at` set; one `ImportRun` row per processed file.
- `apps/web/src/tests/unit/seed-import.test.ts` passes; `pnpm copy:check` passes.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| BOM not stripped → first-file required-column validation fails (note #1) | `csv-parse` `{ bom: true }`; unit test asserts clean first header from a `utf-8-sig` fixture. |
| Seed enum violations rejected (`seafood`, `dessert`) (note #4) | Store `dish_category`/`meal_type` as `String`/`String[]`; never validate against an enum. |
| Missing `soy`/`sesame` allergen rows because no ingredient/dish carries them (note #3) | Seed the **fixed** §6.4 allergen list, not tags-present-only; test asserts both exist. |
| FK failure: `DishAllergenRisk` before `Allergen` | Manifest order enforces allergen derivation before dishes. |
| Off-vocab / blank risk value silently mis-imported | `normalizeRiskLevel` collapses unknown/blank/off-list to `unknown` (conservative, safe-by-default). |
| Forbidden safety copy leaks into generated reasons/actions | Templates reviewed against §16 denylist; `pnpm copy:check` in success criteria; no `Suitable`/`Guaranteed Safe` strings emitted here. |
| Decimal serialized as raw object downstream (note #5) | Importer writes numbers; note that API response mappers (later phase) own serialization. |
| Partial failure leaves inconsistent state | One transaction per file + `ImportRun` per file; failed file rolls back and is recorded; other files unaffected. |

## Security Considerations

- **Safety copy:** generated `reason`/`action` strings must never contain "Guaranteed Safe", "100% Safe", "Allergy-proof", "This dish is safe", "verified_safe" (§0/§16). Unknown risk stays `unknown` — never upgraded. No `RecommendationStatus.suitable` is produced here (status mapping is the risk engine's job in phase 5).
- **OSM discovery-only (§6.6):** restaurants imported with `verificationStatus="unverified"`, `reviewStatus=needs_review`; license/attribution (`ODbL-1.0`, `attribution_required`) preserved. Restaurants are NOT surfaced in any Phase 1 public UX — importer only lands rows for admin review.
- **No secrets / no network:** pure local file transform; no external calls, no credentials. `DATABASE_URL` is the only sensitive input, consumed via the phase-3 Prisma client (`src/lib/db.ts`), never logged.
- **Input trust:** kit CSVs are untrusted content — required-column validation + fail-fast on malformed required fields; `raw_tags_json` parsed defensively (skip on parse error, record in `ImportRun.errors`).
- **No auth surface:** this is a build/ops script, not an HTTP route; it is not reachable by end users.

## Next Steps

- **Unblocks:** `phase-05-domain-package.md` (risk engine now has real `Dish`/`DishAllergenRisk`/`Allergen` data to resolve against, including the `unknown` soy/sesame gap) and `phase-06-api-skeleton.md` (`GET /api/v1/dishes`, `/recommendations/dishes`, `/allergens`, `/profile-templates` return seeded rows).
- **Dependency reminder:** requires phase-03 Prisma models + `src/lib/db.ts` and a migrated DB (`pnpm db:migrate`) before it will run.
- **Follow-up (later phases, not now):** when real `dish_ingredients` / `menu_items` / `risk_rules` data files (non-`_schema`) appear, extend the manifest with those importers reusing `seed/csv.ts` + `normalizeRiskLevel` (the `likely→likely_contains` path already exists for `dish_ingredients`).
- **Phase 14 (OpenMap restaurant discovery) reuses this phase's plumbing:** `import-openmap-restaurants.ts` imports `seed/csv.ts` (BOM-aware), the `ImportRun` writer, and the discovery-only rails from here — it only adds an OpenMap→`Restaurant` field mapping (`externalSource=openmapvn`, `externalId=sid`) and a cross-source de-dup step. Nothing in this phase changes; phase-14 is purely additive.
