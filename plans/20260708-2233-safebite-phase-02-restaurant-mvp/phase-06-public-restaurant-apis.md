# Phase 06 — Public restaurant APIs

**Context:** Spec §8, §11, §16 · pattern from `api/v1/dishes/route.ts`, `api/v1/recommendations/dishes/route.ts`, `lib/api-response.ts`, `lib/serializers.ts`. Depends on Phase 01 (evaluators) + Phase 02 (schema).

## Overview
- **Priority:** P0.
- **Status:** Not started.
- Public browse (non-personalized) + personalized recommendation endpoints. Profile always in **POST body**, never URL/query. Zod at every boundary; `apiOk`/`apiError` envelope; public DTO serializers (never raw Prisma). Only `reviewStatus=approved` rows public.

## Key insights (verified)
- Public recommendation pattern already exists for dishes: profile posted in body, validated by `recommendationRequestSchema` (domain). Mirror it for restaurants (extend with `filters`, `clientLocation`, `limit`, `cursor`).
- Distance: **Haversine** server-side from `clientLocation` (Phase 02 keeps Decimal lat/lon). Never store user location.
- Attribution: responses include `attribution` (e.g. "© OpenStreetMap contributors") when OSM/OpenMap rows present.

## Endpoints (§8)
1. `GET /api/v1/restaurants?city&district&q&cuisine&limit&cursor` — non-personalized list; `reviewStatus=approved` only; `hasMenuItems` computed; `attribution`. (§8.1)
2. `GET /api/v1/restaurants/[restaurantIdOrSlug]` — metadata + raw menu rows, no personalization. (§8.2)
3. `POST /api/v1/recommendations/restaurants` — body `{ profile, city, filters{district,q,cuisine,sort}, clientLocation?, limit, cursor }`; runs `evaluateRestaurantReadiness` per restaurant over its menu recommendations; returns readiness/counts/summary/source/verification/menu/stale + `distanceMeters` when location given; sort `recommended|nearest|last_checked|name`. (§8.3)
4. `POST /api/v1/recommendations/restaurants/[restaurantIdOrSlug]` — body `{ profile, clientLocation? }`; returns restaurant + recommendation + `menuRecommendations[]` via `evaluateMenuItem`. (§8.4)

## Requirements
- Resolve `restaurantIdOrSlug` by id OR slug.
- Load menu items + `MenuItemAllergenStatus` + mapped dish risks; feed `evaluateMenuItem` (evidence priority), then `evaluateRestaurantReadiness`.
- Visibility: exclude `rejected`; never expose `needs_review` publicly (no dev flag unless protected). Discovery-only rows return readiness C + "Menu allergy data not available yet" summary + "Discovery data only" source label (§4.4).
- Cursor pagination consistent with existing list pattern.
- Sort defaults (§11.4): recommended (profile present), nearest (location + explicit), name (no context).

## Related code files
- Create: `api/v1/restaurants/route.ts`, `api/v1/restaurants/[restaurantIdOrSlug]/route.ts`, `api/v1/recommendations/restaurants/route.ts`, `api/v1/recommendations/restaurants/[restaurantIdOrSlug]/route.ts`; `lib/restaurant-serializers.ts`; `lib/geo/haversine.ts`.
- Modify: `lib/serializers.ts` if shared helpers; domain request/response schemas already from Phase 01.

## Implementation steps
1. Haversine util + distance sort.
2. Public browse GET + serializer (approved-only, attribution, hasMenuItems).
3. Detail GET (metadata + raw menu rows).
4. Recommendation POST (list): load rows, evaluate, sort, paginate.
5. Recommendation POST (detail): full menu recommendations.
6. Reject profile-in-query attempts (schema has no such params; recommendation is POST-only).

## Todo
- [ ] Haversine util
- [ ] GET browse (approved-only + attribution)
- [ ] GET detail
- [ ] POST recommendations list
- [ ] POST recommendations detail
- [ ] Serializers (Decimal→number, no internal notes)

## Success criteria
Browse returns only approved; recommendation accepts profile in body and NOT query; detail returns menu recommendations with status/reason/source/confidence/last-checked; discovery-only ⇒ C; distance present only with clientLocation; attribution shown for OSM rows.

## Risks
- N+1 on menu/allergen loads → use Prisma `include`/batched queries.
- Decimal in domain Zod → serialize before evaluation.

## Security
No profile/allergen in URL (§16.1). Zod on path/query/body. Public serializer omits internal `notes`, exact source internals stay minimal but source label + verification exposed (§16.4).

## Next
Unblocks Phase 07 (public UI).
