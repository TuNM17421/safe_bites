# Phase 04 — Recommendation Integration (flags → signals → apply → feedbackSummary)

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md` §9.5 (API signal/response additions), §11.1-11.6 (data loading, matching, readiness cap, suppress-suitable, hide, source labels), §18 (data contract additions).
- Reality map: `research/codebase-reality-map.md` §3 (recommendation APIs & choke point), §2 (domain), §0 (spec deltas).
- Contract: `research/interface-contract.md` (Server + Recommendation sections; `recommendRestaurant` signature gains `signals`).
- Depends on: [[phase-01-domain-feedback-core]] (`FeedbackSignal`, `applyFeedbackSignalsToMenuItem`, `applyFeedbackSignalsToRestaurantReadiness`, `summarizeFeedbackSignals`, `flagRowToSignal` types), [[phase-02-prisma-persistence]] (`FeedbackFlag` table + enums), [[phase-03-public-feedback-api]] (server dir exists). Unblocks [[phase-06-public-feedback-ux]] (renders the additive fields).

## Overview

**Priority:** High (this is the payoff — feedback that never changes recommendations is theatre). **Current status:** Not started.

Wire persisted active `FeedbackFlag` rows into the single recommendation choke point. Load flags per result set, map each row to a domain `FeedbackSignal`, derive `profileAllergenIds`/`severityByAllergen` from the POST-body profile, thread `signals` through `recommendRestaurant`, and apply the pure domain transforms **conservatively** (downgrade/suppress/cap only — never upgrade). Add a backward-compatible `feedbackSummary` at the top level and per menu item to both recommendation routes, plus the public `feedback_under_review` source marker/label. No UI badges here — that is [[phase-06-public-feedback-ux]].

## Key Insights (grounded facts + spec deltas)

- **Single choke point:** `recommendRestaurant()` in `apps/web/src/lib/restaurant-recommend.ts:58-63`. It maps `evaluateMenuItem` (`:67-77`) then `evaluateRestaurantReadiness` (`:79-84`). Both routes call it (list `route.ts:94`, detail `[restaurantIdOrSlug]/route.ts:39`). Change the signature once; both routes benefit.
- **Return types are `MenuItemRecommendation` / `RestaurantRecommendation`** (reality §2, `restaurant-types.ts:104,146`), NOT the spec's `*Evaluation`. `RestaurantRecommendation` has `readinessClass:'A'..'E'` + `reasons: Bilingual[]` (not `status`/`reason`). `MenuItemRecommendation` has `status:RecommendationStatus` (snake_case) + `reason: Bilingual` + `source: string`.
- **Status literals are snake_case** (`'suitable'|'ask_first'|'risky'|'avoid'|'unknown'`). The spec's `"Suitable"/"Risky"` in §9.5/§11.4 are display copy — apply logic compares/emits snake_case only. Title-case lives in domain `copy.ts` and app i18n.
- **No `profileAllergenIds` variable exists** (reality §0). Derive `const profileAllergenIds = new Set(profile.allergies.map((a) => a.allergenId))`. `severityByAllergen` = `Map<allergenId, Severity>` from `profile.allergies` (`{allergenId, severity, crossContactSensitive}`), `Severity='mild'|'moderate'|'severe'|'anaphylaxis_risk'`.
- **Responses are plain object literals into `apiOk(...)`** — no output Zod schema (reality §3). Adding optional `feedbackSummary` is purely additive. Per reconciliation #4, the domain apply-fns do **NOT** populate a `feedbackSummary` field (the domain `MenuItemRecommendation` has no such field); the **route** attaches it by mapping each item through `summarizeFeedbackSignals` (scoped to that item's ids) → `{ ...rec, feedbackSummary }` — an additive response field only.
- **List route matches restaurant-level flags only** (§11.2). **Detail route matches restaurant + menuItem + dish flags** (dish only when `menuItem.dishId` present).
- **Flag matches profile when** `flag.allergenId` is null OR ∈ `profileAllergenIds` (§11.2). Matching + effect application lives in the **domain** (phase-01); the route only supplies `signals` + `profileAllergenIds` + `severityByAllergen`.
- **Ordering constraint (CORRECTED — critical):** `applyFeedbackSignalsToMenuItem` **rewrites `source` to the `feedback_under_review` marker**, so its output must **NOT** be fed back into `evaluateRestaurantReadiness` (the readiness evaluator detects evidence via `EXPLICIT_SOURCES.includes(source)` and would mis-cap to C). Correct order in `recommendRestaurant`: (1) build BASE menu recs via `evaluateMenuItem`; (2) compute BASE readiness via `evaluateRestaurantReadiness(baseMenuRecs)`; (3) `adjustedMenu = applyFeedbackSignalsToMenuItem(baseItem)` per item; (4) `adjustedReadiness = applyFeedbackSignalsToRestaurantReadiness(baseReadiness)`. The restaurant class reflects feedback via the restaurant-level `cap_restaurant_readiness` flag (auto-created on severe reports), **not** via re-counting suppressed item statuses. Return `adjustedMenu` + `adjustedReadiness`.
- **`quality` CI has no DB.** All apply/summarize logic is pure domain (unit-tested there). This phase's route glue is exercised in `e2e` only. `loadActiveFeedbackFlags` mirrors `loadDishRecMap` — Prisma stays in `lib/restaurant-query.ts`, not in the pure layer.

## Requirements

### Functional

1. Load active (`status='active'`) `FeedbackFlag` rows scoped to the current result set (restaurant ids always; menuItem + dish ids for detail).
2. Map each row → `FeedbackSignal` via `flagRowToSignal` (phase-01 pure mapper), JSON-safe (Decimal→number, Date→ISO).
3. Derive `profileAllergenIds: Set<string>` and `severityByAllergen: Map<string, Severity>` from the POST-body profile in each route.
4. `recommendRestaurant` accepts a single `feedback` object arg (reconciliation #3: `{ signals, profileAllergenIds, severityByAllergen }`, default empty). It computes BASE menu recs → BASE readiness → then applies `applyFeedbackSignalsToMenuItem` per item and `applyFeedbackSignalsToRestaurantReadiness` to the base readiness **independently** (see corrected ordering constraint in Key Insights — never feed adjusted menu recs into the readiness evaluator).
5. Both routes return top-level `feedbackSummary` (route calls `summarizeFeedbackSignals` over restaurant-scoped signals); detail route attaches per-item `feedbackSummary` by mapping each `menuRecommendation` through `summarizeFeedbackSignals` scoped to that item's ids.
6. Effects honoured: `cap_restaurant_readiness` (readinessCap `D`, most-conservative wins, `E` stays `E`), `suppress_suitable`, `hide_recommendation`, `downgrade_confidence`, `flag_for_review` — all via domain (§11.3-11.5).
7. Public source label `feedback_under_review` surfaced as menu-item `source` marker; never as a verification source (§11.6).

### Non-functional

- Zod at API boundary (existing request schemas unchanged; profile already validated). No new output schema.
- Backward-compatible: absent when no matching active flags (existing UI/tests unaffected, spec §18).
- No hardcoded UI strings, no raw colors, no `next/link` — but this phase touches only `lib/` + route handlers + serializers, so no JSX. Copy for the label is a domain `Bilingual` const (phase-01) mirrored to i18n in phase-06.
- Files <200 lines; `restaurant-query.ts` addition kept tight (mirror `loadDishRecMap`).
- Never expose raw `notes`/`staffAnswerText`; `feedbackSummary` is aggregate-only.

## Architecture

Data flow (detail route shown; list route omits menuItem/dish + per-item summary):

```
POST body profile ──► buildProfile() ──► profile
        │
        ├─► profileAllergenIds = Set(profile.allergies.map(a=>a.allergenId))
        └─► severityByAllergen = Map(allergenId -> severity)

