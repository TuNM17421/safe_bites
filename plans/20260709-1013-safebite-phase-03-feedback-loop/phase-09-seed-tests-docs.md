# Phase 09 — Seed demo, tests, README, quality gate

## Context Links
- Spec: `docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md` §19 (seed), §20 (testing: domain/API/e2e/copy/gate), §20.5 (quality gate), §21 (manual QA), §22 (acceptance).
- Reality map: `plans/20260709-1013-safebite-phase-03-feedback-loop/research/codebase-reality-map.md` §7 (testing/CI), §0 (spec deltas).
- Contract: `plans/20260709-1013-safebite-phase-03-feedback-loop/research/interface-contract.md` (Tests/seed/docs section).
- Depends on ALL prior phases — this is the closeout: [[phase-01-domain-schemas-types]], [[phase-02-prisma-persistence]], [[phase-03-server-feedback-service]], [[phase-04-public-feedback-api]], [[phase-05-recommendation-integration]], [[phase-06-public-feedback-ui]], [[phase-07-offline-queue-sync]], [[phase-08-admin-feedback-ui]].

## Overview
- **Priority:** P1 (gates merge). **Current status:** Not started.
- Deliver the dev-only `seed:feedback-demo` script, the full DB-free unit test suite (domain + app), the e2e feedback specs (happy + severe + optional offline) with a new admin-login helper, CI wiring, and the README Phase 03 closeout (status, scripts row, Feedback manual-QA checklist). End state: `quality` and `e2e` CI jobs both green.

## Key Insights
- **The `quality` CI job has NO database** (only `prisma generate`). Every vitest test added here MUST be pure or `fake-indexeddb/auto` only — never import `@/lib/db` / Prisma / route handlers. Real POST/admin/reco-impact/idempotency behaviour is proven in `e2e` (real Postgres) ONLY.
- **Map each spec §20.2 "API test" to pure-unit OR e2e** (see Architecture table). Do not write a "route handler unit test" — that pattern does not exist in this repo.
- Seed template = `import-demo-menu.ts`: production guard, `$transaction` with `TX_OPTS`, fixed `OBSERVED_AT` (no `Date.now()`), idempotent `upsert`. Mirror it exactly. New seed keys on `clientReportId @unique`.
- Demo fixtures already exist from `seed:restaurant-demo-menu`: restaurant `rest_demo_bun_cha` (slug `demo-bun-cha-hoan-kiem`), menu item `mi_demo_bun_cha` (dish `dish_bun_cha`), allergens incl. `peanut`. Reuse these; the severe report scopes to `peanut` so it matches the e2e profile.
- **No e2e admin-login helper exists** — admin visibility was faked at seed. We need a real one: POST `/api/v1/admin/login` `{ token }` sets the `sbt_admin` cookie (CI env `ADMIN_TOKEN=change-me-in-dev`).
- E2E profile injection pattern is fixed: write straight into IndexedDB `safebite_pwa_v1` (`profiles` + `metadata.activeProfileId`) — copy from `restaurant-happy-path.spec.ts`. No `data-testid`; select by role/name against EN chrome.
- `messages/*.json` IS scanned by `copy:check` — feedback copy in BOTH locales must dodge the denylist substrings. Test/seed fixtures too (build banned phrases from fragments, as `restaurant-api.test.ts:171` does).

## Requirements
### Functional
- `pnpm seed:feedback-demo` (root + web) creates exactly 4 idempotent reports: no-reaction, mild, severe-pending (+ auto flags + system actions), resolved. Re-run = byte-identical, zero duplicates.
- Domain unit tests cover every §20.1 assertion. App unit tests cover Zod schema, `planFeedbackReport`/`flagRowToSignal`, and the Dexie `pendingFeedbackRepo`.
- E2E: public no-reaction happy path + admin sees it; severe flow (public warning + admin urgent + resolve/clear); optional offline queue+sync.
- CI `e2e` job runs `seed:feedback-demo` after `seed:restaurant-demo-menu`.
- README updated: Phase 03 status paragraph, `seed:feedback-demo` scripts-table row + quality-gate chain note, `Feedback (§21)` manual-QA checklist.

