# Phase 03 — Codebase Reality Map

> Source: 9 parallel subsystem readers over the actual repo (2026-07-09). This is the
> ground truth the plan is built on. Where the spec assumed something false, the
> **delta** is called out. Read this before touching code — the spec
> (`docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md`) has several inaccurate assumptions.

## 0a. Stack update — Next 16 / next-intl 4 (applied 2026-07-09, PR #3)

The repo was upgraded **Next 15.5 → Next 16.2.10 · next-intl 3.26 → 4.13.1 · Serwist 9.5.11 · React 19.2.7**
(View Transitions enabled). Ref: `docs/NEXT16_MIGRATION.md`. Deltas that affect Phase 03:

- **Network boundary is `apps/web/src/proxy.ts`** (default export `proxy` + `config.matcher`), NOT `middleware.ts`. The admin perimeter (`createMiddleware(routing)` + `ADMIN_COOKIE`/`verifyAdminCookie`, admin paths first) lives there, unchanged in behavior. Anywhere this doc/plan says "middleware", read **proxy.ts**. `requireAdmin(req)` in each handler is still the authoritative second layer.
- **Request APIs stay async** (`params`/`searchParams`/`cookies`/`headers` are Promises) — already handled app-wide; `await ctx.params` still correct.
- **Build uses Webpack** (`"build": "prisma generate && next build --webpack"`) because the Serwist SW needs Webpack; dev may use Turbopack. CI's `pnpm build` already resolves to this — **never drop `--webpack`** (offline is core). No change needed in Phase 03 code.
- **next-intl v4, same house APIs**: navigation still via `@/i18n/navigation` (`Link`/`useRouter`/`usePathname`/`redirect`), copy via `useTranslations`/`getTranslations`, EN+VI parity. v4 nuance: `NextIntlClientProvider` takes an explicit `locale` prop (the admin island already passes `locale="en"`), `getRequestConfig` returns `{ locale, messages }`. Route-handler conventions (`runtime='nodejs'`, `dynamic='force-dynamic'`, `parseBody`/`apiOk`) are unchanged.
- **View Transitions**: `experimental.viewTransition: true`; `(app)` layout wraps swapping content in React `<ViewTransition>`; the old CSS fade (`(app)/template.tsx`, `sb-page-enter`) is removed. Phase 03's public feedback routes live under `(app)`, so they inherit VT + the app shell automatically — do not add a page `template.tsx` or reintroduce the CSS fade.
- **Prisma/DB: unchanged** — the upgrade made no schema changes. **Phase 02 is entirely unaffected.**

## 0. Spec-assumption deltas (the important corrections)

| Spec assumed | Reality | Consequence |
|---|---|---|
| Menu model `RestaurantMenuItem` | It is **`MenuItem`** (`schema.prisma:252`) | All relations/FKs target `MenuItem` |
| Core models use `@default(cuid())` | `Restaurant`/`MenuItem`/`Dish`/`Allergen` use **caller-supplied `String @id @map(...)`**; only link/audit tables (`DishAllergenRisk`, `MenuItemAllergenStatus`, `ImportRun`) use `cuid()` | New feedback tables use `@default(cuid())` (they are audit-like); `clientReportId` is the client-supplied unique key |
| Domain types `MenuItemEvaluation` / `RestaurantReadinessEvaluation` | Real return types are **`MenuItemRecommendation`** and **`RestaurantRecommendation`** (`restaurant-types.ts:104,146`) | `applyFeedbackSignals*` operate on these; restaurant has `readinessClass` (not `status`) + `reasons: Bilingual[]` (not `reason`) |
| Status labels `"Suitable"/"Ask First"` | Internal codes are **snake_case**: `'suitable'\|'ask_first'\|'risky'\|'avoid'\|'unknown'` (`types.ts:9`). Title-case strings live only in `copy.ts` | Compare/emit snake_case literals only |
| `profileAllergenIds` exists | No such variable — evaluators loop `profile.allergies` directly | Derive `new Set(profile.allergies.map(a => a.allergenId))` yourself |
| Cookie named `ADMIN_TOKEN` | Cookie is **`sbt_admin`** = SHA-256 digest of the `ADMIN_TOKEN` env; guard is `requireAdmin(req): Promise<NextResponse\|null>` | Reuse `requireAdmin`; never reinvent |
| `pnpm test` has a DB | **`quality` CI job has NO database** (only `prisma generate`). Unit tests never touch Prisma — they test pure fns/serializers/schemas | Feedback business logic **must be unit-testable without a DB**; real HTTP+DB → e2e only |
| Gate is one `&&` chain | Two parallel CI jobs: `quality` (typecheck→lint→test→copy:check) and `e2e` (own Postgres+seeds). No `needs:` | Keep pure tests DB-free; add feedback seed to the e2e chain |
| Denylist includes "Reported safe" | Denylist = `guaranteed safe`, `100% safe`, `allergy-proof`, `allergy proof`, `this dish is safe`, `verified_safe` (substring, case-insensitive). "Reported safe"/"User verified" are NOT banned but spec §11.6 forbids them | Avoid all; optionally **strengthen** the denylist (allowed; never weaken it) |
| Profile persisted via `persist` middleware | Zustand store has **NO persist middleware**; manual Dexie hydration via `local-repo.ts` | Read profile via `useProfileStore.getState().profile` or `profileRepo.loadActiveProfile()` |

