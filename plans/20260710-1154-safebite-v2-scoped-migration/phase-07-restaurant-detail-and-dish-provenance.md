# Phase 07 — Restaurant detail % ring + /restaurant/:id/dish ingredient provenance

## Context Links
- Plan overview: [`../plan.md`](../plan.md)
- Migration delta: [`../migration-delta.md`](../migration-delta.md) (§1 rows "Restaurant detail" / "Dish at restaurant", §2.1 `MenuItemIngredient`, §3 A–E → % ring removal)
- v2 mockups: `docs/design/safebite-ui-ux-mockups-v2.html` — `/restaurant/:id` (lines 454–482) and `/restaurant/:id/dish` (lines 484–503); note-inline on Google Maps + location use (line 506)
- Current detail view: `apps/web/src/features/restaurants/restaurant-detail.tsx`
- Current menu card: `apps/web/src/components/restaurants/menu-item-recommendation-card.tsx`
- Current badges: `apps/web/src/components/restaurants/restaurant-badges.tsx`
- Detail API: `apps/web/src/app/api/v1/recommendations/restaurants/[restaurantIdOrSlug]/route.ts`
- Client fetchers/Zod: `apps/web/src/features/restaurants/restaurants-client.ts`

## Overview
- **Priority:** High (core business flow — the "restaurant → dish → confirm with human" loop)
- **Current status:** Not started
- **Effort:** L
- **Risk:** med
- **Depends on:** phase-05 (adds `MenuItemIngredient` provenance table + `SourceType` `user_contribution`; §2.1/2.2), phase-02 (singular `/restaurant/[id]` route rename + link sweep)
- **Description:** Replace the restaurant-detail A–E readiness letter with a compatibility **% ring** ("Phù hợp cao … · N hợp · N hỏi lại · N không hợp"), swap the OSM link for **Open Google Maps** directions, and make each menu item link to a new `/restaurant/[id]/dish` page. That new page lists per-restaurant ingredients as traffic-light dots with a **provenance line** ("restaurant self-declared + N user contributions") and the three ingredient actions (Add, Report wrong, Ask owner). All new/edited ingredient rows are written `needs_review` / `unverified` — the app only suggests.

## Key Insights
- **% is derivable — no new column.** `recommendation.counts` already ships `{ suitable, askFirst, risky, avoid, unknown, total }` (see `restaurants-client.ts` `counts` schema and route.ts `recommendation.counts`). The ring % is a pure function of these; the mockup shows `88%` with `6 hợp · 3 hỏi lại · 1 không hợp` (line 462). Delta §2.8 confirms "derive from suit/ask/avoid counts, no column".
- **No CompatRing component exists yet.** Grep found none; must be created. Reuse the sb color tokens (`--sb-status-suitable-fg` etc.) that the traffic-light dots already use; keep it color-blind-safe (ring + numeric label + text, never color alone — same rule the A–E badge follows in `restaurant-badges.tsx`).
- **A–E badge is being retired.** `RestaurantReadinessBadge` (`restaurant-badges.tsx:27`) and its use in `restaurant-detail.tsx:106` go away for the user view. `rec.readinessClass` stays in the DTO for now (admin uses it) — just stop rendering it.
- **`osmUrl` block** (`restaurant-detail.tsx:75–78`, rendered at `:163`) is the exact thing to replace with a Google Maps directions link (`https://www.google.com/maps/dir/?api=1&destination=<lat>,<lon>`). `r.lat`/`r.lon` already present in the detail DTO (`route.ts:86–87`).
- **Distance already computed.** `distanceMeters` is on the detail DTO (`route.ts:74–88`) and there is a ready `RestaurantDistanceLabel` (`restaurant-badges.tsx:84`) rendering "320 m" / "2.2 km" — the detail view currently does not show it; the ring row should.
- **Menu card already links out** — `MenuItemRecommendationCard` (`menu-item-recommendation-card.tsx:52`) links to `/question-card?menuItemId=…` and renders a `FeedbackEntryButton`. In v2 the card's primary tap target becomes `/restaurant/[id]/dish?menuItemId=…`; the "ask" / "I ate this" affordances move onto the dish page.
- **Ingredients are Dish-scoped today.** `DishIngredient` (`schema.prisma:242`) is per-canonical-dish; `MenuItem` has only free-text `ingredientNotes` (`schema.prisma:355`). The per-restaurant rows come from phase-05's new `MenuItemIngredient` `{ menuItemId, ingredientId, status(traffic-light), source, contributorType, verificationStatus }`.
- **Question-card path is fully reusable.** `useQuestionCard({ profile, targetLanguage, menuItemId, dishId, includeDish })` (`features/question-card/use-question-card.ts`) already takes a `menuItemId` and works offline. "Create question for owner" reuses it verbatim — no new API.
- **Report-wrong reuses the feedback spine.** `FeedbackEntryButton` (`components/feedback/feedback-entry-button.tsx`) already carries `restaurantId`/`menuItemId`/`dishId` into the feedback flow. Delta §2.4 adds `FeedbackEntityType += ingredient`; phase-09 wires the admin `approve_ingredient_correction` action. This phase surfaces the red "Report wrong ingredient" trigger and the "Add ingredient" writer.
- **Gotcha — offline cache.** `useRestaurantDetail` caches detail per restaurant+profile and strips `distanceMeters` before caching (`use-restaurant-detail.ts:33`). Any new dish/ingredient fetch must follow the same "never cache user location" rule and degrade gracefully offline.

