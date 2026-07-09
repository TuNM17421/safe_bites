# Phase 01 — Domain Feedback Core

## Context Links
- Spec: `docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md` §7.1 (enums), §8 (all), §11.3–11.6 (cap/suppress/hide/source-label), §2.2 (safety invariants), §18 (FeedbackSummary), §20.1 (domain unit tests).
- Reality map: `plans/20260709-1013-safebite-phase-03-feedback-loop/research/codebase-reality-map.md` §0, §2.
- Contract: `plans/20260709-1013-safebite-phase-03-feedback-loop/research/interface-contract.md` (Domain section).
- Downstream: [[phase-02-prisma-persistence]] (Prisma), [[phase-03-public-feedback-api]] (services/routes). This phase produces **NO** Prisma and **NO** API code.

## Overview
- **Priority:** P0 — foundational. Spec §23: "Do not start with admin UI. Start with domain/schema/API… broken trust logic is just a spreadsheet wearing perfume."
- **Current status:** ✅ Done (implemented 2026-07-09). 37 new domain tests pass (25 signals + 12 apply); full `quality` gate green (typecheck, lint, 133 tests, copy:check). Note: `applyFeedbackSignalsToMenuItem` rewrites `source` to the review marker — [[phase-04-recommendation-integration]] must compute readiness from BASE (pre-feedback) menu recs (ordering correction applied to phase-04).
- Build the pure, framework-free, DB-free feedback trust logic in `packages/domain/src/feedback/`: enum unions + parallel `z.enum`, DTO/signal Zod schemas, `FeedbackSignal`/`FeedbackSummary`/`FeedbackFlagSpec` types, and the pure decision/adjustment functions. Fully unit-tested in the `quality` CI job (no DB). Everything else (persistence, HTTP, UI) depends on the names fixed here.

## Key Insights (grounded facts + spec deltas)
- **Real return types are `MenuItemRecommendation` (`restaurant-types.ts:104-119`) and `RestaurantRecommendation` (`:146-158`)**, not the spec's `MenuItemEvaluation`/`RestaurantReadinessEvaluation`. `MenuItemRecommendation` has `status: RecommendationStatus`, `confidence: ConfidenceLabel`, `confidenceScore: number`, `reason: Bilingual`, `source: string`. `RestaurantRecommendation` has `readinessClass:'A'..'E'`, `confidence: ConfidenceLabel`, `reasons: Bilingual[]` (array), `summary: Bilingual`, `source: string`.
- **Status codes are snake_case** (`types.ts:9`): `'suitable'|'ask_first'|'risky'|'avoid'|'unknown'`. Emit/compare these — never the Title-case labels (those live only in `copy.ts`).
- **`STATUS_RANK`** (from `constants.ts`, re-exported): `suitable:1, unknown:2, ask_first:3, risky:4, avoid:5` (higher = more cautious). Use this as the monotonic-caution guard: feedback may only raise rank, never lower it.
- **`downgradeConfidence(label)`** (`staleness.ts:25-29`) already does "one level, floor low". **Reuse it**; it touches the label only, never `confidenceScore` (leave `confidenceScore` untouched — documented in contract).
- **Suitable invariant**: `menu-item.ts:160` throws if unknown risk resolves to `suitable`. Feedback logic must never build a path *toward* `suitable`; it only makes things more cautious.
- **No `profileAllergenIds` var exists** — functions take it as an explicit `string[]` arg (caller derives `new Set(profile.allergies.map(a => a.allergenId))`).
- **Enum convention**: hand-written snake_case string-literal `type` unions mirrored by parallel `z.enum([...])` in `schemas.ts` (matches `schemas.ts:3-6`). Composite DTOs (`FeedbackReportInput`, response) may use `z.infer` of their Zod schema — new pattern, scoped to feedback DTOs only.
- **Copy is bilingual-by-value**: add `Bilingual` consts to `restaurant-constants.ts` and export them from package `index.ts` (that file is not currently re-exported). Avoid the substring `verified_safe`; do not emit banned phrases (`this dish is safe`, etc.). Internal source marker string is `feedback_under_review` (safe substring).

