# Phase 14 — OpenMap.vn Restaurant Discovery (additive, opt-in)

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §5.3 Restaurant model (target table), §6.6 restaurant import rules (discovery-only, unverified), §1.3 (restaurant public UX deferred to Phase 2), §5.1 `SourceType`.
- Decisions/report: `reports/spec-gap-decisions-and-risks.md` — **ADR-007** (multi-source restaurant discovery), **R14** (OpenMap ToS/license), **R15** (cross-source de-dup deferred to Phase 2).
- Depends on:
  - `phase-03-database-prisma-schema-and-migrations.md` — provides `SourceType.openmapvn`, `Restaurant.externalId @map("external_id")`, and `@@index([externalSource, externalId])` (ADR-007 delta already baked in). **This phase runs no migration.**
  - `phase-04-seed-kit-importer.md` — provides reusable `scripts/seed/csv.ts` (BOM-aware `parseCsv`, `requireColumns`, `splitList`, `toNumber`), the `ImportRun` write pattern, and the **source-agnostic** discovery-only rails.
- Data source (real, verified against a live API call — not docs):
  - `openmap_seed_kit/fetch_openmap_restaurants.py` — corrected live-pull script; field names verified against a live Nearby response (Hoàn Kiếm, 2026-07). Emits the 30-column CSV this importer reads (`utf-8-sig`/BOM).
  - `openmap_seed_kit/restaurants.csv` — committed **5-row sample in the same 30-col schema** (regenerated from the live probe via the script's own row logic); doubles as the deterministic test fixture.
  - `openmap_seed_kit/sources.csv` — OpenMap Nearby + Place Detail API references.

## Overview

- **Priority:** P2 (additive; **NOT** on the Phase-0/1 critical path). Restaurants are hidden in Phase-1 UX (§1.3), so this unblocks Phase-2 restaurant features, not the Phase-0/1 DoD. Build after the Phase-0/1 sequence is green.
- **Current status:** Not started (schema hooks ready from phase-03).
- **Brief description:** Add an **opt-in** importer mapping OpenMap.vn Nearby POIs → `Restaurant` (`externalSource=openmapvn`, `externalId=sid`), runnable via `pnpm seed:openmap -- --kit ./openmap_seed_kit`. It **reuses** phase-04's `seed/csv.ts` + `ImportRun` + discovery-only rails and is **excluded** from the default `seed:kit`/CI run. OSM and OpenMap restaurants coexist in one table, tagged by source; **active OSM↔OpenMap de-dup/merge is deferred to Phase 2** (R15). Per-source in-file de-dup (by `sid`) already happens in the fetch script.

## Key Insights

1. **Zero migration — phase-03 baked the delta (ADR-007).** `SourceType.openmapvn` + `Restaurant.externalId` + the index already exist. This phase only adds a mapper + a thin orchestrator + a package script. If phase-03 shipped without the delta, STOP and fix phase-03 first (do not add a second migration here).
2. **Field shape verified against LIVE data.** The real `properties` carry discrete `housenumber`/`street` (use them, don't only split `short_address`), a multi-value `category[]` array (rich cuisine signal), a clean Vietnamese admin hierarchy (`region`/`county`/`locality` — better than OSM's sparse `addr:*`), and a stable short id `sid`. `short_address` is sometimes `""` or carries a landmark ("Silk Path Boutique Hanoi, 21 Hàng Khay") → not a clean street field.
3. **OpenMap wins on address, loses on contact.** `phone`/`website` came back **null** in the live Nearby pull (even though the old docs sample had them). Do NOT expect contact data from Nearby; enriching it needs the **Place Detail API** (2nd source in `sources.csv`) — deferred, out of scope here.
4. **Discovery-only rails are source-agnostic and MANDATORY (§6.6).** Force `verificationStatus="unverified"`, `reviewStatus=needs_review`, `menuStatus="not_observed"`. No OpenMap restaurant is surfaced in any Phase-1 UX. Same rule as OSM — the source does not change the trust posture.
5. **License is NOT ODbL — it's OpenMap.vn ToS (R14).** Unlike OSM, storing/redisplaying OpenMap POIs is governed by their commercial plan. Set conservative defaults (`attributionRequired=true`, `dataLicense="openmapvn-terms"`), preserve `sourceUrl`, and **confirm the plan permits DB storage + in-app display + caching before any Phase-2 surfacing** (open question).
6. **De-dup deferred by decision (R15).** Import both sources tagged; `upsert` by `restaurant_id` + the `@@index([externalSource, externalId])` give per-source idempotency. Both kits cover the SAME 3 districts, so cross-source duplicates WILL exist (e.g. "Poke Hanoi, 11B Hàng Khay" appears in both) — the name+geo merge is a Phase-2 job, harmless while restaurants are hidden.
7. **Cuisine signal is richer than OSM.** `category[]` (e.g. `vietnamese_restaurant, pho_restaurant, Phở, seafood_restaurant, vegetarian_restaurant`) → `cuisineRaw` (raw join) + `cuisineNormalized[]` (generic tokens dropped, `_restaurant`/`_bar` suffixes stripped). The fetch script already produces both `categories` and `cuisine_normalized` columns.

## Field Mapping — OpenMap CSV column → Prisma `Restaurant`

| CSV column (from fetch script) | → Prisma `Restaurant` | Transform / note |
|---|---|---|
| `restaurant_id` (`rest_openmap_{sid}`) | `id` | upsert key |
| `external_source` (`openmapvn`) | `externalSource` | assert `=="openmapvn"` → `SourceType.openmapvn` |
| `sid` | `externalId` | stable short id (source-scoped) |
| `external_id` (long opaque id) | `rawTagsJson.external_id` | audit only |
| `canonical_name` / `name_vi` / `name_en` | `canonicalName` / `nameVi` / `nameEn` | `name_en` usually empty |
| `housenumber` / `street` | `housenumber` / `street` | discrete fields (preferred over `short_address`) |
| `full_address` | `fullAddress` | OpenMap `label` |
| `short_address` | `rawTagsJson.short_address` | no dedicated column; covered by housenumber+street+fullAddress |
| `area` | `district` | from `county` (`"quận …"` stripped) |
| `ward` | `ward` | from `locality` (`"phường …"` stripped) |
| `city` | `city` | from `region` (`"thành phố …"`/`"tỉnh …"` stripped) |
| `country` | `country` | `"Việt Nam"` |
| `lat` / `lon` | `lat` / `lon` | `toNumber()` → `Decimal(10,7)` |
| `categories` | `cuisineRaw` | raw category join |
| `cuisine_normalized` | `cuisineNormalized[]` | `splitList()` |
| `phone` / `website` / `opening_hours` | `phone` / `website` / `openingHours` | often empty (see insight 3) |
| `zipcode` | `rawTagsJson.zipcode` | no dedicated column |
| `source_url` | `sourceUrl` | API docs URL (no per-place URL) |
| `source_observed_at` | `sourceObservedAt` | `new Date(...)` |
| `confidence_discovery` | `discoveryConfidence` | `toNumber()` → `Decimal(3,2)` |
| `data_quality_notes` | `notes` | — |
| `menu_status` (`not_observed`) | `menuStatus` | keep `"not_observed"` |
| `verification_status` | `verificationStatus` | **force `"unverified"`** (never trust the CSV value) |
| `discovery_status` | `rawTagsJson.discovery_status` | audit only |
| *(importer-set)* | `externalSource`-independent defaults | `dataLicense="openmapvn-terms"`, `attributionRequired=true`, `reviewStatus=needs_review`, `osmType`/`osmId`/`amenity`/`websiteMenu`=null |

## Requirements

### Functional

1. CLI `pnpm seed:openmap -- --kit ./openmap_seed_kit` (default file `<kit>/restaurants.csv`; `--file <csv>` overrides to import a live-pull output such as `restaurants_openmap_live.csv`).
2. Parse the 30-col CSV **BOM-aware** via `seed/csv.ts` (`utf-8-sig`). If header-only → skip cleanly (`status=skipped`, exit 0).
3. `requireColumns([restaurant_id, external_source, canonical_name, city, lat, lon])`; fail fast on a missing required column; assert `external_source=="openmapvn"` per row.
4. Map every row per the field table. **Force** `verificationStatus="unverified"`, `reviewStatus=needs_review`, `menuStatus="not_observed"`; set `dataLicense="openmapvn-terms"`, `attributionRequired=true`.
5. `toNumber()` for `lat`/`lon`/`confidence_discovery`; `splitList()` for `cuisine_normalized`; build `rawTagsJson` = `{external_id, sid, short_address, zipcode, categories, discovery_status}`.
6. Upsert by `restaurant_id` (idempotent re-runs; second run updates, no duplicates).
7. Write one `ImportRun` (sourceName `openmap`, path, counts, status, timing, errors); print `Restaurants (openmap) imported: N`.
8. **NOT wired** into `seed:kit` or the CI e2e seed step. It is a standalone, manually-invoked command.

### Non-functional

- Reuse phase-04 `seed/csv.ts` + `ImportRun` pattern (DRY); each new impl file < ~200 lines (KISS).
- BOM-safe, idempotent, **no network** (importer reads a CSV; the live pull is a separate manual step via `fetch_openmap_restaurants.py`).
- No forbidden §16 copy in any mapped/emitted string (`copy:check` clean).
- Export a **pure** `mapOpenmapRow(row) → RestaurantCreateInput` for a DB-free unit test (mirrors phase-13's pure-transform approach).

## Architecture

**System design.** A thin opt-in orchestrator drives a single `(file → importer)` step, reusing phase-04's shared CSV/ImportRun plumbing. The mapper is a pure `parse → validate → map → upsert-in-transaction` unit, structurally identical to `import-restaurants.ts` but for the OpenMap column shape. Nothing in phase-04 changes.

```
import-openmap.ts (opt-in orchestrator, arg parse, ImportRun, summary)
   └─ seed/csv.ts                    parseCsv(bom:true) + requireColumns/splitList/toNumber   [reused, phase-04]
   └─ seed/import-openmap-restaurants.ts   mapOpenmapRow() [pure] + upsert Restaurant (externalSource=openmapvn)
uses apps/web/src/lib/db.ts (prisma client from phase-03)
```

**Data flow (one row).**
```
CSV row → requireColumns + assert external_source=openmapvn
        → mapOpenmapRow(): admin/name/address direct, splitList(cuisine_normalized),
          toNumber(lat/lon/confidence), rawTagsJson stash, FORCE verification=unverified
        → prisma.restaurant.upsert({ where:{id}, create/update }) inside one $transaction
        → ImportRun row + summary line
```

## Related Code Files

### To create
- `apps/web/scripts/import-openmap.ts` — opt-in orchestrator: `--kit`/`--file` args, one transaction, `ImportRun`, summary print, header-only/ missing-file clean skip.
- `apps/web/scripts/seed/import-openmap-restaurants.ts` — exported pure `mapOpenmapRow(row)` + `upsertOpenmapRestaurants(rows)`.
- `apps/web/src/tests/unit/import-openmap.test.ts` — DB-free tests for `mapOpenmapRow` against the committed `openmap_seed_kit/restaurants.csv` fixture.

### To modify
- `apps/web/package.json` — add `"seed:openmap": "tsx scripts/import-openmap.ts"`.
- `package.json` (root) — add `"seed:openmap": "pnpm --filter @safebite/web seed:openmap"` (mirrors `seed:kit`). **Do not** add it to any default/CI chain.

### To delete
- None.

## Implementation Steps

1. **Confirm phase-03 delta exists.** `SourceType` has `openmapvn`; `Restaurant.externalId` + `@@index([externalSource, externalId])` present. If not → fix phase-03 (no migration here).
2. **Confirm phase-04 helpers are importable.** `seed/csv.ts` exports `parseCsv`/`requireColumns`/`splitList`/`toNumber`; `ImportRun` write helper reusable. If phase-04 kept them source-agnostic (it should — flagged in that phase), import as-is.
3. **`mapOpenmapRow()` (pure).** Implement per the field table. Assert `row.external_source==="openmapvn"`; force `verificationStatus="unverified"`, `reviewStatus="needs_review"`, `menuStatus="not_observed"`; `dataLicense="openmapvn-terms"`, `attributionRequired=true`; `osmType/osmId/amenity/websiteMenu=null`; `rawTagsJson={external_id,sid,short_address,zipcode,categories,discovery_status}`. Return a `Prisma.RestaurantCreateInput`.
4. **`upsertOpenmapRestaurants(rows)`.** `prisma.$transaction` of `upsert({where:{id}})`; count inserted/updated/skipped.
5. **Orchestrator `import-openmap.ts`.** Resolve `--file` (default `<kit>/restaurants.csv`); `parseCsv`; if 0 data rows → skip cleanly; else `requireColumns` → map → upsert → write `ImportRun` → print `Restaurants (openmap) imported: N`. Non-zero exit only on required-column/malformed failure.
6. **Package scripts.** Add `seed:openmap` to `apps/web` + root `package.json`. Verify it does NOT appear in `seed:kit`, `db:seed`, or `.github/workflows/ci.yml`.
7. **Unit test.** `import-openmap.test.ts`: load the committed fixture via `parseCsv`; assert (a) `mapOpenmapRow` sets `externalSource='openmapvn'`, `externalId=sid`, `verificationStatus='unverified'` regardless of CSV; (b) `district/ward/city` stripped of `quận/phường/thành phố`; (c) `cuisineNormalized` is a `string[]` with generic `restaurant` dropped; (d) `lat/lon` are `number`; (e) `rawTagsJson` carries `sid`+`external_id`; (f) no forbidden §16 phrase in any output string.
8. **Manual live validation (optional, needs API key + ToS check).** `export OPENMAP_API_KEY=…` → `python openmap_seed_kit/fetch_openmap_restaurants.py --out openmap_seed_kit/restaurants_openmap_live.csv` → `pnpm seed:openmap -- --file ./openmap_seed_kit/restaurants_openmap_live.csv` → confirm rows land `unverified`; re-run → idempotent.

## Todo List

- [ ] Verify phase-03 ADR-007 delta (enum value + `externalId` + index) exists
- [ ] Verify phase-04 `seed/csv.ts` + `ImportRun` helpers are source-agnostic/importable
- [ ] Implement pure `mapOpenmapRow()` per the field table (force discovery-only rails)
- [ ] Implement `upsertOpenmapRestaurants()` (transaction, upsert by id)
- [ ] Implement `import-openmap.ts` orchestrator (skip header-only, ImportRun, summary)
- [ ] Add `seed:openmap` to `apps/web` + root `package.json`; confirm NOT in `seed:kit`/CI
- [ ] Write `import-openmap.test.ts` (DB-free) against the committed fixture; `copy:check` clean
- [ ] (Optional) live pull + import validation with API key after ToS confirmation

## Success Criteria

- `pnpm seed:openmap -- --kit ./openmap_seed_kit` imports the 5 committed sample rows as `Restaurant` with `externalSource='openmapvn'`, `externalId=sid`, `verificationStatus='unverified'`, `reviewStatus='needs_review'`.
- Re-run → all rows move inserted→updated, **no duplicates** (idempotent); one `ImportRun` row per run.
- `seed:openmap` is absent from the default `seed:kit` chain and CI (grep the workflow + root scripts).
- `import-openmap.test.ts` passes DB-free; `pnpm copy:check` clean over new files.
- `pnpm typecheck` passes; no `Decimal` leaks (mapper writes numbers; API serialization is a Phase-2 concern when restaurants surface).
- No Phase-1 route reads `Restaurant` (unchanged from phases 03/04 — this phase adds no read path).

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| OpenMap ToS forbids storing/redisplaying POIs (R14) | Legal exposure at Phase-2 display | Conservative `dataLicense`/`attributionRequired` defaults + preserved `sourceUrl`; **confirm plan before Phase-2 surfacing**; import (private, admin-only) vs public display are separable |
| Cross-source duplicates (same place from OSM + OpenMap) (R15) | Double-listing when restaurants surface | Deferred by decision; both rows tagged by `externalSource`/`externalId`; Phase-2 merge does name-normalize + haversine(<~50m). Harmless while hidden |
| `seed:openmap` accidentally added to CI/default seed | Phase-2 concern pollutes Phase-0/1 gate; needs live data/key | Success criteria explicitly greps CI + root scripts for its absence |
| Fetch-script field drift (API changes property names) | Import maps wrong/empty columns | Field names pinned from a verified live response; script comments record the contract; unit test asserts fixture shape |
| BOM on live-pull CSV (`utf-8-sig`) breaks parse | First column `﻿restaurant_id` | Reuse phase-04 `parseCsv({bom:true})`; fixture is `utf-8-sig` so the test regression-guards it |
| Trusting CSV `verification_status` | A future CSV could smuggle `verified` | Mapper **hard-forces** `"unverified"`; never reads the CSV's value into the trust field |

## Security Considerations

- **Discovery-only, source-agnostic (§6.6):** every OpenMap row lands `verificationStatus="unverified"`, `reviewStatus=needs_review`, and is invisible to all Phase-1 public UX. No path upgrades a discovery row to verified without explicit admin action (Phase-2).
- **No secrets in repo/CI:** the API key lives only in the operator's `OPENMAP_API_KEY` env for the manual live pull; the importer consumes a committed/local CSV and never holds the key. `DATABASE_URL` via the phase-03 Prisma client, never logged.
- **License/attribution retained (R14):** `dataLicense`/`attributionRequired`/`sourceUrl` preserved for every row so a Phase-2 display can honor OpenMap's terms; import ≠ authorization to display.
- **Input trust:** CSV is untrusted — `requireColumns` + fail-fast; `external_source` asserted `=="openmapvn"`; numeric fields coerced defensively; `rawTagsJson` is inert stashed audit data.
- **Safety copy (§16):** mapper emits no risk/verdict copy (restaurants carry no allergy claims); `copy:check` covers the new files.

## Next Steps

- **Unblocks Phase 2:** restaurant public UX can now draw from two discovery sources; the merge/enrichment layer (Place Detail API for phone/website; OSM↔OpenMap de-dup) is the first Phase-2 restaurant task.
- **Open item (PO/legal):** confirm the OpenMap.vn plan permits DB storage + in-app display + caching, and the exact attribution string, before any Phase-2 surfacing (R14 / report open question).
- **Reuse note:** the same pattern (pure `map*Row` + `seed/csv.ts` + opt-in orchestrator) extends to `google_places`/`foursquare` later — the generic `externalId` column already supports them.
