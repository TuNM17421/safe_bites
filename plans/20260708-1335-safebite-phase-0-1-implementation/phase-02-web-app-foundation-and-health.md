# Phase 02 - Next.js Web App Foundation + Health

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §3 Repository structure (`apps/web/src/app`, lines 154-215)
  - §4.1 `.env.example` (env vars this phase validates)
  - §9 API envelope (`ApiResponse<T>`, lines 891-910)
  - §9.1 Health route (lines 912-931)
  - §12.1 Landing page `/` acceptance (lines 1308-1320)
  - §13 Components / status priority + `Suitable` caveat (lines 1480-1490)
  - §14 i18n copy keys -> become next-intl messages (lines 1494-1527)
  - §16 Copy safety guard scan folders (lines 1570-1599)
  - §18 P0-02 acceptance (lines 1667-1677)
- Related phases:
  - `phase-01-monorepo-bootstrap.md` (P0-01: pnpm workspace, `tsconfig.base.json`, root scripts, `.env.example`, `docker-compose.yml`) - **dependency**
  - `phase-03-database-prisma-and-health-db.md` (P0-03: wires the real DB ping into `/api/health`) - **unblocks**
- Kit files: none consumed this phase (seed import is Phase 04). Confirm kit path `./osm_overpass_seed_kit` exists at repo root for later phases.

## Overview

- **Priority:** P0 (blocks every UI and API phase)
- **Current status:** Not started
- **Brief description:** Bootstrap `apps/web` as a Next.js 15 / React 19 App Router application: build config (`next.config.ts`, Tailwind + PostCSS, `globals.css` semantic tokens), the next-intl skeleton (`[locale]` routing, provider, `@/i18n/navigation`, baseline `messages/{en,vi}.json`), the two foundation libs (`lib/env.ts` zod-validated env, `lib/api-response.ts` envelope helpers), the `/api/health` route (DB ping deferred to Phase 03), and the landing page `/` per §12.1. This establishes the next-intl + token + envelope skeleton the rest of the app builds on.

## Key Insights

- **next-intl override reshapes §3's flat `app/` tree.** The spec §3 lists `app/page.tsx`, `app/layout.tsx`, `app/(app)/...`, `app/admin/...` flat. The confirmed override (URL locale routing `/en` `/vi`) means every **page** moves under `app/[locale]/`, while **route handlers stay locale-free under `app/api/`** (APIs must not be locale-redirected). The sole root layout becomes `app/[locale]/layout.tsx` (owns `<html lang>` + `<body>` + provider). This phase sets that shape once; later phases just drop pages into `[locale]/`.
- **`lib/i18n.ts` from §3 is replaced by `src/i18n/{routing,navigation,request}.ts`.** The override supersedes the "simple dictionary" module. Record this deviation so later phases import `@/i18n/navigation`, not a dictionary.
- **Copy guard blind spot (cross-cutting, must flag now).** §16's `assert-no-unsafe-copy.ts` scans `apps/web/src`, `packages/domain/src`, `apps/web/prisma` — but the override puts bilingual chrome strings in **`apps/web/messages/*.json`, which is OUTSIDE every scan folder.** The forbidden-phrase gate would silently miss the message files. **Mitigation locked here:** the CI-scripts phase MUST add `apps/web/messages` to the scan globs (this phase creates that dir, so the requirement originates here). Noted in Risk + Security.
- **Health `db` field must be honest, not faked.** §9.1's example shows `db: "ok"`, but the DB client does not exist until Phase 03. Returning `"ok"` now would claim an unverified state — against the product's transparency posture. This phase returns `db: "unknown"`; Phase 03 replaces it with a real `SELECT 1` ping. P0-02 acceptance only requires `status: "ok"`, so this passes.
- **Env split protects secrets.** `DATABASE_URL` and `ADMIN_TOKEN` are server-only and must never enter the client bundle. `env.ts` exposes `publicEnv` (parsed `NEXT_PUBLIC_*`, safe to import anywhere) and a lazy `serverEnv()` function (called only inside route handlers / server code). `DATABASE_URL` is validated but unused until Phase 03.
- **CSV list env vars need parsing.** `NEXT_PUBLIC_SUPPORTED_CITIES` / `NEXT_PUBLIC_SUPPORTED_LANGUAGES` are comma strings in §4.1; zod-transform them to arrays, and constrain languages to `en|vi`.
- **Decimal-serialization seam lives here.** `lib/api-response.ts` is where every response is JSON-shaped. Per integration note 5, Prisma `Decimal` (confidence/lat/lon/price) must serialize as plain numbers. No Decimals flow through Phase 02, but the response-mapper contract (map to plain JSON before `apiOk`) is established here for data phases to honor.
- **Semantic tokens only (standing rule).** `globals.css` defines the CSS-variable palette (surface + the five status tokens Suitable/Ask First/Risky/Avoid/Unknown + a safety-notice token), and `tailwind.config.ts` maps them to named colors. Components will consume `bg-status-avoid` etc. — never raw hex. Status **visual priority** (§13: Avoid > Risky > Ask First > Unknown > Suitable) is a components-phase concern; only the tokens are minted here.

