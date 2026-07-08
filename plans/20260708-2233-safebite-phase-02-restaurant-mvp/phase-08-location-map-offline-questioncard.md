# Phase 08 — Location, map shell, offline, question card

**Context:** Spec §4.3, §4.6, §11, §12, §15 · `components/app-shell/use-online-status.ts`, `lib/dexie.ts` (v1), `lib/local-repo.ts`, `features/question-card/*`, domain `buildQuestionCard`.

## Overview
- **Priority:** P0 for location + question-card; P1 for map + offline (include if it fits).
- **Status:** Not started.
- Location permission flow (user-triggered only), distance sorting, list-first map shell, optional Dexie offline cache, and restaurant/menu-context question cards.

## Key insights (verified)
- `buildQuestionCard(input)` takes `{ profile, allergens, targetLanguage, dishName? }`. **Option A (preferred, §15):** extend input with optional `restaurantName?`/`menuItemName?` (Bilingual) and add sections; keep existing behavior/tests intact. Deterministic, no LLM.
- Dexie is `version(1)` with 5 stores → bump to `.version(2)` for `savedRestaurants`/`lastRestaurantSearch`/`lastRestaurantDetail`. `local-repo.ts` has `assertNoSecrets` + no-status-upgrade guard to respect.
- `questionCardRepo` + `metadata` (`lastQuestionCardId`) already exist; reuse for saving.

## Requirements
1. **Location flow (§4.3, §11):** request geolocation **only** after explicit tap ("Find food near me"/"Use my location"/"Sort by distance"). Pre-permission explanation panel (`LocationPermissionPanel`, EN+VI copy §11.2). Granted ⇒ store in memory / `sessionStorage` (TTL ≤30 min), pass `clientLocation` in POST body — **not URL**. Denied ⇒ city/district browsing. Never persist exact location in IndexedDB or send to analytics.
2. **Distance:** server-side Haversine (Phase 06) when `clientLocation` posted; client fallback if needed.
3. **Map shell (§4.6):** list-first. Add accessible Map/List toggle. **P0 fallback (recommended):** responsive "location panel" (address + distance + OpenStreetMap external link with visible attribution); keep map tab as disabled/P1 with code TODO. Do **not** add Leaflet if it risks destabilizing — prefer the panel. No Google Maps.
4. **Offline (§12, P1):** add Dexie stores `lastRestaurantSearch`, `lastRestaurantDetail` (fields: cacheKey, profileFingerprint, city, restaurantId?, savedAt, expiresAt, payload). Repos in `local-repo.ts`. Offline: show last cached search/detail with stale warning (§12 copy); if none, CTA to allergy card + dish guide. Never cache exact location long-term.
5. **Question card (§15):** on "Ask about this item", extend `buildQuestionCard` with restaurant/menu context, save as last question card (Dexie), navigate to `/question-card`. Card includes allergen/severity statement, menu item name, ingredient + cross-contact questions, kitchen-check phrase, restaurant name context.

## Related code files
- Create: `features/location/*` (`use-geolocation.ts`, `LocationPermissionPanel`), `components/restaurants/restaurant-map-shell.tsx` (or location panel), Dexie repos.
- Modify: `packages/domain/src/question-card.ts` (+`QuestionCardInput` fields, +sections — keep existing tests green), `lib/dexie.ts` (`.version(2)`), `lib/local-repo.ts` (+restaurant repos), `features/restaurants/*` (wire location + Ask CTA), `messages/{en,vi}.json` (+locationPermission, offline restaurant copy).

## Implementation steps
1. Extend `buildQuestionCard` (Option A) + update question-card tests for new sections.
2. `use-geolocation` hook + `LocationPermissionPanel` (user-triggered, EN+VI).
3. Wire distance sort in list (clientLocation in body).
4. Location panel + OSM external link + attribution; map tab disabled TODO.
5. Dexie `.version(2)` + repos + offline states in list/detail.
6. Wire "Ask about this item" → save + navigate.

## Todo
- [ ] buildQuestionCard context extension + tests
- [ ] Geolocation hook + permission panel
- [ ] Distance sorting wired
- [ ] Location panel / map shell fallback + attribution
- [ ] Dexie v2 + offline cache + stale warnings
- [ ] Ask-about-this-item → question card

## Success criteria
Location prompt only after user action; denied still browses by city; distance sorting works when granted; question card carries menu/restaurant context; offline shows saved+stale warning if cached; OSM attribution visible; no location in URL/DB/analytics.

## Risks
- Map library instability → default to location-panel fallback (spec-sanctioned).
- Dexie migration → additive stores only, guard with fingerprint (no raw profile).

## Security / privacy
No exact location stored/persisted/sent to analytics (§11, §12, §16). Profile never in URL. `assertNoSecrets` respected.

## Next
Completes public flow; Phase 09 tests + gates.