## 1. Prisma schema & DB (`apps/web/prisma/schema.prisma`)

- **All enums snake_case.** Examples: `ReviewStatus{needs_review,approved,rejected}`, `RiskLevel{contains,likely_contains,possible,unlikely,unknown}`, `SourceType{...,admin_verified}`.
- **`String[]` scalar lists supported & used** (`@default([])`) — e.g. `Restaurant.cuisineNormalized`. So `allergenIds String[]` is fine.
- **Every domain column is `@map`ped to snake_case**; Prisma's `createdAt`/`updatedAt` stay camelCase columns. New fields must add `@map`.
- Reuse candidates: `Restaurant.reviewStatus ReviewStatus` (closest to publish gate; **no** boolean `published/hidden`), `Restaurant.verificationStatus String` + `menuStatus String` (free-text, not enums), `Restaurant.discoveryConfidence Decimal`. `MenuItem` has `mappingConfidence Decimal`, `menuStatus String`; **no** verificationStatus/reviewStatus of its own. `MenuItemAllergenStatus` has `verificationStatus String`, `lastVerifiedAt`, `source String`, `confidence Decimal`, `riskLevel`.
- **No feedback/flag/report/audit/actor model or field exists** anywhere. `ImportRun` is ETL bookkeeping only.
- `prisma` singleton exported from `apps/web/src/lib/db.ts` (`import { prisma } from '@/lib/db'`). Migrate via `prisma migrate dev --name phase03_feedback_loop` (uses `DIRECT_URL`). Migration folders: `<YYYYMMDDHHMMSS>_slug/`; additive `ALTER/CREATE` only, like the Phase 02 migration.

## 2. Domain package (`packages/domain/src`)