### Non-functional
- No vitest test touches Prisma/DB/network. `pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check` stays green. Seed refuses to run in prod without `ALLOW_DEMO_SEED=true`.

## Architecture
Spec §20.2 assertion → where it lives:

| §20.2 assertion | Home |
|---|---|
| POST creates report / validates required / rejects mismatched menuItem / idempotent by clientReportId | **e2e** (real DB) + schema-shape half in `feedback-schema.test.ts` (pure) |
| Severe creates urgent active flags / no-reaction creates none | **pure** `feedback-plan.test.ts` (`planFeedbackReport`) + **e2e** persistence assertion |
| Feedback notes length-limited | **pure** `feedback-schema.test.ts` (Zod max 500) |
| Admin list requires auth / start review / resolve / audit row / clear flag | **e2e** (admin-login helper + real DB) |
| Recommendation API applies active severe flag / never exposes raw notes | **e2e** (flag→signal→apply) + **pure** `feedback-apply.test.ts` (no-notes-in-output shape) |

Flow: `seed:restaurant-demo-menu` → `seed:feedback-demo` (reads demo restaurant/menu, writes reports+flags+actions) → built app → Playwright drives public + admin.

## Related Code Files
### Create
- `apps/web/scripts/import-feedback-demo.ts` — dev seed (§19).
- `packages/domain/tests/feedback-signals.test.ts` — `getFeedbackPriority`, `shouldAutoCreateFeedbackFlag`, `feedbackSignalWeight`, `summarizeFeedbackSignals`.
- `packages/domain/tests/feedback-apply.test.ts` — `applyFeedbackSignalsToMenuItem` / `...ToRestaurantReadiness` invariants.
- `apps/web/src/tests/unit/feedback-schema.test.ts` — Zod (`FeedbackReportInputSchema` etc.), mirrors `api-validation.test.ts`.
- `apps/web/src/tests/unit/feedback-plan.test.ts` — `planFeedbackReport` + `flagRowToSignal` (pure, hand-built rows).
- `apps/web/src/tests/unit/feedback-repo.test.ts` — `pendingFeedbackRepo` via `fake-indexeddb/auto`, mirrors `local-repo.test.ts`.
- `apps/web/src/tests/e2e/feedback-happy-path.spec.ts` — public + severe (+ optional offline).
- `apps/web/src/tests/e2e/helpers/admin-login.ts` — POST `/api/v1/admin/login` helper.

### Modify
- `apps/web/package.json` — add `"seed:feedback-demo": "tsx scripts/import-feedback-demo.ts"`.
- `package.json` (root) — add `"seed:feedback-demo": "pnpm --filter @safebite/web seed:feedback-demo"`.
- `.github/workflows/ci.yml` — add `- run: pnpm seed:feedback-demo` after the `seed:restaurant-demo-menu` step (line 60).
- `README.md` — scripts table (after line 126), quality-gate note (~134), new `Feedback (§21)` checklist (after Restaurants block ~159), Status Phase 03 paragraph (after line 188).

