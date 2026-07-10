# Phase 06 — Map-first /home (MapLibre + bottom sheet + CompatRing)

## Context Links
- Plan overview: [../plan.md](../plan.md)
- Migration delta: [../migration-delta.md](../migration-delta.md) (§1 "Map home"; §2.8 lat/lon on list DTO + derived %)
- Target mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — "Bản đồ / Map" home route
- Current files read:
  - `apps/web/src/app/[locale]/(app)/home/page.tsx` (CTA hub to be rewritten)
  - `apps/web/src/features/restaurants/restaurant-guide.tsx` (list/map toggle + geo wiring to lift)
  - `apps/web/src/features/restaurants/use-restaurant-recommendations.ts`
  - `apps/web/src/features/restaurants/restaurants-client.ts` (list DTO + Zod)
  - `apps/web/src/features/location/use-geolocation.ts`, `.../location-permission-panel.tsx`
  - `apps/web/src/lib/geo/haversine.ts`
  - `apps/web/src/components/restaurants/restaurant-map-shell.tsx` (placeholder to delete)

## Overview
- **Priority:** High (core v2 surface; first screen after login)
- **Current status:** Not started
- **Effort:** L | **Risk:** high | **Depends on:** phase-05 (data-model: lat/lon on list DTO)
- Replace the CTA-hub `/home` with a full-bleed MapLibre map whose pins are labelled by
  compatibility %, a draggable nearby-restaurant bottom sheet (% ring + name + cuisine +
  distance), and an allergen/free-text search input. Reuse the existing geolocation +
  recommendation stack verbatim; degrade to a list-only view when offline (vector tiles do
  not cache).

## Key Insights
- **What exists to reuse (read today):**
  - `useGeolocation()` returns `{ location, status, request, clear }`, in-memory + `sessionStorage`
    with 30-min TTL, prompts only on explicit action (`use-geolocation.ts`). Feeds map auto-center.
  - `LocationPermissionPanel` is the approved pre-permission affordance — reuse unchanged.
  - `useRestaurantRecommendations(city, profile, filters, geo.location)` already handles the
    live/saved/offline tri-state and the offline stale banner; returns `RestaurantListResponse`.
  - `restaurant-guide.tsx` already implements the exact geo→sort coupling (`recommended`↔`nearest`)
    and client-side free-text filter over `r.name.en/vi` + `r.address` — lift that logic.
  - `haversineMeters(a,b)` exists for client distance when the DTO's `distanceMeters` is null (offline).
  - Compatibility % is **derived, not stored** (§2.8): `counts { suitable, askFirst, risky, avoid,
    unknown, total }` on each list item → `% = round(100 * suitable / (total - unknown))` (band the
    result green/yellow/red; grey when denominator 0). Confirm exact formula against mockup.
- **What the code looks like TODAY:** `home/page.tsx` is a client greeting hero + 5 `@/i18n/navigation`
  `<Link>` CTAs; no map library is installed (`package.json` deps have no map/gl entry). The only
  "map" is `RestaurantMapShell` — an honest "map coming soon" placeholder.
- **Gotchas:**
  - The **list DTO (`listItemSchema`) has no `lat/lon`** — only the detail DTO does. Pins need
    coordinates on every list item; phase-05 adds `lat/lon` to the list DTO. This phase is blocked
    until that lands — extend the Zod schema here to match.
  - MapLibre touches `window`/WebGL → the leaf map component MUST be `dynamic(..., { ssr: false })`
    (RSC-first: `home/page.tsx` stays a server shell; the interactive tree is a client island).
  - Tiles are network-only; Serwist won't cache them. Offline must fall back to the sheet-as-list.
  - Tile source must be **license-clean** (decision §Decisions.2) — use a self-hosted/keyed
    style URL from env, never a hardcoded proprietary endpoint; surface attribution
    (`rec.data.attribution`) on-map as required.

## Requirements
**Functional**
- Full-bleed map centered on the user (via `useGeolocation`) or city fallback (`profile.destinationCity`).
- One colored pin per nearby restaurant, labelled with its compatibility %; tap → detail route.
- Draggable bottom sheet listing restaurants: % ring + name + cuisine + distance rows; tap-through.
- Allergen/free-text search input filtering the visible set (client-side, name + address).
- `LocationPermissionPanel` shown until location granted; map auto-centers on grant.
- Offline: hide the map, render the sheet full-height as a list with the existing stale banner.

**Non-functional**
- All UI strings via `useTranslations` (add product-approved VI/EN keys under `home.*`); no hardcoded copy.
- Navigation via `@/i18n/navigation` `Link`/`router` only. Semantic `sb-*` tokens only.
- CompatRing color-blind safe (color + numeric label + text band, mirroring traffic-light suit).
- Each new file < 200 lines; leaf map lazy-loaded (no MapLibre in the initial home bundle).

## Architecture
- `home/page.tsx` (RSC shell) → renders `<HomeMapExperience/>` client island.
- `HomeMapExperience` (client): owns `useGeolocation`, `filters`, search state; calls
  `useRestaurantRecommendations`; derives `results` (haversine-sorted client-side). Composes:
  - `RestaurantMapCanvas` — `dynamic(ssr:false)` MapLibre (`react-map-gl/maplibre`); props: center,
    `results`, `onSelect`. Renders `CompatPin` markers.
  - `NearbySheet` — draggable bottom sheet; maps `results` → rows (`CompatRing` + name + cuisine + distance).
  - `CompatRing` — pure SVG %-arc + band token + text label (shared with phase-07 detail).
  - `CompatPin` — colored marker using the same band token, showing %.
