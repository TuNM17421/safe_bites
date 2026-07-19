# Phase 09 — Ingredient-correction reports + /admin/reports UI

## Context Links
- Plan overview: [`plan.md`](./plan.md) (phase 09; depends 05, 07)
- Migration delta: [`migration-delta.md`](./migration-delta.md) §1 (dish + admin reports rows), §2.4–2.6 (data model), §3 (feedback demotion)
- v2 mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — routes `/restaurant/:id/dish` ("Report wrong ingredient" sheet) and `/admin/reports`
- Data-model dep (phase-05): [`phase-05-data-model-foundation.md`](./phase-05-data-model-foundation.md) — must land `MenuItemIngredient`, `FeedbackEntityType += ingredient`, `FeedbackAdminActionType += approve_ingredient_correction`, `SourceType`/`source` already has `user_submitted`/`user_contribution`, and a nullable reporter ref on `FeedbackReport`
- Current code read: `apps/web/src/server/feedback/admin-actions.ts`, `apps/web/src/server/feedback/create-feedback-report.ts`, `apps/web/src/app/api/v1/feedback/route.ts`, `apps/web/src/app/api/v1/admin/feedback/route.ts` + `[reportId]/actions/route.ts`, `apps/web/src/features/admin/feedback/admin-feedback-serializers.ts`, `apps/web/src/components/feedback/feedback-entry-button.tsx`, `apps/web/src/lib/dexie.ts`, `apps/web/src/features/feedback/offline-feedback-queue.ts`, `packages/domain/src/feedback/schemas.ts`, `apps/web/prisma/schema.prisma`

## Overview
- **Priority:** High (core human-in-the-loop write path; only report action that mutates data)
- **Current status:** Not started
- **Effort:** L | **Risk:** med | **Depends on:** phase-05 (schema), phase-07 (dish provenance UI + `MenuItemIngredient` rows to correct)
- Reframe the v1 6-step reaction wizard into a lean, in-context "Report wrong ingredient" flow that targets a single `MenuItemIngredient`, and build the `/admin/reports` queue whose new `approve_ingredient_correction` action transactionally mutates the ingredient + traffic light and stamps provenance. The report → flag → audit → offline-outbox spine is reused verbatim; only the input shape, one admin action, one Dexie version, and the admin UI are new.

## Key Insights
- **The spine already exists and is clean.** `applyAdminAction()` (admin-actions.ts:57) is a `$transaction` that switches on `FeedbackAdminActionType` and ALWAYS writes exactly one `FeedbackAdminAction` with `before`/`after` JSON snapshots (lines 169–179). Every existing action only flips report status or inserts/resolves a `FeedbackFlag` — **none mutate domain data**. `approve_ingredient_correction` is the first data-mutating case; it must follow the same before/after audit pattern.
- **Public submit path is generic.** `POST /api/v1/feedback` (route.ts) → `resolveEntities` → `planFeedbackReport` → `persistFeedbackReport` (create-feedback-report.ts). `resolveEntities` currently resolves restaurant/menuItem/dish only (`FeedbackEntityError` reasons); it has no `ingredient` branch. `FeedbackReportInputSchema` (schemas.ts:130) is reaction-shaped: `reaction` is **required**, plus `staffAnswer`/`reactionTiming`/`userTrustRating`. For an ingredient correction these are noise.
- **`FeedbackEntityType` is `restaurant | menu_item | dish`** (schemas.ts:69 + prisma:142) — no `ingredient`. `FeedbackFlag` has `restaurantId/menuItemId/dishId/allergenId` columns but **no `ingredientId`/`menuItemIngredientId`** (prisma:471). `flagFromTarget` (admin-actions.ts:34) maps entityType→id column; an ingredient target needs a new column + branch.
- **Dexie is at `version(3)`** (dexie.ts:93, DB name `safebite_pwa_v1`). `PendingFeedbackReport.payload: FeedbackReportInput` (dexie.ts:52). Outbox drain (`flushPendingFeedback`, offline-feedback-queue.ts:38) re-POSTs with `submissionSource:'offline_synced'` — payload-shape-agnostic, so a leaner ingredient payload flows through unchanged **if** the store schema is migrated additively.
- **Admin list API is ready.** `GET /api/v1/admin/feedback` (route.ts) filters + offset-paginates + returns `meta` counts; `[reportId]` detail + `[reportId]/actions` exist. Serializers (`admin-feedback-serializers.ts`) already expose restaurant/menuItem bilingual names + `notes`. There is **no admin UI** — `apps/web/src/app/admin/` has only dishes/ingredients/dish-risks/restaurants pages; `/admin/reports` is greenfield.
- **Gotcha — provenance value.** `SourceType` enum (prisma:53) lists `user_submitted` but not `user_contribution`. Confirm in phase-05 which literal the `MenuItemIngredient.source` uses; this phase writes exactly that value. Do not invent a second one.
- **Gotcha — anonymity boundary.** v1 feedback is deliberately anonymous (create-feedback-report.ts stores no identity, no geolocation). Reporter reference is an **open decision** (delta §4.7); default to nullable/optional so the pipeline stays anonymous-capable.
- **Do not delete the v1 wizard yet** — phase-02 demotes `/feedback/new`. This phase only adds the ingredient path; retiring reaction steps is out of scope here.

