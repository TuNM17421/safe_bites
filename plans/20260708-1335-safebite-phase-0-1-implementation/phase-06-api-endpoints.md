# Phase 06 — Public API Endpoints `/api/v1`

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §9 API Specification (envelope, 9.2 client-config, 9.3 profile-templates, 9.4 dishes + `[dishId]`, 9.5 recommendations/dishes, 9.6 question-cards)
  - §7 Domain Types (`LocalUserProfile`, `DishRiskFact`, `DishRecommendationCard`)
  - §8 Risk Engine v1 (status ranks, mappings, confidence buckets)
  - §14 i18n Copy Keys (`suitableCaveat`, status labels) / §15 Question Card Templates
  - §5.2 Core models (`Dish`, `DishAllergenRisk`, `Allergen`, `ProfileTemplate`)
  - §6.4/§6.5 allergen + dish import (city→`region_tags`, allergen coverage gap)
  - §16 Copy Safety Guard / §0 §13 safety constraints
  - §18 P0-06 API skeleton (acceptance)
- Related phase files:
  - `phase-03-database-schema.md` (Prisma models + `lib/db.ts` client) — **dependency**
  - `phase-05-domain-package.md` (`@safebite/domain`: risk engine, question card, Zod request schemas, copy) — **dependency**
  - `phase-02-project-setup.md` (`lib/env.ts`, `lib/api-response.ts` scaffold, health route) — provides env + envelope base
  - `phase-12-admin-api.md` (admin `/api/v1/admin/*` — **out of scope here**)
- Seed kit: `osm_overpass_seed_kit/outputs/starter_dishes_hanoi_sample.csv` (drives `region_tags`, 10 risk columns — no soy/treenut columns)

## Overview

- **Priority:** P0 (blocks all Phase 1 UI data fetching)
- **Current status:** Not started
- **Brief description:** Implement the seven public read/compute route handlers under `apps/web/src/app/api/v1/` plus `/api/health` glue. Every handler validates input with Zod, returns the `ApiResponse<T>` envelope, serializes Prisma `Decimal` to plain numbers, and delegates all safety logic to `@safebite/domain`. Server-first (route handlers are server code; no `'use client'`). Admin routes are explicitly excluded (Phase 12).

## Key Insights