## Requirements
**Functional**
- Detail header shows a compatibility **% ring** + "high match" headline + `N hợp · N hỏi lại · N không hợp` + distance (from `counts` + `distanceMeters`).
- "Open Google Maps" button (directions to `lat,lon`) replaces the OSM link; hidden when `lat`/`lon` are null.
- Each menu item links to `/restaurant/[id]/dish?menuItemId=<id>` (dish name + traffic-light suit dot).
- New `/restaurant/[id]/dish` page: ingredient rows (traffic-light dot + name + optional note) sourced from `MenuItemIngredient`, plus provenance line "restaurant self-declared + N user contributions".
- Three actions on the dish page: **Add ingredient** (writes new row), **Report wrong ingredient** (red, feedback spine), **Create question for owner** (reuse question-card).
- Add-ingredient writes `MenuItemIngredient` with `verificationStatus=unverified`, `reviewStatus=needs_review`, `source=user_contribution`, `contributorType=user` — never auto-verified.

**Non-functional**
- All UI strings via `useTranslations` (add product-approved VI/EN keys under `restaurantDetail`, `menuItemCard`, and a new `dishAtRestaurant` group). No hardcoded copy.
- Navigation via `@/i18n/navigation` `Link`/`useRouter` only.
- Semantic `sb-*` tokens for the ring and dots (traffic-light triads); color-blind-safe (color + icon/label).
- Zod at both API boundaries (new dish GET + ingredient POST); RSC-first page shell, `'use client'` only where interactive.
- Component files < 200 lines — split ring, ingredient row, and action bar into their own files.

## Architecture
- **Ring:** `components/restaurants/compat-ring.tsx` — pure presentational, props `{ percent, size }`; percent computed by a helper `compatPercentFromCounts(counts)` in `restaurant-serializers`/a small util (suitable-weighted; ask/unknown partial; avoid zero — exact formula decided with the counts already returned, no new server data).
- **Detail view:** `restaurant-detail.tsx` swaps the readiness panel for a "brand" card: ring + headline + counts line + distance + Google-Maps button. Menu section keeps `STATUS_DISPLAY_ORDER` grouping but the card becomes a link to the dish page.
- **Dish page (RSC shell):** `app/[locale]/(app)/restaurant/[id]/dish/page.tsx` awaits `params`, `setRequestLocale`, renders a client `DishAtRestaurant` feature that reads `menuItemId` from search params, fetches ingredients + provenance, and hosts the action bar.
- **New API:** `GET /api/v1/restaurants/[id]/menu-items/[menuItemId]/ingredients` → `{ ingredients: [{ id, name(bilingual), status, note?, source, contributorType }], provenance: { selfDeclared: boolean, userContributions: number } }`. **New API:** `POST …/ingredients` (Zod body: ingredientId-or-freeText name + suggested status) → creates `MenuItemIngredient` as needs_review/unverified.
- **Data flow:** phone location (client) → distance already server-side; ring % is client-derived from `counts`; ingredient provenance aggregates `MenuItemIngredient` rows by `contributorType`/`source`.

## Related Code Files
**Modify**
- `apps/web/src/features/restaurants/restaurant-detail.tsx` — ring panel, Google Maps link, distance, menu-item links
- `apps/web/src/components/restaurants/menu-item-recommendation-card.tsx` — primary link → `/restaurant/[id]/dish`
- `apps/web/src/components/restaurants/restaurant-badges.tsx` — stop exporting/using `RestaurantReadinessBadge` in user view (keep for admin if still referenced)
- `apps/web/src/app/api/v1/recommendations/restaurants/[restaurantIdOrSlug]/route.ts` — ensure `counts` + `lat/lon/distanceMeters` present (already are; verify only)
- `apps/web/src/features/restaurants/restaurants-client.ts` — add fetchers + Zod for ingredients GET/POST
- `apps/web/messages/en.json` + `vi.json` — add product-approved VI/EN keys

**Create**
- `apps/web/src/components/restaurants/compat-ring.tsx`
- `apps/web/src/lib/restaurant-serializers.ts` helper `compatPercentFromCounts` (or a new `apps/web/src/lib/compat-percent.ts`)
- `apps/web/src/app/[locale]/(app)/restaurant/[id]/dish/page.tsx`
- `apps/web/src/features/restaurants/dish-at-restaurant.tsx` (client feature)
- `apps/web/src/components/restaurants/ingredient-row.tsx` and `ingredient-action-bar.tsx`
- `apps/web/src/features/restaurants/use-menu-item-ingredients.ts`
- `apps/web/src/app/api/v1/restaurants/[id]/menu-items/[menuItemId]/ingredients/route.ts` (GET + POST)

