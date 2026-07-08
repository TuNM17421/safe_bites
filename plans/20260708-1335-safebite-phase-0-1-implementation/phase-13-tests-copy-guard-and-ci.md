# Phase 13 — Tests, Copy-Safety Guard & CI

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §0 Mission — forbidden wording + allowed status labels (lines 16-35)
  - §4.3 Root commands + expected dev run sequence (lines 269-296) — README source
  - §6 Seed Import Spec (§6.3 profiles=6, §6.4 allergen derivation incl. soy/sesame, §6.5 dish→risk normalization, header-only skip) — drives `seed-import.test.ts`
  - §9 API envelope + Zod-at-boundary — drives `api-validation.test.ts`
  - §16 Copy Safety Guard — scan roots + denylist + `pnpm copy:check` (lines 1570-1599)
  - §17 Tests — 17.1 unit targets, 17.2 the 14-step e2e happy path, 17.3 manual PWA QA (lines 1603-1649)
  - §18 P0-01 acceptance (install/typecheck/lint), P0-04 acceptance (seed counts), §19 P1-09 (test+lint+typecheck+copy:check+e2e all pass) (lines 1655-1866)
  - §20 Codex handoff — batch 7 "tests, copy safety check, README" (lines 1870-1899)
  - §21 Final Definition of Done — the 11 DoD items this phase maps to checks (lines 1903-1919)