- **Routes are thin adapters.** No risk math, no status decisions, no copy generation live here. The route loads rows from Prisma, maps them to domain input types, calls the domain function, and shapes the response. This keeps files < 200 lines and keeps the single source of safety truth in `@safebite/domain` (DRY).
- **`Decimal` must never leak (audit note #5).** `DishAllergenRisk.confidence` is `Decimal(3,2)`. Convert with `Number()` in a shared serializer before it reaches the engine or the JSON body. Raw `Decimal` objects serialize as `{}` / string and break clients.
- **City filter maps to `region_tags`, not a `city` column.** `Dish` has no `city` field; `regionTags: String[]`. Filter with Prisma `regionTags: { has: city }`. Unseeded city → empty groups (UI shows "city not seeded yet", §UX). Do **not** error on empty.
- **`review_status` default is `approved`.** Public `GET /dishes` returns `approved` first; `needs_review` and `all` are dev-only query values (§9.4). Recommendations run only over `approved` dishes.
- **Allergen coverage gap (audit note #3).** Seed dishes expose only 10 risk columns — no treenut, no soy risk rows. The engine returns `unknown` (never hidden, never `suitable`) for allergens a dish carries no fact for. `GET /allergens` returns whatever Phase 3/4 seeded; if `soy`/`treenut` must be pickable in onboarding, they must exist as `Allergen` rows (flag to Phase 3/4). The API stays honest by surfacing `unknown`, not by dropping the allergen.
- **Group keys are camelCase; engine status is snake_case.** Engine emits `ask_first`; the response group key is `askFirst` (§9.5). Map explicitly.
- **`unknown` outranks `suitable` (§8.1 rank: suitable=1, unknown=2).** The engine guarantees `unknown` never collapses to `suitable`; the route must not re-sort or re-bucket in a way that undoes this.
- **Suitable caveat is a UI render concern, not an API field.** The API emits `status: "suitable"` with the engine's honest `action`. The `suitableCaveat` copy (§14) is attached at render time (UI phase) via next-intl. The API must never emit any forbidden "safe/guaranteed" string (§16 CI gate scans route files).
- **Restaurants stay invisible.** No public route reads `Restaurant`/`MenuItem`. Discovery-only, `verification_status='unverified'` (§5.3). Not in this phase's surface at all.
- **Request-body schemas belong to the domain package; query schemas are HTTP-local.** `LocalUserProfile`/recommendation/question-card bodies mirror domain types → Zod schemas exported from `packages/domain/src/schemas.ts` (Phase 5), imported here to avoid drift. `city`/`review_status`/`dishId` are transport concerns → small local Zod schemas per route.

## Requirements

### Functional

1. `GET /api/v1/client-config` → `{ supportedCities, defaultCity, supportedLanguages, offlineCacheTtlDays, pwaInstallEnabled }` sourced from validated env (§9.2). No DB.
2. `GET /api/v1/profile-templates` → `{ items: [{ id, name:{en,vi}, profileType, strictness, description:{en,vi} }] }` from `ProfileTemplate` (§9.3).
3. `GET /api/v1/allergens` → `{ items: [{ id, name:{en,vi}, aliases:{en,vi} }] }` from `Allergen` (data-driven bilingual, used by onboarding + question-card).
4. `GET /api/v1/dishes?city=&review_status=` → `{ items: [dishDTO] }` filtered by `region_tags has city` + review status (default `approved`); each DTO carries all §9.4 fields incl. `allergenRisks` with `confidence` as number (§9.4).
5. `GET /api/v1/dishes/{dishId}` → single `dishDTO` or `404` with envelope error (§9.4).
6. `POST /api/v1/recommendations/dishes` → validate body, load approved dishes for city + their risks, call risk engine per dish, group into `suitable/askFirst/risky/avoid/unknown` + `summary` counts (§9.5). Each card carries name, status, riskLevel, confidence bucket, reason, action, source, lastCheckedAt, matchedAllergens (§7).
7. `POST /api/v1/question-cards` → validate body, load the target allergens from DB, call `buildQuestionCard` deterministically (no LLM), return `{ id, targetLanguage, source, createdAt, text, sections[] }` (§9.6/§15).
8. All handlers return `400` with a useful envelope error on invalid input; `404` on missing dish; `500` on unexpected failure — always enveloped.

### Non-functional

- Zod validation at **every** boundary — body **and** query (standing rule + §9).
- `ApiResponse<T>` envelope on **every** response, success and error (§9).
- No raw hex/rgb, no forbidden safety copy anywhere in route files (CI gate §16).
- `runtime = 'nodejs'` on DB-touching routes (Prisma is not edge-safe); `dynamic = 'force-dynamic'` where request-specific.
- Each route file < ~200 lines; shared mapping in `lib/serializers.ts` (DRY).
- Response latency dominated by a single indexed Prisma query per request; no N+1 (use `include` for `allergenRisks`).

## Architecture

**System design.** Thin Next.js App Router route handlers → `@safebite/domain` (pure logic) + Prisma (`lib/db.ts`). Shared cross-cutting helpers in `lib/api-response.ts` (envelope + error) and `lib/serializers.ts` (`Decimal`→number DTO mappers).

**Component interactions.**

```
Client (TanStack Query)
   │  fetch /api/v1/*
   ▼
Route handler (server)
   ├─ Zod parse (domain schema | local query schema) ──▶ 400 on fail
   ├─ Prisma (lib/db) load rows ──────────────────────▶ 404 / [] as needed
   ├─ serializers.ts: Decimal→number, row→DTO / DishRiskFact
   ├─ @safebite/domain: assessDish() | buildQuestionCard()
   └─ api-response.ok(data) ──────────────────────────▶ ApiResponse<T>
```

**Data flow — recommendations (representative).**

1. Parse body with `recommendationRequestSchema` (domain) → `{ city, language, profile }`.
2. `db.dish.findMany({ where: { regionTags: { has: city }, reviewStatus: 'approved' }, include: { allergenRisks: true } })`.
3. For each dish: `mapRisksToFacts(dish.allergenRisks)` (Decimal→number) → `DishRiskFact[]`.
4. `assessDish(profile, { dishId, name, risks })` → `DishRecommendationCard` (status, confidence bucket, matchedAllergens, reason, action…).
5. Bucket by `statusToGroupKey(card.status)`; tally `summary`.
6. `ok({ city, groups, summary })`.

**Data flow — question card.** Parse body (`questionCardRequestSchema`) → load `Allergen` rows for `profile.allergies[].allergenId` → map to `{ id, nameVi, nameEn, aliasesVi, aliasesEn }` → optional dish name lookup by `dishId` → `buildQuestionCard({ profile, allergens, targetLanguage, dishName })` → `ok(card)`. `targetLanguage` is independent of UI locale.

## Related Code Files

### To create

- `apps/web/src/app/api/v1/client-config/route.ts` — GET, env-backed.
- `apps/web/src/app/api/v1/profile-templates/route.ts` — GET, DB.
- `apps/web/src/app/api/v1/allergens/route.ts` — GET, DB.
- `apps/web/src/app/api/v1/dishes/route.ts` — GET list, query Zod (`city`, `review_status`).
- `apps/web/src/app/api/v1/dishes/[dishId]/route.ts` — GET one, 404.
- `apps/web/src/app/api/v1/recommendations/dishes/route.ts` — POST, risk engine.
- `apps/web/src/app/api/v1/question-cards/route.ts` — POST, `buildQuestionCard`.
- `apps/web/src/lib/serializers.ts` — `dishToDTO`, `mapRisksToFacts`, `allergenToDTO`, `templateToDTO`, `statusToGroupKey` (all Decimal→number safe).

### To modify

- `apps/web/src/lib/api-response.ts` — ensure `ok(data, meta?)` and `fail(code, message, status, details?)` helpers exist; add `parseJson(req, schema)` / `parseQuery(url, schema)` that throw→`400`.
- `apps/web/src/lib/env.ts` — expose typed `SUPPORTED_CITIES`, `DEFAULT_CITY`, `SUPPORTED_LANGUAGES`, `OFFLINE_CACHE_TTL_DAYS`, `PWA_INSTALL_ENABLED` (consumed by client-config). Create if Phase 2 has not.
- `packages/domain/src/schemas.ts` — confirm/add `recommendationRequestSchema`, `questionCardRequestSchema`, `localUserProfileSchema` exports (owned by Phase 5; add if missing).
- `apps/web/src/app/api/health/route.ts` — align to envelope (if scaffolded in Phase 2; light touch only).

### To delete

- None.

## Implementation Steps

1. **Envelope + parse helpers** (`lib/api-response.ts`): `ok<T>(data, meta?)` sets `meta.generatedAt = new Date().toISOString()` and optional `requestId = crypto.randomUUID()`; `fail(code, message, status, details?)` returns `NextResponse.json({ error }, { status })`; `parseJson` / `parseQuery` run `schema.safeParse` and on failure `throw fail('VALIDATION_ERROR', msg, 400, err.flatten())` (or return a discriminated result). One place owns the 400 shape.
2. **Serializers** (`lib/serializers.ts`): pure functions mapping Prisma rows → DTOs. `mapRisksToFacts` converts `confidence` via `Number()` and builds `reason/action` `Record<'en'|'vi'>` from `reasonEn/reasonVi` + `recommendedActionEn/Vi`; `lastCheckedAt` → ISO string. `statusToGroupKey('ask_first') → 'askFirst'`, etc.
3. **`GET client-config`**: read env, return static config object. `runtime='nodejs'` optional (no DB); safe to cache lightly.
4. **`GET profile-templates`**: `db.profileTemplate.findMany({ orderBy: { id: 'asc' } })` → `templateToDTO` → `{ items }`.
5. **`GET allergens`**: `db.allergen.findMany({ orderBy: { id: 'asc' } })` → `allergenToDTO` (`name`/`aliases` as `{en,vi}`) → `{ items }`.
6. **`GET dishes`**: local query schema — `city` required string, `review_status` enum `['approved','needs_review','all']` default `'approved'`. Build `where` (`regionTags has city`; add `reviewStatus` unless `all`). `findMany({ include:{ allergenRisks:true } })` → `dishToDTO[]` → `{ items }`.
7. **`GET dishes/[dishId]`**: `findUnique({ where:{ id }, include:{ allergenRisks:true } })`; null → `fail('NOT_FOUND','Dish not found',404)`; else `dishToDTO`.
8. **`POST recommendations/dishes`**: `parseJson(req, recommendationRequestSchema)`; load approved dishes for `city`; per dish `assessDish(profile, {...})`; group + summarize; `ok({ city, groups, summary })`. Empty result → all-zero summary, empty groups (not an error).
9. **`POST question-cards`**: `parseJson(req, questionCardRequestSchema)`; load `Allergen` rows for the profile's allergenIds; optional dish name via `findUnique`; `buildQuestionCard(...)`; `ok(card)`.
10. **Error safety net**: wrap each handler body in `try/catch`; unknown error → `fail('INTERNAL','Unexpected error',500)` (never leak stack). Re-throw/return the `fail` produced by parse helpers as-is.
11. **Copy-guard pass**: run `pnpm copy:check` — confirm no forbidden phrase and only allowed status labels appear in new route/serializer files.
12. **Smoke test each route** with `curl`/REST against a seeded dev DB; verify envelopes, 400s, 404, grouped recommendations, EN/VI question cards.

## Todo List

- [ ] `lib/api-response.ts`: `ok` / `fail` / `parseJson` / `parseQuery` helpers finalized
- [ ] `lib/serializers.ts`: dish/allergen/template DTO mappers + `mapRisksToFacts` (Decimal→number) + `statusToGroupKey`
- [ ] `GET /api/v1/client-config` from env
- [ ] `GET /api/v1/profile-templates`
- [ ] `GET /api/v1/allergens`
- [ ] `GET /api/v1/dishes` with `city` + `review_status` Zod query validation
- [ ] `GET /api/v1/dishes/[dishId]` with 404
- [ ] `POST /api/v1/recommendations/dishes` calling risk engine, grouped + summary
- [ ] `POST /api/v1/question-cards` calling `buildQuestionCard` (deterministic EN/VI)
- [ ] Confirm domain Zod request schemas exist/exported (`packages/domain/src/schemas.ts`)
- [ ] All routes `runtime='nodejs'` where DB-touching; envelope on success + error
- [ ] `pnpm copy:check` passes on new files; `pnpm typecheck` clean

## Success Criteria

Mirrors §18 P0-06 acceptance:

- **All routes return validated envelope responses.** Every 2xx body is `{ data, meta:{ generatedAt } }`; `meta.generatedAt` is ISO-8601.
- **Bad inputs return 400 with useful error.** Missing `city` on `/dishes`, malformed profile on `/recommendations` or `/question-cards`, bad `review_status` → `{ error:{ code:'VALIDATION_ERROR', message, details } }`, status 400. Validate via `curl` with a bad body.
- **Recommendation API returns grouped results.** Response has `groups.{suitable,askFirst,risky,avoid,unknown}` arrays and `summary` counts whose sum equals `total`; `unknown` risk never appears under `suitable` (verify with a dish lacking a risk column, e.g. soy).
- **Question card API returns deterministic EN/VI template output.** Same input → byte-identical output; severe peanut VI output matches §15 expected lines; no network/LLM call.
- **Decimal serialized.** `typeof allergenRisks[].confidence === 'number'` in `/dishes` and card confidence is the `'low'|'medium'|'high'` bucket, never a `Decimal`.
- **Missing dish → 404** enveloped; **unseeded city → empty groups**, not error.
- Validate: `pnpm typecheck`, `pnpm copy:check`, and manual `curl` matrix against a seeded DB.

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| `Decimal` leaks into JSON (note #5) | Broken clients, wrong confidence | Single `mapRisksToFacts` serializer; assert `number` in smoke test |
| City has no `city` column; wrong filter | Empty/incorrect dish lists | Filter on `regionTags: { has: city }`; document; empty = valid |
| `unknown` bucketed as `suitable` | **Safety violation** (§8.2) | Engine owns ranking; route only maps status→group; test soy/treenut dish yields `unknown` |
| Forbidden safety copy sneaks into a route string | CI gate fails / unsafe UX | Keep all human copy in domain/next-intl; `copy:check` in todo; routes emit status enums only |
| Domain request schema drift vs types | Runtime 400s or unsafe passthrough | Import Zod schemas from `@safebite/domain` (Phase 5), don't re-declare body shapes here |
| `treenut`/`soy` not selectable (note #3) | Onboarding can't honor allergen | `/allergens` returns DB rows as-is; flag Phase 3/4 to seed those `Allergen` rows; engine returns honest `unknown` |
| Prisma on edge runtime | 500s | `export const runtime='nodejs'` on DB routes |

## Security Considerations

- **No auth on these routes** (Phase 1 has no user accounts, §2). They are read/compute only over public dish/allergen data; the local profile is sent per-request and never persisted server-side (§9.5 uses POST precisely because there is no server profile store).
- **Admin endpoints excluded.** `/api/v1/admin/*` and the `sbt_admin` cookie are Phase 12 — not created here.
- **Zod at every boundary** blocks malformed/oversized payloads; cap array/string sizes in the domain schemas (Phase 5) to avoid abuse of the recommendation loop.
- **Safety copy invariants (§0/§13/§16):** routes emit only the allowed status labels (`Suitable, Ask First, Risky, Avoid, Unknown`) as enums; human-readable safety strings come from `@safebite/domain`/next-intl. The `suitableCaveat` is rendered by the UI, but the API never emits any forbidden phrase and never labels a dish "safe".
- **OSM discovery-only:** no route reads restaurant/menu tables; restaurants remain `unverified` and invisible in Phase 1 UX (§5.3).
- **No stack/PII leakage:** `fail('INTERNAL', …, 500)` returns a generic message; details only for `VALIDATION_ERROR` (Zod `flatten()`, no secrets).

## Next Steps

- **Depends on:** Phase 03 (Prisma models + `lib/db.ts`, seeded dev DB) and Phase 05 (`@safebite/domain` risk engine `assessDish`, `buildQuestionCard`, Zod request schemas, copy). Also Phase 02 for `lib/env.ts` + envelope scaffold.
- **Unblocks:** Phase 1 UI/data phases — onboarding (`/allergens`, `/profile-templates`), dishes list/detail (`/dishes`), recommendations screen (`/recommendations/dishes`), question-card screen (`/question-cards`), and the TanStack Query hooks + Dexie offline cache that wrap these endpoints.
- **Feeds later:** Phase 12 admin API reuses `api-response.ts` and serializers; keep them generic.
