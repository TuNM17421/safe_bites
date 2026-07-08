# Phase 01 — Domain types & evaluators

**Context:** Spec §7, §15, §17.1 · `packages/domain/src/*` · consumed as raw TS (no build step), tested with Vitest under `packages/domain/tests/`.

## Overview
- **Priority:** P0 (everything downstream depends on the contract).
- **Status:** Not started.
- Add restaurant/menu Zod schemas, types, and two pure evaluators + a staleness util, mirroring the existing dish `risk-engine.ts` design. Framework-free, `zod` only.

## Key insights (verified)
- No `AllergyProfile`/`LocalizedText` exist → use **`LocalUserProfile`** and **`Bilingual`**.
- Reuse: `RecommendationStatus` union, `RiskLevel`, `Severity`, `STATUS_RANK` (suitable 1, unknown 2, ask_first 3, risky 4, avoid 5 — **strictest wins**, `unknown` outranks `suitable`), `isConservative(severity, cross)` logic, `CONFIDENCE_HIGH=0.8`/`CONFIDENCE_MEDIUM=0.55`, and the copy `suitableCaveat` override.
- The safety invariant pattern (throw if `unknown` resolves to `suitable`) must be replicated for menu items.
- `EvidenceType` already includes `menu_observed`, `restaurant_verified` — reuse; do **not** add LLM/OCR values that create facts.

## Requirements
Add Zod schemas + inferred types (§7.1): `RestaurantSource`, `RestaurantReviewStatus`, `RestaurantVerificationStatus`, `RestaurantMenuStatus`, `MenuItemRiskSource`, `SharedCookware`/`SharedFryer`, `GeoPoint`, `RestaurantMenuItem(Like)`, `MenuItemAllergenStatus(Like)`, `RestaurantLike`, `MenuItemRecommendation`, `RestaurantRecommendation` (+`RestaurantRecommendationCounts`, `RestaurantReadinessClass`), `RestaurantRecommendationRequest`/`Response`, `RestaurantSummary`, `RestaurantDetail`.

Enum string values (match spec §5 + Prisma):
- verification: `unverified|restaurant_contacted|restaurant_confirmed|admin_verified|expired|flagged`
- menu_status: `not_observed|menu_url_available|observed_not_verified|restaurant_submitted|admin_verified`
- allergen-status source: `admin_manual|restaurant_submitted|official_menu|user_report|dish_inferred`
- shared_cookware: `unknown|no|yes|possible`; shared_fryer: `+ not_applicable`; can_customize: `true|false|unknown`.

## Functions to implement
1. `evaluateMenuItem(input): MenuItemRecommendation` — evidence priority (§7.3): explicit allergen status `admin_verified` > `restaurant_submitted` > `admin_manual`/`official_menu` > mapped dish recommendation (from existing dish engine output) > `unknown`. Classification (§7.4) per active allergen, strictest across allergens via `STATUS_RANK`. `contains`/`likely_contains`→Avoid; `possible`→Risky if conservative else Ask First; `unlikely`→Suitable only if evidence verified & cross-contact not unknown for severe, else Ask First; `unknown`→Unknown. **Never** Suitable when any input risk is unknown (throw-guard). Suitable action always appends confirm-with-staff caveat.
2. `evaluateRestaurantReadiness(input): RestaurantRecommendation` — deterministic A–E (§7.6) from menu recommendations + counts. **Hard caps:** discovery-only or no-menu or no-mapping ⇒ max **C**; unverified dish-inferred ⇒ max **B**; expired ⇒ cap B + downgrade confidence; flagged ⇒ max **D**. Build `counts`, `summary` (Bilingual), `reasons`.
3. `isStale(lastCheckedAt, sourceType, now): boolean` (§7.7) — thresholds admin_verified 60d / restaurant_submitted 30d / official_menu·admin_manual 45d / discovery 90d. Stale ⇒ downgrade confidence one level (applied in evaluators).

Export all new symbols from `packages/domain/src/index.ts`.

## Related code files
- Create: `restaurant.ts`, `menu-item.ts`, `restaurant-schemas.ts` (or extend `schemas.ts`/`types.ts`), `staleness.ts`.
- Modify: `index.ts`, possibly `constants.ts` (readiness thresholds/tables), `copy.ts` (restaurant summary phrases — keep denylist-safe).
- Tests: `tests/menu-item.test.ts`, `tests/restaurant-readiness.test.ts`.

## Implementation steps
1. Add schemas/types with `z.infer`. Keep files < 200 lines; split evaluator helpers.
2. Implement `evaluateMenuItem` reusing `isConservative`, `STATUS_RANK`, `mapConfidence` logic; wire staleness downgrade.
3. Implement `evaluateRestaurantReadiness` with explicit cap functions.
4. Add `isStale`.
5. Unit tests covering every §17.1 bullet.
6. `pnpm --filter @safebite/domain typecheck && test`.

## Todo
- [ ] Schemas + types + exports
- [ ] `evaluateMenuItem` + guard
- [ ] `evaluateRestaurantReadiness` + caps
- [ ] `isStale`
- [ ] Unit tests (all §17.1 cases) green

## Success criteria
All §17.1 unit tests pass; typecheck clean; no Suitable-for-unknown path; discovery-only never verifies; caps enforced; strictest-status aggregation matches dish guide ordering.

## Risks
- Divergence from dish-engine semantics → reuse its helpers, don't re-derive.
- Over-engineering readiness → keep rules literal per §7.6; YAGNI.

## Security
No profile persisted here; pure functions. Copy must pass denylist (§16, §2.3).

## Next
Unblocks Phase 06 (public recommendation APIs). Independent of schema Phase 02, but recommendation APIs need both.