- Exports (from `index.ts`, `export *` of `types`, `restaurant-types`, `schemas`, `restaurant-schemas`, plus named `evaluateMenuItem`, `evaluateRestaurantReadiness`, `evaluateDishes`, `buildQuestionCard`, `isStale`, `downgradeConfidence`, `copy`, `STATUS_RANK`, `ALLERGEN_CATALOG`, `ALLERGY_ALLERGEN_IDS`).
- `restaurant-constants.ts` (reason/summary copy, `STALENESS_DAYS`) is **not** exported from index — add exports if new reason copy lives there.
- **`MenuItemRecommendation`** (`restaurant-types.ts:104-119`): `{ menuItemId, restaurantId, dishId?, displayName:Bilingual, status:RecommendationStatus, riskLevel, confidence:ConfidenceLabel, confidenceScore:number, source:string, reason:Bilingual, action:Bilingual, lastCheckedAt?, stale, matchedDishName? }`.
- **`RestaurantRecommendation`** (`restaurant-types.ts:146-158`): `{ restaurantId, readinessClass:'A'..'E', confidence:ConfidenceLabel, counts, summary:Bilingual, reasons:Bilingual[], source:string, verificationStatus, menuStatus, lastCheckedAt?, stale }`.
- Enums are **string-literal unions** (`type`) mirrored by parallel `z.enum([...])` in `schemas.ts`/`restaurant-schemas.ts`. **No `z.infer` re-export convention exists** (introducing it for new DTOs is a judgment call). `ConfidenceLabel='low'|'medium'|'high'`. `Severity='mild'|'moderate'|'severe'|'anaphylaxis_risk'`. `Bilingual=Record<'en'|'vi',string>`.
- **`downgradeConfidence(label)`** already implements "one level, floor low" (high→medium→low). Reuse it. It only affects the label, not `confidenceScore`.
- **Runtime safety invariant**: `menu-item.ts:160` / `risk-engine.ts:191` THROW if unknown risk resolves to `suitable`. Feedback never emits `suitable`, so safe — but never build a path TO suitable.
- `STATUS_RANK`: `suitable:1, unknown:2, ask_first:3, risky:4, avoid:5` (higher = more cautious; unknown outranks suitable).
- Copy is bilingual-by-value: every user-facing string is `{en,vi}` emitted inline. Domain ships both languages; app mirrors keys into next-intl. New feedback reason/summary copy → add `Bilingual` consts (e.g. in `restaurant-constants.ts`), export them.

## 3. Recommendation APIs & injection point

- Profile arrives in **POST body** via `parseBody(req, schema)`. Body schema `restaurantRecommendationRequestSchema` / `restaurantDetailRecommendationRequestSchema` (`restaurant-schemas.ts:61-90`); `profile.allergies` = `allergyEntrySchema[]` = `{allergenId, severity, crossContactSensitive: boolean|'not_sure'}`.
- **Single choke point: `recommendRestaurant()` in `apps/web/src/lib/restaurant-recommend.ts`** — calls `evaluateMenuItem` (`:67-77`) then `evaluateRestaurantReadiness` (`:79-84`). Its signature (`:58-63`) must gain a feedback-signals arg. Called from list route (`recommendations/restaurants/route.ts:94`) and detail route (`.../[restaurantIdOrSlug]/route.ts:39`).
- Detail route loads `restaurant.menuItems{ include:{allergenStatuses} }` + `loadDishRecMap()` (`restaurant-query.ts:32-46`, keyed by `dishId`). Menu→dish link: `menuItem.dishId → approved Dish`.
- **Responses are plain object literals into `apiOk(...)` — no output Zod schema.** Adding optional `feedbackSummary` (top-level + per-menu-item) is additive/backward-compatible.
- Query helpers live in `lib/restaurant-query.ts` (`approvedRestaurantWhere`, `loadDishRecMap`). Add `loadActiveFeedbackFlags({restaurantIds,menuItemIds,dishIds})` here, mirroring `loadDishRecMap` (dedupe ids, guard empty arrays, coerce Decimal/Date to JSON-safe via `restaurant-serializers.ts` `num`/`iso`).
- Pagination = stringified numeric offset, in-memory after `take:500` (`restaurants/route.ts:103-105`). No shared cursor helper.

## 4. Admin subsystem