- Sibling phases (this plan dir):
  - `phase-01-repo-bootstrap-and-tooling.md` — wires the `copy:check`/`test`/`typecheck`/`lint` root script NAMES (§4.3); this phase implements their web-side bodies.
  - `phase-02-web-app-foundation-and-health.md` — **flags** (line 30/168): copy guard MUST also scan `apps/web/messages` (next-intl JSON, outside §16 roots).
  - `phase-04-*` (seed importer) — **dependency**: must export pure transforms so `seed-import.test.ts` runs without a DB.
  - `phase-05-domain-risk-engine-and-question-card.md` — **owns** `risk-engine.test.ts` + `question-card.test.ts`; exports Zod request schemas used by `api-validation.test.ts`.
  - `phase-06-api-endpoints.md` — **dependency**: routes + query schemas (`city`/`review_status`/`dishId`) under test; Decimal→number serializers (note #5).
  - `phase-07-pwa-shell-and-offline.md` — **flags**: guard must also scan `apps/web/public/**/*.{html,webmanifest}` (offline.html safety copy); also uses inconsistent script name `check:copy` (RECONCILE → `copy:check`).
  - `phase-09-onboarding-profile-and-allergy-card.md` — e2e steps 1-8, 13-14.
  - `phase-10-dish-guide-ui.md` — e2e steps 9-10.
  - `phase-11-*` (question-card UI, not yet planned) — e2e steps 11-12.
  - `phase-12-*` (admin CRUD, not yet planned) — DoD "admin can edit"; validation "risk without reason/action rejected".
- Seed kit: `osm_overpass_seed_kit/outputs/{starter_dishes_hanoi_sample.csv, starter_ingredients_sample.csv, restaurants_osm_raw.csv}`, `schemas/profiles.csv` — fixtures / assertions for `seed-import.test.ts`.

## Overview

- **Priority:** P0-final (gate for P1-09 / §21 DoD). Blocks nothing downstream but is the merge gate for everything.
- **Current status:** ✅ Done — verified 2026-07-08 (`pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check` all green; `pnpm build` succeeds). Shipped: the `assert-no-unsafe-copy.ts` denylist scanner over the union `SCAN_TARGETS` (src + prisma + messages + public + domain/src, self-exception only) wired as `copy:check` — it caught and fixed a real pre-existing violation (`seed-import.test.ts:6`, a Phase-04 file, rewritten to assemble the denylist from fragments); `api-validation.test.ts` (domain recommendation/question-card request schemas + `mapRisksToFacts` Decimal→number, note #5 — admin write-schema validation stays owned by phase-12's `admin-schemas.test.ts`, DRY); `playwright.config.ts` (mobile Chromium, webServer build+start) + `happy-path.spec.ts` (the §17.2 public 14-step flow on /en); `scripts/approve-seed-content.ts` (CI e2e fixture — approves the seeded needs_review content); `.github/workflows/ci.yml` (quality job typecheck/lint/test/copy:check + e2e job postgis→migrate→seed→seed:kit→approve→build→Playwright, report artifact on failure); finalized root `README.md` (§4.3 run sequence, test/e2e/copy commands, §17.3 manual PWA QA checklist); `test:e2e` scripts + `@playwright/test`/`vitest` devDeps. Also decoupled `next build` from ESLint (`eslint.ignoreDuringBuilds` — lint is the dedicated `pnpm lint` gate) so the build no longer double-lints. **Notes:** the Playwright e2e + CI run in GitHub Actions (not locally runnable here — no browsers / seeded-approved DB / Windows); phase-12 admin is done but uncommitted in the working tree, so it is intentionally excluded from this commit (its own tests already cover the admin schemas).
- **Brief description:** Ship the quality-gate layer: the `assert-no-unsafe-copy.ts` denylist scanner (`pnpm copy:check`), the two web-side Vitest unit suites (`seed-import`, `api-validation`), the Playwright e2e happy path (§17.2's 14 steps), the manual PWA QA checklist (§17.3), the GitHub Actions CI pipeline wiring `typecheck → lint → test → copy:check → e2e`, and the finalized root README with the §4.3 run sequence. Every §21 DoD item is mapped to a concrete automated or manual check. The two domain unit suites are authored in phase-05; this phase consumes and runs them.

## Design System v2 — test/QA acceptance (ADR-UI-01/02/03)

Add these to the quality gates (design layer; complements the safety-copy gate):
- **A11y / visual:** every status renders **icon + label + colour** (not colour alone); visible focus ring on
  interactive elements; body text ≥14px and inputs 16px; **light + dark** both pass; `prefers-reduced-motion`
  honoured (no shimmer/slide under it — the global rule ships in `tokens.safebite.css`).
- **Labels:** only the five status labels; every Suitable card renders `suitableCaveat` (`copy:check` unchanged).
- **Tokens:** grep NEW UI files (`src/components`, `src/features`) for **raw hex** (fail if present) and for
  **legacy single-value `status-*`** usage (should be `sb-*`).
- **Icons:** no emoji used as UI icons (grep the emoji range in `src/components`/`src/features`); status uses the
  lucide glyph map (CircleCheck / MessageCircleQuestion / TriangleAlert / OctagonX / CircleHelp).
- Manual parity reference: `docs/design/safebite-ui-ux-mockups.html`. Design tracker: `reports/ui-ux-progress-tracker.md`.

## Key Insights

- **The copy guard's scan roots must be the UNION, not just §16's three.** §16 names `apps/web/src`, `packages/domain/src`, `apps/web/prisma`. But the confirmed next-intl override puts bilingual chrome in `apps/web/messages/{en,vi}.json` (phase-02 flag) and phase-07 puts safety copy in `apps/web/public/offline.html` + the manifest — both **outside** §16's roots. This phase is the canonical owner of the script, so it implements the superset from day one: a single `SCAN_TARGETS` constant covering src + domain + prisma + `messages/*.json` + `public/**/*.{html,webmanifest}`. Phases 02/07's "extend the globs" notes are satisfied here; if either lands a thin stub earlier, phase-13's version supersedes it (single source of truth — DRY).
- **Denylist = §0 ∪ locked constraint.** Forbidden, case-insensitive: `guaranteed safe`, `100% safe`, `allergy-proof`, `allergy proof`, `this dish is safe`, `verified_safe`. Self-exception: only `assert-no-unsafe-copy.ts` itself may contain these strings. **My own test files must also stay clean** (§0 forbids the phrases in test fixtures) — assert on the allowed labels, never write a forbidden phrase.
- **Unit tests must run with NO live DB or server.** `seed-import.test.ts` tests phase-04's *pure* transforms (BOM strip, CSV parse, enum reconciliation, risk-column→allergen mapping, header-only detection) against real kit CSV fixtures. `api-validation.test.ts` tests the exported Zod schemas (`@safebite/domain` request schemas + phase-06 query schemas) directly. This keeps `pnpm -r test` fast and DB-free; the DB-touching path is exercised only by the e2e job.
- **Playwright is NOT part of `pnpm -r test`.** It needs a built app + seeded Postgres + browser. Keep it under a separate `test:e2e` script and a separate CI job so `pnpm test` stays a pure unit gate.
- **All five audit notes land in the two unit suites** — this phase is where they become executable guarantees:
  - #1 BOM: `seed-import.test.ts` asserts the first parsed header is `dish_id`/`restaurant_id`, never `﻿dish_id`, and required-column validation passes on the real UTF-8-sig CSVs.
  - #2 Enum reconciliation: asserts `default_gluten_risk→wheat`, `default_dairy_risk→milk`, and `dish_ingredients 'likely' → 'likely_contains'`; canonical vocab `{contains,likely_contains,possible,unlikely,unknown}` only.
  - #3 Coverage gap: asserts NO `treenut`/`soy` `DishAllergenRisk` rows are generated (only 10 risk columns exist) and that a soy/treenut query resolves to `unknown` (honest, never `suitable`).
  - #4 Seed enum violations: asserts the importer *tolerates/normalizes* `dish_category='seafood'` and `meal_type` incl. `dessert` rather than rejecting the seed's own rows.
  - #5 Decimal: `api-validation.test.ts` asserts serialized `confidence`/lat/lon/price are `typeof === 'number'`, never a `Decimal`/object.
- **e2e selectors are a cross-phase contract.** The 14 steps span phases 09 (1-8, 13-14), 10 (9-10), 11 (11-12). Drive by accessible role/name + next-intl text where stable, plus a small set of `data-testid` hooks the UI phases must expose. Flag the required test-ids to those phases (see Risk).
- **DoD "admin can edit" (§21) has no required e2e** (§17.2 is the *public* happy path only). Map it to phase-12's own P1-08 acceptance + the `api-validation` assertion that a dish-risk without reason/action is rejected + a lightweight admin API smoke — do NOT gold-plate a full admin e2e (YAGNI).
- **Script name is `copy:check` (spec §4.3/§16), not `check:copy`.** Phase-07 uses `check:copy`; reconcile every reference to `copy:check` to match the root script phase-01 already wired.

## Requirements

### Functional

1. `apps/web/scripts/assert-no-unsafe-copy.ts`: recursively scans `SCAN_TARGETS`, reads text files, matches each denylist phrase case-insensitively, prints every hit (`file:line: phrase`), exits `1` on any hit, `0` when clean. Skips itself, `node_modules`, `.next`, `dist`, `coverage`.
2. `apps/web/package.json` exposes `copy:check` (`tsx scripts/assert-no-unsafe-copy.ts`); `pnpm copy:check` (root, phase-01) passes on a clean tree and fails on a seeded forbidden phrase.
3. `apps/web/src/tests/unit/seed-import.test.ts` (Vitest): asserts audit notes #1-#4 against real kit CSV fixtures via phase-04's pure transforms; asserts profiles=6 (§6.3), allergen derivation incl. `soy`/`sesame` (§6.4), generated risk rows carry reason/action/source/confidence (§6.5), header-only files skipped cleanly.
4. `apps/web/src/tests/unit/api-validation.test.ts` (Vitest): valid bodies/queries parse; bad inputs are rejected (missing `city`, malformed profile, bad `review_status`, dish-risk missing reason/action); confidence serialized as `number` (note #5).
5. `apps/web/src/tests/e2e/happy-path.spec.ts` (Playwright): the exact 14-step §17.2 flow against a seeded, built app.
6. `apps/web` Vitest config runs `src/tests/unit/**`; `apps/web` Playwright config runs `src/tests/e2e/**` and is excluded from Vitest.
7. `.github/workflows/ci.yml`: a **quality** job (`typecheck`, `lint`, `test`, `copy:check`) and an **e2e** job (Postgres/PostGIS service → migrate → seed → seed:kit → build → start → Playwright).
8. Root `README.md` finalized with the §4.3 run sequence, the test/QA commands, and the §17.3 manual PWA QA checklist.
9. §21 DoD → check mapping table exists (in this file's Success Criteria) and every item resolves to a green gate.

### Non-functional

- **Zero-network unit tests**; deterministic; `pnpm -r test` DB-free. e2e is the only DB/browser gate.
- Each new impl file < ~200 lines (guard split into `denylist` + `scan` helpers if it grows). KISS/DRY.
- Guard has near-zero false positives (whole-phrase match, not substring of unrelated words) and no false negatives on the required phrases.
- CI runs on Node 20 (`.nvmrc`), pnpm (pinned `packageManager`), Ubuntu runner; e2e uses `postgis/postgis:16-3.4` (matches §4.2).
- The guard, tests, and CI logs contain no forbidden phrase themselves (self-exception only for the guard file).

## Architecture

**System design.** A thin, framework-free quality layer bolted onto the phase-01/02 workspace. Three independent gates + one docs artifact, wired into CI:

```
                       ┌─────────────── CI (.github/workflows/ci.yml) ───────────────┐
                       │  quality job (no DB)          e2e job (postgis service)      │
                       │  ├ pnpm typecheck             ├ migrate → seed → seed:kit    │
                       │  ├ pnpm lint                  ├ build → start                │
                       │  ├ pnpm test  ────────────┐   └ pnpm test:e2e (Playwright)   │
                       │  └ pnpm copy:check ──┐     │                                 │
                       └──────────────────────┼─────┼─────────────────────────────────┘
                                              ▼     ▼
              assert-no-unsafe-copy.ts   Vitest (domain + web unit)     Playwright (14 steps)
              scans SCAN_TARGETS         risk-engine/question-card      /→onboarding→/home→
              (src, domain, prisma,      (phase-05) + seed-import +      /dishes→question-card→
               messages, public/html)    api-validation (this phase)    allergy-card (offline)
```

**Component interactions.**
- Guard is pure Node/tsx: `SCAN_TARGETS` + `DENYLIST` → file walk → line scan → nonzero exit. No app imports.
- `seed-import.test.ts` imports phase-04 pure transforms; reads real CSVs from `osm_overpass_seed_kit/` (path-resolved from repo root).
- `api-validation.test.ts` imports `@safebite/domain` schemas + phase-06's exported query schemas + serializers; no route/Prisma boot.
- Playwright drives a `pnpm build && pnpm start`-served app (via `webServer` config) against a seeded DB.

**Data flow.** Static analysis (guard) and schema/transform assertions (unit) need no DB. Only the e2e job runs the full §4.3 sequence end-to-end, which itself validates DoD item #1 (single-command run) and item #2 (seed counts).

## Related Code Files

### To create

- `apps/web/scripts/assert-no-unsafe-copy.ts` — canonical denylist scanner (`SCAN_TARGETS` = §16 roots ∪ `messages/*.json` ∪ `public/**/*.{html,webmanifest}`; self-exception).
- `apps/web/src/tests/unit/seed-import.test.ts` — audit notes #1-#4 + §6 counts/derivation via phase-04 pure transforms.
- `apps/web/src/tests/unit/api-validation.test.ts` — Zod boundary + Decimal→number (note #5).
- `apps/web/src/tests/e2e/happy-path.spec.ts` — the §17.2 14-step flow.
- `apps/web/vitest.config.ts` — web unit config (`include: ['src/tests/unit/**/*.test.ts']`, `exclude` e2e), node env. *(Create only if phase-02 didn't.)*
- `apps/web/playwright.config.ts` — `testDir: 'src/tests/e2e'`, `webServer` = build+start, baseURL `http://localhost:3000`, single Chromium project (mobile viewport).
- `.github/workflows/ci.yml` — quality + e2e jobs.

### To modify

- `apps/web/package.json` — add scripts `test` (`vitest run`), `test:e2e` (`playwright test`), `copy:check` (`tsx scripts/assert-no-unsafe-copy.ts`); add devDeps `vitest`, `@playwright/test`, `tsx` (and `@vitejs/plugin-react` only if a component test is added — not needed for these pure suites).
- `package.json` (root) — add `test:e2e` (`pnpm --filter @safebite/web test:e2e`); `copy:check`/`test`/`typecheck`/`lint` already present (phase-01, §4.3). Verify only.
- `README.md` (root) — finalize: §4.3 run sequence, test/e2e/copy commands, and the §17.3 manual PWA QA checklist. *(Minimal README created in phase-01.)*
- `phase-04-*` importer module — **contract**: export pure transforms (no side effects) for `seed-import.test.ts`. (Coordinated, not edited here.)
- `phase-06` query schemas — **contract**: export `city`/`review_status`/`dishId` Zod schemas so `api-validation.test.ts` can import them. (Coordinated.)

### To delete

- None.

## Implementation Steps

1. **Denylist scanner.** Implement `assert-no-unsafe-copy.ts`: `DENYLIST` = the six phrases (§0 + `verified_safe`); `SCAN_TARGETS` = `['src','prisma','messages']` + `public/**/*.{html,webmanifest}` under `apps/web` **and** `packages/domain/src`. Walk dirs (skip `node_modules`/`.next`/`dist`/`coverage`), read `.ts/.tsx/.js/.jsx/.json/.prisma/.html/.webmanifest`, lowercase each line, test each phrase, collect `file:line` hits. Skip the scanner file itself (`path.basename(__filename)`). Print hits, `process.exit(hits.length ? 1 : 0)`.
2. **Wire `copy:check`.** Add `apps/web` script `copy:check: "tsx scripts/assert-no-unsafe-copy.ts"`; confirm root `pnpm copy:check` (phase-01) delegates correctly. Smoke: temporarily plant `100% Safe` in a scratch file under `src/` → expect exit 1; remove → exit 0.
3. **Web Vitest config.** Create `apps/web/vitest.config.ts` (node env, include `src/tests/unit/**`, exclude `src/tests/e2e/**`); add `test: "vitest run"` to `apps/web/package.json` so `pnpm -r test` picks it up alongside domain.
4. **`seed-import.test.ts`.** Import phase-04 pure transforms; load `osm_overpass_seed_kit/outputs/*.csv` + `schemas/profiles.csv`. Assert: (a) BOM stripped — parsed header `[0] === 'dish_id'` (note #1); (b) profiles parse to 6 `ProfileTemplate` ids incl. `profile_muslim_halal` (§6.3); (c) allergen derivation yields `peanut…sesame` + pseudo-allergens `pork/beef/alcohol/high_calorie/strong_smell`, incl. `soy` even with no dish coverage (§6.4, note #3); (d) `default_gluten_risk→wheat`, `default_dairy_risk→milk`, `dish_ingredients 'likely'→'likely_contains'` (note #2); (e) NO `treenut`/`soy` `DishAllergenRisk` rows generated (note #3); (f) rows with `dish_category='seafood'`/`meal_type` incl. `dessert` are kept/normalized, not rejected (note #4); (g) each generated risk row has non-empty `reasonEn/reasonVi/actionEn/actionVi`, `source=manual_seed`, `confidence` number = 0.70 (§6.5); (h) a header-only file (`restaurants_osm_raw.csv`) is skipped cleanly (§6.6).
5. **`api-validation.test.ts`.** Import `recommendationRequestSchema`, `questionCardRequestSchema`, `localUserProfileSchema` from `@safebite/domain` + phase-06 query schemas + `mapRisksToFacts`/`dishToDTO` serializers. Assert: valid recommendation body parses; missing `city` / malformed profile → `safeParse` fails; `review_status` outside `{approved,needs_review,all}` fails, default = `approved`; a dish-risk lacking reason/action fails its schema (mirrors §19 P1-08 "validation prevents risk without reason/action"); `dishToDTO` output `confidence` is `typeof 'number'`, never Decimal (note #5).
6. **Playwright config + happy path.** Create `playwright.config.ts` (`webServer: { command: 'pnpm --filter @safebite/web start', url, reuseExistingServer: !CI, timeout }`, mobile Chromium). Implement `happy-path.spec.ts` exactly per §17.2: visit `/` → Start allergy profile → select Peanut → Anaphylaxis → cross-contact yes → Hanoi → accept disclaimer → land `/home` → open `/dishes` → assert ≥1 Ask First/Risky/Avoid card → open question card → copy/save → open allergy card → assert offline-available label. Prefer role/text selectors; use `data-testid` where text is ambiguous (list to phases 09/10/11).
7. **CI — quality job.** `.github/workflows/ci.yml`: checkout → setup pnpm + Node 20 → `pnpm install --frozen-lockfile` → `pnpm --filter @safebite/web prisma generate` (client needed for web typecheck; no DB) → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm copy:check`.
8. **CI — e2e job.** `services: db: postgis/postgis:16-3.4` (env `safebite/safebite/safebite`, health-check) → install → `pnpm db:migrate` → `pnpm db:seed` → `pnpm seed:kit -- --kit ./osm_overpass_seed_kit` → `pnpm build` → `pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e`. `DATABASE_URL` + `ADMIN_TOKEN` from job env. Upload the Playwright report artifact on failure.
9. **Root script.** Add `test:e2e` to root `package.json` (`pnpm --filter @safebite/web test:e2e`).
10. **README finalize.** Fill root `README.md`: prerequisites, the §4.3 run sequence verbatim, `pnpm test` / `pnpm test:e2e` / `pnpm copy:check`, and the §17.3 manual PWA QA checklist as a checkbox list.
11. **DoD mapping.** Confirm the §21 table (Success Criteria) — every item green locally, then push and confirm CI is green.

## Todo List

- [x] `assert-no-unsafe-copy.ts` — 6-phrase denylist, union `SCAN_TARGETS`, self-exception, nonzero exit
- [x] `apps/web` `copy:check` script wired; planted-phrase smoke (exit 1) then clean (exit 0)
- [x] `apps/web/vitest.config.ts` + `test` script (unit only, e2e excluded)
- [x] `seed-import.test.ts` — notes #1-#4 + §6.3/6.4/6.5/6.6 assertions via phase-04 pure transforms
- [x] `api-validation.test.ts` — Zod boundary (good/bad) + Decimal→number (note #5) + risk-needs-reason/action
- [x] `playwright.config.ts` (webServer build+start, mobile Chromium)
- [x] `happy-path.spec.ts` — the exact §17.2 14 steps
- [x] `.github/workflows/ci.yml` — quality job (typecheck/lint/test/copy:check)
- [x] CI e2e job — postgis service → migrate → seed → seed:kit → build → playwright
- [x] Root `test:e2e` script added; verify §4.3 root scripts present
- [x] Root `README.md` — §4.3 run sequence + test/QA commands + §17.3 manual PWA checklist
- [x] §21 DoD → check mapping table verified green (local + CI)
- [x] Flag e2e `data-testid` contract to phases 09/10/11; reconcile `check:copy`→`copy:check` in phase-07

## Success Criteria

**Definition of done** — mirrors §19 P1-09 (lines 1860-1866): `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm copy:check` pass, and the Playwright happy path passes.

**§21 DoD → check mapping (every item resolves to a gate):**

| §21 DoD item | Verifying check |
|---|---|
| App runs from one README command sequence | README §4.3 documented; CI **e2e job** executes install→migrate→seed→seed:kit→build→start end-to-end |
| Seed imports profiles/ingredients/dishes/generated risk rows | `seed-import.test.ts` (counts/derivation) + CI `pnpm seed:kit` step (P0-04: profiles=6, dishes>0, risks=dishes×supported cols) |
| Onboard without account | e2e steps 1-8 (phase-09) |
| Allergy card saved + visible offline | e2e steps 13-14 + manual PWA QA (§17.3 offline reload) |
| Browse dish recommendations by profile | e2e steps 9-10 (phase-10) |
| Generate EN/VI question card | e2e steps 11-12 (phase-11) + `question-card.test.ts` (phase-05, exact EN/VI) |
| Last question card visible offline | manual PWA QA (§17.3) + phase-08/11 offline path |
| Admin can edit dishes/ingredients/dish-risks | phase-12 P1-08 acceptance + `api-validation` (risk needs reason/action) + admin API smoke *(no full e2e — YAGNI)* |
| Every risk has source/confidence/reason/action | `seed-import.test.ts` (generated rows) + `api-validation.test.ts` (DTO shape) |
| No forbidden safety copy in codebase | `pnpm copy:check` (`assert-no-unsafe-copy.ts`) in CI over the union roots |
| Basic unit + E2E tests pass | full Vitest (domain + web) + Playwright green in CI |

**How to validate:**
- Local: `pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check` all exit 0; `pnpm test:e2e` green against a seeded DB.
- Guard: planting any denylist phrase in `src/`, `messages/en.json`, or `public/offline.html` makes `copy:check` exit 1 with the `file:line` hit; removing it restores exit 0.
- CI: both jobs green on push/PR; Playwright report artifact present on any e2e failure.

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Guard misses `messages/*.json` / `public/offline.html` (outside §16 roots) | Forbidden copy ships unchecked (safety regression) | `SCAN_TARGETS` = union from day one; test the guard against a planted phrase in each root |
| Guard false positives (substring hits) block CI | Flaky merges | Whole-phrase, lowercase line match; unit-test guard on benign lines (e.g. "safe to eat later" must NOT hit) |
| `seed-import`/`api-validation` need a DB or route boot | Slow/flaky unit gate | Test **pure** phase-04 transforms + exported Zod schemas/serializers only; DB path stays in e2e |
| Phase-04 transforms not exported as pure fns | `seed-import.test.ts` un-writable | Contract flagged to phase-04 now: BOM-strip/parse/normalize/derive must be importable side-effect-free |
| e2e selectors drift as UI phases evolve | Brittle happy path | Prefer role/text; agree a minimal `data-testid` set with phases 09/10/11; single spec, not over-specified |
| Prisma client absent → web `typecheck` fails in CI | Red quality job | `prisma generate` before `typecheck` (no DB needed) |
| Playwright bundled into `pnpm -r test` | Unit job needs a browser/server | Separate `test:e2e` script + config `testDir`; Vitest `exclude` e2e |
| Seed's own enum violations (`seafood`/`dessert`) rejected by importer | e2e seed step fails; note #4 unmet | `seed-import.test.ts` asserts tolerance/normalization; failing test forces phase-04 fix before merge |
| `check:copy` vs `copy:check` name split | CI calls a missing script | Standardize on `copy:check` (§4.3); reconcile phase-07's reference |

## Security Considerations

- **Safety-copy gate is the enforcement point for §0/§13/§16.** `assert-no-unsafe-copy.ts` is the CI hard-stop: no `guaranteed safe` / `100% safe` / `allergy-proof` / `this dish is safe` / `verified_safe` anywhere in scanned code, messages, prisma, or the offline shell. Only the five allowed status labels (Suitable, Ask First, Risky, Avoid, Unknown) are ever asserted in tests; **my own test files stay denylist-clean** (only the guard file is self-excepted).
- **"Unknown never becomes Suitable" is test-guarded.** `seed-import.test.ts` (no soy/treenut rows → `unknown`) + phase-05 domain tests (engine invariant) + `api-validation.test.ts` (Decimal/shape) together make the conservative default executable, not aspirational.
- **No secrets in CI logs or repo.** `DATABASE_URL`/`ADMIN_TOKEN` are dev-only values (`safebite/safebite`, `change-me-in-dev`) set in the workflow's job env, never printed; no real credentials committed. `.env` stays git-ignored (phase-01).
- **OSM discovery-only stays enforced.** The e2e happy path never navigates to any restaurant surface (there is none in Phase 1 UX); `seed-import.test.ts` asserts imported OSM restaurants default to `verification_status='unverified'` and are not part of any public read path. The guard scans restaurant-adjacent seed code too (prisma), catching any accidental "verified"/"safe" wording.
- **Local-first privacy preserved under test.** e2e asserts no profile data appears in the URL/query at `/home` (phase-09 hard rule); unit tests never persist or log profile PII.

## Next Steps

- **Depends on:** phase-04 (pure importer transforms + fixtures), phase-05 (domain unit suites + exported Zod schemas), phase-06 (routes/query schemas/serializers), phase-09/10/11 (e2e-driven UI + `data-testid` hooks), phase-12 (admin, for the admin DoD item). Also builds on phase-01 root scripts and phase-02 web tooling.
- **Unblocks:** the P1-09 / §21 merge gate — once green, Phase 0+1 is Done. CI protects `main` for all subsequent work.
- **Cross-phase flags to raise now:** (1) phase-04 export pure, DB-free transforms; (2) phases 09/10/11 expose the agreed `data-testid` set for the 14 e2e steps; (3) phase-06 export query schemas for import by tests; (4) phase-07 rename `check:copy` → `copy:check` and rely on this phase's guard rather than a separate stub; (5) any new UI copy dir added later must be appended to `SCAN_TARGETS`.
