# Phase 05 — Data-model foundation (compat %, lat/lon on list, ingredient provenance, famous flag, source enums)

## Context Links
- Plan overview: [../plan.md](../plan.md)
- Migration delta (§2 data-model, §1 detail/dish rows): [../migration-delta.md](../migration-delta.md)
- Target mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — map home (Bản đồ, compat % pins), restaurant detail (% ring), dish-at-restaurant (ingredient rows + provenance), Nổi tiếng (famous), admin Reports.
- Current schema: `apps/web/prisma/schema.prisma`
- List/detail client Zod: `apps/web/src/features/restaurants/restaurants-client.ts`
- Serializers: `apps/web/src/lib/restaurant-serializers.ts`, `apps/web/src/lib/serializers.ts`
- Readiness scorer (source of `counts`): `packages/domain/src/restaurant-readiness.ts`
- Feedback domain Zod: `packages/domain/src/feedback/schemas.ts`

## Overview
- **Priority:** High (blocking foundation)
- **Current status:** Not started
- **Effort:** L
- **Risk:** High (Prisma migration on shared tables + a new join table with provenance)
- **Depends on:** phase-02
Land the schema, serializer, and DTO changes that unblock map, restaurant-dish detail, famous, and reports in one coherent migration. No UI in this phase — only the data contracts other phases build on. Every new/edited row is `needs_review`/`unverified` (human-in-the-loop); nothing is auto-verified.