- **Auth:** `requireAdmin(req): Promise<NextResponse|null>` (`lib/admin-auth.ts:75`). Idiom: `const denied = await requireAdmin(req); if (denied) return denied;`. The proxy boundary (`proxy.ts`, Next 16 — formerly `middleware.ts`) already 401s `/admin` API (login exempt). Cookie `sbt_admin` (httpOnly digest). `ADMIN_TOKEN` via `serverEnv().ADMIN_TOKEN`.
- **API convention:** `runtime='nodejs'`, `dynamic='force-dynamic'`; `parseBody`/`parseQuery`; `apiOk`/`apiError`; `ctx.params` is a **Promise** (`await ctx.params`) — unchanged in Next 16. Prisma error map: `P2025→404`, `P2002→409`. Error codes seen: `UNAUTHORIZED, INVALID_TOKEN, VALIDATION_ERROR, NOT_FOUND, CONFLICT`.
- **Admin is a separate tree `app/admin/*`, NOT locale-prefixed**; uses `next/link` + `next/navigation` deliberately; fixed-locale `NextIntlClientProvider locale="en"` with `adminMessages` (English-only, in `app/admin/admin-messages.ts` — **NOT** in `messages/*.json`).
- **Nav:** `const NAV` in `app/admin/layout.tsx:17-23` (add `{href:'/admin/feedback', key:'feedback'}` + `adminMessages.nav.feedback`).
- **Admin pages are client components** using TanStack Query via `useAdminResource<T>(basePath, query)` / `adminFetch<T>(url, init)` (`features/admin/use-admin-resource.ts`) — the `sbt_admin` cookie rides along. **No server-component+Prisma admin page pattern.** Bespoke hooks (`menu-admin-hooks.ts`) exist where the API is asymmetric.
- **`AdminDataTable<T extends {id:string}>`** (`components/admin/admin-data-table.tsx`): `columns: AdminColumn<T>[]` (`{key,header,render?,align?}`), `rows`, optional `onEdit/onDelete`, `*Label` strings. Presentational, i18n-agnostic (caller pre-translates).
- **No StatusBadge in admin** (renders status as plain text). **No audit/actor infrastructure** — both net-new for Phase 03.

## 5. Offline / Dexie / profile / SW

- **Dexie** (`lib/dexie.ts`): DB `safebite_pwa_v1`, **current version 2**. Add `this.version(3).stores({ pendingFeedbackReports: 'clientReportId, status, createdAt' })` — additive, no `.upgrade()` needed. Add `Table` field + row interface. **Must add the table to `clearAllLocalData()` (`local-repo.ts:157-173`) transaction list + `Promise.all`.**
- **Repos** in `lib/local-repo.ts` (plain async objects over `db`). Add `pendingFeedbackRepo` (save/list/delete). Call `assertNoSecrets(row)` (throws in non-prod on `/token|secret|password|cookie|sbt_admin|authorization/i`). `nowIso()` helper exists. `restaurantCacheRepo` shows a 24h TTL delete-on-read pattern.
- **Profile store** (`lib/profile-store.ts`): Zustand, **no persist**. `LocalUserProfile.allergies=[{allergenId, severity, crossContactSensitive: boolean|'not_sure'}]`; dietary profiles = **`selectedProfileIds: string[]`** (no `dietaryProfiles` field). Read out-of-React via `useProfileStore.getState().profile` or `profileRepo.loadActiveProfile()`.
- **Online signal:** `useOnlineStatus()` (`components/app-shell/use-online-status.ts`) already wires `window` online/offline. Reuse for flush-on-reconnect. **No existing outbox/queue-retry** — net-new; TanStack Query available.
- **Service worker** (`lib/service-worker.ts`): `NetworkOnly` for **all non-GET** → feedback POSTs are **never cached**. No SW change needed.
- **Geolocation** lives only in `features/location/use-geolocation.ts` (in-memory + `sessionStorage`, 30-min TTL, never IndexedDB). Restaurant hooks strip `distanceMeters→null` before caching. **Feedback records must exclude any lat/lon/distance** — enforced by record shape (the `assertNoSecrets` guard does NOT catch geo keys).

## 6. i18n & copy guard

- `messages/en.json` + `vi.json`: 20 top-level namespaces, camelCase leaves, enum-valued keys use the exact snake_case enum string (`statuses.ask_first`, `severity.anaphylaxis_risk`). **Every key added to en.json must be added to vi.json** (exact parity). ICU plurals: `vi.json` drops the `one` branch.
- **copy guard** (`scripts/assert-no-unsafe-copy.ts`): scans `apps/web/{src,prisma,messages,public}` + `packages/domain/src`, extensions incl. `.json/.prisma/.html/.webmanifest`. Denylist (case-insensitive substring): `guaranteed safe, 100% safe, allergy-proof, allergy proof, this dish is safe, verified_safe`. Exit 1 on any hit. Hedged wording ("cannot guarantee food safety") passes. **`messages/*.json` IS scanned** — feedback copy in both locales is subject to the (English) denylist; avoid the substring `verified_safe` in any enum/source key.
- Routes: `locales=['en','vi']`, `defaultLocale='en'`, prefix `always`. New public route → `app/[locale]/(app)/feedback/{new,thanks}/page.tsx`. Import `Link` from `@/i18n/navigation` (never `next/link`). Server components: `getTranslations` + `setRequestLocale(locale)`; client: `useTranslations('ns')`.