## Requirements

### Functional

- `pnpm dev` starts the app; `GET /` renders the landing page; `GET /api/health` returns `{ data: { status: "ok", db: "unknown" }, meta: { generatedAt } }` (P0-02, §9.1).
- Locale routing works: `/` redirects to `/en` (default), `/vi` renders the Vietnamese landing page; unknown locale -> `notFound()`.
- Landing page (§12.1) shows: app positioning, "no install required", CTA **Start allergy profile** (-> `/onboarding`), CTA **Browse dish guide** (-> `/dishes`), and a safety note that the app cannot guarantee food safety. CTAs use `Link` from `@/i18n/navigation` (locale-prefixed automatically).
- All static UI strings on the landing page resolve via `useTranslations`/`getTranslations`; no hardcoded EN/VI in JSX.
- `lib/api-response.ts` provides `ApiResponse<T>` (exact §9 shape) plus `apiOk`/`apiError` helpers that stamp `meta.generatedAt` (ISO) and optional `requestId`.
- `lib/env.ts` zod-validates every §4.1 variable at load; a missing/invalid required var throws a clear error at boot.

### Non-functional

- `pnpm typecheck` and `pnpm lint` pass for `apps/web` (P0-01/P0-02).
- Landing `/` and `layout` are React Server Components (server-first rule); no `'use client'` introduced this phase.
- No forbidden copy (§0/§16) in any created file including `messages/*.json`.
- No raw hex/rgb in components — semantic tokens only.
- Every impl file < ~200 lines; KISS/DRY/YAGNI (no PWA/manifest/Dexie/DB here — those are later phases).

## Architecture

**System design.** `apps/web` is a Next 15 App Router monolith. next-intl's `createNextIntlPlugin` wraps `next.config.ts` and points at `src/i18n/request.ts`. Middleware (`src/middleware.ts`) handles locale detection + prefixing for page routes and explicitly excludes `/api`, `/_next`, and static assets.

**Component interactions.**
```
next.config.ts --(createNextIntlPlugin)--> src/i18n/request.ts --loads--> messages/{locale}.json
src/middleware.ts --(createMiddleware(routing))--> locale redirect for pages (not /api)
app/[locale]/layout.tsx --> setRequestLocale + NextIntlClientProvider(messages) --> renders <html lang>
app/[locale]/page.tsx --> getTranslations('landing'|'safety') + Link(@/i18n/navigation)
app/api/health/route.ts --> apiOk(...) from lib/api-response.ts   (no locale, no DB yet)
lib/env.ts --> publicEnv (build-inlined) | serverEnv() (lazy, server-only)
```

**Data flow (health request).** `GET /api/health` -> route handler -> `apiOk({status:'ok', db:'unknown'})` -> `NextResponse.json({ data, meta:{ generatedAt } })`. No DB, no locale, no auth.