## Cross-cutting safety invariants (this phase enforces the trust core)
1. Feedback **never emits `suitable`**; unknown never → suitable.
2. Positive / no-reaction feedback never upgrades status/readiness/confidence.
3. `getFeedbackPriority` = `urgent` for `severe`/`anaphylaxis_or_emergency`; `shouldAutoCreateFeedbackFlag` true **only** for those two.
4. Resolved/dismissed/expired/`spam` signals contribute **zero** weight and are ignored.
5. Allergen-scoped flags only affect matching profile allergens (`allergenId == null` = matches all).
6. Domain stays framework-free (no Prisma, no next, no fetch). Copy passes `copy:check`.

## Requirements
### Functional
- Zod schemas: `FeedbackReactionSchema`, `FeedbackReactionTimingSchema`, `StaffAnswerSchema`, `FeedbackReportInputSchema`, `FeedbackReportResponseSchema`, `FeedbackAdminActionInputSchema`, `FeedbackFlagSchema`, `FeedbackSignalSchema`, `FeedbackSummarySchema`.
- Union types: `FeedbackReaction`, `FeedbackReactionTiming`, `StaffAnswer`, `FeedbackPriority`, `FeedbackFlagEffect`, `FeedbackFlagStatus`, `FeedbackEntityType`. Object types: `FeedbackSignal`, `FeedbackSummary`, `FeedbackFlagSpec`.
- Pure functions (exact contract signatures): `getFeedbackPriority`, `shouldAutoCreateFeedbackFlag`, `buildAutoFlagSpecs`, `feedbackSignalWeight`, `applyFeedbackSignalsToMenuItem`, `applyFeedbackSignalsToRestaurantReadiness`, `summarizeFeedbackSignals`.
- Bilingual copy consts + `publicReasonKey` values in `restaurant-constants.ts`, exported.

### Non-functional
- Every file < 200 lines, kebab-case. No DB/framework imports. Deterministic (accept `now?` for time). All exports flow through package `index.ts`. `pnpm --filter @safebite/domain typecheck` + domain vitest green with no DB.

## Architecture
Data/flow (all pure):
```
report input ──► getFeedbackPriority ──► priority
             └─► shouldAutoCreateFeedbackFlag ──► buildAutoFlagSpecs ──► FeedbackFlagSpec[]   (→ phase-02 persists)

active flag rows (phase-03 mapper) ──► FeedbackSignal[]
   FeedbackSignal[] + MenuItemRecommendation + profileAllergenIds + severityByAllergen
        └─► applyFeedbackSignalsToMenuItem ──► adjusted MenuItemRecommendation
   FeedbackSignal[] + RestaurantRecommendation + profileAllergenIds
        └─► applyFeedbackSignalsToRestaurantReadiness ──► adjusted RestaurantRecommendation
   FeedbackSignal[] ──► summarizeFeedbackSignals ──► FeedbackSummary   (→ API response)
```
- **Matching (§11.2):** a signal matches when `signal.allergenId == null || profileAllergenIds.includes(signal.allergenId)`, AND its `entityId` matches the recommendation's `restaurantId`/`menuItemId`/`dishId`, AND `feedbackSignalWeight > 0`.
- **Monotonic-caution guard:** after computing a candidate status, `if (STATUS_RANK[next] < STATUS_RANK[current]) next = current`. Guarantees "never upgrade / never emit suitable".

