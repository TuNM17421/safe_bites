# Phase 05 — Admin Feedback API (list / detail / patch / actions + audit)

## Context Links
- Spec: `docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md` §6.5 (actions + side effects), §10.1–10.4 (list/detail/patch/actions APIs + side-effect table), §16.4 (audit trail), §17.4 (admin action transaction).
- Reality map: `research/codebase-reality-map.md` §4 (admin subsystem — `requireAdmin`, Next15 `ctx.params` Promise, P2025/P2002, no audit/actor infra, no admin StatusBadge).
- Contract: `research/interface-contract.md` — Server (`admin-actions.ts` `applyAdminAction`), Admin API routes, enums, invariants.
- Depends on: [[phase-02-prisma-persistence]] (models/enums), [[phase-03-public-feedback-api]] (`create-auto-flags.ts`, serializer helpers). Coupled to [[phase-04-recommendation-integration]] (reco must ignore spam/resolved/dismissed/expired flags & reports). UI consumer: [[phase-08-admin-feedback-ui]] (not built here).

## Overview
**Priority:** High (blocks admin UI) · **Current status:** Not started

Three admin-only API surfaces plus the transactional service behind them: `GET /api/v1/admin/feedback` (filtered, cursor-paginated list, default sort priority-desc then createdAt-desc), `GET|PATCH /api/v1/admin/feedback/[reportId]` (rich detail + simple state change), and `POST /api/v1/admin/feedback/[reportId]/actions` (apply an admin action with side effects). **Every** admin action — and simple PATCH — writes a `FeedbackAdminAction` row with `before`/`after` JSON snapshots. All routes gated by `requireAdmin`. No UI in this phase.

## Key Insights (grounded)
- **Auth idiom** (`lib/admin-auth.ts:75`): `const denied = await requireAdmin(req); if (denied) return denied;`. Cookie is `sbt_admin`; middleware already 401s `/admin` API. Never reinvent.
- **Route conventions** (from `admin/restaurants/[restaurantId]/route.ts`): `export const runtime='nodejs'; export const dynamic='force-dynamic';`. `ctx.params` is a **Promise** → `const { reportId } = await ctx.params;`. Prisma errors: `P2025→404 NOT_FOUND`, `P2002→409 CONFLICT`. Envelope via `apiOk`/`apiError`; body via `parseBody(req, schema)`, query via `parseQuery(req.url, schema)` (both return `{ok, data|response}`).
- **No actor identity exists** — `sbt_admin` is a shared token digest, not a user. Set `actor='admin'` for human actions, `actor='system'` for auto-created rows. **Flag this in the return summary** (no richer identity available in Phase 03).
- **No audit/StatusBadge/serializer for feedback exists** — all net-new. Reuse `restaurant-serializers.ts` `num`/`iso` helpers (Decimal/Date → JSON-safe) when snapshotting.
- **No shared cursor helper** — list pagination in `restaurants/route.ts` is offset-after-`take:500`. Here use a **keyset cursor**: opaque base64 of `{createdAt, id}`; encode `nextCursor` from the last row, decode into a `where` predicate. Keep it in a tiny local helper (`lib/feedback-cursor.ts`) — do not build a generic framework (YAGNI).
- **Prisma enum ordering ≠ priority order.** `FeedbackPriority` DB order is `low,normal,high,urgent` (ascending). "priority desc" = urgent-first, which matches. But keyset pagination on an enum is fragile → paginate primarily by `createdAt desc, id desc` and apply priority as the leading `orderBy`; document that cursor stability relies on `(priority, createdAt, id)` tuple. Simpler & safe: order `[{priority:'desc'},{createdAt:'desc'},{id:'desc'}]`, cursor = `{priority, createdAt, id}`.
- **Invariant coupling:** `mark_spam`/`dismiss_report`/`resolve_no_change` must make reports & their flags invisible to reco. This phase only sets `status`/flag.status; [[phase-04-recommendation-integration]]'s `loadActiveFeedbackFlags` must filter `status='active'` AND report not in `{spam,dismissed,resolved}`. Note the coupling; do not duplicate the filter here.

