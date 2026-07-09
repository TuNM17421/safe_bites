# Phase 03 — Public Feedback API + Server Services

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md` §9.1–9.4 (submit / idempotency / validation / options), §17.2–17.3 (transaction + severe auto-flag), §17.5 (error handling), §2.3 (privacy / minimal snapshot).
- Reality map: `plans/20260709-1013-safebite-phase-03-feedback-loop/research/codebase-reality-map.md` (§0 deltas, §1 Prisma, §3 recommendation choke point).
- Contract: `plans/20260709-1013-safebite-phase-03-feedback-loop/research/interface-contract.md` (Server + API routes sections).
- Depends on: [[phase-01-domain-feedback-core]] (pure domain fns + schemas), [[phase-02-prisma-persistence]] (models + migration).
- Unblocks: [[phase-04-recommendation-integration]], [[phase-05-admin-feedback-api]].

## Overview

**Priority:** High (core write path of the feedback loop).
**Current status:** Not started.

Build the public write/read surface: `POST /api/v1/feedback` (idempotent submit), `GET /api/v1/feedback/options`, and the `apps/web/src/server/feedback/` service layer that plans a report purely (`planFeedbackReport`) then persists it transactionally (`persistFeedbackReport`), creating severe auto-flags + system audit rows. Validation limits, entity checks, idempotent 200-on-duplicate, and no raw Prisma error leakage are all enforced here. Heavy business logic (priority, severe detection, flag specs) is delegated to Phase 01 domain fns so it is unit-testable in the DB-less `quality` CI job.

## Key Insights (grounded facts + spec deltas)

- **Menu model is `MenuItem`** (schema.prisma:252), NOT `RestaurantMenuItem`. FKs + entity checks target `MenuItem`.
- **Status codes are snake_case** (`suitable|ask_first|risky|avoid|unknown`). The spec §9.1 request example shows `"menuItemStatus": "Ask First"` — that field is an opaque stored snapshot; keep it a loose string, do NOT re-derive or map it.
- **New feedback tables use `@default(cuid())`**; `clientReportId String @unique` is the client idempotency key (Phase 02 owns the schema).
- **`quality` CI job has NO DB.** `planFeedbackReport` and all domain calls must be pure. Only `persistFeedbackReport` touches Prisma; it is exercised in `e2e` only.
- **Response envelope** = `apiOk(data, {status})` / `apiError(code, message, {status, details})` from `lib/api-response.ts`; validate bodies with `parseBody(req, schema)`, queries with `parseQuery(req.url, schema)`.
- **P2002 template** lives in `admin/dishes/route.ts:30-34` (catch `PrismaClientKnownRequestError.code === 'P2002'`). Reuse the pattern for the idempotency race.
- `prisma` singleton from `@/lib/db`; `prisma.$transaction(async (tx) => …)` for the atomic write.
- Import `FeedbackReportInputSchema` and domain fns from `@safebite/domain` (barrel export set up in Phase 01) — do NOT redefine the schema in the app.

## Cross-cutting safety invariants (enforced here)

1. Feedback never emits `suitable`; unknown never → suitable. (This phase never computes recommendation status — it only stores + flags.)
2. Positive / no-reaction feedback never creates flags or upgrades anything (`shouldAutoCreateFeedbackFlag` returns true only for `severe`/`anaphylaxis_or_emergency`).
3. Feedback never creates `restaurant_verified` / `admin_verified` evidence.
4. Severe/anaphylaxis → `priority=urgent` + active flags + system audit rows (all inside one tx).
5. Public responses never echo raw `notes`/`staffAnswerText`; the submit response returns only ids/status/priority/flag ids.
6. No lat/lon/distance ever enters a feedback record. Store only the minimal `profileSnapshot` (allergy ids/severity/cross-contact) + `allergenIds`.
7. Zod at every boundary; no raw Prisma error strings in responses.

## Requirements

### Functional

- `POST /api/v1/feedback`: validate → entity checks → derive `dishId` if omitted → plan (pure) → persist (tx) → return report summary. Duplicate `clientReportId` returns the **existing** report as HTTP 200 success (with `activeFlagIds` if it had flags).
- `GET /api/v1/feedback/options?restaurantId=`: return public metadata `{ restaurant{id,name,city}, menuItems[{id,name,dishId,dishName}], allergens[{id,nameEn,nameVi}] }`. Approved restaurants only; 404 otherwise.
- Best-effort in-memory rate limiter (`lib/rate-limit.ts`); over-limit → 429 with a stable code. Documented as non-durable.

### Non-functional

- `planFeedbackReport` + all domain calls pure/DB-free (unit-tested in `quality`).
- Response shapes stable & JSON-safe (serialize any Decimal/Date). Files < 200 lines, kebab-case.
- `runtime='nodejs'`, `dynamic='force-dynamic'` on both routes.

## Architecture

Flow (`POST /api/v1/feedback`):

```
route.ts
 ├─ rateLimit(req)                → 429 RATE_LIMITED (best-effort)
 ├─ parseBody(req, FeedbackReportInputSchema)   → 400 VALIDATION_ERROR
 ├─ resolveEntities(input)        → restaurant approved? menuItem∈restaurant? dish exists? derive dishId
 │     → 404 NOT_FOUND on miss
 ├─ planFeedbackReport(input, resolved)   [PURE]
 │     → { input, resolved, priority, severeAutoFlagged, flagSpecs[] }
 └─ persistFeedbackReport(plan)   [Prisma $transaction]
       ├─ findUnique({clientReportId}) → exists? return existing (+flags)   [idempotent 200]
       ├─ create FeedbackReport
       ├─ if severe: create FeedbackFlag[] (create-auto-flags) + system FeedbackAdminAction rows
       └─ catch P2002 (race) → re-read existing
   → apiOk(reportResponse, {status: 201 | 200})