## Implementation Steps
1. **Seed script** `import-feedback-demo.ts`: copy the guard header from `import-demo-menu.ts` (`if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') { ...exit(1) }`). Const `SEEDED_AT = new Date('2026-07-02T00:00:00.000Z')` (fixed, no `Date.now()`). Precondition: `findUnique` on `rest_demo_bun_cha` / `mi_demo_bun_cha`; if absent, `console.error('Run seed:restaurant-demo-menu first')` and `exit(1)`.
2. In one `$transaction(TX_OPTS)`, `upsert` 4 `FeedbackReport` rows keyed on `clientReportId` (`feedback-demo-none`, `-mild`, `-severe`, `-resolved`):
   - `none`: `reaction:'none'`, `priority:'low'`, `status:'needs_review'`, minimal `profileSnapshot` (allergenIds `['peanut']`, severity `anaphylaxis_risk`), no flags.
   - `mild`: `reaction:'mild'`, `priority:'normal'`.
   - `severe`: `reaction:'severe'`, `priority:'urgent'`, `severeAutoFlagged:true`, plus `upsert` a restaurant `FeedbackFlag` (`effect:'cap_restaurant_readiness'`, `readinessCap:'D'`, `publicReasonKey:'feedback_under_review_severe'`, `status:'active'`, `allergenId:'peanut'`) and a menu-item flag (`effect:'suppress_suitable'`, `publicReasonKey:'feedback_under_review_severe_item'`), plus system `FeedbackAdminAction` rows (`actor:'system'`). Reuse the Phase 03 `persistFeedbackReport`/`buildAutoFlagSpecs` path if importable; else inline conservative literal data matching §17.3.
   - `resolved`: `reaction:'moderate'`, `status:'resolved'`, `reviewedBy:'admin'`, a resolved flag (`status:'resolved'`).
   - Idempotency: flags/actions upsert on a deterministic id derived from `clientReportId` (never random), so re-run is a no-op. All copy denylist-safe (no "safe"/"verified_safe").