- Data flow: geo/profile → recs hook → list items (with lat/lon after phase-05) → `compatPercent()`
  helper → shared band → both pins and rings. Offline branch skips the canvas.

## Related Code Files
**Modify**
- `apps/web/src/app/[locale]/(app)/home/page.tsx` — rewrite to RSC shell mounting the map island.
- `apps/web/src/features/restaurants/restaurants-client.ts` — add `lat/lon` to `listItemSchema` (coord with phase-05).
- `apps/web/package.json` — add `maplibre-gl` + `react-map-gl`.
- `apps/web/messages/en.json` + `vi.json` — add `home.*` map/sheet/search keys.

**Create**
- `apps/web/src/features/home/home-map-experience.tsx` — client orchestrator (geo + recs + state).
- `apps/web/src/components/restaurants/restaurant-map-canvas.tsx` — `dynamic ssr:false` MapLibre leaf.
- `apps/web/src/components/restaurants/nearby-sheet.tsx` — draggable bottom sheet + rows.
- `apps/web/src/components/restaurants/compat-ring.tsx` — SVG % ring (color-blind safe).
- `apps/web/src/components/restaurants/compat-pin.tsx` — colored % marker.
- `apps/web/src/lib/restaurants/compat-percent.ts` — `counts → { percent, band }` derivation + unit tests.

**Delete**
- `apps/web/src/components/restaurants/restaurant-map-shell.tsx` (superseded; also removed by phase-02).

## Implementation Steps
1. Add `maplibre-gl` + `react-map-gl` to `package.json`; install; confirm typecheck + build.
2. Extend `listItemSchema` with `lat: z.number().nullable()`, `lon: z.number().nullable()` (align with phase-05 server DTO).
3. Write `compat-percent.ts`: derive percent + band from `counts`; grey/unknown when denominator 0. Unit-test bands.
4. Build `CompatRing` (SVG arc + numeric label + band text; `sb-status-*` tokens; `role`/`aria-label`).
5. Build `CompatPin` (marker reusing band token + %).
6. Build `NearbySheet`: draggable/snap bottom sheet; rows = ring + name + cuisine + distance (`Link` to detail).
7. Build `RestaurantMapCanvas` as `dynamic(() => …, { ssr:false })`; center from geo/city; render pins; `onSelect`; env-driven license-clean style URL + on-map attribution.
8. Build `HomeMapExperience`: lift geo + sort-coupling + free-text filter from `restaurant-guide.tsx`; compute client distance via `haversineMeters` when `distanceMeters` is null; render permission panel, search input, canvas, sheet.
9. Offline branch: when `!online && rec.source==='saved'|null`, hide canvas, render sheet as full list + existing stale banner.
10. Rewrite `home/page.tsx` to a thin RSC shell mounting `<HomeMapExperience/>`.
11. Add product-approved VI/EN `home.*` keys; run `copy:check`. Delete `restaurant-map-shell.tsx`.

## Todo
- [ ] Add MapLibre + react-map-gl deps; build passes
- [ ] Add `lat/lon` to list DTO Zod (align phase-05)
- [ ] `compat-percent.ts` + unit tests (bands + zero-denominator)
- [ ] `CompatRing` (color-blind safe)
- [ ] `CompatPin`
- [ ] `NearbySheet` (draggable + rows + detail links)
- [ ] `RestaurantMapCanvas` (`ssr:false`, env style URL, attribution)
- [ ] `HomeMapExperience` (geo + recs + search + offline)
- [ ] Rewrite `home/page.tsx` RSC shell
- [ ] VI/EN keys + `copy:check`; delete map-shell placeholder

## Success Criteria
- `pnpm --filter @safebite/web typecheck` and `build` pass; MapLibre not in the initial home chunk.
- Granting location auto-centers the map; pins show compatibility % and open the detail route.
- Sheet is draggable, lists nearby restaurants with correct % rings + distances.
- Search filters both pins and rows.
- Offline shows the list-only fallback with the stale banner (no blank map).
- `compat-percent` unit tests pass; `copy:check` finds no hardcoded/unapproved copy.

## Risk Assessment
- **MapLibre SSR/WebGL crash** → strict `dynamic ssr:false`; guard `window`; jsdom-safe tests mock the canvas.
- **Blocked on lat/lon** → coordinate with phase-05; keep pins behind a null-coord guard so the sheet still ships.
- **Tile licensing / cost** → env-driven license-clean style; attribution on-map; document the source in the decision log.
- **Bundle bloat** → lazy-load the canvas; keep each file < 200 lines.
- **Offline blank map** → explicit list-only fallback tested.

## Security Considerations
- **PII / on-device:** location stays in memory + `sessionStorage` (30-min TTL) via `useGeolocation`; never persisted to IndexedDB, never sent to tile provider beyond the map viewport it already needs; offline cache continues to strip `distanceMeters` (per hook comment §11/§16).
- **Zod at boundary:** the extended `listItemSchema` still validates every API response before render.
- **Provenance / human-in-the-loop:** % ring reflects existing verified counts only; this phase renders, never mutates, restaurant data — no auto-verification introduced.
- **No secrets in client:** tile style key via public env at build only; no server credentials in the island.

## Next Steps
- Unblocks phase-07 (restaurant detail % ring reuses `CompatRing`/`compat-percent`) and phase-13
  (agent chat can deep-link map pins). Admin map (phase-10) can reuse `RestaurantMapCanvas`.
