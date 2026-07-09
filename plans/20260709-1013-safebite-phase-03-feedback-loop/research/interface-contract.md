# Phase 03 — Interface Contract (canonical names & decisions)

> Every phase file must use these exact names/paths. If a phase needs to change one,
> update it here first. Grounded in `codebase-reality-map.md`.

## Cross-cutting safety invariants (restate in every phase)

1. Feedback never emits `suitable`; **unknown never → suitable**.
2. Positive / no-reaction feedback never upgrades status/readiness/confidence.
3. Feedback never creates `restaurant_verified` / `admin_verified` evidence.
4. Severe / anaphylaxis report → `priority=urgent` + auto-created active flags + escalated to admin.
5. Public API/UI never exposes raw user `notes`/`staffAnswerText` (aggregate-only).
6. Allergy/profile data never in URL, analytics, or (for geo) anywhere in feedback records.
7. Zod at every API boundary; domain stays framework-free; `copy:check` must pass.
8. Only public status labels: Suitable / Ask First / Risky / Avoid / Unknown.

## Decisions (defaults chosen; user may override)

- **Enum types**: hand-written snake_case string-literal unions + parallel `z.enum` (matches domain convention). Composite input/response DTOs use `z.infer` of their Zod schema (pragmatic; introduces the pattern for new feedback DTOs only).
- **New Prisma model ids**: `String @id @default(cuid())` (like `MenuItemAllergenStatus`/`ImportRun`). `clientReportId String @unique` is the client idempotency key.
- **All new Prisma columns `@map` to snake_case.**
- **Rate limiting**: no infra exists. v1 = rely on `clientReportId @unique` dedup + a best-effort module-scope in-memory limiter (`lib/rate-limit.ts`, not durable; documented as such). Not a blocker.
- **Confidence downgrade**: reuse existing `downgradeConfidence` (label only). Leave `confidenceScore` as-is (documented).
- **Feedback business logic is pure & DB-free** so it runs in the `quality` CI job (no DB). Prisma persistence is a thin transactional wrapper; DB integration verified in `e2e` only.
- **copy:check hardening (optional, allowed)**: add `reported safe`, `user verified`, `community verified` to the denylist to enforce spec §11.6. Never weaken it.

## Prisma (in `apps/web/prisma/schema.prisma`)

Enums (snake_case): `FeedbackReportStatus{needs_review,in_review,resolved,dismissed,spam}`,
`FeedbackPriority{low,normal,high,urgent}`,
`FeedbackReaction{none,mild,moderate,severe,anaphylaxis_or_emergency,not_sure,prefer_not_to_say}`,
`FeedbackReactionTiming{during_meal,within_2_hours,later_same_day,next_day_or_later,not_sure,not_applicable}`,
`StaffAnswer{confirmed_no_allergen,confirmed_contains_allergen,confirmed_can_remove,confirmed_cannot_remove,kitchen_checked,not_sure,language_barrier,no_answer,other}`,
`FeedbackFlagStatus{active,resolved,dismissed,expired}`,
`FeedbackFlagEffect{flag_for_review,downgrade_confidence,suppress_suitable,cap_restaurant_readiness,hide_recommendation}`,
`FeedbackEntityType{restaurant,menu_item,dish}`,
`FeedbackAdminActionType{start_review,resolve_no_change,dismiss_report,mark_spam,confirm_feedback_flag,clear_feedback_flag,request_reverification,apply_confidence_downgrade,suppress_suitable_until_review,hide_menu_item_temporarily,add_note}`.

Models: `FeedbackReport`, `FeedbackFlag`, `FeedbackAdminAction` (spec §7.2-7.4 shapes, but FK to **`MenuItem`** not `RestaurantMenuItem`; ids `@default(cuid())`; add `@map`).
Back-relations: `Restaurant.feedbackReports`, `MenuItem.feedbackReports`, `Dish.feedbackReports` (all `FeedbackReport[]`).
Migration: `prisma migrate dev --name phase03_feedback_loop`.

## Domain (`packages/domain/src/feedback/`)