prisma.restaurant.findFirst(...menuItems{allergenStatuses})
        │
        ▼
loadActiveFeedbackFlags({restaurantIds, menuItemIds, dishIds})   [lib/restaurant-query.ts]
        │  rows (JSON-safe)
        ▼
rows.map(flagRowToSignal)  ──► signals: FeedbackSignal[]         [server/feedback/get-feedback-signals.ts]
        │
        ▼
recommendRestaurant(restaurant, dishRecMap, profile, now, {signals, profileAllergenIds, severityByAllergen})
        │
        ├─ per item: baseItem = evaluateMenuItem(...)
        ├─ baseReadiness = evaluateRestaurantReadiness(BASE menu recs)   ← uses base source, not adjusted
        ├─ adjustedMenu = baseItems.map(applyFeedbackSignalsToMenuItem)  ← rewrites source→marker
        └─ adjustedReadiness = applyFeedbackSignalsToRestaurantReadiness(baseReadiness)
        │
        ▼
route builds response:
   recommendation.feedbackSummary = summarizeFeedbackSignals({signals(restaurant+matched), profileAllergenIds, now})
   each menuRecommendation already carries feedbackSummary from the apply-fn (or route attaches per-item summary)
```

**Signal matching / effect selection is domain-internal.** The route hands the full `signals` array + profile scoping to `recommendRestaurant`; the apply-fns filter by entity + allergen match themselves (phase-01). This keeps the route dumb and the trust logic unit-tested with no DB.

## Related Code Files

### Modify

- `apps/web/src/lib/restaurant-recommend.ts` — extend `recommendRestaurant` signature (`:58-63`) with a `feedback: { signals: FeedbackSignal[]; profileAllergenIds: Set<string>; severityByAllergen: Map<string, Severity>; }` arg (single object, keeps call sites tidy). Apply `applyFeedbackSignalsToMenuItem` inside the `.map` after `evaluateMenuItem` (`:67-77`); apply `applyFeedbackSignalsToRestaurantReadiness` after `evaluateRestaurantReadiness` (`:79-84`). Return the augmented recs unchanged in shape.
- `apps/web/src/lib/restaurant-query.ts` — add `loadActiveFeedbackFlags({restaurantIds, menuItemIds, dishIds})` mirroring `loadDishRecMap` (`:32-46`): dedupe ids via `new Set`, guard empty (return `[]`), `prisma.feedbackFlag.findMany({ where: { status: 'active', OR: [...] } })`, coerce Decimal/Date to JSON-safe.
- `apps/web/src/app/api/v1/recommendations/restaurants/route.ts` — after loading restaurants (`:81-86`), call `loadActiveFeedbackFlags({ restaurantIds })` (restaurant-level only, §11.2); map to signals; derive `profileAllergenIds`/`severityByAllergen` once; pass into `recommendRestaurant` (`:94`); add top-level `feedbackSummary` to each `toListItem` (extend `toListItem` + `ListItem`).
- `apps/web/src/app/api/v1/recommendations/restaurants/[restaurantIdOrSlug]/route.ts` — load flags for `{ restaurantIds:[restaurant.id], menuItemIds, dishIds }`; map to signals; pass into `recommendRestaurant` (`:39`); attach top-level `recommendation.feedbackSummary` (`:70-77` block) + rely on per-item `feedbackSummary` in `menuRecommendations` (`:78`).
- `apps/web/src/lib/restaurant-serializers.ts` — add a `feedbackFlagRowDTO`/`toFeedbackFlagLike` coercion helper if row shaping is non-trivial (reuse module-local `num`/`iso`); OR keep the coercion inline in `loadActiveFeedbackFlags` if trivial. Prefer reuse of `num`/`iso`.

### Create

- `apps/web/src/server/feedback/get-feedback-signals.ts` — export `flagRowToSignal(row): FeedbackSignal` (pure mapper: prisma `FeedbackFlag` row → domain `FeedbackSignal`). Thin; the query itself stays in `restaurant-query.ts` (contract). Unit-testable with hand-built rows (no DB).

### Delete

- None.

## Implementation Steps

1. **Confirm phase-01/02 outputs exist:** `FeedbackSignal`, `FeedbackSignalSchema`, `applyFeedbackSignalsToMenuItem`, `applyFeedbackSignalsToRestaurantReadiness`, `summarizeFeedbackSignals`, `FeedbackSummary` exported from `@safebite/domain`; `prisma.feedbackFlag` model with `status`, `entityType`, `restaurantId`, `menuItemId?`, `dishId?`, `allergenIds String[]`, `effect`, `readinessCap?`, `priority`, `createdAt`. If missing, stop and flag (this phase is blocked on them).
2. **Add `flagRowToSignal`** in `apps/web/src/server/feedback/get-feedback-signals.ts`. Coerce Decimal→`Number`, Date→ISO, snake_case enum strings pass through unchanged. Return the exact `FeedbackSignal` shape (`{ id, entityType, restaurantId, menuItemId?, dishId?, allergenIds, effect, readinessCap?, priority, status, createdAt }` — final fields per phase-01 `FeedbackSignalSchema`). Validate with `FeedbackSignalSchema.parse` in dev if cheap, else trust the mapper.
3. **Add `loadActiveFeedbackFlags`** to `lib/restaurant-query.ts`: dedupe each id list, early-return `[]` when all empty, `findMany({ where: { status: 'active', OR: [ {entityType:'restaurant', restaurantId:{in}}, {entityType:'menu_item', menuItemId:{in}}, {entityType:'dish', dishId:{in}} ] } })` (drop OR branches with empty id lists). Map rows to JSON-safe plain objects (Decimal/Date coerced) — or return raw rows and let `flagRowToSignal` coerce. Keep it under the `loadDishRecMap` pattern.
4. **Extend `recommendRestaurant`** signature with the `feedback` object arg. Inside the `.map`, wrap: `const rec = evaluateMenuItem({...}); return applyFeedbackSignalsToMenuItem({ recommendation: rec, signals, profileAllergenIds, severityByAllergen, now });`. After readiness: `let recommendation = evaluateRestaurantReadiness({...}); recommendation = applyFeedbackSignalsToRestaurantReadiness({ recommendation, signals, profileAllergenIds, severityByAllergen, now });`. The apply-fns filter signals by entity/allergen internally.
5. **List route:** derive `profileAllergenIds`/`severityByAllergen` after `buildProfile`. Load `flags = await loadActiveFeedbackFlags({ restaurantIds: restaurants.map(r=>r.id) })`. `const signals = flags.map(flagRowToSignal)`. Pass `{ signals, profileAllergenIds, severityByAllergen }` into `recommendRestaurant`. Extend `toListItem` to include `feedbackSummary: recommendation.feedbackSummary` (present only when set); update `ListItem` type. Do **not** sort by feedback (sort unchanged).
6. **Detail route:** collect `menuItemIds = restaurant.menuItems.map(m=>m.id)`, `dishIds = restaurant.menuItems.map(m=>m.dishId).filter(Boolean)`. Load flags for all three; map to signals; pass into `recommendRestaurant`. Add `feedbackSummary: recommendation.feedbackSummary` to the `recommendation` response object (`:70-77`). `menuRecommendations` already carry per-item `feedbackSummary` from step 4 — no extra work beyond returning them as-is.
7. **Top-level summary:** in each route compute `summarizeFeedbackSignals({ signals, profileAllergenIds, now })` for the restaurant-scope summary IF the apply-fn does not already populate `recommendation.feedbackSummary`. Prefer the apply-fn's populated field to avoid double computation; only call `summarizeFeedbackSignals` directly if phase-01 leaves it to the caller (check the phase-01 signature — contract says apply-fns return augmented recs; summarize is a separate exported fn). Use whichever phase-01 actually wires.
8. **Source label:** ensure suppressed/hidden items carry the internal `feedback_under_review` marker in `MenuItemRecommendation.source` (emitted by phase-01 apply-fn). This phase only passes it through; verify it appears in the JSON. Do NOT add it to any verification-source allowlist.
9. **Typecheck + lint:** `pnpm --filter @safebite/web typecheck && pnpm --filter @safebite/web lint`. Fix Decimal/Set type frictions.
10. **Manual JSON smoke (e2e-adjacent):** with a seeded active flag, POST the detail route and confirm: readiness capped to `D` (A/B/C→D), a matching item's `status` raised off `suitable`, `source` contains `feedback_under_review`, `feedbackSummary.hasActiveFlags=true`, and no raw `notes` anywhere in the payload.

## Todo List

- [ ] Verify phase-01/02 exports + `feedbackFlag` model exist (else BLOCKED)
- [ ] Create `server/feedback/get-feedback-signals.ts` with pure `flagRowToSignal`
- [ ] Add `loadActiveFeedbackFlags` to `lib/restaurant-query.ts` (dedupe, empty-guard, JSON-safe)
- [ ] Extend `recommendRestaurant` signature + apply item then readiness transforms in order
- [ ] List route: derive profile allergen scope, load restaurant-level flags, thread signals, add `feedbackSummary` to `toListItem`/`ListItem`
- [ ] Detail route: load restaurant+menuItem+dish flags, thread signals, add top-level + per-item `feedbackSummary`
- [ ] Confirm top-level summary source (apply-fn field vs `summarizeFeedbackSignals`) and wire the correct one
- [ ] Pass `feedback_under_review` source marker through; keep it out of verification allowlists
- [ ] Typecheck + lint both web + domain
- [ ] JSON smoke: cap→D, suppress off suitable, marker present, summary set, no raw notes leaked

## Success Criteria

- **Definition of done:** Both recommendation routes accept the same request bodies, return unchanged shapes plus optional `feedbackSummary` (top-level both routes; per-item on detail). With a seeded active `cap_restaurant_readiness` flag, an A/B/C restaurant reports `readinessClass:'D'`; `E` stays `E`. With a `suppress_suitable` menu flag matching the profile allergen, a `suitable` item becomes `risky` (severe/anaphylaxis profile) or `ask_first` (mild/moderate), `confidence` downgraded one level, `source` includes `feedback_under_review`. No matching flags ⇒ `feedbackSummary` absent and output byte-identical to Phase 02.
- **Validation:** `quality` gate green (domain apply/summarize unit tests from phase-01 cover the logic with no DB); `e2e` gate green (a new spec asserts the capped/suppressed JSON through the real HTTP+DB path — authored in [[phase-09-seed-tests-docs]] but relies on this wiring). Manual step 10 confirms no raw-notes leak.

## Risk Assessment

| Issue | Mitigation |
|---|---|
| Applying feedback could accidentally UPGRADE (e.g. `unknown`→`suitable`) | Transforms live in phase-01 domain and are one-directional (STATUS_RANK only increases). `menu-item.ts:160`/`risk-engine.ts:191` THROW on unknown→suitable — never build a path to `suitable`. This phase adds no status logic, only threading. |
| Feeding adjusted menu recs into the readiness evaluator corrupts evidence detection (`source` was rewritten to the marker → mis-caps to C) | Compute BASE readiness from BASE menu recs; apply the two transforms independently (corrected ordering constraint). Restaurant class reflects feedback via the restaurant-level `cap_restaurant_readiness` flag, not re-counted item statuses. |
| Flag query loads inactive/dismissed rows | `where: { status: 'active' }` hard filter; `flagRowToSignal` never runs on non-active rows. |
| `Decimal`/`Date` leak into JSON (breaks response / non-serializable) | Coerce in `loadActiveFeedbackFlags`/`flagRowToSignal` via `num`/`iso` (mirror `loadDishRecMap`). |
| N+1 or per-restaurant flag queries in list route | Single `findMany` with `restaurantId: { in: [...] }` for the whole page set, like `loadDishRecMap`. |
| Empty id arrays produce `IN ()` / full-table scan | Early-return `[]`; drop OR branches whose id list is empty. |
| Existing UI/tests break on new field | `feedbackSummary` is optional and omitted when no active flags (spec §18) — verify absence path in smoke test. |
| Spec title-case status confusion (`"Risky"`) | Compare/emit snake_case only; title-case is display-layer (phase-06 i18n). |

## Security & Privacy Considerations

- **Aggregate-only exposure:** `feedbackSummary` carries counts, `highestPriority`, `lastReportAt`, and a `publicMessageKey` — never raw `notes`/`staffAnswerText`. `flagRowToSignal` selects only flag scalars; never joins report free-text.
- **No profile/allergy data in URL, analytics, or logs** — profile stays in the POST body (§16.1); this phase adds no query params.
- **Feedback never creates verification evidence:** the `feedback_under_review` marker is a caution source, never `restaurant_verified`/`admin_verified`; keep it out of any verification-source allowlist.
- **Positive/no-reaction reports never upgrade:** guaranteed by phase-01 one-directional transforms; this phase must not add any branch that lowers caution based on feedback.
- **Geo exclusion:** flags/signals carry no lat/lon/distance; recommendation distance is computed separately from `clientLocation` and never persisted into feedback.

## Next Steps

- [[phase-06-public-feedback-ux]] renders `feedbackSummary` (`FeedbackUnderReviewBadge`, `feedback-summary-banner.tsx`) and the `feedback_under_review` source chip; it consumes the fields this phase emits.
- [[phase-09-seed-tests-docs]] adds the e2e spec asserting capped/suppressed recommendations end-to-end (needs `seed:feedback-demo` active flags) and the manual-QA checklist entry.
- No admin dependency; [[phase-05-admin-feedback-api]] mutates flag `status`, which this phase's `status:'active'` filter automatically respects (resolved/dismissed flags stop influencing recommendations).