## Requirements
**Functional**
- A public report can target a single ingredient row: `{ restaurantId, menuItemId, menuItemIngredientId, proposedStatus (green/yellow/red/unknown), proposedIngredientName?, reportText, reporter? }`.
- Dish detail (`/restaurant/:id/dish`) shows a per-ingredient "Report wrong ingredient" trigger opening an in-context sheet (no route change), replacing the 6-step wizard for this flow.
- Reports queue at `/admin/reports` lists restaurant·dish, report text, reporter, proposed correction; each row has Approve / Reject.
- **Approve** (`approve_ingredient_correction`) transactionally: updates the `MenuItemIngredient` status/name, sets `source = <user-contribution literal>` + `verificationStatus` unverified/needs_review (NEVER auto-verified), resolves the report, and writes one `FeedbackAdminAction` with before/after.
- **Reject** reuses `dismiss_report`/`resolve_no_change`; no data mutation.
- Offline: an ingredient report submitted offline is queued and drained identically to reaction reports.

**Non-functional**
- All UI strings via `useTranslations`/next-intl (add product-approved VI/EN keys under `feedback.reportIngredient.*` and `admin.reports.*`); no hardcoded copy.
- `@/i18n/navigation` Link/router only (admin island keeps its existing `next/link` per convention).
- Semantic `sb-*` tokens only; the "report" restyle uses the red/avoid traffic-light token, not raw colors.
- Zod at both boundaries (public submit + admin action). Files < 200 lines; RSC-first (admin page server-fetches; sheet is a client island).

## Architecture
- **Domain (packages/domain):** add `IngredientReportInputSchema` (lean; no `reaction`) OR extend `FeedbackReportInputSchema` with an optional `ingredientCorrection` object + `entityType='ingredient'` discriminant. Prefer a **discriminated addition** so the existing reaction path is untouched and `submissionSource`/`clientReportId`/idempotency are inherited. Add `'ingredient'` to `FeedbackEntityTypeSchema` and `'approve_ingredient_correction'` to `FeedbackAdminActionTypeSchema` (mirrors phase-05 Prisma enums — single source of truth).
- **Public flow:** `feedback-entry-button.tsx` gains a restyled "report" variant that opens a client sheet (`components/feedback/report-ingredient-sheet.tsx`, new) instead of routing to `/feedback/new`. Sheet collects proposed status + text → builds payload → `submitOrQueueFeedback` (unchanged). `resolveEntities` gains an `ingredient` branch verifying the `MenuItemIngredient` belongs to `menuItemId`/`restaurantId` (new `FeedbackEntityError` reason).
- **Admin approve:** new `case 'approve_ingredient_correction'` in `applyAdminAction`: read target `MenuItemIngredient` (before), update status/name/source/verificationStatus (after), `setStatus('resolved', true)`, one audit row. Add `menuItemIngredientId` to `FeedbackFlag` + `flagFromTarget` if a flag is needed; otherwise a pure data mutation + audit is sufficient.
- **Admin UI:** RSC `apps/web/src/app/admin/reports/page.tsx` fetches the existing list API server-side; a client `reports-table` island renders rows + Approve/Reject buttons posting to `[reportId]/actions`. Reuse `admin-feedback-serializers.ts` (extend list DTO with `reportText`/`reporter`/`proposedCorrection`).
- **Offline:** Dexie `version(4)` additively re-declares `pendingFeedbackReports` (same store name/keys) to admit the new payload shape; existing v3 rows/data preserved.