**Data flow (landing render).** request `/vi/...` -> middleware confirms/normalizes locale -> `[locale]/layout` sets request locale + loads messages via `request.ts` -> `page.tsx` pulls `landing`/`safety` namespaces -> renders CTAs with locale-aware `Link`.

## Related Code Files

### To create

- `apps/web/package.json` — `@safebite/web`; deps: `next` (15), `react`/`react-dom` (19), `next-intl`, `zod`; scripts `dev`/`build`/`lint`/`typecheck` (matches root filters in §4.3). (If Phase 01 left a stub, extend it instead.)
- `apps/web/tsconfig.json` — extends `../../tsconfig.base.json`; `paths` `@/*` -> `./src/*`; `plugins: [{ name: "next" }]`.
- `apps/web/next.config.ts` — `withNextIntl('./src/i18n/request.ts')(nextConfig)`.
- `apps/web/postcss.config.mjs` — `tailwindcss` + `autoprefixer`.
- `apps/web/tailwind.config.ts` — `content: ['./src/**/*.{ts,tsx}']`; `theme.extend.colors` mapping semantic + status tokens to `hsl(var(--…))`.
- `apps/web/src/app/globals.css` — `@tailwind base/components/utilities` + `:root` token vars (+ dark via `prefers-color-scheme`).
- `apps/web/src/app/[locale]/layout.tsx` — root layout: `generateStaticParams`, `setRequestLocale`, `NextIntlClientProvider`, `<html lang={locale}>`, imports `../globals.css`.
- `apps/web/src/app/[locale]/page.tsx` — landing `/` (§12.1), async RSC using `getTranslations` + `@/i18n/navigation` `Link`.
- `apps/web/src/app/api/health/route.ts` — `GET` -> `apiOk({ status:'ok', db:'unknown' })`.
- `apps/web/src/i18n/routing.ts` — `defineRouting({ locales:['en','vi'], defaultLocale:'en' })`.
- `apps/web/src/i18n/navigation.ts` — `createNavigation(routing)` -> exports `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`.
- `apps/web/src/i18n/request.ts` — `getRequestConfig` loading `../../messages/${locale}.json`.
- `apps/web/src/middleware.ts` — `createMiddleware(routing)`; matcher excludes `api|_next|_vercel|*.*`.
- `apps/web/messages/en.json` — namespaces `common`, `landing`, `safety`, `statuses` (baseline).
- `apps/web/messages/vi.json` — same keys, VI strings from §14.
- `apps/web/src/lib/env.ts` — zod schemas; `publicEnv` + lazy `serverEnv()`.
- `apps/web/src/lib/api-response.ts` — `ApiResponse<T>`, `apiOk`, `apiError`.

### To modify

- `apps/web/package.json` — only if Phase 01 created a placeholder (add Next/next-intl/zod deps + scripts).
- Root `.gitignore` (Phase 01) — ensure `.env`, `.next/`, `node_modules/` ignored (verify, add if missing).

### To delete

- None. (Do **not** create `src/lib/i18n.ts` from §3 — superseded by `src/i18n/*`.)

## Implementation Steps

