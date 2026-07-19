# Phase 08 — /famous curated dishes

## Context Links
- Plan overview: [`../plan.md`](../plan.md)
- Migration delta: [`../migration-delta.md`](../migration-delta.md) (§1 "Famous (Nổi tiếng)" row; §2.3 `Dish.isFamous`; §4 decision 9 "Famous signal")
- v2 mockup: `docs/design/safebite-ui-ux-mockups-v2.html` → **Nổi tiếng / Famous** tab (bottom-nav item `famous`)
- Depends on: [`phase-05-data-model-foundation.md`](./phase-05-data-model-foundation.md) — provides `Dish.isFamous` + `MenuItemIngredient`
- Key current files read:
  - `apps/web/src/features/dishes/dishes-client.ts` (fetch + Zod client)
  - `apps/web/src/app/api/v1/dishes/route.ts` (GET dishes by city)
  - `apps/web/src/lib/serializers.ts` (`dishToDTO`, `dishToEvaluationInput`, `statusToGroupKey`)
  - `apps/web/src/app/api/v1/recommendations/dishes/route.ts` (evaluate pattern)
  - `apps/web/src/components/status/status-badge.tsx` (`StatusBadge`)
  - `packages/domain/src/risk-engine.ts` (`evaluateDish`/`evaluateDishes`)
  - `apps/web/src/features/dishes/dish-card.tsx`, `apps/web/messages/en.json`

## Overview
- **Priority:** Medium (net-new user surface, parallelizable track)
- **Current status:** Not started
- **Effort:** M | **Risk:** low | **Depends on:** phase-05
- Build the **Nổi tiếng / Famous** tab: a curated list of famous local dishes, each rendered as a lightweight card carrying a profile-aware traffic-light status chip (reusing `StatusBadge` + the domain `evaluateDishes` engine), a VI description, ingredient chips, and a "N restaurants serving this near you" link. It is a **read-only, suggest-only** surface — no writes, no new verification state.

## Key Insights
- **The recommendation engine already does the hard part.** `evaluateDishes(profile, DishEvaluationInput[])` in `packages/domain/src/risk-engine.ts` returns `DishRecommendationCard[]` with a resolved `status` (`suitable|ask_first|risky|avoid|unknown`). `/api/v1/recommendations/dishes` (route.ts:38) already maps Prisma dishes through `dishToEvaluationInput` and evaluates them. Famous is the **same evaluation over a different `where` filter** (`isFamous: true` instead of the full city list).
- **`StatusBadge`** (`components/status/status-badge.tsx`) is a drop-in, i18n-driven (`useTranslations('statuses')`), color-token-only chip keyed by `RecommendationStatus`. Reuse verbatim for the per-dish chip — no new status UI.
- **Today there is no "famous" concept.** `Dish` (`schema.prisma:211`) has `regionTags`, `cuisine`, `descriptionVi/En`, `commonIngredientsVi/En` but **no `isFamous`** — that column is added in phase-05 (delta §2.3). Until then this phase is blocked on the migration.
- **Dish→restaurant aggregation exists in the data but has no query.** `MenuItem.dishId` is nullable and **indexed** (`schema.prisma:369` `@@index([dishId])`), so `groupBy({ by: ['dishId'], _count })` over `MenuItem` is cheap. There is no current endpoint returning a per-dish restaurant count.
- **DTO shape to extend:** `dishToDTO` (`serializers.ts:33`) returns `{ id, name, description, commonIngredients, regionTags, allergenRisks, … }`. Add `restaurantCount` + `isFamous` here (or a sibling serializer) rather than a second round-trip.
- **Client pattern to copy:** `dishes-client.ts` uses a Zod schema + `fetch` + `schema.parse(json.data)`. Famous client mirrors this exactly.
- **Gotcha — "near you":** true geo-proximity needs `Restaurant.lat/lon` + a radius query (phase-06 territory). For phase-08 keep it a **city-scoped count** ("N restaurants in {city}") and label copy honestly; wire real proximity only once map/geo lands. Avoid over-building (YAGNI).
- **Gotcha — profile-aware but profile-optional:** the Famous list must render for users **without** a profile (show dishes with a neutral/`unknown` chip or hide the chip), since it is a browse/discovery surface, unlike `/dishes` which gated on profile. Decide: no-profile → omit chip.

