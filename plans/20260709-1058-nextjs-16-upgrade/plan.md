# SafeBite Travel — Next.js 16 Upgrade (Implementation Plan)

**Migration doc:** `docs/NEXT16_MIGRATION.md` · **Created:** 2026-07-09 · **Status:** Planned (not started)

Upgrade the web app from **Next.js 15.5 → 16** (React stays 19.2) so we can ship real **View
Transitions** (cross-fade + shared-element morph) — a feature that is unavailable on 15.5 because
its bundled React has no `<ViewTransition>`. This is a **major version bump on a production,
offline-first PWA**, so the plan front-loads baseline capture + verification and treats the PWA
build (Serwist) as the top risk.

## Ground truth (read first)
- `docs/NEXT16_MIGRATION.md` — the canonical "what changes and the new conventions" reference. Its
  **Conventions after upgrade** section is authoritative (proxy.ts, `build --webpack`, next-intl v4,
  View Transitions usage).
- The app is already on **modern patterns**, so most Next 16 breaking changes are no-ops here:
  async `params`/`searchParams` (already `Promise` + `await` everywhere), **no `next/image`** usage,
  Node ≥20 / TS ≥5.1 already met, React already 19.2.7.

## What actually changes for THIS app
| Next 16 change | Impact here | Where |
|---|---|---|
| Async request APIs | **none** — already async | all `page.tsx` |
| `next/image` defaults | **none** — 0 usages | — |
| `middleware.ts` → `proxy.ts` | rename file + export `proxy` (keeps next-intl + admin perimeter) | `apps/web/src/middleware.ts` |
| Turbopack default (dev+build) | Serwist SW build needs Webpack → `next build --webpack` | `package.json`, `apps/web/vercel.json` |
| next-intl v3.26 → **v4.4+** (required) | small — app uses `createNavigation`/`defineRouting`/`getRequestConfig` (stable in v4) | `src/i18n/*`, providers |
| React `<ViewTransition>` available | **the payoff** — enables cross-fade + morph | new VT wiring |

## Phases
| # | Phase | Depends on | Status |
|---|-------|-----------|--------|
| 01 | [Pre-flight, branch & baseline](phase-01-preflight-and-baseline.md) | — | ☐ Not started |
| 02 | [Core upgrade: codemod + Next 16 + Serwist + middleware→proxy](phase-02-core-upgrade.md) | 01 | ☐ Not started |
| 03 | [next-intl v3 → v4 migration](phase-03-next-intl-v4.md) | 02 | ☐ Not started |
| 04 | [PWA / Turbopack build (`--webpack`) + offline verify](phase-04-pwa-turbopack-build.md) | 02 | ☐ Not started |
| 05 | [Full verification & stabilization (tests/build/all screens)](phase-05-verify-and-stabilize.md) | 02–04 | ☐ Not started |
| 06 | [Enable View Transitions (cross-fade + shared-element morph)](phase-06-view-transitions.md) | 05 | ☐ Not started |

Phases 03 and 04 can partly parallelize once 02 lands. **06 is the goal**; do it only after 05 is green.
After execution, update the docs to reflect reality (see Phase 06 + the migration doc).

## Key risks
- **Serwist PWA build (offline = core feature).** Turbopack is the Next 16 default but Serwist compiles
  the service worker with **Webpack** → build must use `next build --webpack`. Verify the SW builds and
  offline actually works before declaring done. *(highest risk)*
- **next-intl v4.** Provider/format behavior shifts; the app uses modern APIs so churn is small, but
  re-test EN/VI across every screen.
- **Regression surface.** 46 vitest + Playwright e2e + `copy:check` are the safety net — keep them green.
- **Timing.** Major bump; do it on a branch at a stable checkpoint (no other agent mid-edit).

## Definition of done
`next@16` + `next-intl@4` installed; `middleware.ts` → `proxy.ts`; `build` uses `--webpack`; `pnpm
typecheck && lint && test && copy:check` green; production build succeeds; **offline PWA verified**
(SW registers, offline shell + saved data work); all Phase 0/1/2/3.1 flows pass (consumer + admin,
EN/VI); View Transitions live (cross-fade on navigation + dish list→detail morph, `prefers-reduced-motion`
respected, graceful on unsupported browsers); `docs/NEXT16_MIGRATION.md` + `deployment.md` updated to reality.

## Rollback
Work on branch `chore/nextjs-16-upgrade`; each phase is a commit. If the PWA build or e2e can't be made
green, `git reset`/abandon the branch — `main` stays on Next 15.5 (fully working). No DB/schema changes
are involved, so rollback is code-only.