1. **App manifest & TS config.** Create/extend `apps/web/package.json` (`@safebite/web`, Next 15 / React 19 / next-intl / zod, scripts) and `apps/web/tsconfig.json` (extends base, `@/*` alias, next plugin). Run `pnpm install`.
2. **Build config.** Add `postcss.config.mjs`, `tailwind.config.ts` (content globs + token color map), and `next.config.ts` wrapped by `createNextIntlPlugin('./src/i18n/request.ts')`.
3. **Semantic tokens.** Write `src/app/globals.css`: Tailwind directives + `:root` variables for surface tokens (`--background`, `--foreground`, `--muted`, `--border`), the five status tokens (`--status-suitable`, `--status-ask-first`, `--status-risky`, `--status-avoid`, `--status-unknown`), and `--safety`; add a dark-scheme block.
4. **i18n skeleton.** Create `src/i18n/routing.ts`, `src/i18n/navigation.ts`, `src/i18n/request.ts`, and `src/middleware.ts` (matcher excluding `/api`). Verify the `request.ts` relative path resolves to `apps/web/messages`.
5. **Baseline messages.** Create `messages/en.json` and `messages/vi.json` with `common.appName`, `landing.*`, `safety.{disclaimer,offlineNotice,suitableCaveat}` (verbatim §14), and `statuses.{suitable,askFirst,risky,avoid,unknown}` (§14 labels; VI `suitable` = "Phù hợp hơn").
6. **Root layout.** `app/[locale]/layout.tsx`: `generateStaticParams` over `routing.locales`, `await params`, `hasLocale` guard -> `notFound()`, `setRequestLocale(locale)`, `getMessages()`, wrap children in `NextIntlClientProvider`, set `<html lang={locale}>`, import `../globals.css`.
7. **Foundation libs.** `lib/api-response.ts` (`ApiResponse<T>` + `apiOk`/`apiError` stamping `meta.generatedAt`); `lib/env.ts` (zod `publicEnv` with CSV->array transforms + `serverEnv()` lazy for `DATABASE_URL`/`ADMIN_TOKEN`).
8. **Health route.** `app/api/health/route.ts` `GET` returning `apiOk({ status:'ok', db:'unknown' })`. Add the `// Phase 03 wires real DB ping` comment.
9. **Landing page.** `app/[locale]/page.tsx` async RSC: `setRequestLocale`, `getTranslations('landing')` + `('safety')`, render positioning, no-install line, two `Link` CTAs (`/onboarding`, `/dishes`), and the safety note (`safety.disclaimer`). Style with token classes only.
10. **Verify.** `pnpm typecheck`, `pnpm lint`, `pnpm dev`; curl `/api/health`; open `/en` and `/vi`; confirm `/` redirects to `/en`.

## Todo List

- [ ] `apps/web/package.json` + `tsconfig.json` created/extended; `pnpm install` clean
- [ ] `postcss.config.mjs`, `tailwind.config.ts`, `next.config.ts` (next-intl plugin) in place
- [ ] `globals.css` with semantic surface + five status tokens + safety token (light/dark)
- [ ] `src/i18n/{routing,navigation,request}.ts` + `src/middleware.ts` (matcher excludes `/api`)
- [ ] `messages/en.json` + `messages/vi.json` with `common`/`landing`/`safety`/`statuses`
- [ ] `app/[locale]/layout.tsx` root layout (provider, `setRequestLocale`, `<html lang>`)
- [ ] `lib/api-response.ts` (`ApiResponse<T>` + `apiOk`/`apiError`)
- [ ] `lib/env.ts` (zod `publicEnv` + lazy `serverEnv()`, CSV parsing, `en|vi` guard)
- [ ] `app/api/health/route.ts` returns `{status:'ok', db:'unknown'}` via envelope
- [ ] `app/[locale]/page.tsx` landing with §12.1 CTAs + safety note (all i18n keys)
- [ ] `typecheck` + `lint` pass; `pnpm dev` serves `/en`, `/vi`, `/api/health`
- [ ] Flag to CI-scripts phase: add `apps/web/messages` to §16 copy-guard scan globs

## Success Criteria

Mirrors §18 P0-02 acceptance plus §12.1 / §9.1:

- **`pnpm dev` starts the app** without error.
- **`GET /` renders the landing page** — shows positioning, "no install required", both CTAs, and the safety note; redirects to `/en`; `/vi` renders VI copy.
- **`GET /api/health` returns status ok** — body exactly `{ "data": { "status": "ok", "db": "unknown" }, "meta": { "generatedAt": "<ISO>" } }` (envelope validated end-to-end; `db` upgraded to a real ping in Phase 03).
- `pnpm typecheck` and `pnpm lint` pass.
- Unknown locale (`/xx`) -> 404; landing strings all come from `messages/*.json` (grep JSX shows no literal EN/VI sentences).
- **Validation commands:** `pnpm dev` then `curl localhost:3000/api/health`; open `/en` and `/vi`; run `pnpm typecheck && pnpm lint`.