## Cross-cutting safety invariants (restated)
1. Feedback never emits `suitable`; unknown never → suitable — admin actions here only **create/resolve flags & change report state**, never upgrade.
2. Positive/no-reaction feedback never upgrades status/readiness/confidence — no action type does this.
3. Feedback never creates `restaurant_verified`/`admin_verified` evidence — `request_reverification` sets a review marker only, never a verified source.
4. Severe/anaphylaxis auto-flags already exist from submission; admin `clear_feedback_flag`/`resolve_no_change` are the only ways to deactivate them.
5. Public API/UI never exposes raw `notes`/`staffAnswerText` — but **admin detail MAY** (admin is trusted; §6.4/§6.6 notes are internal-only). Ensure these fields never leak to any *public* serializer.
6. Zod at every boundary; `admin-actions.ts` service stays a thin Prisma wrapper (no domain trust logic — that lives in [[phase-01-domain-feedback-core]]).

## Requirements
### Functional
- List: filter by `status, priority, reaction, restaurantId, menuItemId, allergenId, hasActiveFlag, createdAt` range; `cursor`, `limit` (default 50, max 100); default sort priority-desc, createdAt-desc; response `{items:[...], nextCursor}`. `allergenId` filters via `allergenIds has` (scalar-list). `hasActiveFlag=true` → `flags: { some: { status:'active' } }`.
- Detail: report + restaurant + menuItem + dish + allergen metadata + `recommendationSnapshot` (stored) + **current recommendation if computable** + active flags + related reports (same restaurant OR menuItem OR any shared allergen, `createdAt >= now-90d`, excluding self) + full action history (ordered `createdAt asc`).
- PATCH: simple state — `status`, `adminSummary`, `reviewOutcome` only. Sets `reviewedAt=now`, `reviewedBy='admin'` when status leaves `needs_review`. Writes an `add_note`-typed audit row with before/after.
- Actions: `POST .../actions` validates `{actionType, note?, target?, expiresAt?}`, calls `applyAdminAction(...)`, returns `{actionId, reportId, createdFlagId?, updatedFlagId?, status:'ok'}`.
- `applyAdminAction` maps every `FeedbackAdminActionType` to its §10.4 side effect (table below), transactionally, always writing one `FeedbackAdminAction`.

### Non-functional
- All handlers `requireAdmin`-gated; unauthenticated → 401. Files < 200 lines (split serializer/cursor/service). No raw Prisma errors leak. Cursor opaque & tamper-safe (decode failure → 400 `VALIDATION_ERROR`, not 500). Snapshots JSON-safe (Decimal/Date coerced).

## Architecture
```
route (list)      -> parseQuery(adminFeedbackListQuerySchema) -> where + orderBy + keyset
                     -> prisma.feedbackReport.findMany (+_count flags, restaurant/menuItem select)
                     -> feedbackReportRowToListDTO[] + encodeCursor(last)

route (detail)    -> load report (include restaurant, menuItem{dish}, flags{active}, actions)
                     -> load related reports (90d window) -> optional current-reco compute
                     -> feedbackReportToDetailDTO

route (PATCH)     -> parseBody(adminFeedbackPatchSchema) -> tx{ before snapshot; update; audit add_note }

route (actions)   -> parseBody(adminFeedbackActionSchema) -> applyAdminAction(...)

applyAdminAction  -> $transaction:
   load report(+flags)  -> switch(actionType) side-effect  -> write FeedbackAdminAction(before/after)
```
`applyAdminAction({reportId, actionType, note, target?, expiresAt?, actor})`. `target = {entityType, entityId, restaurantId?, menuItemId?, dishId?, allergenId?}` (needed for `confirm_feedback_flag`, `suppress_suitable_until_review`, `apply_confidence_downgrade`, `hide_menu_item_temporarily`); `clear_feedback_flag`/`confirm_feedback_flag` may reference an existing `flagId` in `target`.

