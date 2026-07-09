# Phase 05 — Full verification & stabilization

**Depends on:** 02–04 · **Status:** Not started · **Priority:** P0 (gate before the View Transitions payoff)

## Overview
Prove the Next 16 app is at parity with the 15.5 baseline across every gate and every screen before
adding new behavior (Phase 06).

## Key insights
- Safety net already exists: **46 vitest** unit tests, **Playwright e2e**, `copy:check`. Use them.
- Compare against `research/baseline.md` from Phase 01 — nothing that was green may regress.
- Verify the real runtime with headless Chrome + CDP (per prior sessions), not just static checks.

## Requirements
- Every quality gate green on Next 16; all Phase 0/1/2/3.1 flows work (consumer + admin, EN + VI, online + offline).

## Implementation steps
1. Static gates: `pnpm --filter @safebite/web typecheck` · `lint` · `test` (46 pass) · `copy:check`.
2. Production build: `node ./apps/web/node_modules/next/dist/bin/next build --webpack` — success.
3. e2e: `pnpm --filter @safebite/web test:e2e` (Playwright) — green (seeds its own PostGIS per CI).
4. Runtime smoke (headless Chrome CDP, 390px mobile), each 200 + no console errors, EN + VI:
   `/`, `/onboarding`, `/home`, `/dishes`, `/dishes/[id]`, `/restaurants` (Nearby), `/restaurants/[id]`,
   `/question-card`, `/allergy-card`, `/profile`, `/offline`, `/admin` (login + a CRUD screen).
5. Regression spot-checks: bottom nav = 4 tabs (Home/Dishes/Nearby/Profile); top-bar allergy-card button;
   onboarding has no shell + bottom-pinned CTA; status labels resolve ("Ask First"/"Hỏi trước"); admin
   perimeter returns 401 unauthenticated.
6. Offline: SW registers; offline → shell + saved allergy card/dishes work (from Phase 04).
7. Fix any fallout; keep commits scoped.

## Related code files
- No new source expected; fixes only. Reference `research/baseline.md`.

## Todo
- [ ] typecheck / lint / vitest(46) / copy:check green
- [ ] `next build --webpack` green
- [ ] Playwright e2e green
- [ ] All routes 200, EN+VI, no console errors (CDP)
- [ ] Admin auth + offline verified
- [ ] Regressions from prior UI work still intact (4-tab nav, top-bar card, onboarding, status labels)

## Success criteria
Full parity with the 15.5 baseline; zero regressions. This is the go/no-go gate for Phase 06.

## Risk assessment
- **Hidden runtime regressions** (caching/RSC defaults changed in 16) → the CDP per-route smoke + e2e catch these.
- If a gate can't be made green, prefer rolling back the branch over shipping a degraded PWA.

## Security considerations
- Re-confirm admin 401s and that recommendation APIs never leak raw notes (Phase 03 feedback logic) still hold.

## Next steps
Phase 06 — enable View Transitions (only if this phase is fully green).
