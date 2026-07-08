# Phase 12 — Admin Auth & CRUD

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §9 API envelope + §9.7 Admin APIs (login, cookie, dishes/ingredients/dish-risks routes, create/update validation rules) — lines 1137-1177
  - §12.9 `/admin` UI (login, dashboard counts, three tables, create/edit/delete, `review_status` filter, desktop-first) — lines 1441-1455
  - §13 Components — `AdminDataTable` (line 1477); status labels & visual priority (never render `Suitable` as guaranteed safe)
  - §5.1/§5.2 enums + `Dish` / `Ingredient` / `DishAllergenRisk` / `Allergen` models — lines 308-493
  - §3 repo structure — `middleware.ts`, `lib/admin-auth.ts`, `app/admin/*`, `app/api/v1/admin/*` — lines 140, 170-210
  - §16 Copy Safety Guard (forbidden phrases, `pnpm copy:check`) — lines 1570-1599
  - §19 P1-08 Admin CRUD acceptance — lines 1842-1854
- Related phase files:
  - `phase-03-database-prisma-schema-and-migrations.md` — Prisma models + `lib/db.ts` client — **dependency**
  - `phase-06-api-endpoints.md` — `lib/api-response.ts` (`apiOk`/`apiError`, `parseJson`/`parseQuery`), `lib/serializers.ts` (`toNumber`) — **dependency**
  - `phase-02-web-app-foundation-and-health.md` — existing `src/middleware.ts` (next-intl), `lib/env.ts` (`serverEnv().ADMIN_TOKEN`), `NextIntlClientProvider`, `messages/{en,vi}.json`
  - `phase-05-domain-risk-engine-and-question-card.md` — `constants.ts` (proposed shared `FORBIDDEN_COPY`), risk vocab
  - `phase-01-repo-bootstrap-and-tooling.md` — `scripts/assert-no-unsafe-copy.ts`, `ADMIN_TOKEN` env placeholder
- Seed/kit: none directly. Admin CRUD covers **dishes/ingredients/dish-risks only** — OSM `Restaurant`/`MenuItem` tables stay out of every Phase-1 surface (§5.3, audit note: discovery-only).

## Overview

- **Priority:** P1 (internal curation tooling; unblocks approving seeded data so the public API/UX shows dishes)
- **Current status:** Not started
- **Brief description:** Add token-gated admin: `lib/admin-auth.ts` (cookie + verify helpers, edge-safe), compose the admin guard into the existing next-intl `middleware.ts`, a `POST /api/v1/admin/login` route that sets the httpOnly `sbt_admin` cookie, and CRUD route handlers for `dishes` / `ingredients` / `dish-risks` (§9.7) with Zod validation at every boundary. Plus a desktop-first admin UI island (`/admin`): login, dashboard counts, three tables (`AdminDataTable`) with create/edit/delete forms and a `review_status` filter. Admin never sets a recommendation *status* — it edits *facts* (risk level, confidence, reason, action, review status); the risk engine still owns Suitable/Unknown, preserving "Unknown never becomes Suitable".

## Design System v2 — visual spec (ADR-UI-01/02/03 approved & wired · READ FIRST)

Infra applied (`tokens.safebite.css` imported, `safebite` preset in tailwind, `lucide-react` added → `pnpm install`).

- **Tokens `sb-*`** for the desktop admin (surfaces/text/`border-sb-border`/`shadow-sb-e1`/`rounded-sb-*`) — no raw hex, no legacy `status-*`.
- **`AdminDataTable`:** `border-sb-border`, `shadow-sb-e1`, **tabular figures** for counts/confidence/dates; `review_status` filter; sidebar items use `lucide-react` (`LayoutGrid` / `UtensilsCrossed` / dish-risk `TriangleAlert` / etc.) — **no emoji**.
- **Risk level chip:** reuse `StatusBadge` styling (lucide glyph + status trio) to render the dish-risk `riskLevel`. Admin edits **facts** (riskLevel/confidence/reason/action/reviewStatus) — it never sets a recommendation status; the engine still owns Suitable/Unknown.
- The `/admin` island keeps its phase-12 i18n exceptions (`next/link`, fixed `en`) — but still uses `sb-*` tokens + lucide. The mockup's **severe-report review queue** and **OCR/LLM review** screens are Phase 3–5 (reference only; not this phase).
- **Mockup:** `docs/design/safebite-ui-ux-mockups.html` → "Admin dashboard". Spec: `reports/ui-ux-design-integration-guide.md` §3. Track: `reports/ui-ux-progress-tracker.md` §B/§C.