## Related Code Files
### Create
- `packages/domain/src/feedback/schemas.ts` — enum unions + `z.enum`, DTO/signal/summary/flag schemas, `z.infer` DTO exports.
- `packages/domain/src/feedback/signals.ts` — `getFeedbackPriority`, `shouldAutoCreateFeedbackFlag`, `buildAutoFlagSpecs`, `feedbackSignalWeight`, `summarizeFeedbackSignals`, `FeedbackSignal`/`FeedbackSummary`/`FeedbackFlagSpec` types, matching helpers.
- `packages/domain/src/feedback/apply-feedback-signals.ts` — `applyFeedbackSignalsToMenuItem`, `applyFeedbackSignalsToRestaurantReadiness`.
- `packages/domain/src/feedback/index.ts` — `export * from './schemas'; export * from './signals'; export * from './apply-feedback-signals';`.
- `packages/domain/tests/feedback-signals.test.ts`, `packages/domain/tests/feedback-apply.test.ts`.
### Modify
- `packages/domain/src/restaurant-constants.ts` — add `FEEDBACK_UNDER_REVIEW_REASON`, `FEEDBACK_UNDER_REVIEW_SUMMARY` (+ severe variants) `Bilingual` consts and `FEEDBACK_UNDER_REVIEW_SOURCE = 'feedback_under_review'`.
- `packages/domain/src/index.ts` — add `export * from './feedback';` and export the new copy consts.
### Delete
- None.

