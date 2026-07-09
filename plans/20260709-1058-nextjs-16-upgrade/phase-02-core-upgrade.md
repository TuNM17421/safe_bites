# Phase 02 — Core upgrade: codemod + Next 16 + Serwist + middleware→proxy

**Depends on:** 01 · **Status:** Not started · **Priority:** P0

## Overview
Bump Next.js to 16 (React stays 19.2), run the official codemod, bump Serwist, and rename the
`middleware.ts` network boundary to `proxy.ts` per Next 16.

## Key insights
- **Codemod** does most of it: `npx @next/codemod@latest upgrade latest` updates `next`, `react`,
  `react-dom`, and applies async-API + config codemods. Because the app is already async + has no
  `next/image`, expect near-zero code diffs from those codemods.
- **middleware → proxy** (Next 16): rename `src/middleware.ts` → `src/proxy.ts` and rename the default
  export function `middleware` → `proxy`. The app's file composes **next-intl `createMiddleware` +
  the admin auth perimeter** — keep that logic identical; only the filename/function name changes. The
  `config.matcher` export stays.
- Keep `react`/`react-dom` at **19.2** (Next 16 targets it and bundles the canary that exposes
  `<ViewTransition>` for App Router — that's why Phase 06 becomes possible).

## Requirements
- `next@16`, `next-intl@4` (installed here; migrated in Phase 03), Serwist current 9.x.
- `proxy.ts` in place; app boots on Next 16 dev (`next dev --turbopack`).

## Implementation steps
1. From `apps/web`: `pnpm dlx @next/codemod@latest upgrade latest` (or bump manually in `package.json`
   then `pnpm install`). Review the diff — revert any unwanted codemod edits.
2. Bump `next-intl` to `^4.4` in `package.json` (migration lands in Phase 03; app may not build until then).
3. Bump `@serwist/next` + `serwist` to the latest 9.x (Turbopack-aware). Do not change SW source yet.
4. `git mv apps/web/src/middleware.ts apps/web/src/proxy.ts`; rename `export default async function
   middleware` → `proxy`. Keep imports (`next-intl/middleware`, `admin-auth`, `routing`) and `config`.
5. `pnpm install`; start dev via the binary (`node ./node_modules/next/dist/bin/next dev --turbopack -p <port>`)
   and confirm the server boots and `/en` renders (i18n fixes may still be pending → Phase 03).

## Related code files
- Modify: `apps/web/package.json`, `apps/web/next.config.ts` (codemod may touch), `apps/web/src/middleware.ts` → `apps/web/src/proxy.ts`.
- Watch: `apps/web/src/lib/service-worker.ts` (Serwist SW source — unchanged here).

## Todo
- [ ] Codemod run; diff reviewed
- [ ] `next@16`, `next-intl@^4.4`, Serwist 9.x latest installed
- [ ] `middleware.ts` → `proxy.ts` (function renamed, logic + matcher unchanged)
- [ ] Dev server boots on Next 16

## Success criteria
Deps at target versions; `proxy.ts` handles locale + admin perimeter; dev server starts (typecheck may
still fail pending next-intl v4 — that's Phase 03).

## Risk assessment
- **Codemod over-edits** → review every diff; keep unrelated files untouched.
- **proxy matcher regression** → verify `/admin` is NOT locale-redirected and locale routing still works
  after Phase 03.

## Security considerations
- The admin perimeter (`requireAdmin`, `ADMIN_COOKIE` constant-time compare) MUST survive the rename —
  it is the authoritative auth layer. Re-test `/api/v1/admin/*` 401 behavior in Phase 05.

## Next steps
Phase 03 (next-intl v4) and Phase 04 (PWA build) — can run in parallel.