3. **Scripts**: add `seed:feedback-demo` to `apps/web/package.json` and root `package.json` (delegating form).
4. **CI**: insert the seed step in `ci.yml` `e2e` job right after line 60 (`seed:restaurant-demo-menu`), before `pnpm build`.
5. **Domain tests** (`packages/domain/tests/`): assert §20.1 — priority map (all 7 reactions), `shouldAutoCreateFeedbackFlag` true only for `severe`/`anaphylaxis_or_emergency`, decay 1.0/0.7/0.4/0.15 by age, severe flags do not decay, `summarizeFeedbackSignals` counts + `publicMessageKey`. In `feedback-apply.test.ts`: never emits `'suitable'`; `suppress_suitable` on severe → `'risky'` / mild-moderate → `'ask_first'`; `cap_restaurant_readiness` A/B/C→D, E→E; `none` report changes nothing; resolved/dismissed/expired ignored; allergen-scoped flag only affects matching `profileAllergenIds`. Use hand-built `MenuItemRecommendation`/`RestaurantRecommendation` literals (snake_case status, `readinessClass`, `reasons: Bilingual[]`).
6. **App unit tests** (`apps/web/src/tests/unit/`): `feedback-schema.test.ts` — valid input parses + defaults; missing `clientReportId`/`restaurantId`/`reaction` rejected; `notes`/`staffAnswerText` >500 rejected; `allergenIds` >10 rejected; `userTrustRating` outside 1..5 rejected. `feedback-plan.test.ts` — `planFeedbackReport` derives priority + `severeAutoFlagged` + flag specs (pure, no DB); `flagRowToSignal` maps a hand-built row to `FeedbackSignal` (Decimal/Date coerced). `feedback-repo.test.ts` — import `'fake-indexeddb/auto'`; `pendingFeedbackRepo` save/list/delete round-trip; `assertNoSecrets` rejects a token-bearing payload; `clearAllLocalData` empties `pendingFeedbackReports`.
7. **E2E helper** `admin-login.ts`: `export async function adminLogin(page)` → `page.request.post('/api/v1/admin/login', { data: { token: 'change-me-in-dev' } })`; assert `ok`. Cookie rides the context.
8. **E2E spec** `feedback-happy-path.spec.ts`: inject peanut/anaphylaxis profile into IndexedDB (copy from `restaurant-happy-path.spec.ts:24-37`). (a) Open `/en/restaurants/demo-bun-cha-hoan-kiem`, click the menu-item "Share feedback" CTA, complete the wizard with `reaction=none`, submit, assert success panel. Then `adminLogin`, open `/admin/feedback`, assert the row is visible. (b) Severe: submit `reaction=severe` for `mi_demo_bun_cha`; assert public detail shows the feedback-under-review warning; admin queue shows urgent; admin resolves + clears flag. (c) Optional offline: `context.setOffline(true)`, submit, assert queued banner, `setOffline(false)`, assert sync (guard as `test.skip` if flaky per §20.3).
9. **README**: add the `seed:feedback-demo` scripts-table row; extend the quality-gate paragraph e2e chain to `... → seed:restaurant-demo-menu → seed:feedback-demo → build → Playwright`; add `Feedback (§21)` checklist subsection (all 13 §21 items verbatim, denylist-safe); add a **Phase 03 implemented** Status paragraph.
10. Run the gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check`; then verify seed idempotency locally (`pnpm seed:restaurant-demo-menu && pnpm seed:feedback-demo && pnpm seed:feedback-demo`) and `pnpm test:e2e`.

## Todo List
- [ ] Create `import-feedback-demo.ts` with prod guard, precondition, fixed timestamps, 4 idempotent reports (+ severe flags/actions)
- [ ] Add `seed:feedback-demo` to web + root `package.json`
- [ ] Wire `seed:feedback-demo` into `ci.yml` e2e job after `seed:restaurant-demo-menu`
- [ ] Domain tests: `feedback-signals.test.ts`, `feedback-apply.test.ts`
- [ ] App unit tests: `feedback-schema.test.ts`, `feedback-plan.test.ts`, `feedback-repo.test.ts`
- [ ] E2E helper `admin-login.ts` + `feedback-happy-path.spec.ts` (public + severe + optional offline)
- [ ] README: scripts row, gate note, `Feedback (§21)` checklist, Phase 03 Status paragraph
- [ ] Green: typecheck + lint + test + copy:check; seed idempotent; test:e2e passes

## Success Criteria
- `pnpm seed:feedback-demo` run twice after `seed:restaurant-demo-menu` yields 4 reports, 2 flags (1 active severe + 1 resolved), system actions, and zero duplicates.
- `pnpm test` green in a DB-less env (no Prisma import anywhere in new vitest files — verify `grep -L 'fake-indexeddb\|no-db' | xargs grep -l "@/lib/db"` finds nothing).
- `pnpm copy:check` passes (all new EN+VI copy, seed, and test fixtures denylist-clean).
- `pnpm test:e2e` passes public + severe flows; offline either passes or is `test.skip`'d with a manual-QA note.
- README shows Phase 03 status, the new script, and the §21 Feedback checklist.

## Risk Assessment
- **A unit test reaches for the DB → `quality` job fails (no Postgres).** → Keep all vitest pure/`fake-indexeddb`; push HTTP+DB assertions to e2e. Add the grep check in step 10.
- **Seed non-idempotent (random ids/`Date.now()`) → duplicate rows on re-run.** → `upsert` on `clientReportId` + deterministic flag/action ids + fixed `SEEDED_AT`.
- **copy:check trips on a banned substring in a fixture/message.** → Build banned phrases from fragments in tests; hedge all seed/README wording; never use `verified_safe`.
- **Offline e2e flaky.** → §20.3 sanctions demoting it to `test.skip` + manual QA; do not block the gate on it.
- **admin-login helper leaks the token into a record/log.** → Only pass it as the POST body; never persist; `assertNoSecrets` already guards client storage.

## Security & Privacy Considerations
- Seed `profileSnapshot` is minimal (allergenIds + severity only) — no full profile, no geo/lat/lon, no PII. Enforces contract invariant #6.
- E2E/seed never place allergy data in a URL (profile injected via IndexedDB; only `restaurantId`/`menuItemId` in query).
- Public-facing e2e assertions confirm raw `notes`/`staffAnswerText` never render (invariant #5).
- Seed and CI keep `ADMIN_TOKEN=change-me-in-dev` as a dev/CI-only value; never a real secret. Seed refuses prod without explicit override.

## Next Steps
- With this green, Phase 03 is merge-ready: both CI jobs pass and the acceptance checklist (§22) is demonstrable. Unblocks release tagging and the Phase 04 (Menu Upload/Scan) kickoff, which reuses the feedback signal + admin review architecture.