**Delete**
- None (readiness badge retained for admin; route rename handled in phase-02)

## Implementation Steps
1. Add `compatPercentFromCounts(counts)` helper + unit test (avoid → 0 weight, suitable → full, ask/unknown → partial); keep formula simple/documented.
2. Build `CompatRing` (SVG ring using `--_p` style var like the mockup; sb tokens; numeric label + text for a11y).
3. Rewrite the detail "readiness" section into the brand ring card: ring + headline + `N hợp · N hỏi lại · N không hợp` + `RestaurantDistanceLabel`.
4. Replace `osmUrl` with a Google Maps directions button (`/maps/dir/?api=1&destination=lat,lon`), hidden when coords null; keep `attribution`.
5. Point `MenuItemRecommendationCard`'s primary link at `/restaurant/[id]/dish?menuItemId=…`; move ask/feedback affordances off the card.
6. Create the dish RSC page shell + `DishAtRestaurant` client feature (reads `menuItemId`).
7. Add `GET/POST …/ingredients` route with Zod schemas; POST writes `MenuItemIngredient` needs_review/unverified/user_contribution.
8. Add `useMenuItemIngredients` (TanStack Query, online-guarded like `use-restaurant-detail`) + client fetchers/Zod in `restaurants-client.ts`.
9. Build `IngredientRow` (traffic-light dot + name + note) and `IngredientActionBar` (Add / Report-wrong red / Ask-owner via `useQuestionCard`).
10. Render provenance line from aggregated rows; add VI/EN keys (placeholders — request product-approved copy).
11. Wire "Report wrong ingredient" through the feedback spine (`FeedbackEntryButton`/feedback flow) targeting the ingredient (entity type lands in phase-05/09).
12. `pnpm typecheck` + `pnpm lint`; run/extend restaurant + question-card unit tests.

## Todo
- [ ] `compatPercentFromCounts` helper + test
- [ ] `CompatRing` component (a11y, sb tokens)
- [ ] Detail ring card (headline + counts + distance)
- [ ] Google Maps directions button replaces OSM link
- [ ] Menu card links to `/restaurant/[id]/dish`
- [ ] Dish RSC page + `DishAtRestaurant` client feature
- [ ] Ingredients GET/POST API with Zod (writes needs_review/unverified)
- [ ] `useMenuItemIngredients` + client fetchers/Zod
- [ ] `IngredientRow` + `IngredientActionBar` (Add / Report-wrong / Ask-owner)
- [ ] Provenance line + VI/EN keys (product-approved)
- [ ] Report-wrong wired to feedback spine
- [ ] typecheck + lint + tests green

## Success Criteria
- Restaurant detail shows a % ring (derived from `counts`) with headline, `N/N/N` line, and distance; no A–E letter in the user view.
- "Open Google Maps" opens directions to the restaurant coords; absent when coords null.
- Tapping a menu item opens `/restaurant/[id]/dish` with the correct `menuItemId`.
- Dish page lists ingredients with correct traffic-light dots and a provenance line reflecting real `MenuItemIngredient` counts.
- Adding an ingredient persists a row that is `needs_review` + `unverified` + `user_contribution` (verified via DB query); it never shows as verified to users.
- "Create question for owner" produces a question card for that menu item; "Report wrong ingredient" enters the feedback flow.
- `pnpm typecheck`, `pnpm lint`, and restaurant/question-card unit tests pass.

## Risk Assessment
- **% formula is a product decision** → ship a documented, simple default (avoid=0, ask/unknown partial), unit-tested; flag for product sign-off, keep it swappable.
- **Depends on phase-05 table not yet merged** → if `MenuItemIngredient` is absent, the dish page and API cannot land; do not start API work until phase-05 migration is in.
- **Route rename coupling** → this phase assumes singular `/restaurant/[id]` from phase-02; if not renamed yet, links break — verify route exists first.
- **Offline** → ingredient fetch must degrade like `use-restaurant-detail` (online-guarded, no location cached).

## Security Considerations
- **Zod at both new boundaries** — reuse `restaurantIdOrSlugSchema`; validate `menuItemId` and ingredient POST body (reject unknown fields).
- **Human-in-the-loop invariant** — POST forces `reviewStatus=needs_review`, `verificationStatus=unverified`, `source=user_contribution`; the client cannot elevate these. Approval only via admin (phase-09).
- **No PII in URLs/cache** — only ids reach the URL (mirror `FeedbackEntryButton`'s rule); never cache `distanceMeters` (user location) — follow `use-restaurant-detail.ts` stripping.
- **Provenance honesty** — display self-declared vs user-contributed distinctly so users never mistake a crowd suggestion for restaurant/admin verification.

## Next Steps
- Unblocks **phase-09** (ingredient reports + `/admin/reports` review of `report wrong ingredient` and `approve_ingredient_correction`).
- Provides the dish-detail surface the **phase-13** agent's "Confirm/Edit → ingredient-correction" path routes into.
- Establishes the CompatRing reused by **phase-06** map pins and **phase-10** admin restaurant list.