## Requirements
**Functional**
- New route `/[locale]/(app)/famous` listing dishes where `isFamous = true`, optionally narrowed by the user's `destinationCity` via `regionTags`.
- Each card shows: native VI (+ EN) dish name, `StatusBadge` verdict chip (profile-aware; omitted when no profile), VI description, up to N ingredient chips (from `commonIngredients`), and a "N restaurants near you" link to a filtered restaurant view.
- New aggregation: per-dish count of `MenuItem` rows referencing that `dishId` (city-scoped), surfaced as `restaurantCount` on the DTO **or** a dedicated `GET /api/v1/dishes/[dishId]/restaurants`.
- New `famous` i18n namespace in `messages/{en,vi}.json` (product-approved VI/EN keys — do **not** invent copy here).

**Non-functional**
- RSC-first: server component fetches + evaluates; a small client island only for language toggle / interactivity if needed. Files < 200 lines each.
- No hardcoded UI strings (`useTranslations`); `@/i18n/navigation` `Link` only; `sb-*` tokens only.
- Zod at both API boundaries (query params in, DTO out validated client-side).
- Read-only: introduces **no** new verification/review state; respects human-in-the-loop (no auto-writes).

## Architecture
```
/[locale]/(app)/famous/page.tsx        (RSC)
  └─ reads profile (server-safe subset) → calls fetchFamousDishes(city, profile)
        │
        ▼
  GET /api/v1/dishes?famous=true&city=hanoi        (extend existing route.ts)
        ├─ prisma.dish.findMany({ where:{ isFamous:true, regionTags:{has:city}, reviewStatus:'approved' }, include:{ allergenRisks } })
        ├─ prisma.menuItem.groupBy({ by:['dishId'], where:{ dishId:{ in:ids }, restaurant:{ city } }, _count:{ _all:true } })
        └─ dishToDTO(dish) + { isFamous, restaurantCount }
        │
        ▼
  evaluateDishes(profile, dtos.map(dishToEvaluationInput))   (profile present)
        │
        ▼
  <FamousDishCard status chip=StatusBadge  name  descriptionVi  ingredientChips  restaurantsLink />
```
- Reuse `dishToEvaluationInput` + `statusToGroupKey` from `serializers.ts`; reuse `RecommendationCard` internals only if they fit — otherwise a purpose-built `famous-dish-card.tsx` (leaner: chip + VI desc + chips + link).
- Restaurants link target: `/restaurant?dish={dishId}` or the map `/home` with a dish filter (coordinate with phase-06/07 route shape; leave a TODO if that route isn't final).

## Related Code Files
**Create**
- `apps/web/src/app/[locale]/(app)/famous/page.tsx` — RSC list page
- `apps/web/src/features/dishes/famous-dish-card.tsx` — lightweight card (chip + VI desc + ingredient chips + restaurants link)
- `apps/web/src/features/dishes/famous-client.ts` — Zod schema + `fetchFamousDishes` (mirror `dishes-client.ts`)

**Modify**
- `apps/web/src/app/api/v1/dishes/route.ts` — add `famous`/`region` query params + `restaurantCount` aggregation (or add `apps/web/src/app/api/v1/dishes/[dishId]/restaurants/route.ts` if kept separate)
- `apps/web/src/lib/serializers.ts` — extend `dishToDTO` (or add `dishToFamousDTO`) with `isFamous` + `restaurantCount`
- `apps/web/messages/en.json` + `apps/web/messages/vi.json` — new `famous` namespace (product-approved keys)
- `apps/web/src/components/app-shell/bottom-nav.tsx` — already gets the `famous` tab in phase-01; confirm `href:'/famous'` present

**Delete** — none.

## Implementation Steps
1. Confirm phase-05 merged: `Dish.isFamous` exists in `schema.prisma` and Prisma client regenerated; at least a few Hà Nội dishes seeded with `isFamous=true`.
2. Extend `querySchema` in `api/v1/dishes/route.ts` with `famous: z.coerce.boolean().optional()`; when set, add `isFamous: true` to `where`. Keep `review_status` default `approved`.
3. Add the aggregation: after `findMany`, `groupBy` `MenuItem` on `dishId` filtered to the returned ids and `restaurant.city = city`; build an `id → count` map.
4. Extend `dishToDTO` (or new `dishToFamousDTO`) to include `isFamous` and `restaurantCount` (default 0); return via `apiOk`.
5. Create `famous-client.ts`: Zod `famousDishSchema` (id, name bilingual, description nullableBilingual, commonIngredients, isFamous, restaurantCount, allergenRisks) + `fetchFamousDishes(city)`; `parse(json.data)`.
6. Create `famous-dish-card.tsx`: props `{ card: DishRecommendationCard | null, dish: FamousDish, lang }`. Render `StatusBadge` only when `card` present; VI description; map first N `commonIngredients` to chip spans (`sb-*` tokens); a `Link` "N restaurants near you" using a `famous.restaurantsNearby` key with `{count}` ICU.
7. Create `famous/page.tsx` (RSC): read profile subset; `fetchFamousDishes`; if profile present run `evaluateDishes` and zip cards by `dishId`; render header (`useTranslations('famous')`) + list. Handle empty/loading/no-profile states with existing `StateView`/`SkeletonCard`.
8. Add `famous` namespace keys to `en.json` + `vi.json` (screen title, ranked/suggest-only reminder, restaurants-nearby ICU, empty state, ingredient-chips label) — request product-approved VI/EN copy; keep keys parallel across both files.
9. Verify `bottom-nav.tsx` routes to `/famous` (from phase-01); ensure active-state highlight works.
10. Typecheck + lint + run domain/API tests; add a unit test for the aggregation mapping and a Zod-parse test for the famous client.

## Todo
- [ ] Confirm `Dish.isFamous` from phase-05 + seeded famous dishes
- [ ] Extend `api/v1/dishes` query schema with `famous` param
- [ ] Add `MenuItem` groupBy restaurant-count aggregation (city-scoped)
- [ ] Extend serializer with `isFamous` + `restaurantCount`
- [ ] Create `famous-client.ts` (Zod + fetch)
- [ ] Create `famous-dish-card.tsx` (chip + VI desc + ingredient chips + link)
- [ ] Create `famous/page.tsx` RSC with profile-aware `evaluateDishes`
- [ ] Add `famous` namespace to `en.json` + `vi.json` (product-approved copy)
- [ ] Confirm `/famous` bottom-nav tab + active state
- [ ] Typecheck, lint, tests (aggregation + client parse)

## Success Criteria
- `/[locale]/(app)/famous` renders famous dishes in both `vi` and `en` with **zero hardcoded strings** (all via `useTranslations('famous')`/`statuses`).
- With a profile, each card shows a correct `StatusBadge` verdict from `evaluateDishes`; without a profile the list still renders (chip omitted) — no crash.
- Each card shows `restaurantCount` matching a manual `MenuItem` count for that `dishId` in the city.
- `pnpm typecheck` / lint pass; new unit tests (aggregation map + `famousDishSchema.parse`) pass; existing suites green.
- All colors via `sb-*` tokens; all links via `@/i18n/navigation`; every API boundary Zod-validated.

## Risk Assessment
- **Blocked on phase-05** (`isFamous`): low risk, sequenced dependency — do not start route work until the column + seed land. *Mitigation:* stub the query behind the flag; ship UI against seeded data.
- **"Near you" over-promises without geo** (`lat/lon` proximity is phase-06): *Mitigation:* scope the count to city and choose honest copy (product-approved); add real radius later behind the same DTO field.
- **Restaurants-link target route unstable** (depends on phase-06/07 route shape): *Mitigation:* centralize the href, leave a TODO, land the list first.
- **N+1 / perf** if counting per dish: *Mitigation:* single `groupBy` keyed by `dishId`, not per-row queries.

## Security Considerations
- **Auth:** public read surface (same trust boundary as `/api/v1/dishes`); no PII, no auth required; no new writes so no CSRF surface.
- **Zod:** validate `famous`/`city` query params server-side and the DTO client-side; reject unknown params.
- **Provenance / human-in-the-loop:** only `reviewStatus='approved'` dishes shown; `restaurantCount` is a neutral aggregate, never implies verification. No field on this surface auto-marks data verified — it stays read-only and suggest-only.
- **On-device profile:** profile subset used for evaluation stays request-scoped; do not persist or log the posted profile.

## Next Steps
- Unblocks the map/dish-filter linkage: the "N restaurants near you" link becomes live once phase-06 (map `/home`) / phase-07 (restaurant detail) define the dish-filtered restaurant view.
- Feeds phase-13 (`/agent`): the agent can surface famous-dish suggestions reusing `fetchFamousDishes` + the same evaluation.
- Real geo-proximity swaps into `restaurantCount`/link once `lat/lon` radius queries exist.
