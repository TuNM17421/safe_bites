# Phase 05 — Domain package: risk engine + question card

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §3 Repository Structure (`packages/domain` layout, lines 216-232)
  - §5.1/§5.2 Enums + core models (RiskLevel, RecommendationStatus, ProfileTemplate, Dish, DishAllergenRisk) — the shapes this engine consumes
  - §7 Domain Types (721-794)
  - §8 Risk Engine v1 (798-888): STATUS_RANK, allergy table §8.2, religious/diet/preference §8.3, confidence §8.4, required tests §8.5
  - §13 status priority + Suitable caveat (1480-1490)
  - §14 i18n copy keys (1494-1528)
  - §15 Question Card Templates (1531-1567)
  - §17.1 Unit tests (1605-1614)
  - §18 P0-05 acceptance (1707-1717)
- Sibling phases (same plan dir):
  - `phase-01-*.md` — monorepo bootstrap + Vitest/tsconfig (DEPENDENCY: provides workspace, test runner, TS project refs)
  - `phase-04-*.md` — seed importer: performs enum reconciliation so this engine only ever sees canonical `RiskLevel`
  - `phase-06-*.md` — API skeleton: maps Prisma rows → domain inputs and consumes `evaluateDish` / `buildQuestionCard`
- Kit: `osm_overpass_seed_kit/` (only indirect — its normalized data is what the engine scores; no direct import here)

## Overview

- **Priority:** P0 (blocks P0-06 API and all Phase 1 UX — every card/recommendation flows through this engine)
- **Current status:** Not started
- **Brief description:** Implement the pure, framework-free `packages/domain` package: shared types, Zod schemas, the deterministic risk engine (allergy + religious/diet/preference mapping with conservative "unknown never suitable" handling and multi-profile highest-rank selection), the deterministic bilingual question-card builder, safety copy strings, and unit tests covering every §8.5 case plus the severe-peanut EN/VI card. **NO LLM. No Next/Prisma imports** — usable identically by API routes and client components.

## Key Insights