Files: `schemas.ts`, `signals.ts`, `apply-feedback-signals.ts`, `index.ts`. Re-export via package `index.ts` (`export * from './feedback'` + named fn exports).

Types: `FeedbackReaction`, `FeedbackReactionTiming`, `StaffAnswer`, `FeedbackPriority`, `FeedbackFlagEffect`, `FeedbackFlagStatus`, `FeedbackEntityType` (unions); `FeedbackSignal`, `FeedbackSummary`, `FeedbackFlagSpec` (auto-flag output). Schemas: `FeedbackReportInputSchema`, `FeedbackReportResponseSchema`, `FeedbackAdminActionInputSchema`, `FeedbackFlagSchema`, `FeedbackSignalSchema`, `FeedbackSummarySchema`, `FeedbackReactionSchema`, `FeedbackReactionTimingSchema`, `StaffAnswerSchema`.

Pure functions (operate on REAL types):
- `getFeedbackPriority({reaction, ateHere?}): FeedbackPriority`
- `shouldAutoCreateFeedbackFlag({reaction,...}): boolean` (true only `severe`/`anaphylaxis_or_emergency`)
- `buildAutoFlagSpecs(input): FeedbackFlagSpec[]` (§17.3: restaurant `cap_restaurant_readiness`/readinessCap=`D`/urgent; menu `suppress_suitable`/urgent; dish `flag_for_review`/high; scoped to allergenIds)
- `feedbackSignalWeight({createdAt, now?, priority, status?}): number` (decay 1.0/0.7/0.4/0.15; severe/anaphylaxis active flags do not decay)
- `applyFeedbackSignalsToMenuItem({recommendation: MenuItemRecommendation, signals, profileAllergenIds, severityByAllergen?, now?}): MenuItemRecommendation`
- `applyFeedbackSignalsToRestaurantReadiness({recommendation: RestaurantRecommendation, signals, profileAllergenIds, severityByAllergen?, now?}): RestaurantRecommendation`
- `summarizeFeedbackSignals({signals, profileAllergenIds, now?}): FeedbackSummary`

Copy: add `Bilingual` consts to `restaurant-constants.ts` (e.g. `FEEDBACK_UNDER_REVIEW_REASON`, `FEEDBACK_UNDER_REVIEW_SUMMARY`) + export from index. Internal source marker string (menu-item `source`) = `feedback_under_review`. `publicReasonKey` values: `feedback_under_review`, `feedback_under_review_severe`, `feedback_under_review_severe_item`.

`FeedbackSummary` = `{ hasActiveFlags:boolean; highestPriority?:FeedbackPriority; pendingReviewCount:number; recentReportCount:number; lastReportAt?:string|null; publicMessageKey?:'feedback_under_review'|'feedback_under_review_severe'|'feedback_under_review_severe_item' }`.

## Server (`apps/web/src/server/feedback/`)

- `create-feedback-report.ts`: `planFeedbackReport(input, resolved)` (pure: derives priority + severeAutoFlagged + flag specs via domain) + `persistFeedbackReport(plan)` (Prisma `$transaction`: create report + flags + system `add_note`/auto actions). Idempotency: `findUnique({where:{clientReportId}})` → return existing (+flags); else create; catch `P2002` race → re-read.
- `create-auto-flags.ts`: maps `FeedbackFlagSpec[]` → prisma flag creates + system `FeedbackAdminAction` rows (within the report tx).
- `get-feedback-signals.ts`: `flagRowToSignal(row): FeedbackSignal` (pure mapper). The **query** `loadActiveFeedbackFlags({restaurantIds,menuItemIds,dishIds})` lives in `lib/restaurant-query.ts` (next to `loadDishRecMap`).
- `admin-actions.ts`: `applyAdminAction({reportId, actionType, note, target?, expiresAt?, actor})` — transactional side-effects per spec §10.4 table, before/after JSON snapshots, always writes a `FeedbackAdminAction`.

## API routes (all `runtime='nodejs'`, `dynamic='force-dynamic'`, envelope `apiOk`/`apiError`, `parseBody`/`parseQuery`)