### Side-effect map (spec §10.4 / §6.5)
| actionType | effect | audit before/after |
|---|---|---|
| `start_review` | `report.status='in_review'` | report status |
| `resolve_no_change` | `report.status='resolved'`; if `target.clearFlags` → active report flags `status='resolved'` | report+flags |
| `dismiss_report` | `report.status='dismissed'`; optionally dismiss report's active flags | report+flags |
| `mark_spam` | `report.status='spam'` (reco ignores — coupling note) | report status |
| `confirm_feedback_flag` | keep existing active flag, or **create** active flag from `target` (`effect=flag_for_review` default) | flag |
| `clear_feedback_flag` | `flag.status='resolved'`, `resolvedAt=now`, `resolvedBy='admin'` | flag status |
| `request_reverification` | set `report.reviewOutcome='reverification_requested'`; **reuse** existing `Restaurant.reviewStatus='needs_review'` if `target.entityType='restaurant'` (never a verified source) | report + restaurant.reviewStatus |
| `apply_confidence_downgrade` | create active flag `effect=downgrade_confidence`, `confidenceDelta` from body or default | flag |
| `suppress_suitable_until_review` | create active flag `effect=suppress_suitable` scoped to `target` (+`allergenId`, `expiresAt`) | flag |
| `hide_menu_item_temporarily` | create active flag `effect=hide_recommendation` (no physical hide in v1) | flag |
| `add_note` | audit row only | — |

Flag creation reuses [[phase-03-public-feedback-api]] `create-auto-flags.ts` builder where shape overlaps (DRY) — extract a shared `insertFeedbackFlag(tx, spec)` if needed. `readinessCap`/`publicReasonKey` set only where meaningful (`suppress_suitable`→`feedback_under_review`).

## Related Code Files
### Create
- `apps/web/src/app/api/v1/admin/feedback/route.ts` — GET list.
- `apps/web/src/app/api/v1/admin/feedback/[reportId]/route.ts` — GET detail + PATCH.
- `apps/web/src/app/api/v1/admin/feedback/[reportId]/actions/route.ts` — POST actions.
- `apps/web/src/server/feedback/admin-actions.ts` — `applyAdminAction(...)` (transactional).
- `apps/web/src/features/admin/feedback/admin-feedback-serializers.ts` — `feedbackReportRowToListDTO`, `feedbackReportToDetailDTO`, `flagRowToAdminDTO`, `actionRowToDTO` (admin DTOs; may include notes).
- `apps/web/src/lib/feedback-cursor.ts` — `encodeFeedbackCursor` / `decodeFeedbackCursor` (base64 `{priority,createdAt,id}`).
- `apps/web/src/lib/admin-feedback-schemas.ts` — `adminFeedbackListQuerySchema`, `adminFeedbackPatchSchema`, `adminFeedbackActionSchema` (Zod; import shared enum schemas from `@safebite/domain`).

### Modify
- `apps/web/src/server/feedback/create-auto-flags.ts` — export a reusable `insertFeedbackFlag(tx, spec)` if flag-insert logic is shared (else duplicate minimally).
- (Read-only reference — no edit) `packages/domain` enum schemas (`FeedbackAdminActionInputSchema`, `FeedbackFlagSchema`) from [[phase-01-domain-feedback-core]].

### Delete
- None.

