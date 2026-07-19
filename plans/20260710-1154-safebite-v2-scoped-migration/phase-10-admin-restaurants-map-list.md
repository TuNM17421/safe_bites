# Phase 10 — Admin restaurants map+list + provenance badge

## Context Links
- Plan overview: [`../plan.md`](../plan.md)
- Migration delta: [`../migration-delta.md`](../migration-delta.md) (§1 row "Admin restaurants", §1 "Admin sidebar", §2.1 provenance, §3 admin demotions)
- Data-model foundation (dependency): [`./phase-05-data-model-foundation.md`](./phase-05-data-model-foundation.md)
- v2 mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — `/admin/restaurants` desk (lines ~616-658): map/list `seg` toggle, `qrow` list, `prov` provenance badge, 4-item `aside.side` sidebar
- Current files: `apps/web/src/app/admin/layout.tsx`, `apps/web/src/app/admin/admin-messages.ts`, `apps/web/src/features/admin/restaurant-admin-list.tsx`, `apps/web/src/features/admin/admin-serializers.ts`

## Overview
- **Priority:** Medium (unblocks phase-11 Import UI which reuses the collapsed shell)
- **Current status:** Not started
- **Effort:** M
- **Risk:** low
- **Depends on:** phase-05 (needs `MenuItemIngredient` for the ingredient count; `SourceType` already carries the discovery values)
- **Description:** Collapse the admin nav to the four v2 destinations (Restaurants / Import Excel / OCR review / Reports), demoting the four CRUD resources off the nav (routes kept). Add a Map/List segmented toggle to `RestaurantAdminList` that plots pins from existing `lat/lon`, and a labelled provenance badge (`SourceType` → admin·seed / OpenMap·unverified / user contribution / OCR). Add a per-restaurant ingredient count to `adminRestaurantToDTO`.

## Key Insights
- **Nav today is a top header, not a sidebar.** `admin/layout.tsx` renders a `<header>` with a `NAV` array of **5** items (`dashboard`, `dishes`, `ingredients`, `dishRisks`, `restaurants` — lines 17-23) mapped to `<Link>` from `next/link`. The `/admin` island **deliberately** uses `next/link` + `usePathname` (not `@/i18n/navigation`) so admin URLs stay locale-unprefixed (phase-12 ADR, comment lines 9-16). **Keep that** — do not swap to `@/i18n/navigation`.
- **Messages are an EN-only island.** `admin-messages.ts` holds `adminMessages` handed to a fixed-locale `NextIntlClientProvider` (`locale="en"`); nothing goes into `messages/{en,vi}.json`. `nav` object (lines 8-15) currently has `dashboard/dishes/ingredients/dishRisks/restaurants/logout`. New copy for the toggle + provenance labels is added **here**, product-approved EN strings.
- **The list already fetches everything the map needs.** `RestaurantAdminList` (line 52) uses `useAdminResource<RestaurantRow>(BASE, query)`; rows come from `adminRestaurantToDTO`, which already serializes `lat`/`lon` (Decimal→number, lines 148-149) and `menuItemCount` from `_count.menuItems` (line 162). No API/query change is needed for pins — plot from `list.data`.
- **Provenance source field.** Each row exposes `externalSource` (rendered today at line 122 as `{r.id} · {r.externalSource}`) and `verificationStatus`. `SourceType` enum (schema.prisma line 53) = `manual_seed, menu_observed, restaurant_submitted, user_submitted, expert_review, openstreetmap, openmapvn, google_places, foursquare, admin_verified`; phase-05 adds `ocr`, `user_contribution`. The badge maps these families to the four mockup labels.
- **Gotcha — ingredient count ≠ menu-item count.** The mockup shows "12 món · 34 nguyên liệu" — two distinct numbers. `menuItemCount` already exists; the **ingredient** count is new and requires the phase-05 `MenuItemIngredient` table, so this field is gated on phase-05 and computed via a Prisma relation count in the admin restaurants route, not in the serializer alone.
- **Column reuse.** `AdminDataTable` + `AdminColumn<RestaurantRow>` (line 5) drives the list; the provenance badge slots in as a new column `render`, reusing existing `sb-*` token classes seen throughout (`sb-surface-2`, `sb-status-*`).