Public:
- `POST app/api/v1/feedback/route.ts` — submit (idempotent). 400 invalid, 404 restaurant/menuItem, 409 duplicate → **return existing as 200/success**, 429 if limited.
- `GET app/api/v1/feedback/options/route.ts?restaurantId=` — public metadata (restaurant + menuItems + allergens).
Admin (all `requireAdmin`):
- `GET app/api/v1/admin/feedback/route.ts` — list (filters+cursor, default sort priority desc, createdAt desc).
- `GET|PATCH app/api/v1/admin/feedback/[reportId]/route.ts` — detail / simple state change.
- `POST app/api/v1/admin/feedback/[reportId]/actions/route.ts` — apply admin action.
Recommendation (updated): `recommendations/restaurants/route.ts`, `recommendations/restaurants/[restaurantIdOrSlug]/route.ts` — fetch flags → signals → apply in `recommendRestaurant` → add `feedbackSummary`.

`recommendRestaurant` (`lib/restaurant-recommend.ts:58-63`) signature gains `signals: FeedbackSignal[]` (+ derived `profileAllergenIds`, `severityByAllergen`).

## Client / UI

Public routes: `app/[locale]/(app)/feedback/new/page.tsx`, `app/[locale]/(app)/feedback/thanks/page.tsx`.
Feature: `features/feedback/` — `feedback-form.tsx` (client multi-step, mirrors onboarding wizard, transient draft), `feedback-client.ts` (fetch+Zod), `offline-feedback-queue.ts` (submit-or-queue orchestration), `use-feedback-sync.ts` (flush-on-reconnect via `useOnlineStatus`), step section components, `feedback-entry-button.tsx`.
Components (`components/feedback/`): `feedback-under-review-badge.tsx`, `feedback-summary-banner.tsx`, `feedback-success-panel.tsx`, `feedback-offline-queue-banner.tsx`, plus feedback source label (extend `restaurant-badges.tsx` allowlist or new chip). Reuse `sb-*` tokens, `Link` from `@/i18n/navigation`, `role="alert"` for severe notice, `role="radiogroup"` for reaction/rating.
CTA hosts: `components/restaurants/menu-item-recommendation-card.tsx` (after existing CTA `<Link>`), `features/restaurants/restaurant-detail.tsx` (readiness section).

Admin UI: `app/admin/feedback/page.tsx`, `app/admin/feedback/[reportId]/page.tsx` (client components); `features/admin/feedback/` — `admin-feedback-queue-table.tsx`, `admin-feedback-detail-panel.tsx`, `admin-feedback-action-panel.tsx`, `admin-feedback-audit-trail.tsx`, `admin-feedback-priority-badge.tsx`, `admin-feedback-status-badge.tsx`, hooks via `adminFetch`/bespoke. Nav: add `{href:'/admin/feedback', key:'feedback'}` to `app/admin/layout.tsx` NAV + `adminMessages.nav.feedback` + badge counts. Admin copy English-only in `admin-messages.ts`.

Dexie: `lib/dexie.ts` `version(3)` + `pendingFeedbackReports: 'clientReportId, status, createdAt'` + `PendingFeedbackReport` row type; `lib/local-repo.ts` `pendingFeedbackRepo` + add table to `clearAllLocalData`.

i18n: new `feedback` namespace in `messages/en.json` + `vi.json` (exact key parity). `clientReportId` via `crypto.randomUUID()`.

## Tests / seed / docs

- Domain unit: `packages/domain/tests/feedback-signals.test.ts`, `feedback-apply.test.ts` (pure).
- App unit: `apps/web/src/tests/unit/feedback-schema.test.ts` (Zod, mirrors `api-validation.test.ts`), `feedback-plan.test.ts` (planFeedbackReport/flagRowToSignal pure), `feedback-repo.test.ts` (`fake-indexeddb/auto`, mirrors `local-repo.test.ts`).
- E2E: `apps/web/src/tests/e2e/feedback-happy-path.spec.ts` (+ severe flow, + optional offline). Needs a NEW e2e admin-login helper (POST `/api/v1/admin/login` with CI `ADMIN_TOKEN=change-me-in-dev`).
- Seed: `apps/web/scripts/import-feedback-demo.ts` + `seed:feedback-demo` (both package.jsons) + root `pnpm seed:feedback-demo`; guard `NODE_ENV==='production' && ALLOW_DEMO_SEED!=='true'`. Add step to CI `e2e` job after `seed:restaurant-demo-menu`.
- README: Phase 03 status + scripts table + `Feedback` manual-QA checklist (spec §21).
- Gate unchanged: `quality` (typecheck/lint/test/copy:check, no DB) + `e2e` (Postgres+seeds) both green.