## Key Insights

- **Compose, don't replace, the middleware (critical).** Phase-02 already ships `src/middleware.ts` = `createMiddleware(routing)` with a matcher that **excludes `/api`**. The admin guard must intercept `/admin` and `/api/v1/admin` **before** delegating to the intl middleware, and the matcher must be extended to include `/api/v1/admin/:path*` (otherwise admin API is unguarded). Order matters: fall through to `intlMiddleware(req)` only for non-admin paths.
- **Admin lives OUTSIDE locale routing (`app/admin/*`, not `app/[locale]/admin/*`).** §3 places `admin/` as a sibling of `(app)/`. If admin sat under the general page matcher, intl would locale-redirect `/admin` → `/en/admin`. The middleware therefore short-circuits `/admin` with `NextResponse.next()`/redirect and never passes it to intl. **Two scoped, documented exceptions to locked i18n rules follow from this:** (1) admin uses `next/link` + `next/navigation`, **not** `@/i18n/navigation` (locale-prefixing would corrupt `/admin` URLs); (2) admin chrome is English-first via a fixed-locale `NextIntlClientProvider locale="en"` island so `useTranslations('admin')` still works without URL locale routing. VI admin is deferred (YAGNI). Both exceptions apply *only* to the internal `/admin` island; the public app keeps every locked rule.
- **Edge-runtime constraint on `admin-auth.ts`.** Middleware runs on the Edge Runtime — **no `node:crypto`** (`timingSafeEqual` unavailable). The cookie verify path must use Web Crypto (`crypto.subtle`) + a pure-JS constant-time string compare, so the same helper is importable by both middleware (edge) and route handlers (node).
- **Cookie carries a digest, not the raw token.** `sbt_admin` = hex `SHA-256(ADMIN_TOKEN)` (a constant marker), set only after the posted token verifies. Middleware/`requireAdmin` recompute the expected digest and constant-time compare. Presence-only checks are unsafe (anyone could set `sbt_admin=1`); storing the raw token is avoidable. httpOnly + `SameSite=Strict` + `Secure` (prod).
- **Decimal must not leak (audit note #5).** `DishAllergenRisk.confidence` is `Decimal(3,2)`. Admin GET responses convert via `toNumber` (reuse phase-06 `lib/serializers.ts`); admin POST/PATCH accept `confidence` as a plain `number` (Zod `.min(0).max(1)`) which Prisma stores into the Decimal column.
- **Admin edits facts, never recommendation status (safety invariant).** The five recommendation labels (Suitable/Ask First/Risky/Avoid/Unknown) are **derived** by the engine at query time — they are not columns and are not editable here. Admin sets `riskLevel` (contains/likely_contains/possible/unlikely/unknown), `confidence`, bilingual `reason`/`action`, `source`/`evidence`, and `reviewStatus`. This structurally guarantees "Unknown never becomes Suitable" (§0/§13) — admin cannot override the engine.
- **Admin-entered text renders in PUBLIC dish detail.** `reason_*`/`action_*` typed in the admin form flow to the public dish API and UI. The §16 CI gate scans *source files*, not DB rows — so a forbidden phrase typed by an admin would bypass it. Enforce the denylist at the **API boundary** via a Zod refinement on reason/action fields (reuse a shared `FORBIDDEN_COPY`). This directly upholds the non-negotiable "no forbidden copy anywhere in UI" constraint.
- **`dish-risks/[riskId]/route.ts` is missing from the §3 tree but required by §9.7** (`PATCH`/`DELETE /dish-risks/{riskId}`). Create it. `GET /dish-risks` also **requires `?dishId=`** per §9.7.
- **Admin default review filter is `all`, not `approved`.** Unlike the public API (§9.4 defaults `approved`), admin must see `needs_review`/`rejected` to curate them; approving is simply a PATCH of `reviewStatus`.
- **Restaurants stay invisible.** Admin CRUD scope is dishes/ingredients/dish-risks only. No admin route or page reads `Restaurant`/`MenuItem` — they remain `verification_status='unverified'`, discovery-only, absent from every Phase-1 surface (§5.3).

## Requirements

### Functional

1. `POST /api/v1/admin/login` — Zod body `{ token: string(min 1) }`; constant-time compare to `serverEnv().ADMIN_TOKEN`. Match → set httpOnly `sbt_admin` digest cookie, return `apiOk({ ok: true })`. Mismatch → `401` envelope, no cookie.
2. Logout — clears the `sbt_admin` cookie (expire it). Minimal: `DELETE /api/v1/admin/login` (or a `POST` action) hit by a Logout button.
3. Middleware guards: unauthenticated `/admin/*` (except `/admin/login`) → redirect to `/admin/login`; authenticated `/admin/login` → redirect to `/admin`; unauthenticated `/api/v1/admin/*` (except `/login`) → `401` JSON envelope. Non-admin paths → existing next-intl middleware.
4. `requireAdmin(req)` — in-handler authoritative guard (defense-in-depth + unit-testable seam) returning `apiError('UNAUTHORIZED', …, 401)` when the cookie is invalid; called first by every admin API handler except login.
5. Dishes CRUD (§9.7): `GET /admin/dishes?review_status=`, `POST /admin/dishes`, `PATCH /admin/dishes/{dishId}`, `DELETE /admin/dishes/{dishId}`.
6. Ingredients CRUD (§9.7): `GET/POST /admin/ingredients`, `PATCH/DELETE /admin/ingredients/{ingredientId}`.
7. Dish-risks CRUD (§9.7): `GET /admin/dish-risks?dishId=&review_status=` (dishId required), `POST /admin/dish-risks`, `PATCH/DELETE /admin/dish-risks/{riskId}`.
8. §9.7 create/update validation: localized names present (`nameVi`+`nameEn` non-empty); dish risk has `reason_vi`+`reason_en` and `recommended_action_vi`+`recommended_action_en`; `confidence` in `[0,1]`; `source`/`evidence` explicit (required enums, not silently defaulted on create). Update schemas are partial but keep the same field-level rules. Reason/action reject forbidden copy.
9. Admin UI (§12.9): `/admin/login` form; `/admin` dashboard with summary counts (total + per `review_status`, per entity); `/admin/dishes`, `/admin/ingredients`, `/admin/dish-risks` pages each rendering `AdminDataTable` + create/edit/delete form + `review_status` filter. Dish-risks page has a dish selector (GET needs `dishId`). Desktop-first, not broken on mobile.
10. On dish-risk create/update, set `lastCheckedAt = now()` so every risk row carries an honest last-checked timestamp (§0/§13 evidence requirement).

### Non-functional

- Zod at **every** admin boundary — body **and** query (`review_status`, `dishId`) (standing rule + §9).
- `ApiResponse<T>` envelope on every admin response, success and error. `Decimal`→`number` on all responses (reuse `toNumber`).
- `runtime='nodejs'` on all admin route handlers (Prisma). `admin-auth.ts` stays edge-safe (no node-only imports) so middleware can import it.
- No raw hex/rgb and no forbidden copy in any admin source/message file (`pnpm copy:check`). Semantic tokens only.
- Each route/component file < ~200 lines. Shared logic (`admin-auth`, `admin-schemas`, generic table, generic resource hook) keeps CRUD DRY.

## Architecture

**System design.** A `middleware.ts` perimeter (edge) + `requireAdmin` per-handler (node) enforce the `sbt_admin` cookie. Thin admin route handlers reuse phase-06 `apiOk`/`apiError`/`parseJson`/`parseQuery` + `toNumber`, validate with `lib/admin-schemas.ts` (Zod), and read/write via Prisma (`lib/db`). The `/admin` UI is a fixed-locale (`en`) intl island of RSC pages (dashboard counts via direct Prisma) + client components (tables/forms) that call the admin API through TanStack Query.

**Component interactions.**

```
Browser (/admin/* pages, sends sbt_admin cookie automatically, same-origin)
   │
   ▼  navigation                          fetch /api/v1/admin/*
middleware.ts (edge) ───────────────────────────┐
   ├─ /admin/*  → redirect if !authed            │
   ├─ /api/v1/admin/* → 401 JSON if !authed       │ (perimeter)
   └─ else → intlMiddleware(req)                   ▼
                                          admin route handler (node)
                                          ├─ requireAdmin(req) ─▶ 401 (authoritative)
                                          ├─ parseJson/parseQuery(admin-schemas) ─▶ 400
                                          ├─ Prisma read/write (lib/db)
                                          ├─ toNumber(confidence) on response
                                          └─ apiOk(dto)
```

**Data flow — create a dish risk (representative).**

1. Form (`dish-risk-form.tsx`, client) validates input with `dishRiskCreateSchema` (same Zod as server) → POST `/api/v1/admin/dish-risks`.
2. Middleware perimeter + `requireAdmin` verify cookie.
3. `parseJson(req, dishRiskCreateSchema)` — enforces reason_vi/en, action_vi/en, confidence 0-1, explicit source/evidence, no forbidden copy.
4. `db.dishAllergenRisk.create({ data: { …, lastCheckedAt: new Date() } })`.
5. `apiOk(adminRiskToDTO(row))` (confidence via `toNumber`).
6. TanStack Query invalidates the dish-risks list → table refetches.

**Data flow — dashboard counts.** RSC `app/admin/page.tsx` (already behind middleware) runs `Promise.all([db.dish.count(...), db.ingredient.count(...), db.dishAllergenRisk.count(...)])` grouped by `reviewStatus` and renders count cards. Read-only, server-only — no client fetch.

## Related Code Files

### To create

- `apps/web/src/lib/admin-auth.ts` — `ADMIN_COOKIE='sbt_admin'`, `computeAdminDigest(token)` (Web Crypto SHA-256 hex), `verifyAdminCookie(value)`, `buildAdminCookie(digest)` / `clearedAdminCookie()` options, `constantTimeEqual(a,b)`, `requireAdmin(req)` → `null | NextResponse` (401 envelope). Edge-safe.
- `apps/web/src/lib/admin-schemas.ts` — Zod: `dishCreateSchema`/`dishUpdateSchema`, `ingredientCreateSchema`/`Update`, `dishRiskCreateSchema`/`Update`, `reviewStatusQuerySchema`, `dishIdQuerySchema`, `loginSchema`. Enums via `z.nativeEnum` from `@prisma/client` (RiskLevel/SourceType/EvidenceType/ReviewStatus). `noForbiddenCopy` refinement on reason/action.
- `apps/web/src/features/admin/admin-serializers.ts` — `adminDishToDTO`, `adminIngredientToDTO`, `adminRiskToDTO` (Decimal→number via shared `toNumber`).
- `apps/web/src/app/api/v1/admin/login/route.ts` — `POST` login, `DELETE` logout.
- `apps/web/src/app/api/v1/admin/dishes/route.ts` — `GET` list, `POST` create.
- `apps/web/src/app/api/v1/admin/dishes/[dishId]/route.ts` — `PATCH`, `DELETE`.
- `apps/web/src/app/api/v1/admin/ingredients/route.ts` — `GET`, `POST`.
- `apps/web/src/app/api/v1/admin/ingredients/[ingredientId]/route.ts` — `PATCH`, `DELETE`.
- `apps/web/src/app/api/v1/admin/dish-risks/route.ts` — `GET` (`dishId` required), `POST`.
- `apps/web/src/app/api/v1/admin/dish-risks/[riskId]/route.ts` — `PATCH`, `DELETE`. **(Not in §3 tree — required by §9.7.)**
- `apps/web/src/app/admin/layout.tsx` — admin shell: nav (Dashboard/Dishes/Ingredients/Dish risks/Logout) + `NextIntlClientProvider locale="en"` with the `admin` namespace.
- `apps/web/src/app/admin/login/page.tsx` — login form (client).
- `apps/web/src/app/admin/page.tsx` — dashboard counts (RSC, direct Prisma).
- `apps/web/src/app/admin/dishes/page.tsx`, `apps/web/src/app/admin/ingredients/page.tsx`, `apps/web/src/app/admin/dish-risks/page.tsx` — table + form + filter.
- `apps/web/src/components/admin/admin-data-table.tsx` — `AdminDataTable` (§13): generic columns + row actions + `review_status` filter control (client).
- `apps/web/src/features/admin/dish-form.tsx`, `ingredient-form.tsx`, `dish-risk-form.tsx` — create/edit forms, validate with the shared Zod schemas (client).
- `apps/web/src/features/admin/use-admin-resource.ts` — generic TanStack Query hook factory: `list(query)` + `create`/`update`/`delete` mutations for a resource path (DRY across the three entities).

### To modify

- `apps/web/src/middleware.ts` — compose admin guard around the existing `intlMiddleware`; extend `config.matcher` to add `/admin/:path*` and `/api/v1/admin/:path*`.
- `apps/web/messages/en.json` (and `vi.json` placeholder) — add `admin` namespace (nav, table headers, form labels, filter, login). Keep forbidden-phrase clean (§16 blind spot flagged in phase-02).
- `packages/domain/src/constants.ts` — add exported `FORBIDDEN_COPY` list (single source shared by `admin-schemas.ts` refinement **and** `scripts/assert-no-unsafe-copy.ts`); coordinate with phase-01 to import it and add `constants.ts` to the guard's file-exception. (DRY; optional — inline list acceptable if coordination slips.)
- `apps/web/src/lib/serializers.ts` — reuse/export `toNumber`; no behavior change (light touch).

### To delete

- None.

## Implementation Steps

1. **`admin-auth.ts` (edge-safe).** `computeAdminDigest(token)` = hex of `crypto.subtle.digest('SHA-256', TextEncoder.encode(token))`. `constantTimeEqual(a,b)` = length-guarded XOR loop (no `node:crypto`). `verifyAdminCookie(value)` → `computeAdminDigest(process.env.ADMIN_TOKEN)` then `constantTimeEqual`. `buildAdminCookie(digest)` returns `{ name:'sbt_admin', value:digest, httpOnly:true, sameSite:'strict', secure: process.env.NODE_ENV==='production', path:'/', maxAge: 8*3600 }`; `clearedAdminCookie()` = same with `maxAge:0`. `requireAdmin(req)` reads the cookie, returns `apiError('UNAUTHORIZED','Admin auth required',401)` or `null`.
2. **`middleware.ts` compose.** `const authed = await verifyAdminCookie(req.cookies.get(ADMIN_COOKIE)?.value)`. Branch `/api/v1/admin` (exempt `/login` → next; else `!authed` → 401 JSON; else next) → branch `/admin` (exempt `/admin/login`: authed→redirect `/admin`, else next; else `!authed`→redirect `/admin/login`; else next) → else `return intlMiddleware(req)`. Matcher: `['/admin/:path*','/api/v1/admin/:path*','/((?!api|_next|_vercel|.*\\..*).*)']`.
3. **`login/route.ts`.** `POST`: `parseJson(req, loginSchema)`; `constantTimeEqual(computeAdminDigest(token), computeAdminDigest(ADMIN_TOKEN))` (or compare posted token to env, constant-time) → on success build response `apiOk({ ok:true })` and `res.cookies.set(buildAdminCookie(digest))`; on failure `apiError('INVALID_TOKEN','Invalid admin token',401)`. `DELETE`: set `clearedAdminCookie()`, `apiOk({ ok:true })`. `runtime='nodejs'`.
4. **`admin-schemas.ts`.** Define create schemas mirroring the Prisma columns actually editable; `dishRiskCreateSchema` requires `dishId`, `allergenId`, `riskLevel` (native enum), `confidence: z.number().min(0).max(1)`, `reasonVi/En`, `recommendedActionVi/En` (all `.min(1)` + `noForbiddenCopy`), `sourceType`+`evidenceType` (required native enums), optional `sourceUrl`, `reviewStatus` default `needs_review`. Names schemas enforce `nameVi`/`nameEn` `.min(1)`. Update schemas = `.partial()` but re-apply per-field checks. Query schemas: `review_status ∈ {needs_review,approved,rejected,all}` default `all`; `dishId` required for dish-risks GET.
5. **`admin-serializers.ts`.** Map rows → DTOs; `confidence: toNumber(row.confidence)`; dates → ISO; return editable fields only.
6. **Dishes routes.** `GET`: `parseQuery(url, reviewStatusQuerySchema)`; `where` = `reviewStatus` unless `all`; `findMany({ orderBy:{ updatedAt:'desc' } })` → `adminDishToDTO[]`. `POST`: `parseJson(dishCreateSchema)` → `db.dish.create` (generate `id` from name/slug or `cuid` — match phase-03 id strategy). `[dishId]` `PATCH`: `parseJson(dishUpdateSchema)` → `update`; `DELETE` → `delete` (cascades to risks/ingredients per schema). All start with `requireAdmin`.
7. **Ingredients routes.** Same shape as dishes with `ingredientCreateSchema`/`Update`; `canonicalNameVi/En`, `ingredientCategory`, arrays; `reviewStatus` filter.
8. **Dish-risks routes.** `GET`: `parseQuery(dishIdQuerySchema + reviewStatusQuerySchema)`; require `dishId` → `findMany({ where:{ dishId, …review }, orderBy:{ updatedAt:'desc' } })` → `adminRiskToDTO[]`. `POST`: `parseJson(dishRiskCreateSchema)` → `create({ data:{ …, lastCheckedAt: new Date() } })`; respect the `@@unique([dishId,allergenId])` → catch P2002 → `apiError('CONFLICT',…,409)`. `[riskId]` `PATCH`: set `lastCheckedAt = now()` on risk-field change; `DELETE`.
9. **Admin UI shell.** `app/admin/layout.tsx` (server): import `en.json` `admin` namespace → `NextIntlClientProvider locale="en" messages={admin}`; render nav with `next/link` (deliberate non-`@/i18n` exception) + Logout button (calls `DELETE /api/v1/admin/login` then `router.replace('/admin/login')` via `next/navigation`).
10. **Login page.** Client form → POST token; on `200` `router.replace('/admin')`; on `401` show inline error. No token echoed back; no localStorage.
11. **Dashboard.** RSC counts via `Promise.all` of grouped `count`s; render count cards (semantic tokens). Link to each table.
12. **`AdminDataTable` + resource hook.** `use-admin-resource.ts` = factory `(basePath) => { useList(query), useCreate, useUpdate, useRemove }` over the admin API (TanStack Query, invalidate on mutate). `admin-data-table.tsx` takes `columns`, `rows`, `onEdit`, `onDelete`, and a `review_status` `<select>` bound to query state. Three pages compose table + entity form + filter.
13. **Entity forms.** `dish-form` / `ingredient-form` / `dish-risk-form` validate with the shared Zod schema before submit (surface field errors); dish-risk form has dish + allergen selectors and enum dropdowns for riskLevel/source/evidence; never exposes a recommendation-status field.
14. **Messages + copy guard.** Fill `admin` namespace (EN); run `pnpm copy:check` (source + confirm no forbidden phrase, only allowed status labels) and `pnpm typecheck`/`pnpm lint`.
15. **Smoke test** the full matrix with `curl` (login sets cookie; unauth 401/redirect; CRUD round-trips; bad payloads 400) against a seeded dev DB, then click the UI happy path.

## Todo List

- [ ] `lib/admin-auth.ts` — cookie name, SHA-256 digest, constant-time verify, `buildAdminCookie`/`clearedAdminCookie`, `requireAdmin` (edge-safe)
- [ ] `middleware.ts` — compose admin guard with intl middleware; extend matcher (admin pages + admin API)
- [ ] `POST /api/v1/admin/login` sets httpOnly `sbt_admin`; `DELETE` logout clears it; wrong token → 401, no cookie
- [ ] `lib/admin-schemas.ts` — Zod create/update/query schemas; confidence 0-1; reason/action + names required; explicit source/evidence; `noForbiddenCopy`
- [ ] `features/admin/admin-serializers.ts` — Decimal→number DTOs (`toNumber`)
- [ ] Dishes CRUD routes (`requireAdmin`, envelope, `review_status` filter)
- [ ] Ingredients CRUD routes
- [ ] Dish-risks CRUD routes incl. `[riskId]` route; GET requires `dishId`; `lastCheckedAt` bumped; unique-conflict → 409
- [ ] `app/admin/layout.tsx` (fixed-locale intl island, `next/link`, Logout) + `login/page.tsx`
- [ ] `app/admin/page.tsx` dashboard counts (RSC, per `review_status`)
- [ ] `AdminDataTable` + `use-admin-resource` hook + three table pages with create/edit/delete + filter
- [ ] `messages/en.json` `admin` namespace (VI placeholder); `FORBIDDEN_COPY` shared with copy guard
- [ ] `pnpm copy:check`, `pnpm typecheck`, `pnpm lint` pass on new files

## Success Criteria

Mirrors §19 P1-08 acceptance:

- **Admin login works with `ADMIN_TOKEN`.** Correct token → `sbt_admin` httpOnly cookie set, redirect to `/admin`; wrong token → `401` envelope, no cookie. Unauthenticated `/admin/*` → redirect to `/admin/login`; unauthenticated `/api/v1/admin/*` → `401` JSON. Verify cookie is `HttpOnly; SameSite=Strict` and holds a digest (not the raw token) via DevTools/`curl -i`.
- **Dishes table + edit works.** List/create/edit/delete round-trip through `/api/v1/admin/dishes`; `review_status` filter changes rows; delete cascades risks.
- **Ingredients table + edit works.** Same round-trip on `/admin/ingredients`.
- **Dish risk table + edit works.** `GET ?dishId=` lists a dish's risks; create/edit/delete via `/dish-risks` + `[riskId]`; `lastCheckedAt` updates on edit; `confidence` is a JSON `number`.
- **Validation prevents risk without reason/action.** POST/PATCH dish-risk missing any of `reason_vi/en`, `recommended_action_vi/en` → `400`; `confidence` outside `[0,1]` → `400`; missing `source`/`evidence` on create → `400`; reason/action containing a forbidden phrase → `400`.
- **Safety invariants hold.** No admin field sets a recommendation status; Unknown can never be promoted to Suitable; no forbidden copy in admin source/messages (`pnpm copy:check` green). Only the five allowed status labels appear where labels render.
- Validate: `pnpm typecheck`, `pnpm lint`, `pnpm copy:check`, and the `curl`/UI matrix above against a seeded dev DB.

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Admin guard replaces instead of composes with next-intl middleware | Public locale routing breaks OR admin unguarded | Intercept `/admin` + `/api/v1/admin` first, `return intlMiddleware(req)` for the rest; extend matcher to include admin API (which the base matcher excludes) |
| `node:crypto` used in `admin-auth.ts` | Middleware build/runtime failure on edge | Web Crypto `subtle.digest` + pure-JS constant-time compare; no node-only imports in that file |
| `/admin` locale-redirected to `/en/admin` | Admin URLs corrupted, guard bypassed | Middleware short-circuits `/admin` with `next()`/redirect; admin uses `next/link`, not `@/i18n/navigation` (documented exception) |
| `Decimal` leaks in admin responses (note #5) | Broken tables / wrong confidence | `adminRiskToDTO` uses shared `toNumber`; assert `number` in smoke test |
| Admin stores forbidden copy in `reason`/`action` (renders publicly) | **Safety-constraint breach** (§0/§13) not caught by §16 CI (scans source only) | `noForbiddenCopy` Zod refinement at the API boundary using shared `FORBIDDEN_COPY` |
| Raw admin token stored in cookie | Token exposure if cookie leaks | Store `SHA-256(token)` digest; httpOnly + SameSite=Strict + Secure (prod) |
| `dish-risks/[riskId]` omitted (missing from §3 tree) | PATCH/DELETE of risks impossible | Create the route explicitly (§9.7 requires it); noted in deliverables |
| CSRF on admin mutations | Unauthorized writes | `SameSite=Strict` cookie + same-origin fetch; mutations are non-GET; optionally require an `x-requested-with` header |
| Matcher misconfig leaves admin API open | Unauthorized data access | `requireAdmin` in every handler as authoritative defense-in-depth; add a middleware-off unit test hitting a handler without cookie → 401 |

## Security Considerations

- **Auth boundary is two-layered.** Middleware perimeter (redirect for pages, 401 for API) + `requireAdmin` inside every admin handler (authoritative, unit-testable). Neither trusts the other blindly.
- **Cookie.** `sbt_admin` is httpOnly (no JS access → XSS can't read it), `SameSite=Strict` (blocks cross-site CSRF), `Secure` in production, `path=/`, 8h `maxAge`; value is a SHA-256 digest of `ADMIN_TOKEN`, compared in constant time. Logout expires it.
- **Secret handling.** `ADMIN_TOKEN` is read only via `serverEnv()` / `process.env` in server/edge code; it never enters a `NEXT_PUBLIC_*` var or the client bundle, and is never echoed in a response body. `.env` git-ignored; `.env.example` keeps `change-me-in-dev` (phase-01).
- **Zod at every boundary** blocks malformed/oversized payloads on both body and query; enum fields use `z.nativeEnum` from Prisma so the vocab can't drift.
- **Safety-copy (§0/§13/§16).** Admin never sets a recommendation status; the engine still owns Suitable/Unknown so "Unknown never becomes Suitable" holds structurally. Reason/action text is denylist-checked server-side so forbidden phrases can't reach the public UI via the DB. Admin source + `messages/*.json` are covered by `pnpm copy:check`.
- **OSM discovery-only (§5.3).** Admin CRUD is scoped to dishes/ingredients/dish-risks; no admin route or page reads/writes `Restaurant`/`MenuItem`. Restaurants stay `unverified` and absent from every Phase-1 surface, including admin.
- **No PII/stack leakage.** `apiError('INTERNAL',…,500)` returns a generic message; only `VALIDATION_ERROR` includes Zod `flatten()` details (no secrets). Login failures return a generic `401` without revealing token length/shape; note a login rate-limit as a Phase-2 hardening.

## Next Steps

- **Depends on:** phase-03 (Prisma models `Dish`/`Ingredient`/`DishAllergenRisk`/`Allergen`, `lib/db`, id strategy, seeded dev DB) and phase-06 (`lib/api-response.ts` `apiOk`/`apiError`/`parseJson`/`parseQuery`, `lib/serializers.ts` `toNumber`). Also consumes phase-02 (`src/middleware.ts` base, `serverEnv().ADMIN_TOKEN`, `NextIntlClientProvider`, `messages/*`), phase-05 (risk vocab + shared `FORBIDDEN_COPY`), phase-01 (`ADMIN_TOKEN` env, copy-guard script).
- **Coordinate:** move `FORBIDDEN_COPY` into `packages/domain/src/constants.ts` and have `scripts/assert-no-unsafe-copy.ts` import it + add `constants.ts` to its file-exception (phase-01/phase-05), so the CI gate and the admin API refinement share one denylist.
- **Unblocks:** curation workflow — admin approves seeded dishes/risks (`reviewStatus → approved`) so the public API (§9.4 default `approved`) and Phase-1 UX actually surface data; and the tests/safety phase (P1-09) can assert admin auth + validation + copy guard.