## Key Insights
- **`counts` already exists and is the compat % source.** `evaluateRestaurantReadiness` (`restaurant-readiness.ts:70`) returns `RestaurantRecommendationCounts { suitable, askFirst, risky, avoid, unknown, total }` (`restaurant-types.ts:130`). The list route (`route.ts:34` `toListItem`) and detail route (`[restaurantIdOrSlug]/route.ts:104`) both already surface `rec.counts`. So compat % is a pure derivation over an existing shape — **no column, computed** — matching migration-delta §2.8.
- **lat/lon already flow on detail, not list.** `restaurantDetailDTO` and the detail route (`route.ts:86-87`) expose `lat/lon`; `detailResponseSchema` (`restaurants-client.ts:73-74`) validates them. The list path (`toListItem`, `restaurantSummaryDTO`, `listItemSchema`) omits them even though `Restaurant.lat/lon` columns exist (`schema.prisma:307-308`) and the list route already reads `r.lat/r.lon` for `haversineMeters` (`route.ts:123`). This is a DTO+Zod add only, no migration.
- **Ingredients are Dish-scoped today.** `DishIngredient` (`schema.prisma:242`) links Dish→Ingredient; `MenuItem` has only free-text `ingredientNotes` (`schema.prisma:355`). There is **no per-restaurant ingredient row and no provenance** — this is the one substantial new table.
- **Enums to extend live in two mirrored places.** Prisma `SourceType`/`EvidenceType` (`schema.prisma:44-64`) and Prisma `FeedbackEntityType` (`schema.prisma:142`), mirrored in domain Zod `FeedbackEntityTypeSchema` (`schemas.ts:69`). `MenuItemAllergenStatus.source`/`verificationStatus` are loose `String` (`schema.prisma:383,387`) — reuse that traffic-light/provenance string convention for the new table rather than inventing enums.
- **Traffic-light values.** User-facing suit=green/ask=yellow/avoid=red/unknown=grey. Engine statuses are `suitable|ask_first|risky|avoid|unknown` (`RecommendationStatus`, `schema.prisma:36`). Ingredient `status` should reuse the same 5-value vocabulary for consistency (v2 collapses `risky` into ask/avoid only at the presentation layer — open decision #10, not resolved here).
- **Dish DTO filtering.** `dishToDTO` (`serializers.ts:33`) is the single public Dish serializer — the famous flag is added here and consumed by `/famous`.
- **Gotcha:** `lat/lon` are `Decimal(10,7)`; serializers must coerce with the existing `num()` helper (`restaurant-serializers.ts:13`) — never leak `Decimal` into JSON.
- **Gotcha:** `FeedbackReport` already has `reviewedBy` (`schema.prisma:452`, admin actor). The new "reporter reference" is a *submitter* field — name it distinctly (`reporterRef`) to avoid conflation; nullable to preserve the deliberate anonymity boundary (open decision #7).

## Requirements
### Functional
1. List DTO exposes `lat`/`lon` (nullable numbers) so the map can pin without a second fetch.
2. A numeric compatibility % (0–100) derived from `counts` is exposed on both list and detail recommendation DTOs.
3. New `MenuItemIngredient` join stores per-restaurant ingredient rows with traffic-light `status`, `source`, `contributorType`, and `verificationStatus`; provenance is aggregatable ("restaurant self-declared + N user contributions").
4. `SourceType` gains `ocr`, `user_contribution`; `EvidenceType` gains `ocr`.
5. `Dish` gains a famous flag (`isFamous` + `featuredRank`); `dishToDTO` exposes them; Hà Nội famous dishes are seeded.
6. `FeedbackEntityType` (+ domain Zod) gains `ingredient`; `FeedbackReport` gains a nullable reporter reference.

### Non-functional
- Additive, backward-compatible migration (new nullable/defaulted columns + new table only); existing DTO consumers unaffected.
- Compat % is a pure function (domain), unit-testable, deterministic; no DB column.
- All UI-facing labels deferred to consumers via next-intl — this phase ships no strings. Files stay <200 lines; extract the scorer into its own domain module.

## Architecture
- **Compat scorer (domain):** new `packages/domain/src/restaurant-compatibility.ts` exporting `compatibilityPercent(counts: RestaurantRecommendationCounts): number`. Weighted over non-unknown items (e.g. suitable=1.0, askFirst=0.5, risky/avoid=0), rounded 0–100; `total===0` ⇒ `null`. Exported via `packages/domain/src/index.ts` barrel (alongside `evaluateRestaurantReadiness`, `index.ts:9`).
- **Serializer flow:** list route `toListItem` adds `lat/lon` (via `num()`) + `compatibility`; detail route adds `compatibility` in the `recommendation` block. Both read from already-loaded `Restaurant` + `rec.counts` — no extra query.
- **Provenance model:** `MenuItemIngredient { menuItemId, ingredientId, status, source, contributorType, verificationStatus, confidence?, note?, createdAt, updatedAt }`, `@@id([menuItemId, ingredientId])`, FKs cascade on delete, indexed by `menuItemId` and `status`. A provenance aggregation helper (domain, pure) rolls rows into `{ selfDeclared: bool, userContributionCount: number }` for the dish-at-restaurant view (phase consuming it later).
- **Data flow (unchanged spine):** Prisma row → `…-serializers` DTO → route `apiOk` → client Zod parse. Every new field added at all three layers in lockstep so the boundary can't drift (the existing pattern noted in `restaurants-client.ts` header).

## Related Code Files
### Modify
- `apps/web/prisma/schema.prisma` — extend `SourceType`, `EvidenceType`, `FeedbackEntityType`; add `Dish.isFamous`/`featuredRank`; add `FeedbackReport.reporterRef`; add `MenuItemIngredient` model + `MenuItem`/`Ingredient` back-relations.
- `apps/web/src/features/restaurants/restaurants-client.ts` — add `lat/lon` to `listItemSchema`; add `compatibility` to list item + detail `recommendation` schema.
- `apps/web/src/lib/restaurant-serializers.ts` — add `lat/lon` to `restaurantSummaryDTO`; add provenance aggregation `…Like` mapper if needed by the scorer input.
- `apps/web/src/lib/serializers.ts` — add `isFamous`/`featuredRank` to `dishToDTO`.
- `apps/web/src/app/api/v1/recommendations/restaurants/route.ts` — `toListItem` emits `lat/lon` + `compatibility`.
- `apps/web/src/app/api/v1/recommendations/restaurants/[restaurantIdOrSlug]/route.ts` — `recommendation` block emits `compatibility`.
- `packages/domain/src/feedback/schemas.ts` — add `'ingredient'` to `FeedbackEntityTypeSchema`.
- `packages/domain/src/index.ts` — export the compat scorer + provenance helper.
- `apps/web/prisma/seed.ts` — seed Hà Nội famous dishes (idempotent upsert, following the existing allergen-upsert pattern).

### Create
- `packages/domain/src/restaurant-compatibility.ts` — pure `compatibilityPercent` + provenance aggregation helper.
- `packages/domain/src/restaurant-compatibility.test.ts` — unit tests (edge cases: all-unknown, empty, all-suitable, mixed).
- A new Prisma migration under `apps/web/prisma/migrations/…`.

### Delete
- None.

## Implementation Steps
1. **Schema — enums:** add `ocr`, `user_contribution` to `SourceType`; `ocr` to `EvidenceType`; `ingredient` to `FeedbackEntityType`.
2. **Schema — Dish famous:** add `isFamous Boolean @default(false)` + `featuredRank Int?` with an index on `featuredRank`.
3. **Schema — FeedbackReport reporter:** add `reporterRef String? @map("reporter_ref")` (nullable, device-scoped, no FK — anonymity boundary).
4. **Schema — MenuItemIngredient:** add the model with traffic-light `status` (String, engine vocabulary), `source` (SourceType), `contributorType` (String: `restaurant|user|admin|ocr`), `verificationStatus String @default("unverified")`, optional `confidence Decimal @db.Decimal(3,2)`; back-relations on `MenuItem` and `Ingredient`; indexes on `menuItemId`, `status`.
5. **Migrate:** run `prisma migrate dev` (via `directUrl`, ADR-008); commit the generated SQL. Regenerate client.
6. **Domain scorer:** create `restaurant-compatibility.ts` with `compatibilityPercent` + provenance aggregation; export from `index.ts`.
7. **Domain Zod:** add `'ingredient'` to `FeedbackEntityTypeSchema`.
8. **List path:** `restaurantSummaryDTO` + `toListItem` emit `lat/lon` (`num()`) + `compatibility`; extend `listItemSchema` to match.
9. **Detail path:** detail route `recommendation` block emits `compatibility`; extend detail `recommendation` Zod.
10. **Dish DTO:** add `isFamous`/`featuredRank` to `dishToDTO`.
11. **Seed:** add Hà Nội famous dishes (idempotent upsert; each `reviewStatus: needs_review`, `isFamous: true`, sequential `featuredRank`) — add product-approved VI/EN canonical names.
12. **Verify:** typecheck the monorepo, run domain tests, run existing restaurant-recommendation route tests to confirm additive-only.

## Todo
- [ ] Extend `SourceType`/`EvidenceType`/`FeedbackEntityType` enums (Prisma)
- [ ] Add `Dish.isFamous` + `featuredRank` (+ index)
- [ ] Add `FeedbackReport.reporterRef` (nullable)
- [ ] Add `MenuItemIngredient` model + back-relations + indexes
- [ ] Generate + commit migration; regenerate Prisma client
- [ ] Create `restaurant-compatibility.ts` (scorer + provenance agg) + tests; export from barrel
- [ ] Add `'ingredient'` to `FeedbackEntityTypeSchema` (domain Zod)
- [ ] Emit `lat/lon` + `compatibility` on list DTO + `listItemSchema`
- [ ] Emit `compatibility` on detail `recommendation` + Zod
- [ ] Add `isFamous`/`featuredRank` to `dishToDTO`
- [ ] Seed Hà Nội famous dishes (needs_review, product-approved VI/EN names)
- [ ] Typecheck + domain tests + route tests green

## Success Criteria
- `prisma migrate dev` applies cleanly and is reversible-safe (additive only); `prisma generate` succeeds.
- `compatibilityPercent` unit tests pass, incl. edge cases (empty→null, all-unknown, all-suitable=100).
- List API responses include numeric `lat`/`lon` and `compatibility`; detail `recommendation` includes `compatibility`; client Zod parses without error (parse would throw otherwise — this is the assertion).
- `dishToDTO` output includes `isFamous`/`featuredRank`; seed run marks the Hà Nội set famous and `needs_review`.
- Monorepo typecheck passes; existing restaurant recommendation route/domain tests remain green (proving backward compatibility).

## Risk Assessment
- **Migration on shared tables (high):** keep strictly additive (nullable/defaulted + new table). Mitigation: no column drops/renames; review generated SQL before commit.
- **Compat % vs A–E divergence:** two safety scales could confuse. Mitigation: derive % from the same `counts` the class uses; document the weighting; v2 detail shows the % ring, class stays internal.
- **Provenance model over-design (YAGNI):** ship only fields the dish-at-restaurant + admin views need now; defer OCR-photo linkage to the OCR-review phase.
- **Enum mirror drift:** Prisma `FeedbackEntityType` and domain Zod must both gain `ingredient`. Mitigation: change both in the same commit; step 12 typecheck catches mismatches at usage sites.

## Security Considerations
- **Zod at every boundary:** new DTO fields validated in `restaurants-client.ts` and any new write path; loose strings (`status`, `contributorType`) constrained to enums/`z.enum` where they cross the API.
- **Human-in-the-loop:** `MenuItemIngredient` and famous seed rows default to `verificationStatus: unverified` / `reviewStatus: needs_review`; no user/OCR contribution is auto-verified — approval happens in the admin phases.
- **PII / anonymity:** `reporterRef` is nullable and device-scoped, with no FK to a person; it preserves the existing anonymous-feedback boundary (open decision #7) and stores no location or identity.
- **Provenance integrity:** `source`/`contributorType` are set server-side from the authenticated action context, never trusted from the client body, so a user contribution can never masquerade as restaurant-declared.

## Next Steps
Unblocks: map home (`lat/lon` + compat % pins), restaurant detail % ring, dish-at-restaurant ingredient rows + provenance + "report wrong ingredient" (`ingredient` entity type + `reporterRef`), `/famous` (famous flag + seed), admin Reports reporter column, and the admin OCR-review + import phases (new `SourceType`/`EvidenceType` values).