## Implementation Steps
1. **Copy consts** in `restaurant-constants.ts`: `FEEDBACK_UNDER_REVIEW_REASON`/`FEEDBACK_UNDER_REVIEW_SUMMARY` (calm, hedged, EN+VI — mirror `MENU_UNKNOWN_COPY` tone; e.g. EN reason "Recent feedback for this item is under review. Ask staff directly before ordering."), plus severe variants for `publicReasonKey` `feedback_under_review_severe`/`feedback_under_review_severe_item`. Export const `FEEDBACK_UNDER_REVIEW_SOURCE = 'feedback_under_review'`. Verify no banned substrings (`verified_safe`, `guaranteed safe`, `this dish is safe`).
2. **`schemas.ts`**: declare the 7 enum unions as `type`, each with a parallel `z.enum([...])` (mirror `schemas.ts:3-6`). Build `FeedbackReactionSchema`, `FeedbackReactionTimingSchema`, `StaffAnswerSchema`. Then `FeedbackReportInputSchema` (fields per spec §9.1/§9.3 with limits: `staffAnswerText`/`notes` `.max(500)`, `allergenIds` `.max(10)`, `userTrustRating` `.int().min(1).max(5)`, `visitedAt` future ≤30d / past ≤180d refine, `clientReportId`/`restaurantId`/`city`/`reaction` required, `profileSnapshot` minimal object of `{allergies, selectedProfileIds}`). `FeedbackReportResponseSchema`, `FeedbackAdminActionInputSchema` (actionType + optional `target:{entityType,entityId,allergenId?}` + `note.max(1000)` + `expiresAt?`), `FeedbackFlagSchema`, `FeedbackSignalSchema`, `FeedbackSummarySchema`. Export `type FeedbackReportInput = z.infer<typeof FeedbackReportInputSchema>` etc. **`readinessCap` allowed values `'A'|'B'|'C'|'D'|'E'`.**
3. **`signals.ts` types**: `FeedbackSignal` per spec §8.2; `FeedbackSummary` = `{ hasActiveFlags; highestPriority?; pendingReviewCount; recentReportCount; lastReportAt?; publicMessageKey?: 'feedback_under_review'|'feedback_under_review_severe'|'feedback_under_review_severe_item' }`; `FeedbackFlagSpec` = the shape phase-02 persists (`entityType, entityId, restaurantId?, menuItemId?, dishId?, allergenId?, effect, priority, status:'active', reason, publicReasonKey, readinessCap?, confidenceDelta?, expiresAt?`).
4. **`getFeedbackPriority`**: `anaphylaxis_or_emergency`→`urgent`; `severe`→`urgent`; `moderate`→`high`; `mild`→`normal`; `none`→`low`; `not_sure`/`prefer_not_to_say`→`normal` (spec §8.4).
5. **`shouldAutoCreateFeedbackFlag`**: `true` iff `reaction==='severe' || reaction==='anaphylaxis_or_emergency'`.
6. **`buildAutoFlagSpecs`** (§17.3): return `[]` unless `shouldAutoCreateFeedbackFlag`. Iterate `allergenIds` (or a single `[null]` when empty). Always emit restaurant spec `effect='cap_restaurant_readiness', readinessCap='D', priority='urgent', publicReasonKey='feedback_under_review_severe'`. If `menuItemId` → menu spec `effect='suppress_suitable', priority='urgent', publicReasonKey='feedback_under_review_severe_item'`. Else if `dishId` → dish spec `effect='flag_for_review', priority='high', publicReasonKey='feedback_under_review'`. All `status:'active'`, scoped `allergenId`, `reason` from the copy consts.
7. **`feedbackSignalWeight`** (§8.4 decay): non-active status (`resolved`/`dismissed`/`expired`) → `0`. Active + `priority==='urgent'` → `1.0` (severe/anaphylaxis do not decay). Else by age `now-createdAt`: `0–30d→1.0, 31–90d→0.7, 91–180d→0.4, >180d→0.15`. Default `status='active'`, `now=new Date()`.
8. **`applyFeedbackSignalsToMenuItem`** (§11.4): filter signals to menu-item/restaurant/dish matches with weight>0 and allergen match. For `suppress_suitable` **or** severe `hide_recommendation`: if current `status==='suitable'` → set to `risky` when any matched allergen severity ∈ {`severe`,`anaphylaxis_risk`} (from `severityByAllergen`), else `ask_first`; append `FEEDBACK_UNDER_REVIEW_REASON`, set `source` to include `FEEDBACK_UNDER_REVIEW_SOURCE`, `confidence = downgradeConfidence(confidence)`. For `downgrade_confidence`: keep status, downgrade confidence, set reason. For `hide_recommendation` (non-severe): status→`risky`/`unknown` (whichever is more cautious than current, never below), review reason. Apply monotonic guard `STATUS_RANK[next] >= STATUS_RANK[current]`; **never** set `suitable`. Leave `confidenceScore` unchanged.
9. **`applyFeedbackSignalsToRestaurantReadiness`** (§11.3): collect matched `cap_restaurant_readiness` caps → most conservative = `Math.min` over `CLASS_RANK[cap]` (E rank 1 is strictest; keeps `E` as `E`). New `readinessClass = classFromRank(Math.min(currentRank, capRank))`. On any matched cap/`flag_for_review`: push `FEEDBACK_UNDER_REVIEW_SUMMARY` into `reasons[]`, `confidence = downgradeConfidence(confidence)`, mark `source` with the review marker. Never raise readiness.
10. **`summarizeFeedbackSignals`**: over matched active signals (weight>0). `hasActiveFlags = matched.length>0`; `highestPriority` = max by `low<normal<high<urgent`; `pendingReviewCount`/`recentReportCount` from matched signals (recent = weight≥0.7); `lastReportAt` = max `createdAt`; `publicMessageKey` = `feedback_under_review_severe_item` if any matched `suppress_suitable` menu signal is urgent, else `feedback_under_review_severe` if any urgent `cap_restaurant_readiness`, else `feedback_under_review` (only when `hasActiveFlags`).
11. **Wire exports**: `feedback/index.ts` re-exports all three modules; package `index.ts` adds `export * from './feedback';` and the new copy consts.
12. **Unit tests** (spec §20.1) in the two test files — see Todo. Run `pnpm --filter @safebite/domain test` + `typecheck` + root `pnpm copy:check`.