- **This package is the single source of truth for safety-critical logic.** Both the server (API) and client (offline Dexie recompute) call the exact same functions. Any framework import here breaks client bundling and offline use → keep it pure TS.
- **"Unknown never becomes Suitable" is an explicit, testable invariant** (§8.2 note, 828). Enforce it structurally: the mapping tables never emit `suitable` for a `unknown` risk row, and a defensive assertion guards the final result.
- **Coverage gap → honest Unknown (cross-cutting note #3).** Seed dishes carry only 10 risk columns; there is NO tree-nut / soy dish data. When a user selects an allergen the dish has no `DishRiskFact` for, the engine MUST treat it as `riskLevel = "unknown"` → status `unknown` (action asks staff), never hide it, never downgrade to suitable. Onboarding still offers those allergens; the engine keeps them safe-by-default.
- **Canonical RiskLevel only (cross-cutting note #2).** `dish_ingredients` uses `likely` and dishes use `likely_contains`; that reconciliation happens at IMPORT (phase-04). The engine trusts a canonical vocab `{contains, likely_contains, possible, unlikely, unknown}` and, as a fail-safe, maps any *unrecognized* value to `unknown` (conservative) rather than crashing.
- **Decimal must already be a number (cross-cutting note #5).** `DishRiskFact.confidence` is typed `number`. The API/mapper layer (phase-06) is responsible for serializing Prisma `Decimal` → plain number *before* calling the engine; the domain Zod schema enforces `z.number()` so a raw Decimal object fails loudly at the boundary.
- **next-intl vs data-driven split (locked decision).** `copy.ts` holds only the static safety CHROME strings (disclaimer, offline notice, suitable caveat, status labels) — phase-02 mirrors these keys into `apps/web/messages/{en,vi}.json`. Everything the engine/question-card emit (reasons, actions, card text) stays BILINGUAL DATA as `Record<'en'|'vi',string>`. Question-card `targetLanguage` is independent of the UI locale.
- **Suitable always carries the caveat (§13).** Enforced in-engine: when the resolved status is `suitable`, the card's `action` is set to the `suitableCaveat` string from `copy.ts` (data-driven), so the safety copy cannot be dropped by a forgetful UI.
- **Conservative-by-default cross-contact.** `crossContactSensitive` is `boolean | "not_sure"`; both `true` and `"not_sure"` select the stricter §8.2 column. Only explicit `false` uses the mild/moderate column (and only when severity is mild/moderate).
- **Determinism is a hard requirement** (§18 acceptance: "deterministic EN/VI template output"). Fixed rule evaluation order + fixed alias join order + no `Date.now()` inside pure mappers (timestamps are passed in / taken from facts). Tests assert exact strings.
- **Forbidden copy gate (§16).** `packages/domain/src` is scanned by `assert-no-unsafe-copy.ts`. None of the copy/reason/action strings here may contain "guaranteed safe", "100% safe", "allergy-proof", "this dish is safe", "verified_safe".

## Requirements

### Functional

- Export domain types (§7): `LanguageCode`, `Severity`, `RiskLevel`, `RecommendationStatus`, `EvidenceType`, `LocalUserProfile`, `DishRiskFact`, `DishRecommendationCard`, plus a `QuestionCard` type and the engine's `DishEvaluationInput`.
- Export Zod schemas mirroring those types for reuse at API boundaries (phase-06 request/response validation) — standing Zod rule.
- `evaluateDish(profile, dish): DishRecommendationCard` — evaluate one dish against ALL applicable profile constraints and return the highest-`STATUS_RANK` result with source/confidence/reason/action/last-checked and `matchedAllergens`.
- `evaluateDishes(profile, dishes[]): DishRecommendationCard[]` — thin batch helper (grouping/sorting for the recommendations API stays in phase-06).
- Allergy mapping table (§8.2) driven by `profile.allergies` (severity + cross-contact) against per-allergen `DishRiskFact`.
- Religious/diet/preference mapping (§8.3) driven by `profile.selectedProfileIds`: `profile_muslim_halal` (pork, alcohol), `profile_hindu_no_beef` (beef), `profile_weight_loss` (calorieClass), `profile_picky_eater` (pickyEaterFlags + spicyLevel).
- Confidence numeric→label mapping (§8.4); unknown risk → `low`.
- `buildQuestionCard(input): QuestionCard` — deterministic EN/VI templates (§15), including severity declaration, contains-question (allergen aliases joined), optional cross-contact line (only when cross-contact sensitive), and closing "ask the kitchen" line.
- `copy.ts` exports the §14 `copy` object (safety strings + status labels) for reuse.
- Unit tests: `risk-engine.test.ts` covering all 8 §8.5 cases + the coverage-gap unknown case + suitable-caveat invariant; `question-card.test.ts` asserting exact severe-peanut EN and VI output (§15).

### Non-functional

- Pure ESM TypeScript, zero runtime deps except `zod`. No `next`, no `@prisma/client`, no DOM/Node built-ins in the core logic.
- Each source file < ~200 lines (split tables into `constants.ts`). YAGNI/KISS/DRY.
- Deterministic: identical inputs → byte-identical outputs. No hidden clock/random in mappers.
- 100% branch coverage of the two mapping tables is realistic and expected.

## Architecture

**System design.** A leaf package `packages/domain` with a single public barrel (`index.ts`). No I/O, no ORM, no framework. Callers pass already-mapped plain objects (Decimals serialized to numbers, enums normalized to canonical vocab).

**Component interactions.**

```
API route / Dexie client
      │  (Prisma rows → mapper: Decimal→number, canonical enums)
      ▼
evaluateDish(profile, DishEvaluationInput)
      │  collects candidate evaluations from rules (fixed order):
      │   1. allergy rules   (profile.allergies × dish.risks)
      │   2. religious rules  (pork/alcohol/beef via pseudo-allergen risks)
      │   3. diet rule        (calorieClass)
      │   4. preference rule  (pickyEaterFlags + spicyLevel)
      ▼
pick highest STATUS_RANK  ──► assert(status!=='suitable' when any source risk is 'unknown')
      ▼
DishRecommendationCard  { status, riskLevel, confidence(label), reason, action, source, lastCheckedAt, matchedAllergens, stale? }
```

`buildQuestionCard` is an independent deterministic string composer using `constants.ts` fragments + allergen aliases; it does not touch the risk engine.

**Data flow / key structures.**

- `DishEvaluationInput = { dishId; name: Record<Lang,string>; risks: DishRiskFact[]; calorieClass?; spicyLevel?; pickyEaterFlags: string[] }`.
- Each rule yields an internal `Evaluation { status, riskLevel, confidence:number, reason, action, source, lastCheckedAt, matchedAllergens }`. Selection = max by `STATUS_RANK`; ties resolved by rule order (deterministic).
- For `suitable`, `action` is overridden with `copy.<lang>.suitableCaveat` so the caveat is inseparable from the result. Reasons/actions for allergy & pork/alcohol/beef come from the `DishRiskFact` (data-driven from seed importer); calorie/picky reasons/actions come from bilingual templates in `constants.ts`.

**Allergy table (§8.2), conservative col = severity∈{severe,anaphylaxis_risk} OR crossContact∈{true,"not_sure"}:**

| RiskLevel | mild/moderate & not cross-sensitive | conservative |
|---|---|---|
| contains | avoid | avoid |
| likely_contains | avoid | avoid |
| possible | ask_first | risky |
| unlikely | **suitable** | ask_first |
| unknown | unknown | unknown (action = ask staff) |

**Religious/diet/preference (§8.3):** pork/alcohol/beef → contains|likely_contains ⇒ avoid, possible|unknown ⇒ ask_first, unlikely ⇒ suitable (missing fact = unknown ⇒ ask_first). calorie: high ⇒ ask_first, medium|low ⇒ suitable, unknown|missing ⇒ unknown. picky: any flag ∈ {strong_smell, fermented_sauce, offal_possible, strong_broth} OR spicyLevel=high ⇒ ask_first, else suitable.

## Related Code Files

### To create

- `packages/domain/package.json` — name `@safebite/domain`, `type: module`, exports `./src/index.ts` (or built `dist`), dep `zod`, devDep `vitest`; scripts `test`, `typecheck`.
- `packages/domain/tsconfig.json` — extends `tsconfig.base.json`.
- `packages/domain/src/types.ts` — §7 types + `QuestionCard` + `DishEvaluationInput`.
- `packages/domain/src/constants.ts` — `STATUS_RANK`, `RISK_LEVELS`, allergy table, religious/diet/preference rule config, `PSEUDO_ALLERGENS` (pork/beef/alcohol), confidence thresholds, severity labels (EN/VI), question-card fragment templates, `PROFILE_RULE_REGISTRY` (profileId → constraint).
- `packages/domain/src/copy.ts` — §14 `copy` object (safety strings + status labels); exported for reuse.
- `packages/domain/src/schemas.ts` — Zod schemas: `severitySchema`, `riskLevelSchema`, `recommendationStatusSchema`, `localUserProfileSchema`, `dishRiskFactSchema`, `dishEvaluationInputSchema`, `questionCardInputSchema`.
- `packages/domain/src/risk-engine.ts` — `evaluateDish`, `evaluateDishes`, internal rule evaluators, confidence mapper, highest-rank selector, unknown-never-suitable guard.
- `packages/domain/src/question-card.ts` — `buildQuestionCard`.
- `packages/domain/src/index.ts` — barrel export.
- `packages/domain/tests/risk-engine.test.ts` — all §8.5 cases + unknown coverage-gap + caveat invariant.
- `packages/domain/tests/question-card.test.ts` — severe-peanut EN + VI exact output.

### To modify

- `pnpm-workspace.yaml` — ensure `packages/*` is included (owned by phase-01; verify only).
- Root `package.json` — no change expected; test/typecheck run via workspace filter.

### To delete

- None.

## Implementation Steps

1. **Scaffold package.** Create `packages/domain/package.json` + `tsconfig.json`; add `zod` + `vitest`. Confirm `pnpm install` links the workspace (phase-01 must be done).
2. **types.ts** — port §7 verbatim; add `QuestionCard` (`{ targetLanguage: LanguageCode; title: string; lines: string[]; allergenIds: string[]; dishName?: Record<LanguageCode,string> }`) and `DishEvaluationInput`. Keep it type-only.
3. **constants.ts** — define `STATUS_RANK` (§8.1), the allergy mapping as a lookup keyed by `riskLevel × conservative`, the pork/alcohol/beef + calorie + picky rule config, `PROFILE_RULE_REGISTRY`, confidence thresholds (0.80/0.55), EN/VI severity labels, and the question-card fragment templates. Pure data — no logic.
4. **copy.ts** — paste §14 `copy`. This is the reuse source for phase-02's next-intl messages. Verify no forbidden phrase.
5. **schemas.ts** — Zod mirrors; `confidence: z.number().min(0).max(1)` (rejects raw Decimal — note #5); `riskLevel` uses the canonical enum. Export inferred types alias to the §7 types where practical (DRY).
6. **risk-engine.ts** — implement:
   - `evaluateAllergies(profile, dish)` → per `profile.allergies` entry, find matching `DishRiskFact` (or synthesize `unknown` when absent — note #3), compute conservative flag, look up status, build `Evaluation`.
   - `evaluateReligious/Diet/Preference(profile, dish)` per `PROFILE_RULE_REGISTRY`.
   - `mapConfidence(n, isUnknown)` (§8.4).
   - `evaluateDish` → gather evaluations in fixed order, `selectHighest` by `STATUS_RANK`, override `action` with `suitableCaveat` when status=suitable, run `assertUnknownNeverSuitable`, assemble `DishRecommendationCard` (matchedAllergens = allergens of non-suitable contributors).
   - `evaluateDishes` → `dishes.map(d => evaluateDish(profile, d))`.
7. **question-card.ts** — `buildQuestionCard`: pick highest severity among allergens, compose title (`"I have a {severity} {allergen} allergy."` / `"Tôi bị dị ứng {severity} với {allergen}."`), contains line joining `aliases{En|Vi}` with `, ` and `or/hoặc` before the last item, cross-contact line only when any selected allergy is cross-contact sensitive, closing line. Return `QuestionCard`.
8. **index.ts** — re-export types, schemas, `evaluateDish`, `evaluateDishes`, `buildQuestionCard`, `copy`, and the public constants (`STATUS_RANK`).
9. **risk-engine.test.ts** — encode all 8 §8.5 cases + (a) severe peanut with NO peanut fact ⇒ `unknown`, (b) `suitable` result carries `suitableCaveat` in `action`, (c) multi-profile highest-rank (e.g. allergy `suitable` + halal `avoid` ⇒ `avoid`).
10. **question-card.test.ts** — assert exact EN and VI strings from §15 for severe peanut, cross-contact = yes.
11. **Run** `pnpm --filter @safebite/domain test` and `typecheck`; confirm green. Grep the src tree to confirm no forbidden phrase (dry-run of §16 gate).

## Todo List

- [ ] Scaffold `packages/domain` (package.json, tsconfig) and link in workspace
- [ ] `types.ts` — §7 types + `QuestionCard` + `DishEvaluationInput`
- [ ] `constants.ts` — STATUS_RANK, mapping tables, rule registry, severity labels, card fragments
- [ ] `copy.ts` — §14 safety strings + status labels (forbidden-phrase clean)
- [ ] `schemas.ts` — Zod mirrors; confidence as `z.number()` (Decimal rejected)
- [ ] `risk-engine.ts` — allergy + religious/diet/preference rules, confidence map, highest-rank selector, unknown-never-suitable guard, suitable-caveat override
- [ ] `question-card.ts` — deterministic EN/VI `buildQuestionCard`
- [ ] `index.ts` — barrel exports
- [ ] `risk-engine.test.ts` — all §8.5 cases + unknown-gap + caveat + multi-profile
- [ ] `question-card.test.ts` — exact severe-peanut EN + VI
- [ ] Run test + typecheck green; verify no forbidden copy in `packages/domain/src`

## Success Criteria

**Definition of done (mirrors §18 P0-05, 1711-1717):**

- `pnpm --filter @safebite/domain test` passes: `risk-engine` and `question-card` suites green.
- `pnpm --filter @safebite/domain typecheck` passes.
- **No LLM dependency and no framework import** exists anywhere in the package (grep confirms no `openai`/`anthropic`/`next`/`@prisma/client`).

**Validation:**

- Every §8.5 case asserted and passing:
  - peanut possible + severe ⇒ `risky`; peanut unlikely + severe ⇒ `ask_first`; peanut unlikely + mild ⇒ `suitable`; shellfish likely_contains ⇒ `avoid`; muslim_halal + pork contains ⇒ `avoid`; hindu_no_beef + beef contains ⇒ `avoid`; unknown risk never `suitable`; multiple profiles ⇒ highest-ranked status.
- Coverage-gap case: allergy selected + dish has no matching `DishRiskFact` ⇒ status `unknown` (allergen still present in `matchedAllergens`, action asks staff).
- Every returned `suitable` card has `action === copy[lang].suitableCaveat`.
- `buildQuestionCard` for severe peanut returns exactly the EN and VI blocks in §15 (4 lines each, cross-contact line present).
- Grep of `packages/domain/src` finds none of the forbidden phrases (§16) — pre-check for the CI gate built in a later phase.

## Risk Assessment

- **Silent downgrade of unknown → suitable** (the whole point of the safety model). *Mitigation:* structural — mapping tables never emit suitable for unknown; plus a `assertUnknownNeverSuitable` guard and a dedicated test.
- **Non-canonical `riskLevel` leaking from import.** *Mitigation:* Zod enum at the boundary (phase-06) + engine fallback mapping unknown-string ⇒ `"unknown"`; never throw on scoring a dish.
- **Raw Prisma `Decimal` reaching the engine** (note #5) → NaN comparisons in confidence. *Mitigation:* `z.number()` in `dishRiskFactSchema` rejects it loudly; document mapper responsibility in phase-06.
- **Non-determinism breaking tests** (locale-dependent joins, clock in mappers). *Mitigation:* no `Date.now()` inside pure functions; timestamps sourced from facts/inputs; fixed alias-join order; explicit rule ordering.
- **Over-strict religious rule** (missing pork fact ⇒ ask_first for most dishes). *Accepted per §8.3* (conservative-by-default); in practice seed dishes carry `default_pork_risk`, so real data resolves to suitable/unlikely.
- **File bloat > 200 lines** in `risk-engine.ts`. *Mitigation:* push all tables/config to `constants.ts`; engine stays orchestration-only.
- **Forbidden phrase accidentally introduced** in a reason/action template. *Mitigation:* keep templates minimal; grep in step 11.

## Security Considerations

- **No auth surface here** — pure library, no I/O, no secrets. Admin/`sbt_admin` cookie logic lives in the API layer, not this package.
- **Safety copy integrity:** `copy.ts` is the canonical safety-string source; the §16 CI gate scans `packages/domain/src`. Only allowed status labels (Suitable, Ask First, Risky, Avoid, Unknown) appear. Suitable is never rendered as guaranteed-safe; the caveat is bound to the result in-engine.
- **Fail-safe defaults:** every ambiguous input (unknown risk, missing fact, unrecognized enum) resolves to a MORE cautious status, never a less cautious one. "Risk reduction, not elimination" is encoded in the tables.
- **OSM discovery-only:** not touched by this phase — the engine scores dishes, never restaurants; restaurant/verification data never enters domain scoring.
- **Data minimization:** engine operates on the passed `LocalUserProfile` (client-owned, no accounts in Phase 1); it neither persists nor logs profile data.

## Next Steps

- **Depends on:** phase-01 (workspace, Vitest, `tsconfig.base.json`). Consumes canonical enums produced by phase-04 (seed importer) but has no code dependency on it.
- **Unblocks:** phase-06 API skeleton — `POST /api/v1/recommendations/dishes` (calls `evaluateDishes` on Prisma→domain-mapped inputs) and `POST /api/v1/question-cards` (calls `buildQuestionCard`); and all Phase 1 UX (dish cards, question card, offline Dexie recompute) which import `@safebite/domain` directly.
- **Follow-up in later phases:** phase-02 mirrors `copy.ts` keys into `apps/web/messages/{en,vi}.json` (next-intl); the copy-safety CI gate (§16) is wired in the API/tooling phase.