## Implementation Steps
1. **Schemas** (`lib/admin-feedback-schemas.ts`): `adminFeedbackListQuerySchema` (all filters optional strings, `limit` coerced 1–100 default 50, `cursor` optional). `adminFeedbackPatchSchema` (`status` enum, `adminSummary` ≤1000, `reviewOutcome` nullable ≤200). `adminFeedbackActionSchema` = `FeedbackAdminActionInputSchema` re-used/extended (`actionType` enum, `note` ≤1000, `target` object optional, `expiresAt` ISO datetime nullable, `confidenceDelta` optional). Reuse domain `z.enum`s — no parallel literals.
2. **Cursor** (`lib/feedback-cursor.ts`): encode `{priority, createdAt: iso, id}` → `Buffer.from(JSON.stringify(x)).toString('base64url')`; decode with try/catch → `null` on failure. List route treats bad cursor as 400.
3. **Serializers** (`admin-feedback-serializers.ts`): list DTO = `{id, clientReportId, createdAt, status, priority, reaction, restaurant:{id,name}, menuItem:{id,name}|null, allergenIds, askedStaff, hasActiveFlags}`. Detail DTO adds `profileSnapshot, recommendationSnapshot, staffAnswer, staffAnswerText, notes, ateHere, visitedAt, reactionTiming, userTrustRating, dish, activeFlags[], relatedReports[], actions[]`. Coerce Date→iso, Decimal→num.
4. **List route** (`admin/feedback/route.ts`): `requireAdmin` → `parseQuery` → build `Prisma.FeedbackReportWhereInput` from filters (`allergenId`→`{allergenIds:{has}}`, `hasActiveFlag`→`{flags:{some:{status:'active'}}}`, `createdAt` range). `orderBy:[{priority:'desc'},{createdAt:'desc'},{id:'desc'}]`, `take:limit+1`, keyset `where` from decoded cursor. Slice extra row → `nextCursor`. `apiOk({items, nextCursor})`.
5. **Detail route GET** (`[reportId]/route.ts`): `requireAdmin` → `await ctx.params` → `findUnique` with `include:{restaurant, menuItem:{include:{dish?}}, flags:{where:{status:'active'}}, actions:{orderBy:{createdAt:'asc'}}}`. 404 if null. Load related reports (`createdAt>=now-90d`, `OR:[{restaurantId},{menuItemId},{allergenIds:{hasSome}}]`, `NOT:{id}`, `take:20`). Optionally compute current reco (best-effort; skip if profile unavailable — snapshot only). Return detail DTO.
6. **Detail route PATCH**: `requireAdmin` → `parseBody(adminFeedbackPatchSchema)` → `$transaction`: read `before` (status/adminSummary/reviewOutcome) → `update` (+`reviewedAt`/`reviewedBy='admin'` when leaving `needs_review`) → write `FeedbackAdminAction{actionType:'add_note', actor:'admin', note:adminSummary, before, after}`. Map `P2025→404`.
7. **`applyAdminAction`** (`server/feedback/admin-actions.ts`): signature `({reportId, actionType, note, target?, expiresAt?, actor='admin'})`. `$transaction(async tx => {...})`: load report (+active flags) → 404 if missing → capture `before` → `switch(actionType)` per side-effect table → capture `after` → insert one `FeedbackAdminAction` (link `flagId` when a flag was created/changed) → return `{actionId, createdFlagId?, updatedFlagId?}`. Keep each case a small helper; file < 200 lines (extract flag-insert to shared helper).
8. **Actions route** (`.../actions/route.ts`): `requireAdmin` → `await ctx.params` → `parseBody(adminFeedbackActionSchema)` → `applyAdminAction({reportId, ...body, actor:'admin'})` → `apiOk({...result, reportId, status:'ok'})`. Guard invalid `target`/missing `flagId` for flag actions → 400 `VALIDATION_ERROR`. Map `P2025→404`.
9. **DRY flag insert**: if step 7 & `create-auto-flags.ts` share flag-create shape, export `insertFeedbackFlag(tx, spec)` and use in both.
10. **Sanity typecheck**: run `pnpm --filter @safebite/web typecheck` (no DB needed) to catch Prisma type drift after models land in [[phase-02-prisma-persistence]].

