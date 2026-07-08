# Phase 02 — Prisma schema & migration

**Context:** Spec §6 · `apps/web/prisma/schema.prisma`, `prisma/migrations/*`. Existing single migration `20260708084446_init`.

## Overview
- **Priority:** P0.
- **Status:** Not started.
- **Extend**, do not duplicate. `Restaurant`, `MenuItem`, `ImportRun` already exist. Add missing columns + the `MenuItemAllergenStatus` model + Phase-02 indexes via one backwards-compatible migration.

## Key insights (verified)
- `Restaurant` has most §5.3 fields already (canonical/name_vi/name_en, amenity, cuisine_raw/normalized, address parts, lat/lon `Decimal(10,7)`, phone/website/website_menu/opening_hours, source_url/source_observed_at/data_license/attribution_required, external_source `SourceType`, review_status `ReviewStatus`, verification_status/menu_status as `String` with defaults, raw_tags_json, notes). **Missing: `slug`, `brand`, `operator`.**
- `MenuItem` exists with most §5.4 fields. **Missing: `ingredient_notes`, `customization_notes`, `shared_cookware`, `shared_fryer`, `can_customize`.** `dish_id` is a nullable column with **no FK** — keep as-is (or add optional FK to `Dish` with `onDelete: SetNull`; decision below).
- `MenuItemAllergenStatus` — **does not exist**; create it.
- PostGIS extension is enabled but no geography column. **Decision: stay with `Decimal` lat/lon + Haversine** (spec §11.3 acceptable fallback; KISS for one city / 30–50 rows). Do not add geography/GiST in Phase 02.

## Requirements / schema changes
1. `Restaurant`: add `slug String? @unique @map("slug")` (nullable now, backfilled by admin/importer), `brand String?`, `operator String?`. Add indexes: `@@index([city])`, `@@index([city, district])`, `@@index([reviewStatus])`, `@@index([verificationStatus])`, `@@index([menuStatus])`. (`[externalSource, externalId]` already exists.)
2. `MenuItem`: add `ingredientNotes String? @db.Text @map("ingredient_notes")`, `customizationNotes String? @db.Text`, `sharedCookware String? @map("shared_cookware")` (default `"unknown"`), `sharedFryer String?` (default `"unknown"`), `canCustomize String?` (default `"unknown"`). Add indexes: `@@index([restaurantId])`, `@@index([dishId])`, `@@index([menuStatus])`, `@@index([menuSourceType])`, `@@index([restaurantId, menuStatus])`.
3. New model `MenuItemAllergenStatus` (§5.5/§6.5): `id`, `menuItemId` (FK → MenuItem, onDelete Cascade), `allergenId` (FK → Allergen), `riskLevel RiskLevel`, `confidence Decimal(3,2)`, `source String`, `reasonEn @db.Text`, `reasonVi String?`, `lastVerifiedAt DateTime?`, `verificationStatus String @default("observed_not_verified")`, timestamps. Constraints: `@@unique([menuItemId, allergenId])`, `@@index([menuItemId])`, `@@index([allergenId])`, `@@index([source])`, `@@index([verificationStatus])`. Add relations on `MenuItem` (`allergenStatuses`) and `Allergen` (`menuStatuses`).
4. Keep verification_status/menu_status as `String` (flexible); enforce allowed values in Zod (domain + admin-schemas), not DB enum — matches current importer which writes plain strings.

## Related code files
- Modify: `apps/web/prisma/schema.prisma`.
- Create: `apps/web/prisma/migrations/<ts>_phase02_restaurant_menu/migration.sql` (via `prisma migrate dev`).

## Implementation steps
1. Edit schema with the fields/models/indexes above.
2. `pnpm --filter @safebite/web exec prisma migrate dev --name phase02_restaurant_menu`.
3. `prisma generate` (runs in build/postinstall); verify client types.
4. Sanity: existing 55 restaurant rows still load; new nullable columns default cleanly.

## Todo
- [ ] Add slug/brand/operator + Restaurant indexes
- [ ] Add MenuItem notes/cookware/fryer/customize + indexes
- [ ] Create MenuItemAllergenStatus + relations + constraints
- [ ] Generate migration, apply, `prisma generate`

## Success criteria
Migration applies cleanly on a DB with existing seeded rows; `prisma generate` types compile; unique(menu_item_id, allergen_id) enforced; no data loss.

## Risks
- Adding `@unique` slug on existing rows: keep nullable (unique allows multiple NULLs in Postgres) — safe.
- Decimal→number serialization at API boundary (domain Zod rejects Decimal): serializers must convert (handled in Phases 04/06).

## Security / privacy
No user location column (spec §11.3 — never store exact user location). Internal `notes` fields are admin-only, never in public serializers.

## Next
Unblocks Phases 03, 04, 06.