## Risk Assessment

- **Copy guard misses `messages/*.json` (§16 blind spot).** *Impact:* forbidden phrases could ship undetected in bilingual chrome. *Mitigation:* explicit todo to extend the CI scan globs to include `apps/web/messages`; until then, manual review of the two message files against the §16 denylist (baseline strings already clean).
- **Middleware matcher accidentally captures `/api/health`.** *Impact:* health route gets locale-redirected and breaks P0-02. *Mitigation:* matcher `['/((?!api|_next|_vercel|.*\\..*).*)']`; verify with a direct curl in step 10.
- **`request.ts` relative path to `messages/` wrong** (`src/i18n` -> `../../messages`). *Impact:* runtime "messages not found". *Mitigation:* verify path resolves to `apps/web/messages`; covered by `/vi` render check.
- **Tailwind v3 vs v4 config mismatch.** §3 lists `tailwind.config.ts` + `postcss.config.mjs` (v3 layout). *Mitigation:* target Tailwind v3.4 (`@tailwind` directives in `globals.css`, JS token map) to match the spec file list; do not adopt v4 CSS-first config.
- **CTA targets (`/onboarding`, `/dishes`) don't exist yet.** *Impact:* clicking 404s until later phases. *Mitigation:* acceptable for foundation; links are correct and locale-aware now, target pages land in Phases 05+.
- **Next 15 async `params`/`requestLocale`.** *Impact:* type/runtime errors if awaited incorrectly. *Mitigation:* `await params` and `await requestLocale` per next-intl Next-15 patterns; caught by `typecheck`.

## Security Considerations

- **Secret isolation.** `DATABASE_URL` and `ADMIN_TOKEN` live only in `serverEnv()` (a function called from server code); never exported as module-level constants and never referenced in client components, so they cannot be inlined into the client bundle. Only `NEXT_PUBLIC_*` values are exposed.
- **No auth surface yet.** No user accounts (§2); admin `sbt_admin` cookie / `ADMIN_TOKEN` gating arrives in the admin phase. `ADMIN_TOKEN` is validated here but unused.
- **Safety copy compliance.** All created files (esp. `messages/en.json`, `messages/vi.json`, landing JSX) avoid every §0/§16 forbidden phrase. `Suitable` label ships with the mandated caveat key (`safety.suitableCaveat`) for later status rendering; Unknown is a distinct honest state and the health `db:"unknown"` mirrors that same never-overclaim discipline.
- **OSM discovery-only:** not touched this phase (no restaurant data/UI); constraint remains satisfied by omission.
- **Envelope hygiene.** `apiError` returns structured `{ code, message, details? }` without leaking stack traces; response mappers (data phases) must convert Prisma `Decimal` to plain numbers before `apiOk` (integration note 5).

## Next Steps

- **Depends on:** Phase 01 (workspace, `tsconfig.base.json`, root scripts, `.env.example`, `docker-compose.yml`).
- **Unblocks:**
  - **Phase 03 (Database + Prisma):** replaces `db:"unknown"` in `/api/health` with a real ping; consumes `serverEnv().DATABASE_URL`.
  - **Domain / API phases:** every `/api/v1/*` route reuses `lib/api-response.ts` (`apiOk`/`apiError`) and Zod-at-boundary; `client-config` route consumes `publicEnv` arrays.
  - **UI phases:** all pages mount under `app/[locale]/`, reuse the token palette + `@/i18n/navigation`, and the `NextIntlClientProvider` established here.
  - **CI-scripts phase:** must extend `assert-no-unsafe-copy.ts` scan set to include `apps/web/messages`.