## Requirements
**Functional**
- Admin nav shows exactly four items: Restaurants, Import Excel, OCR review, Reports; Dashboard/Dishes/Ingredients/Dish-risks no longer appear in nav (their routes/pages stay reachable and unchanged).
- `RestaurantAdminList` gains a Map/List segmented toggle; List is the default. Map renders a pin per row that has non-null `lat`/`lon`; rows without coords stay list-only (never dropped).
- A provenance badge renders per restaurant (list + map popup) with an icon + label: admin·seed, OpenMap·unverified, user contribution, OCR, mapping from `externalSource`.
- Each restaurant row shows both `menuItemCount` (món) and the new ingredient count (nguyên liệu).

**Non-functional**
- All new UI copy via `adminMessages` (EN island) — no hardcoded JSX strings, no additions to shared `messages/*.json`.
- Semantic `sb-*` tokens only; color-blind-safe (icon + text, never color alone). Light/dark inherited.
- Keep `restaurant-admin-list.tsx` and `layout.tsx` under 200 lines — extract the badge and the map view into their own files.
- No new heavy map dependency for the admin toggle unless phase-06's chosen map stack is already installed; otherwise use a lightweight CSS-positioned pin overlay (mockup `mapbox`/`compin` style) so this phase does not block on the map-stack decision.

## Architecture
- `admin/layout.tsx`: shrink `NAV` to 4 entries keyed to `restaurants/import/ocrReview/reports`; optionally reshape the `<header>` into the mockup left `aside.side` sidebar (still `next/link`, still `usePathname` active state). Routes `/admin/import`, `/admin/ocr-review`, `/admin/reports` are created by phases 11/12/09 — link now; those pages land later.
- New `admin-provenance-badge.tsx` (client): `function provenanceLabel(source: string)` maps `SourceType` → `{ icon, key }`; renders Lucide icon + `adminMessages.provenance[key]`. Pure, no fetch.
- New `restaurant-admin-map.tsx` (client): receives `rows: RestaurantRow[]` + `selectedId`, plots pins from `lat/lon`, click selects a row. Isolated so `restaurant-admin-list.tsx` stays small.
- `restaurant-admin-list.tsx`: add `view` state (`'list' | 'map'`), a segmented toggle button pair, conditionally render `AdminDataTable` vs `RestaurantAdminMap`; add the provenance column; show ingredient count next to `menuItemCount`.
- `admin-serializers.ts`: extend `adminRestaurantToDTO`'s `_count` param to include `menuItemIngredients` (or a computed distinct-ingredient count from phase-05) and expose `ingredientCount`. The admin restaurants route (`app/api/v1/admin/restaurants`) adds the `_count`/relation include.

## Related Code Files
**Modify**
- `apps/web/src/app/admin/layout.tsx` — 4-item `NAV`, optional sidebar layout
- `apps/web/src/app/admin/admin-messages.ts` — `nav` keys + `provenance.*` + `restaurant.viewMap`/`viewList`/`ingredientCount` copy
- `apps/web/src/features/admin/restaurant-admin-list.tsx` — view toggle, provenance column, ingredient count
- `apps/web/src/features/admin/admin-serializers.ts` — `ingredientCount` in `adminRestaurantToDTO`
- `apps/web/src/app/api/v1/admin/restaurants/route.ts` (verify path) — add ingredient `_count`/include

**Create**
- `apps/web/src/features/admin/admin-provenance-badge.tsx`
- `apps/web/src/features/admin/restaurant-admin-map.tsx`

**Delete** — none.