```

Normal response: `{ reportId, clientReportId, status, priority, severeAutoFlagged, createdAt }`.
Severe response adds `activeFlagIds: string[]`.

## Related Code Files

### Create

- `apps/web/src/app/api/v1/feedback/route.ts` — POST submit handler.
- `apps/web/src/app/api/v1/feedback/options/route.ts` — GET options.
- `apps/web/src/server/feedback/create-feedback-report.ts` — `planFeedbackReport` (pure) + `persistFeedbackReport` (tx) + `resolveEntities`/`toReportResponse` helpers.
- `apps/web/src/server/feedback/create-auto-flags.ts` — maps `FeedbackFlagSpec[]` → prisma flag creates + system `FeedbackAdminAction` rows (within tx; accepts `tx`).
- `apps/web/src/lib/rate-limit.ts` — best-effort module-scope in-memory limiter (documented non-durable).

### Modify

- None required in this phase. (`schema.prisma`, domain barrel, and `FeedbackReportInputSchema` are delivered by Phases 01/02.)

### Read for context

- `apps/web/src/lib/api-response.ts` (envelope + `parseBody`/`parseQuery`).
- `apps/web/src/app/api/v1/admin/dishes/route.ts` (create + P2002 catch template).
- `apps/web/src/app/api/v1/restaurants/route.ts` (GET skeleton), `allergens/route.ts` (allergen DTO).
- `apps/web/src/lib/restaurant-query.ts` (`approvedRestaurantWhere`), `restaurant-serializers.ts` (`num`/`iso` JSON-safe coercion).

## Implementation Steps

1. **rate-limit.ts**: export `rateLimitFeedback(key: string): boolean` — module-scope `Map<string, {count, windowStart}>`, fixed window (e.g. 10/min). Key = `x-forwarded-for` header first value or a fallback. Add a top-of-file comment: non-durable, per-instance, resets on redeploy; acceptable v1 per contract.
2. **create-feedback-report.ts — types**: define `ResolvedEntities` (`{ dishId: string | null }` + entity existence flags) and `FeedbackReportPlan` (`{ input, resolved, priority, severeAutoFlagged, flagSpecs }`). Import `FeedbackReportInput` (`z.infer<typeof FeedbackReportInputSchema>`), `getFeedbackPriority`, `shouldAutoCreateFeedbackFlag`, `buildAutoFlagSpecs`, `FeedbackFlagSpec` from `@safebite/domain`.
3. **planFeedbackReport(input, resolved) [PURE]**: `priority = getFeedbackPriority({reaction: input.reaction, ateHere: input.ateHere})`; `severeAutoFlagged = shouldAutoCreateFeedbackFlag({reaction: input.reaction})`; `flagSpecs = severeAutoFlagged ? buildAutoFlagSpecs({restaurantId, menuItemId, dishId: resolved.dishId, allergenIds: input.allergenIds}) : []`. No Prisma import in this file's pure section — keep pure fns exportable standalone for unit tests.
4. **resolveEntities(input) [DB]** (in same file or route): `prisma.restaurant.findFirst({ where: approvedRestaurantWhere({}) merged with {id} })` → 404 if absent. If `menuItemId`: `prisma.menuItem.findFirst({where:{id, restaurantId}})` → 404 if not owned; capture its `dishId`. Derive `dishId = input.dishId ?? menuItem?.dishId ?? null`. If `input.dishId` given, `prisma.dish.findUnique` existence check → 404 if missing. Return `{ dishId }`.
5. **persistFeedbackReport(plan) [tx]**: `prisma.$transaction(async (tx) => { … })`:
   - `const existing = await tx.feedbackReport.findUnique({ where: { clientReportId }, include: { flags: true } })`; if found → `return toReportResponse(existing)` (idempotent, no new writes).
   - else `create` the report with minimal snapshot columns (`profileSnapshot` JSON, `allergenIds`, `recommendationSnapshot` JSON, reaction fields, `priority`, `status='needs_review'`, capped free-text). Never persist geo.
   - if `flagSpecs.length`: `await createAutoFlags(tx, reportId, flagSpecs)` → returns flag rows + writes system `FeedbackAdminAction` (`actionType='confirm_feedback_flag'` or an auto marker per Phase 02 enum; use `add_note` system row if no auto type) with `actor='system'`.
   - return `toReportResponse(report, flagRows)`.
   - Wrap the whole call in try/catch: on `P2002` (race) re-read via `findUnique({clientReportId})` and return it as success.
6. **toReportResponse(report, flags?)**: `{ reportId: report.id, clientReportId, status, priority, severeAutoFlagged: flags?.length ? true : report.priority==='urgent'&&..., createdAt: iso(report.createdAt) }`; when flags present add `activeFlagIds: flags.filter(f=>f.status==='active').map(f=>f.id)`. Derive `severeAutoFlagged` from presence of active flags, not a stored bool, to keep re-read path correct.
7. **create-auto-flags.ts**: `createAutoFlags(tx, reportId, specs)` → for each spec `tx.feedbackFlag.create({ data: { …spec, reportId, status:'active', allergenIds } })`, then one `tx.feedbackAdminAction.create({ data:{ reportId, actionType, actor:'system', note, flagId } })`. Return created flag rows. Keep < 200 lines.
8. **POST route.ts**: `runtime`/`dynamic` consts; `if (!rateLimitFeedback(key)) return apiError('RATE_LIMITED','Too many submissions, try again shortly.',{status:429});` → `parseBody` → `resolveEntities` (catch its 404 sentinel) → `planFeedbackReport` → `persistFeedbackReport` → `apiOk(resp, {status: created ? 201 : 200})`. Wrap unexpected errors: let Next return 500; do NOT include Prisma message in body (only stable codes).
9. **options route.ts**: `parseQuery(req.url, z.object({ restaurantId: z.string().min(1) }))` → load approved restaurant (`approvedRestaurantWhere`) with `menuItems{ select:{id,displayNameEn?/name, dishId, dish:{select:{canonicalName…}}}}`; 404 if absent. Load `prisma.allergen.findMany` (reuse `allergenToDTO` shape → `{id,nameEn,nameVi}`). Return `apiOk({restaurant, menuItems, allergens})`. Public metadata only — no allergen statuses, no confidence internals.
10. **Unit tests** (DB-free, in `apps/web/src/tests/unit/feedback-plan.test.ts`): assert `planFeedbackReport` produces `priority='urgent'` + non-empty `flagSpecs` for `reaction='anaphylaxis_or_emergency'`, empty specs for `reaction='none'`, and correct `dishId` derivation. (Schema-level tests belong to Phase 01's `feedback-schema.test.ts`.)
11. Run `pnpm --filter @safebite/web typecheck && pnpm lint && pnpm copy:check`. Verify submit path end-to-end via the Phase-08 e2e spec once Phases 01/02 land.

## Todo List

- [ ] `lib/rate-limit.ts` best-effort limiter + non-durability comment.
- [ ] `server/feedback/create-feedback-report.ts`: `planFeedbackReport` (pure), `resolveEntities`, `persistFeedbackReport` (tx + P2002 re-read), `toReportResponse`.
- [ ] `server/feedback/create-auto-flags.ts`: flag creates + system audit rows within tx.
- [ ] `app/api/v1/feedback/route.ts` POST: rate-limit → validate → entities → plan → persist → 201/200.
- [ ] `app/api/v1/feedback/options/route.ts` GET: approved restaurant + menuItems + allergens, 404 on miss.
- [ ] Unit test `feedback-plan.test.ts` (pure, DB-free).
- [ ] typecheck + lint + copy:check green.

## Success Criteria

- New `clientReportId` → 201 with `{reportId,status:'needs_review',priority,severeAutoFlagged,createdAt}`; severe reaction also returns `activeFlagIds` and creates matching `FeedbackFlag` + system `FeedbackAdminAction` rows.
- Re-POST same `clientReportId` → 200 with the identical existing report body; zero new report/flag rows (verify via count).
- Invalid body → 400 `VALIDATION_ERROR` with `details` flatten; missing restaurant / mis-owned `menuItemId` → 404 `NOT_FOUND`; over-limit → 429 `RATE_LIMITED`.
- `GET options` returns public metadata only; unknown/unapproved restaurant → 404.
- No response ever contains a raw Prisma error, `notes`, `staffAnswerText`, or geo data.
- `feedback-plan.test.ts` passes in the DB-less `quality` job.

## Risk Assessment

- **Idempotency race (two concurrent identical submits)** → both miss `findUnique`, one hits `P2002` → catch and re-read existing; return as success. Covered in step 5.
- **In-memory limiter loses state on redeploy / multi-instance** → documented non-durable; the `clientReportId @unique` dedup is the real correctness guard, so a bypassed limiter never double-writes.
- **`menuItemId` on discovery-only restaurant** → spec §9.3 allows null menuItemId there; entity check only rejects a menuItemId that does not belong to the restaurant, not its absence.
- **Snapshot bloat / accidental PII** → whitelist the exact snapshot columns in the `create` data object; never spread the raw request body into Prisma.
- **Domain schema drift** → import `FeedbackReportInputSchema` from `@safebite/domain`; if Phase 01 renames it, update the import only (single source of truth).

## Security & Privacy Considerations

- Anonymous by default: no account, name, email, phone collected or stored.
- Persist only the minimal `profileSnapshot` (allergy ids/severity/cross-contact) + `allergenIds`; never the full profile store, never geo (lat/lon/distance).
- Free-text `notes`/`staffAnswerText` capped at 500 chars by Zod (Phase 01 schema) and never echoed in public responses.
- `apiError` returns stable codes only (`VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `CONFLICT`) — no stack traces, no Prisma internals.
- No allergen/profile data placed in URLs or query strings (submit is POST body; options query carries only `restaurantId`).

## Next Steps

- [[phase-04-recommendation-integration]] consumes the persisted `FeedbackFlag` rows via `loadActiveFeedbackFlags` → `FeedbackSignal[]` → `recommendRestaurant`.
- [[phase-05-admin-feedback-api]] adds `requireAdmin` list/detail/action endpoints over the same models.
- Client submit UI ([[phase-06-public-feedback-ui]] / offline queue) posts to `POST /api/v1/feedback` and relies on the idempotent 200 for retry safety.
