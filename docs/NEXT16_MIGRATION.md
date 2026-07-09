# Next.js 16 Migration — reference for agents

**Status: PLANNED (not yet executed).** Execute via
`plans/20260709-1058-nextjs-16-upgrade/plan.md`. This doc is the single place that explains **what
changes and the conventions to follow once the upgrade lands**, so any agent touching the app afterward
works with the new reality. Until the plan is executed, the app is on **Next 15.5** and the "before"
column applies.

> When the upgrade completes, flip the status to **Done (YYYY-MM-DD)** and delete the "before" notes.

## Why
Ship real **View Transitions** (cross-fade + shared-element morph). Next 15.5's bundled React has **no
`<ViewTransition>`** (verified — the export is absent), so VT is impossible without Next 16, which bundles
the React build that exposes it.

## Target versions
`next@^16` (≥16.1) · `react@19.2` / `react-dom@19.2` (unchanged; Next 16 targets it) · `next-intl@^4.4`
(minimum for Next 16) · `@serwist/next` + `serwist` latest 9.x · Node ≥20.9 · TypeScript ≥5.1.

## What changes (and what doesn't)
| Area | Before (15.5) | After (16) | Agent action |
|---|---|---|---|
| Request APIs (`params`, `searchParams`, `cookies`, `headers`) | already async | async (enforced) | none — **already done** app-wide |
| `next/image` | 0 usages | new defaults | none — app doesn't use it |
| Network boundary | `src/middleware.ts` (fn `middleware`) | **`src/proxy.ts` (fn `proxy`)** | edit `proxy.ts`, not `middleware.ts` |
| Bundler | Webpack | **Turbopack default** (dev + build) | see build note below |
| Service worker (Serwist) | Webpack build | Serwist SW needs **Webpack** | build with `next build --webpack` |
| i18n | next-intl 3.26 | **next-intl 4.x** | modern APIs unchanged; see i18n note |
| Page transitions | CSS fade (`(app)/template.tsx`) | **React `<ViewTransition>`** | use VT; the CSS fade is retired |

## Conventions AFTER the upgrade (follow these)

**1. Network boundary = `proxy.ts`.** The locale + admin-auth perimeter lives in
`apps/web/src/proxy.ts` (default export `proxy`, plus `config.matcher`). Do **not** re-create
`middleware.ts`. Composition is unchanged: next-intl `createMiddleware(routing)` + the admin cookie
perimeter (`requireAdmin`/`ADMIN_COOKIE`, constant-time compare) — admin paths handled first so `/admin`
is never locale-redirected.

**2. Build with Webpack (Serwist).** Turbopack is Next 16's default, but the PWA service worker is
compiled by Serwist with Webpack. So:
- `apps/web/package.json`: `"build": "prisma generate && next build --webpack"` (dev may use `--turbopack`).
- `apps/web/vercel.json` `buildCommand`: `prisma generate && prisma migrate deploy && next build --webpack`.
Offline is a **core feature** — never remove `--webpack` from the build without re-verifying the SW builds
and offline works.

**3. i18n = next-intl v4, same house APIs.** Still: navigation only via `@/i18n/navigation`
(`Link`/`useRouter`/`usePathname`/`redirect` from `createNavigation`) — **never `next/link`**; all copy via
`useTranslations` (no hardcoded strings); EN + VI parity in `messages/{en,vi}.json`. v4 note:
`NextIntlClientProvider` takes an explicit `locale` prop; `getRequestConfig` returns `{ locale, messages }`.

**4. Page transitions = React `<ViewTransition>`.** `experimental.viewTransition: true` is on. Wrap the
swapping page content in `<ViewTransition>` (in the `(app)` layout) for the cross-fade; for a shared-element
morph, put the same `name` on the source and target element (e.g. `dish-title-${id}` on the list card title
and the detail heading). **One element per `view-transition-name` per page** (collisions break it). Respect
`prefers-reduced-motion` (CSS zeroes the VT animation durations). The old CSS fade (`(app)/template.tsx`,
`sb-page-enter` in the Tailwind preset) is **removed** — don't reintroduce it (it double-animates).

## What does NOT change
Design system (`sb-*` tokens, no raw colors), Zod at API boundaries, server-first RSC default, Prisma/Neon
schema (this upgrade has **no DB changes**), the design north-star (`docs/design/`), and all the copy-safety
rules (`copy:check`).

## Gotchas
- **RTK** mangles `next dev`/`next build` output into a fake "Errors: N" banner — run the Next binary
  directly to see real errors: `node ./node_modules/next/dist/bin/next build --webpack` (see memory
  `rtk-mangles-next-dev-output`).
- Verify `import { ViewTransition } from 'react'` actually resolves + types after the bump before building
  VT features; if it doesn't, VT isn't ready — stop and report.
- next-intl v4 + Next 16 `use cache`: `getTranslations()` reads `headers()`, so it doesn't work inside
  `use cache`. The app doesn't use `use cache`, so N/A — but don't add it around translated server code.

## Sources
Next 16 upgrade guide · Next 16 blog · Serwist + Turbopack docs · next-intl v4 releases (see the plan's
phase files for the exact links used).