## Implementation Steps
1. In `admin-messages.ts`, replace the `nav` object with the four keys (`restaurants`, `import`, `ocrReview`, `reports`) + keep `logout`; add product-approved EN strings for `restaurant.viewMap`, `restaurant.viewList`, `restaurant.ingredientCount`, and a `provenance` block (`adminSeed`, `openMapUnverified`, `userContribution`, `ocr`).
2. In `admin/layout.tsx`, shrink `NAV` to the four entries with the new hrefs (`/admin/restaurants`, `/admin/import`, `/admin/ocr-review`, `/admin/reports`); keep `next/link` + `usePathname` active styling. Optionally restructure the header into the mockup sidebar; ensure `/admin` (dashboard) and the three CRUD routes still resolve directly.
3. Create `admin-provenance-badge.tsx`: map `SourceType` families → label key + Lucide icon (User for admin·seed, Globe for OpenMap·unverified, contributor icon for user contribution, ScanText for OCR); render via `useTranslations('admin')` or the passed `adminMessages`.
4. Create `restaurant-admin-map.tsx`: given `rows` + `onSelect`, render pins from `lat/lon` (skip null); reuse the provenance badge in the pin popup. Use the phase-06 map stack if already installed, else the CSS-pin overlay fallback.
5. In `restaurant-admin-list.tsx`, add `view` state + segmented toggle (default `list`); render map vs table conditionally; add a provenance column using the badge; render `ingredientCount` alongside `menuItemCount`.
6. In `admin-serializers.ts`, widen the `adminRestaurantToDTO` param `_count` to include the ingredient relation and return `ingredientCount: r._count?.<rel> ?? null`; update the admin restaurants route's Prisma query to include it.
7. Run typecheck/lint; verify both views render, the badge maps all `SourceType` values (including `ocr`/`user_contribution`), and counts show.

## Todo
- [ ] Update `admin-messages.ts` nav (4 keys) + toggle + provenance copy
- [ ] Collapse `layout.tsx` NAV to 4 items (keep next/link island)
- [ ] Create `admin-provenance-badge.tsx` with SourceType→label mapping
- [ ] Create `restaurant-admin-map.tsx` pin view from lat/lon
- [ ] Add view toggle + provenance column + ingredient count to `restaurant-admin-list.tsx`
- [ ] Add `ingredientCount` to `adminRestaurantToDTO` + route include
- [ ] Typecheck + lint + manual verify both views

## Success Criteria
- Admin nav renders exactly four items; the four CRUD routes remain reachable by direct URL.
- Toggling Map/List switches views without refetch; pins appear only for rows with `lat/lon`.
- Provenance badge renders a correct icon+label for every `SourceType` value, including phase-05's `ocr` and `user_contribution`.
- Restaurant rows display both món (`menuItemCount`) and nguyên liệu (`ingredientCount`).
- `pnpm --filter web typecheck` and lint pass; existing admin restaurant tests still pass; no new hardcoded strings and no `@/i18n/navigation` import inside `/admin`.
- Each touched file stays under 200 lines.

## Risk Assessment
- **Ingredient count coupled to phase-05.** Mitigation: gate step 6 on the `MenuItemIngredient` table; if phase-05 lands after, ship steps 1-5 and return `ingredientCount: null` until the relation exists.
- **Map stack decision still open (delta §4.2).** Mitigation: CSS-pin overlay fallback keeps this phase decision-free; swap to the real map component when phase-06 lands.
- **Accidentally breaking the admin locale island.** Mitigation: assert no `@/i18n/navigation` import; keep `next/link`/`usePathname`; smoke-test that admin URLs stay unprefixed.
- **File bloat.** Mitigation: badge + map extracted to their own files (Create list).

## Security Considerations
- No auth change — the admin routes remain behind the existing admin-token guard; this phase only reorders nav and adds read-only UI.
- Zod boundaries untouched; if the route include changes shape, keep the existing response validation and add the `ingredientCount` field to the DTO/schema in lockstep.
- Provenance is a trust/traceability surface: the badge must faithfully reflect stored `SourceType` — never relabel OpenMap-discovered or OCR rows as verified. Discovered (`openstreetmap`/`openmapvn`) and OCR rows read as **unverified** per human-in-the-loop.
- No PII added; `lat/lon` are already public restaurant coordinates.

## Next Steps
- Unblocks **phase-11** (Import Excel UI) which mounts under the same collapsed admin shell/sidebar.
- The provenance badge + `SourceType` label mapping is reused by **phase-12** (OCR review) and **phase-09** (reports), so extract it cleanly.