## Todo List
- [ ] `lib/admin-feedback-schemas.ts` (list query / patch / action Zod, reusing domain enums)
- [ ] `lib/feedback-cursor.ts` (encode/decode, safe decode)
- [ ] `features/admin/feedback/admin-feedback-serializers.ts` (list + detail + flag + action DTOs)
- [ ] `app/api/v1/admin/feedback/route.ts` (GET list, filters, keyset cursor, default sort)
- [ ] `app/api/v1/admin/feedback/[reportId]/route.ts` (GET detail + PATCH state + audit)
- [ ] `server/feedback/admin-actions.ts` (`applyAdminAction`, side-effect map, always audits)
- [ ] `app/api/v1/admin/feedback/[reportId]/actions/route.ts` (POST actions)
- [ ] Reusable `insertFeedbackFlag(tx, spec)` shared with `create-auto-flags.ts`
- [ ] `pnpm --filter @safebite/web typecheck` clean

## Success Criteria
- `GET /api/v1/admin/feedback` (no cursor) returns urgent-first, then newest; a follow-up call with `nextCursor` returns the next page with no overlap/gap; filters (`status`, `priority`, `reaction`, `restaurantId`, `allergenId`, `hasActiveFlag`, `createdAt` range) narrow correctly.
- Detail returns report + contexts + active flags + ≤90d related reports + full ordered action history.
- Each admin action and each PATCH creates exactly one `FeedbackAdminAction` with non-null `before`/`after` (or `before=null` for pure inserts) and correct `actor`.
- Side effects match the §10.4 table (verified in e2e: start_review→in_review, clear_feedback_flag→flag resolved, suppress_suitable_until_review→active flag exists & later suppresses reco via [[phase-04-recommendation-integration]]).
- All four routes 401 without the `sbt_admin` cookie.
- **Validate:** unit test the cursor round-trip + where-builder (pure, DB-free, `quality` job); e2e (needs new admin-login helper, `POST /api/v1/admin/login` with `ADMIN_TOKEN=change-me-in-dev`) covers list→start_review→resolve→clear_flag→audit-row assertions.

## Risk Assessment
- **Keyset cursor on enum priority is fragile** → paginate by `(priority, createdAt, id)` tuple; if instability appears, fall back to `createdAt,id`-only keyset with priority as non-cursor `orderBy` (documented trade-off: page boundaries may interleave priorities — acceptable v1).
- **Missing `target` for flag actions** → schema `.superRefine` requiring `target`/`flagId` per `actionType`; reject 400 before the transaction.
- **`request_reverification` touching `Restaurant.reviewStatus`** could clobber real review state → only set `needs_review`, never a verified value; snapshot `before` so it is auditable/reversible.
- **Snapshot bloat** (`before`/`after` on large rows) → snapshot only the mutated fields, not full row.
- **`applyAdminAction` file > 200 lines** → extract per-action helpers + shared flag insert.

## Security & Privacy Considerations
- Every route behind `requireAdmin`; rely on middleware + in-handler guard (defense-in-depth). Never log the `sbt_admin` cookie.
- Admin detail exposes internal `notes`/`staffAnswerText`/`profileSnapshot` — this is intentional (trusted admin, §6.6) but these fields MUST NOT be reachable from any public serializer/route; keep admin serializers in `features/admin/feedback/` only.
- No raw Prisma errors to client (`P2025→404`, `P2002→409`, else generic 500 via thrown → framework).
- `actor` is always `'admin'`/`'system'` — **no per-user identity exists in Phase 03** (shared token). Flagged as a known limitation; audit trail attributes to the admin role, not a person.
- Feedback records already exclude geolocation (enforced at submission); admin API must not add lat/lon to any snapshot.

## Next Steps
- Unblocks [[phase-08-admin-feedback-ui]] (queue table, detail panel, action panel, audit trail — consumes these three routes via `adminFetch`/`useAdminResource`).
- The active-flag lifecycle established here (create via action → `status='active'`, clear → `resolved`) is what [[phase-04-recommendation-integration]] reads; confirm the reco flag loader filters `{spam,dismissed,resolved,expired}`.
- Add feedback-demo rows in [[phase-09-seed-tests-docs]] so list/detail have data in e2e.