## Related Code Files
**Modify**
- `packages/domain/src/feedback/schemas.ts` — add `ingredient` entity type, `approve_ingredient_correction`, ingredient-correction input fields/schema
- `apps/web/src/server/feedback/create-feedback-report.ts` — `resolveEntities` ingredient branch + `FeedbackEntityError` reason; persist correction fields
- `apps/web/src/server/feedback/plan-feedback-report.ts` — skip reaction-only planning for ingredient reports (no severe-auto-flag branch)
- `apps/web/src/server/feedback/admin-actions.ts` — `approve_ingredient_correction` case (transactional mutate + before/after audit); extend `flagFromTarget` if `ingredientId` flag needed
- `apps/web/src/app/api/v1/feedback/route.ts` — map new `FeedbackEntityError` reason to 404
- `apps/web/src/lib/admin-feedback-schemas.ts` — allow new action in `adminFeedbackActionSchema`; require ingredient target
- `apps/web/src/features/admin/feedback/admin-feedback-serializers.ts` — list DTO: `notes`/`reportText`, reporter, proposed correction, ingredient ref
- `apps/web/src/components/feedback/feedback-entry-button.tsx` — add red "report ingredient" variant that opens the sheet
- `apps/web/src/lib/dexie.ts` — `version(4)` additive migration for the new payload shape
- `apps/web/messages/en.json` + `apps/web/messages/vi.json` — add product-approved VI/EN keys `feedback.reportIngredient.*`, `admin.reports.*`, action labels, new `publicReasonKey` if used
**Create**
- `apps/web/src/components/feedback/report-ingredient-sheet.tsx` — in-context client sheet (< 200 lines)
- `apps/web/src/app/admin/reports/page.tsx` — RSC reports queue
- `apps/web/src/features/admin/reports/reports-table.tsx` — client Approve/Reject island
- `apps/web/src/tests/unit/ingredient-correction.test.ts` — resolve + approve + audit + idempotency
**Delete**
- None (v1 wizard demotion belongs to phase-02)

## Implementation Steps
1. Confirm phase-05 landed: `MenuItemIngredient`, `FeedbackEntityType.ingredient`, `FeedbackAdminActionType.approve_ingredient_correction`, the `MenuItemIngredient.source` user-contribution literal, and nullable reporter on `FeedbackReport`. If missing, block back to phase-05 (do not add ad-hoc enums here).
2. Domain: extend `FeedbackEntityTypeSchema` + `FeedbackAdminActionTypeSchema`; add ingredient-correction input (discriminated, `reaction` not required for this variant); export inferred types.
3. `resolveEntities`: add ingredient branch (verify `MenuItemIngredient` ↔ menuItem ↔ restaurant); add `menu_item_ingredient_not_found` error + 404 mapping in the route.
4. Persist correction fields on `FeedbackReport` (reuse `notes` for report text or add explicit column per phase-05); ensure `planFeedbackReport` short-circuits reaction-only logic.
5. `admin-actions.ts`: implement `approve_ingredient_correction` — read-before, mutate `MenuItemIngredient` (status/name/`source`/`verificationStatus=unverified`), `setStatus('resolved', true)`, one audit row with before/after. Extend `flagFromTarget`/`FeedbackFlag` with `menuItemIngredientId` only if a caution flag is required.
6. `admin-feedback-schemas.ts`: permit the new action, require an `ingredient` target in `superRefine`.
7. `feedback-entry-button.tsx` + new `report-ingredient-sheet.tsx`: red-restyled trigger → sheet → `submitOrQueueFeedback`. All strings via next-intl.
8. Dexie `version(4)`: additive re-declare of `pendingFeedbackReports`; verify v3 data survives.
9. Admin UI: `admin/reports/page.tsx` (RSC list fetch) + `reports-table.tsx` (Approve/Reject → actions API); add sidebar entry per phase-10 shell.
10. i18n: add VI + EN keys (product-approved copy); no inline strings.
11. Tests: resolve rejects mismatched ingredient; approve mutates + stamps provenance + writes audit + is idempotent by `clientReportId`; reject leaves data untouched. Run typecheck + unit suite.

