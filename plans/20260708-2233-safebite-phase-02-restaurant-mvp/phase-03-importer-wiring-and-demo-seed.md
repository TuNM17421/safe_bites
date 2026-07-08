# Phase 03 — Importer wiring & demo menu seed

**Context:** Spec §10 · `apps/web/scripts/import-openmap.ts`, `scripts/seed/import-restaurants.ts`, `scripts/import-seed.ts`, `prisma/seed.ts`.

## Overview
- **Priority:** P1 (needed for demo data; not for the contract).
- **Status:** Not started.
- Imported rows already land in `Restaurant`. Confirm they surface in `/admin/restaurants` (via Phase 04/05), stay hidden publicly until `approved`, and add a **dev-only** demo menu seed so 5–10 approved restaurants have mapped menu items.

## Key insights (verified)
- `seed:kit` imports 50 OSM rows; opt-in `seed:openmap` imports 5 rows into the **same** `Restaurant` table. Both force `verificationStatus='unverified'`, `reviewStatus=needs_review`, `menuStatus='not_observed'`, and write an `ImportRun` audit row. Source metadata preserved (`dataLicense`, `attributionRequired`, `sourceUrl`, `rawTagsJson`). **No wiring change needed to importers** — they already persist correctly.
- `MenuItem` table is empty; `menu_items.csv` is header-only. So a curated demo seed is required for menu flows.

## Requirements
1. **Public visibility gate** is enforced in the public API (Phase 06), not the importer — verify importer leaves `reviewStatus=needs_review` (it does). No change.
2. **Backfill `slug`** for existing rows: add slug generation to the restaurant importers (from `canonicalName`, deduped) OR a one-off backfill in the demo seed. Keep deterministic (no random) so re-runs are idempotent.
3. **New script** `pnpm seed:restaurant-demo-menu` → `apps/web/scripts/seed/import-demo-menu.ts`:
   - Attach a small **curated** menu-item set (hand-written, conservative) to 5–10 named approved demo restaurants (approve them in the same script or reuse `approve-seed-content.ts`).
   - Map items to existing approved dish ontology via `dishId`.
   - `menuSourceType='manual_seed'`, `menuStatus='observed_not_verified'`, `parsedBy='manual'`.
   - Optionally attach a few explicit `MenuItemAllergenStatus` rows with conservative `reason_en`/`reason_vi`, `source='admin_manual'`.
   - Write an `ImportRun` row (`sourceName:'restaurant-demo-menu'`). Idempotent upsert by deterministic `menu_item_id`.
   - **Never** auto-run in production/CI; guard with an explicit flag/name and clear logging.
4. Do **not** infer allergy status from cuisine/name/website/diet tags/map category (§10.2).

## Related code files
- Create: `apps/web/scripts/seed/import-demo-menu.ts`; curated data file `apps/web/scripts/seed/data/demo-menu.ts` (or CSV).
- Modify: `apps/web/package.json` (add `seed:restaurant-demo-menu`); root `package.json` (optional passthrough); possibly `scripts/seed/import-restaurants.ts` + `import-openmap-restaurants.ts` for slug backfill.

## Implementation steps
1. Add deterministic slug helper (reuse `slugId` from admin serializers if suitable) and backfill.
2. Author curated demo menu data mapped to real seeded dish IDs (verify IDs from `starter_dishes_hanoi_sample.csv`).
3. Write the seed script with idempotent upserts + ImportRun logging.
4. Run locally after Phase 02 migration; verify menu items + allergen statuses appear for demo restaurants.

## Todo
- [ ] Slug backfill (deterministic)
- [ ] Curated demo menu dataset (conservative copy, denylist-safe)
- [ ] `seed:restaurant-demo-menu` script + ImportRun
- [ ] Approve 5–10 demo restaurants
- [ ] Verify idempotent re-run

## Success criteria
5–10 approved Hanoi restaurants each with mapped menu items (and some allergen statuses) after running the seed; re-run is idempotent; no fabricated allergy certainty; production never auto-runs it.

## Risks
- Fake menu data poisoning trust (§10 warning) → curated + conservative + clearly `manual_seed`/`observed_not_verified` only.

## Security
Demo seed is dev-only; must not ship enabled in deploy. Copy passes `copy:check`.

## Next
Feeds Phases 05 (admin verify), 06/07 (public flows), 09 (e2e needs ≥1 mapped menu item).