## Todo List
- [ ] Add feedback copy consts (+source marker) to `restaurant-constants.ts`; export from package index.
- [ ] `schemas.ts`: enum unions + `z.enum` + reaction/timing/staff schemas.
- [ ] `schemas.ts`: `FeedbackReportInputSchema` with all limits/refines + `FeedbackReportResponseSchema`, `FeedbackAdminActionInputSchema`, `FeedbackFlagSchema`, `FeedbackSignalSchema`, `FeedbackSummarySchema`; `z.infer` DTO exports.
- [ ] `signals.ts`: `FeedbackSignal`/`FeedbackSummary`/`FeedbackFlagSpec` types + matching helpers.
- [ ] `getFeedbackPriority` + `shouldAutoCreateFeedbackFlag`.
- [ ] `buildAutoFlagSpecs` (restaurant/menu/dish, allergen-scoped, §17.3).
- [ ] `feedbackSignalWeight` (decay table + no-decay for active urgent + zero for non-active).
- [ ] `summarizeFeedbackSignals` (publicMessageKey precedence).
- [ ] `apply-feedback-signals.ts`: `applyFeedbackSignalsToMenuItem` (+monotonic guard, no `suitable`).
- [ ] `apply-feedback-signals.ts`: `applyFeedbackSignalsToRestaurantReadiness` (cap + most-conservative).
- [ ] `feedback/index.ts` + package `index.ts` exports.
- [ ] Tests: priority mapping; auto-flag only severe/anaphylaxis; decay over time; no-upgrade-to-suitable; suppress-suitable→risky (severe) / ask_first (mild); cap A/B/C→D & E→E; no-reaction no-op; resolved/dismissed/expired ignored; allergen-scoped matching only.
- [ ] `pnpm --filter @safebite/domain typecheck && test`; root `pnpm copy:check` green.

## Success Criteria
- All 9 domain unit tests from spec §20.1 pass, exercising each pure function including the invariants (no upgrade to suitable; suppress-suitable severity split; A/B/C→D & E→E cap; ignore non-active flags; allergen scoping).
- `applyFeedbackSignalsToMenuItem`/`...RestaurantReadiness` return the **real** `MenuItemRecommendation`/`RestaurantRecommendation` shapes, mutated conservatively only.
- Package `index.ts` re-exports every new symbol; `@safebite/domain` typechecks; no Prisma/framework import anywhere under `feedback/`.
- `pnpm copy:check` passes with the new bilingual copy.
- Validate: `pnpm --filter @safebite/domain test && pnpm --filter @safebite/domain typecheck && pnpm copy:check`.

## Risk Assessment
- **Accidentally lowering caution** (e.g. `hide_recommendation` producing a milder status) → mitigate with the single `STATUS_RANK` monotonic guard applied to every status write.
- **Cap direction bug** (E→D upgrade) → reuse readiness rank semantics where lower rank = stricter and use `Math.min`; explicit E→E test.
- **Copy guard failure** on new strings → keep hedged wording, run `copy:check` before finishing; avoid `verified_safe`/"safe" claims.
- **Signature drift from downstream** → names/shapes are fixed by the contract; do not rename. If a name truly must change, update the contract first and flag it.
- **Decay ambiguity for severe** → severe/anaphylaxis map to `priority='urgent'`; the weight fn short-circuits urgent+active to 1.0 (no decay), matching §8.4.

## Security & Privacy Considerations
- Domain functions operate on already-minimized inputs — they must **not** ingest or echo raw `notes`/`staffAnswerText`; `summarizeFeedbackSignals` and the apply fns expose aggregate-only fields (counts, priority, review key), never free text (invariant §5 of contract).
- No allergy/profile identifiers in any emitted reason/summary string. `severityByAllergen` is a plain map consumed for branching only, never rendered.
- `FeedbackReportInputSchema` enforces length caps and the 30d-future/180d-past `visitedAt` bounds so downstream persistence can trust bounds (defense at the boundary begins here).
- No geolocation fields anywhere in feedback types/schemas (contract §6 — records must exclude lat/lon/distance).

## Next Steps
- Unblocks [[phase-02-prisma-persistence]] (Prisma models mirror `FeedbackFlagSpec`/enums) and [[phase-03-public-feedback-api]] (services import `planFeedbackReport` helpers built on `getFeedbackPriority`/`buildAutoFlagSpecs`, and the recommendation route imports the apply/summarize fns).
- The Zod DTO schemas here are the single source of truth imported by both the public API route and the client fetch layer in later UI phases.