## Cross-phase reconciliations (AUTHORITATIVE — supersede any conflicting phase text)

Resolved after the phase files were drafted; these are the binding decisions:

1. **`severeAutoFlagged` is a STORED column** on `FeedbackReport` (`@default(false)`, phase-02). The submit service sets it at create time; the idempotent re-read path returns the **stored** value — do NOT re-derive it from flag presence.
2. **System audit rows** (auto-flags created on severe submit) use `actionType = confirm_feedback_flag` with `actor = 'system'` and `flagId` set. No new enum literal is added. Human actions use `actor = 'admin'`.
3. **`recommendRestaurant` gains ONE object arg**: `feedback: { signals: FeedbackSignal[]; profileAllergenIds: string[]; severityByAllergen: Record<string,string> }` (not three positional params). Default `{ signals: [], profileAllergenIds: [], severityByAllergen: {} }` so existing callers/tests stay valid.
4. **`feedbackSummary` is built by the ROUTE calling `summarizeFeedbackSignals(...)`** — the apply-fns (`applyFeedbackSignalsToMenuItem`/`...RestaurantReadiness`) only mutate status/confidence/reasons and do NOT populate a `feedbackSummary` field. Top-level summary = summarize over restaurant-scoped signals; per-menu-item summary = summarize scoped to that item's ids. Keeps computation single-owner and avoids double work.
5. **Invariant #5 (never expose raw notes) is PUBLIC-SURFACE-ONLY.** Admin detail (behind `requireAdmin`) MAY show `notes`, `staffAnswerText`, `profileSnapshot`, `adminNote` (spec §6.6, internal-only). The guard: these fields live in `features/admin/feedback/` serializers and must never be returned by any public (`/api/v1/feedback*` or recommendation) route.
6. **Admin list response `meta` shape** (drives §16.1 summary cards + nav badge counts): `meta.urgentPendingCount`, `meta.needsReviewCount`, `meta.inReviewCount`, `meta.resolvedThisWeekCount`, `meta.activeFlagCount`. Phase-05 owns/produces these; phase-08 consumes exactly these names.
7. **`buildAutoFlagSpecs` fan-out**: one flag per `allergenId` per entity level; when `allergenIds` is empty, emit a single spec with `allergenId: null` (matches all profiles). Confirmed.
8. **Offline row lifecycle**: delete-on-success (no retained `'synced'` rows). The `PendingFeedbackReport` type keeps the `'pending'|'syncing'|'synced'|'failed'` union for clarity, but a synced row is deleted, not persisted; `flushPendingFeedback` also resets stale `'syncing'` rows.
9. **`createdAt`/`updatedAt` stay camelCase (unmapped) columns**; all *business* columns are `@map`ped to snake_case (matches `MenuItemAllergenStatus`). "@map every column" = business columns.
10. **Accepted additive support files** (not renames): `lib/feedback-cursor.ts`, `lib/admin-feedback-schemas.ts`, `lib/rate-limit.ts`, `features/feedback/build-feedback-snapshot.ts`, `features/feedback/use-feedback-options.ts`, `features/admin/feedback/admin-feedback-badges.tsx` (two badges in one file), `features/admin/feedback/admin-feedback-hooks.ts`, `features/admin/feedback/admin-feedback-summary-cards.tsx`, `apps/web/src/tests/e2e/helpers/admin-login.ts`.
11. **Validation-vs-network discrimination for offline queue**: `feedback-client.ts` (phase-06) throws a typed error carrying the HTTP status; a `400`/`422` (validation) is shown immediately and NEVER queued; network failure / offline → queue. Phase-06 and phase-07 share this contract.
