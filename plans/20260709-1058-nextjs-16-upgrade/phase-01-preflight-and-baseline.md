# Phase 01 — Pre-flight, branch & baseline

**Depends on:** — · **Status:** Not started · **Priority:** P0 (gate for everything else)

## Overview
Capture a known-green baseline and set up an isolated branch so the whole upgrade is reversible
code-only. No production behavior changes in this phase.

## Key insights
- The app is **local-first / offline PWA**; there are **no DB or schema changes** in this upgrade, so
  rollback is purely `git`.
- Current versions: `next 15.5.20`, `react/react-dom 19.2.7`, `next-intl 3.26`, `@serwist/next 9`,
  `tailwindcss 3.4`, Node ≥20 (running 24), pnpm 11.3.
- RTK mangles `next dev`/`next build` output — run the Next binary directly to see real errors
  (`node ./node_modules/next/dist/bin/next …`). See memory `rtk-mangles-next-dev-output`.

## Requirements
- A dedicated branch; a recorded baseline of every quality gate passing on Next 15.5.
- A dependency compatibility matrix confirming target versions before bumping.

## Implementation steps
1. Branch: `git checkout -b chore/nextjs-16-upgrade` from current `main` (HEAD `9d7e695`, Phase 03.1).
2. Record baseline (all must pass on 15.5 — commit the output to `research/baseline.md`):
   - `pnpm --filter @safebite/web typecheck`
   - `pnpm --filter @safebite/web lint`
   - `pnpm --filter @safebite/web test` (expect 46 vitest pass)
   - `pnpm --filter @safebite/web copy:check`
   - production build: `node ./apps/web/node_modules/next/dist/bin/next build` (from `apps/web`) — expect success (needs env; see `.env`).
   - offline PWA smoke: build + `start`, register SW, go offline, confirm shell + saved data.
3. Pin target versions in `research/compat-matrix.md`:
   - `next@^16` (latest stable ≥16.1), `react@19.2` / `react-dom@19.2` (Next 16 bundles React 19.2),
     `next-intl@^4.4` (min for Next 16), `@serwist/next@` latest 9.x (Turbopack-aware), `@types/react@19.2`.
   - Confirm Node ≥20.9 and TypeScript ≥5.1 (both already met).
4. Confirm the two facts that make this cheap: `grep -r "next/image" apps/web/src` → **0**; every
   `page.tsx` uses `params: Promise<…>` + `await` (async APIs already adopted).

## Related code files
- Read: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/vercel.json`, `apps/web/src/middleware.ts`, `.nvmrc`.
- Create: `research/baseline.md`, `research/compat-matrix.md`.

## Todo
- [ ] Branch created off `main`
- [ ] Baseline gates recorded (typecheck/lint/test/copy:check/build/offline)
- [ ] Compat matrix written & target versions pinned
- [ ] Confirmed no `next/image`, async APIs already used

## Success criteria
All 15.5 gates pass and are recorded; branch isolated; target versions confirmed compatible.

## Risk assessment
- Low. Read-only + branch. If baseline is NOT green on 15.5, stop and fix that first (don't upgrade on red).

## Security considerations
- None new. Do not commit `.env`; keep using `.env.example`.

## Next steps
Phase 02 — run the codemod and bump core deps.