## Todo
- [ ] Verify phase-05 schema prerequisites present
- [ ] Domain: entity type + action type + ingredient-correction input/schema
- [ ] `resolveEntities` ingredient branch + 404 mapping
- [ ] Persist correction fields; short-circuit reaction planning
- [ ] `approve_ingredient_correction` transactional mutate + before/after audit
- [ ] Admin action Zod (new action + required ingredient target)
- [ ] Restyled entry button + in-context report sheet
- [ ] Dexie `version(4)` additive migration
- [ ] `/admin/reports` RSC page + Approve/Reject table island
- [ ] VI/EN i18n keys (no hardcoded strings)
- [ ] Unit tests + typecheck green

## Success Criteria
- Submitting an ingredient report from `/restaurant/:id/dish` creates a `needs_review` `FeedbackReport` targeting the ingredient (online and offline-then-synced).
- `/admin/reports` lists the report with restaurant·dish, report text, reporter; Approve mutates the `MenuItemIngredient` (status + `source=<user-contribution literal>` + unverified) and writes one `FeedbackAdminAction` with correct before/after; Reject changes no ingredient data.
- Approve is idempotent by `clientReportId`; the reaction wizard path still works unchanged.
- `pnpm --filter web typecheck` and the feedback unit suite pass; new tests cover resolve/approve/reject/idempotency.

## Risk Assessment
- **Schema coupling with phase-05** → block-and-verify in step 1; no ad-hoc enums in this phase. *Mitigation:* strict dependency gate.
- **First data-mutating admin action** could bypass the audit invariant. *Mitigation:* keep the mutation inside the existing `$transaction` and the shared audit-write tail; add a test asserting an audit row + before/after exist.
- **Auto-verification leak** — approving must not set `verified`/verified source. *Mitigation:* hardcode `verificationStatus` to the unverified/needs_review literal; assert in test.
- **Dexie migration data loss.** *Mitigation:* additive `version(4)` only; never redefine v1–v3; manual round-trip check.
- **Payload divergence** between reaction and ingredient reports bloating the schema. *Mitigation:* discriminated variant, shared envelope fields.

## Security Considerations
- **Auth:** public submit stays anonymous + rate-limited (`rateLimit`/`clientKey` unchanged); admin approve/reject behind `requireAdmin`.
- **Zod at both boundaries:** `parseBody(FeedbackReportInputSchema…)` for submit, `adminFeedbackActionSchema` for actions; ingredient target validated server-side against ownership (never trust client `menuItemIngredientId`).
- **PII / on-device:** reporter reference nullable — preserve the anonymity default (delta §4.7); Dexie outbox continues to store only the sync payload, never profile/geolocation/tokens (dexie.ts:48–60).
- **Provenance / human-in-the-loop:** approved corrections are stamped user-contribution + unverified/needs_review, never auto-verified; every approval leaves an immutable `FeedbackAdminAction` audit row.

## Next Steps
- Unblocks phase-13 `/agent` Confirm/Edit → ingredient-correction path (delta §1 agent row) which reuses this submit endpoint.
- Feeds phase-07 dish provenance ("+ N user contributions") counts once corrections are approved.
- Sets the audited data-mutation pattern reused by phase-12 `/admin/ocr-review` approvals.
