# Phase 09 — Tests, README, quality gates

**Context:** Spec §17, §18, §24 · `packages/domain/tests/*`, `apps/web/src/tests/unit/*`, `src/tests/e2e/happy-path.spec.ts`, `scripts/assert-no-unsafe-copy.ts`, `README.md`.

## Overview
- **Priority:** P0 (phase not done until gates pass).
- **Status:** Not started.
- Domain unit tests (mostly authored in Phase 01), API tests, extended Playwright happy path, README/docs update, and all quality gates green. No skipped restaurant tests.

## Key insights (verified)
- Vitest unit tests under `packages/domain/tests/` and `apps/web/src/tests/unit/`; Playwright e2e under `src/tests/e2e/` (`mobile-chromium`/Pixel 7, needs built + seeded + approved DB). `copy:check` scans `web/src`, `web/prisma`, `web/messages`, `web/public`, `packages/domain/src`.
- Existing happy path: onboard → dishes → question card → offline allergy card. Extend, don't replace.

## Requirements
1. **Domain unit tests (§17.1)** — ensure Phase 01 covers every bullet: contains/likely_contains→Avoid; possible→Risky (anaphylaxis) / Ask First (mild, not cross-contact); unknown→Unknown; never Suitable for unknown; explicit status overrides mapped dish; dish inference used when no explicit status; discovery-only never verifies; readiness C for no menu; cap C for discovery-only; B when ≥1 Ask First/Suitable but not fully verified; E when all Avoid/Risky; stale downgrades confidence.
2. **API tests (§17.2)** in `src/tests/unit/`: GET /restaurants returns only approved; POST recommendations accepts profile in body; POST recommendations rejects profile in query (no such param → validation/ignored); POST detail returns menu recs; admin restaurant/menu CRUD require auth (401 without cookie); invalid enum/status → 400.
3. **E2E happy path (§17.3):** migrate + seed + seed:kit + approve + demo menu + approve ≥1 restaurant with ≥1 mapped menu item → open /en → onboard peanut/anaphylaxis/cross-contact → /restaurants → see cards w/ readiness + source → open detail → see menu recs w/ status/reason/source/confidence → "Ask about this item" → question card with context → copy guard passes. Update CI seed flow if e2e needs seeded restaurant/menu.
4. **README + docs (§24):** update Status + "What it does" with restaurant guide + admin console lines; add Manual QA checklist (§17.4). Update `docs/development-roadmap.md` + `docs/project-changelog.md` per documentation-management rules.

## Related code files
- Create: `apps/web/src/tests/unit/restaurant-api.test.ts` (+ admin variant); extend `src/tests/e2e/happy-path.spec.ts` (or new `restaurant-happy-path.spec.ts`).
- Modify: `README.md`, `docs/development-roadmap.md`, `docs/project-changelog.md`; CI seed flow (`.github/workflows/*`) if needed.

## Implementation steps
1. Confirm domain tests complete; add any missing §17.1 cases.
2. Write API tests (auth, validation, approved-only, body-not-query).
3. Extend e2e + ensure CI seeds a restaurant + mapped menu item + approval.
4. Update README/docs/changelog/roadmap.
5. Run full gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check && pnpm test:e2e && pnpm build`. Fix, don't skip.

## Todo
- [ ] Domain §17.1 coverage complete
- [ ] API tests (§17.2)
- [ ] E2E restaurant path + CI seed wiring
- [ ] README/docs/changelog/roadmap
- [ ] All 6 gates green

## Success criteria
All acceptance criteria (§19) demonstrable; every §18 gate passes; no `test.skip` on restaurant tests; copy guard clean across all new copy/fixtures/seed labels.

## Risks
- e2e DB seeding flakiness → deterministic demo seed (Phase 03) + explicit approval step.
- copy:check on VI strings → keep conservative wording; rewrite rather than weaken guard.

## Security
Tests assert: no profile in query, admin endpoints reject unauthenticated, discovery-only never A/verified, Suitable keeps caveat.

## Next
Phase 02 complete → update `plan.md` statuses.