## 7. Testing & CI

- **Vitest**: env `node` (no jsdom), no global setup, `passWithNoTests`. `apps/web` includes `src/**/*.test.ts`; domain tests in `packages/domain/tests/*.test.ts`. `fake-indexeddb/auto` imported per-file where needed.
- **Unit tests test PURE functions** (schemas, serializers, `approvedRestaurantWhere`, evaluators). They **never invoke route handlers and never touch Prisma** (fixtures are hand-built plain objects). The `quality` CI job has **no DB service**.
- **Playwright**: single `mobile-chromium` (Pixel 7), `workers:1`, `webServer` runs `next start` (built app). **No `data-testid`** — accessible role/name selectors keyed to EN chrome strings. Profile is injected straight into IndexedDB (`safebite_pwa_v1`, stores `profiles`/`metadata`, pointer `metadata.activeProfileId`). **No admin login helper exists in e2e** (admin visibility faked at seed via `approve-seed-content.ts`).
- **CI (`.github/workflows/ci.yml`)**: `quality` job = install → prisma generate → typecheck → lint → test → copy:check (no DB). `e2e` job = Postgres/PostGIS `postgis/postgis:16-3.4`, env `ADMIN_TOKEN=change-me-in-dev`, steps: migrate deploy → `db:seed` → `seed:kit` → `approve-seed-content.ts` → `seed:restaurant-demo-menu` → build → playwright install → `test:e2e`. Both jobs must pass.

## 8. UI components & tokens

- **Use the `sb-*` preset** (`tailwind.safebite-preset.ts`), not the legacy `status.*` layer. Status triads: `sb-status-{suitable,ask-first,risky,avoid,unknown}-{fg,bg,border}`. Surfaces `sb-surface/-2`, `sb-border`, `sb-muted/-faint`, radius `rounded-sb-{xs..xl}`, shadow `shadow-sb-e1..e4`/`shadow-sb-focus`, tap `min-h-sb-tap` (48px), typography `text-sb-{body-s,label,...}`.
- **Badge template** = `StatusBadge` (`status-badge.tsx`): pill, icon + localized label + triad (icon+label+colour, never colour alone). **`ConfidenceMeter`** (`confidence-badge.tsx`) is hue-neutral 3-seg. **`Chip`/SourceBadge** (`source-badge.tsx`) = muted `sb-surface-2` chip; `restaurant-badges.tsx` shows the **allowlist→`t('source.${x}')`, unknown→raw** pattern for a new feedback-source label.
- **CTA hosts:** `menu-item-recommendation-card.tsx` already has a trailing CTA `<Link>` (`:49-55`) — add "Share feedback" as a sibling after it; add `FeedbackUnderReviewBadge` into its meta row (`:39-47`). `restaurant-detail.tsx` — add restaurant-level "Share meal feedback" in the readiness `<section>` (`:101-113`) or before `<SafetyNotice/>`; snapshot from `rec` (destructured `:72`).
- **Multi-step form template** = onboarding wizard (`features/onboarding/`): transient Zustand draft (`use-onboarding-draft.ts`, never persisted/URL'd), `steps[]` indexed by `draft.step`, sticky full-width primary footer button (`min-h-sb-tap w-full rounded-sb-md bg-sb-primary text-sb-primary-foreground focus-visible:shadow-sb-focus`), `role="radiogroup"`+`role="radio" aria-checked` selectors, `aria-label` on inputs.
- **Severe notice:** use `role="alert"` (not `role="note"` — that's `SafetyNotice`, the calm disclaimer). Closest colored-alert-box template = the offline warning box in `restaurant-detail.tsx:86` (`sb-status-ask-first` triad, `role="status"`). Use `sb-status-avoid`/`sb-status-ask-first` triad.
- Nav: `Link`/`useRouter` from `@/i18n/navigation` (public); `crypto.randomUUID()` is the established client id generator (used for profile/card/question-card ids).
