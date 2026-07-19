# Phase 08 — Admin Feedback UI (queue / detail / actions / audit + nav)

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md` §6 (admin UX: routes, nav, queue columns/filters/sort, detail sections, actions, notes), §16 (summary cards, row/detail actions, audit trail), §13 (component list).
- Reality map: `research/codebase-reality-map.md` §4 (admin subsystem — client-only, `adminFetch`/`useAdminResource`, English-only `admin-messages.ts`, no StatusBadge, no audit UI), §8 (tokens/badges).
- Contract: `research/interface-contract.md` → "Admin UI" + "Cross-cutting safety invariants".
- Depends on: [[phase-05-admin-feedback-api]] (list/detail/patch/actions endpoints + response shapes). No other phase dependency.

## Overview

**Priority:** High (admin cannot triage without it) · **Current status:** Not started

Build the admin-side feedback triage surface: a `/admin/feedback` queue page (summary cards, filter bar, priority/status-badged table with row actions) and a `/admin/feedback/[reportId]` detail page (context sections, action panel, audit trail). All client components using `adminFetch`/bespoke TanStack Query hooks against the Phase 05 endpoints, wired into the existing English-only admin island. Adds a `Feedback` nav item with urgent/pending badge counts sourced from list-API meta.

## Key Insights (grounded facts + deltas)

- **Admin is a separate, non-locale-prefixed tree** (`app/admin/*`). It deliberately uses `next/link` + `next/navigation` (NOT `@/i18n/navigation`) and a fixed-locale `NextIntlClientProvider locale="en"` fed by `adminMessages` in `app/admin/admin-messages.ts`. All feedback admin strings go there (English only) — **NOT** in `messages/{en,vi}.json`.
- **Admin pages are client components.** There is no server-component+Prisma admin page pattern. Data comes via `adminFetch<T>(url, init)` / `useAdminResource<T>(basePath, query)` (`features/admin/use-admin-resource.ts`) — the httpOnly `sbt_admin` cookie rides along on same-origin fetch. Asymmetric APIs (list vs actions vs patch) don't fit the generic `useAdminResource`, so use **bespoke hooks** mirroring `menu-admin-hooks.ts`.
- **`AdminDataTable<T extends {id:string}>`** (`components/admin/admin-data-table.tsx`) is presentational and i18n-agnostic: caller passes already-translated `header` strings and a `render` per `AdminColumn`. Reuse it for the queue; render badges/context via `column.render`. Feedback report rows have `id` so the `T extends {id:string}` constraint holds.
- **No StatusBadge exists in admin** (Phase 02 rendered status as plain text). Build small `AdminFeedbackPriorityBadge` + `AdminFeedbackStatusBadge` — icon + label + `sb-*` triad, **never colour-only** (spec §16.2 "visually prominent but not color-only"; a11y §13). Mirror the public `StatusBadge` idea but self-contained in `features/admin/feedback/`.
- **Badge counts come from list-API meta**, not a separate call. [[phase-05-admin-feedback-api]] returns `meta.urgentPendingCount` + `meta.needsReviewCount` (+ summary-card counts) alongside `items`/`nextCursor`. Do NOT recompute client-side from a page slice.
- **`ctx.params` is a Promise (Next 16, unchanged from 15)** — but that's server-side; here the client detail page reads the id via `useParams<{reportId:string}>()` exactly like `app/admin/restaurants/[restaurantId]/page.tsx`.
- **Filter-select + edit-panel pattern** is fully worked out in `features/admin/restaurant-admin-list.tsx` (`FilterSelect`, `useMemo` query object, `panelRef` focus, `role="alert"` error line, `window.confirm` for destructive). Copy that structure.
- Enum option lists (status/priority/reaction) live as client-safe `as const` arrays in `admin-messages.ts` (like `REVIEW_STATUSES`) so forms never import `@prisma/client`.

### Safety invariants relevant to this phase

1. **Admin CAN see internal notes** (`notes`, `staffAnswerText`, admin action `note`) — this is the internal console. But these are still never rendered to any public surface; keep them confined to `app/admin/*`.
2. **No silent mutation** (spec §16.4): every state change is an admin action that writes a `FeedbackAdminAction`; the audit trail must show `createdAt / actionType / actor / note / flag+status changes`. The UI must surface each action, never mutate report/flag state without an audit row appearing.
3. Only public status labels (Suitable / Ask First / Risky / Avoid / Unknown) may appear in public copy — irrelevant here (admin English strings), but do not introduce forbidden phrases (`reported safe`, `user verified`, `community verified`, `verified_safe`, `guaranteed safe`, …) anywhere in `admin-messages.ts`; `copy:check` scans admin copy too.
4. This phase is read+action UI over existing APIs — it must not itself compute trust/priority; all derivation happened server-side in Phase 05 / domain.

## Requirements

### Functional

- `/admin/feedback` queue page: 5 summary cards (Urgent / Needs review / In review / Resolved this week / Active flags), filter bar (status, priority, reaction, restaurantId, allergenId, hasActiveFlag), badged table with columns Priority · Status · Reaction · Restaurant · Menu item · Allergen · Asked staff · Report date · Last action, row actions (Open, Start review, Resolve no change, Dismiss). Default sort urgent→high→newest is server-provided.
- `/admin/feedback/[reportId]` detail page: report summary, restaurant context, menu item context, profile/allergen snapshot, staff answer, reaction outcome, recommendation snapshot (at report time) + current recommendation, related recent reports, active flags, action panel + audit trail.
- Action panel invokes each spec §16.3 action via `POST …/actions`; simple state changes (status + adminSummary) via `PATCH`.
- Nav item `{href:'/admin/feedback', key:'feedback'}` with an urgent/pending badge count.

### Non-functional

- Client components only; TanStack Query via `adminFetch`. Files < ~200 lines, kebab-case. No hardcoded strings outside `adminMessages` (English). `sb-*` tokens only, no raw colour. `lucide-react` icons (as `admin-data-table.tsx` already does). `min-h-sb-tap`/`min-h-9`/`min-h-10` tap targets, `focus-visible:shadow-sb-focus`. Errors surfaced via `role="alert"`.

## Architecture

Data flow (all client, cookie-authed same-origin fetch):

```
/admin/feedback (page.tsx, 'use client')
  └─ AdminFeedbackQueue (feature)
       ├─ useAdminFeedbackList(query)  ── GET /api/v1/admin/feedback?…  → { items, nextCursor, meta }
       │      meta → summary cards + nav badge count
       ├─ FilterSelect × N (reuse pattern)
       └─ AdminDataTable<FeedbackReportRow>
              columns.render → AdminFeedbackPriorityBadge / AdminFeedbackStatusBadge / row actions
              row action → useAdminFeedbackActions().patch/act → invalidate list

/admin/feedback/[reportId] (page.tsx, 'use client')
  └─ AdminFeedbackDetail (feature)
       ├─ useAdminFeedbackReport(reportId) ── GET /api/v1/admin/feedback/[reportId]
       ├─ AdminFeedbackDetailPanel   (context sections, read-only)
       ├─ AdminFeedbackActionPanel   (buttons → PATCH or POST /actions, invalidate)
       └─ AdminFeedbackAuditTrail    (report.actions[] rendered chronologically)
```

Nav badge: the layout can't call the list hook (it's outside a page). Simplest KISS approach: add a tiny `useAdminFeedbackBadge()` hook (its own lightweight `GET /api/v1/admin/feedback?limit=1` read of `meta`, or a dedicated `meta`-only query) invoked from a small client `FeedbackNavBadge` rendered inside the existing NAV map for the `feedback` key. Keep it one small hook; do not duplicate the full list query.

## Related Code Files

### Modify

- `apps/web/src/app/admin/layout.tsx` — add `{href:'/admin/feedback', key:'feedback'}` to `NAV` (`:17-23`); render the `FeedbackNavBadge` next to the label when `item.key === 'feedback'`.
- `apps/web/src/app/admin/admin-messages.ts` — add `nav.feedback` + a `feedback: {…}` message group (English) + client-safe enum option arrays (`FEEDBACK_STATUSES`, `FEEDBACK_PRIORITIES`, `FEEDBACK_REACTIONS`, `FEEDBACK_ACTION_TYPES`).

### Create

- `apps/web/src/app/admin/feedback/page.tsx` — `'use client'` thin page rendering `<AdminFeedbackQueue/>`.
- `apps/web/src/app/admin/feedback/[reportId]/page.tsx` — `'use client'` page; `useParams<{reportId}>()`; renders `<AdminFeedbackDetail reportId=…/>`.
- `apps/web/src/features/admin/feedback/admin-feedback-hooks.ts` — bespoke TanStack hooks: `useAdminFeedbackList(query)`, `useAdminFeedbackReport(reportId)`, `useAdminFeedbackActions(reportId)` (`patch` + `act`), `useAdminFeedbackBadge()`. Plus `FeedbackReportRow` / `FeedbackReportDetail` TS row types (mirror Phase 05 response JSON).
- `apps/web/src/features/admin/feedback/admin-feedback-queue-table.tsx` — `AdminFeedbackQueue`: filter bar + summary cards + `AdminDataTable`.
- `apps/web/src/features/admin/feedback/admin-feedback-summary-cards.tsx` — 5 count cards from `meta` (split out to keep queue file < 200 lines).
- `apps/web/src/features/admin/feedback/admin-feedback-detail-panel.tsx` — `AdminFeedbackDetail` + read-only context sections.
- `apps/web/src/features/admin/feedback/admin-feedback-action-panel.tsx` — action buttons + note textarea (max 1000) + target selection for flag actions.
- `apps/web/src/features/admin/feedback/admin-feedback-audit-trail.tsx` — chronological `report.actions[]` list.
- `apps/web/src/features/admin/feedback/admin-feedback-badges.tsx` — `AdminFeedbackPriorityBadge` + `AdminFeedbackStatusBadge` (+ `FeedbackNavBadge`).

### Delete

- None.

## Implementation Steps

1. **admin-messages.ts:** add `nav.feedback: 'Feedback'`. Add a `feedback` group with keys for: page/detail titles; the 9 column headers; filter labels + `any`; the 5 summary-card labels; each action-button label (map 1:1 to `FeedbackAdminActionType`: `startReview`, `resolveNoChange`, `dismiss`, `markSpam`, `confirmFlag`, `clearFlag`, `requestReverification`, `applyConfidenceDowngrade`, `suppressSuitable`, `hideMenuItem`, `addNote`); status/priority/reaction display labels keyed by the exact snake_case enum value (e.g. `status.needs_review`, `priority.urgent`, `reaction.anaphylaxis_or_emergency`); detail section headings (§6.4 list); audit-trail labels (`actor`, `note`, `changes`, empty state); note textarea label + `open`/`back`/`save`/`applying`. Add `as const` enum arrays `FEEDBACK_STATUSES`/`FEEDBACK_PRIORITIES`/`FEEDBACK_REACTIONS`/`FEEDBACK_ACTION_TYPES`. Avoid every denylisted substring.
2. **admin-feedback-hooks.ts:** define `FeedbackReportRow` (id, clientReportId, createdAt, status, priority, reaction, restaurant{id,name}, menuItem{id,name}|null, allergenIds, askedStaff, hasActiveFlags, lastActionType|null) and `FeedbackReportDetail` (report + restaurant + menuItem + dish + allergens + recommendationSnapshot + currentRecommendation + activeFlags[] + relatedReports[] + actions[]) matching [[phase-05-admin-feedback-api]] output. Implement `useAdminFeedbackList(query)` (`useQuery`, key `['admin-feedback', qs]`, returns `{items,nextCursor,meta}`), `useAdminFeedbackReport(reportId)` (key `['admin-feedback', reportId]`), `useAdminFeedbackActions(reportId)` with `patch` (`PATCH …/[reportId]`) + `act` (`POST …/[reportId]/actions`) mutations that `invalidateQueries` both the report key and `['admin-feedback']` list on success, and `useAdminFeedbackBadge()` (`GET …/feedback?limit=1`, select `meta`).
3. **admin-feedback-badges.tsx:** build `AdminFeedbackPriorityBadge`/`AdminFeedbackStatusBadge` — pill with a lucide icon + `t('admin.feedback.priority.<value>')` label + `sb-*` triad chosen per value (urgent/severe → `sb-status-avoid-*`, high → `sb-status-ask-first-*`, resolved/dismissed → muted `sb-surface-2`). Icon is `aria-hidden`; the text label carries meaning (never colour-only). Also `FeedbackNavBadge` (small count pill via `useAdminFeedbackBadge`, hidden when 0, `aria-label` includes the count meaning).
4. **admin-feedback-summary-cards.tsx:** render 5 cards (Urgent / Needs review / In review / Resolved this week / Active flags) from `meta`, each a `sb-surface` card with label + `tabular-nums` count.
5. **admin-feedback-queue-table.tsx:** clone `restaurant-admin-list.tsx` structure — `FilterSelect` for status/priority/reaction (+ text inputs for restaurantId/allergenId, a hasActiveFlag select), `useMemo` query object, `useAdminFeedbackList(query)`. Build `AdminColumn<FeedbackReportRow>[]` with `render` for the badge columns and a trailing actions column (Open link → `/admin/feedback/${r.id}`, Start review, Resolve, Dismiss buttons calling `act`/`patch`, `window.confirm` on dismiss). Render `<AdminFeedbackSummaryCards meta=…/>` above the table. Loading/error via the same `list.isPending`/`isError` pattern. Severe/urgent rows: prominence via the badge + an inline `role="img"`/`aria-label`ed alert icon, not row colour alone.
6. **admin-feedback-detail-panel.tsx:** `AdminFeedbackDetail({reportId})` calls `useAdminFeedbackReport`; render `← Back` (`next/link` to `/admin/feedback`), then the §6.4 sections as read-only definition lists (report summary incl. `source: online|offline_synced`, restaurant context, menu-item context, profile/allergen snapshot, staff answer incl. `staffAnswerText`, reaction outcome, recommendation-snapshot-at-report vs current, related recent reports, active flags). Then `<AdminFeedbackActionPanel/>` and `<AdminFeedbackAuditTrail/>`. Guard `query.isPending`/`!data` with the existing not-found copy pattern.
7. **admin-feedback-action-panel.tsx:** action buttons grouped (simple state via `patch`: start review / resolve / dismiss / mark spam / add adminSummary; flag actions via `act`: confirm/clear flag, request reverification, apply confidence downgrade, suppress suitable, hide menu item, add note). Shared note `<textarea maxLength={1000}>` (label from messages). Flag actions needing a target render entity-type/allergen selects (options from the report's menu item/allergens). On success the list+report invalidation refreshes the audit trail — no optimistic silent mutation. Errors → `role="alert"`.
8. **admin-feedback-audit-trail.tsx:** render `report.actions[]` newest-first: `createdAt`, `t('admin.feedback.action.<actionType>')`, `actor`, `note`, and a diff line from `before`/`after` (e.g. `status: needs_review → in_review`, `flag <effect>: active → resolved`). Empty state message when no actions.
9. **Pages:** `app/admin/feedback/page.tsx` renders `<AdminFeedbackQueue/>`; `app/admin/feedback/[reportId]/page.tsx` reads `useParams` and renders `<AdminFeedbackDetail reportId=…/>`. Both `'use client'`.
10. **layout.tsx:** add the NAV entry; in the `NAV.map`, when `item.key === 'feedback'` render `{adminMessages.nav.feedback}` followed by `<FeedbackNavBadge/>`.
11. **Verify:** `pnpm --filter web typecheck && pnpm lint && pnpm copy:check`. Manually load `/admin/feedback` and a detail route against a seeded DB (Phase 05 + `seed:feedback-demo` from [[phase-09-seed-tests-docs]]).

## Todo List

- [ ] Add `nav.feedback` + `feedback` message group + enum arrays to `admin-messages.ts`
- [ ] `admin-feedback-hooks.ts` — row/detail types + list/report/actions/badge hooks
- [ ] `admin-feedback-badges.tsx` — priority/status badges + nav badge (icon+label, not colour-only)
- [ ] `admin-feedback-summary-cards.tsx` — 5 meta-driven cards
- [ ] `admin-feedback-queue-table.tsx` — filters + summary + `AdminDataTable` + row actions
- [ ] `admin-feedback-detail-panel.tsx` — §6.4 read-only context sections
- [ ] `admin-feedback-action-panel.tsx` — actions (patch/act) + note textarea + target selects
- [ ] `admin-feedback-audit-trail.tsx` — chronological actions with before/after diff
- [ ] `app/admin/feedback/page.tsx` + `app/admin/feedback/[reportId]/page.tsx`
- [ ] Wire NAV entry + badge in `layout.tsx`
- [ ] typecheck / lint / copy:check green; manual load against seeded DB

## Success Criteria

- `/admin/feedback` lists reports with correct badges, filters, summary cards, and default urgent→high→newest order (server-provided); nav shows a `Feedback` item with a live urgent/pending count.
- Row + detail actions call the Phase 05 endpoints; after any action the audit trail visibly gains a row (no silent mutation) and list counts refresh.
- Detail page shows all §6.4 sections including internal notes and staff answer text (admin-only).
- No hardcoded UI strings outside `adminMessages`; `pnpm copy:check`, `typecheck`, `lint` all pass; every new file `'use client'`, `sb-*`-only, < ~200 lines.

## Risk Assessment

- **Phase 05 response shape drift** → row/detail TS types diverge from JSON. *Mitigation:* derive types directly from the [[phase-05-admin-feedback-api]] documented shapes; keep them in `admin-feedback-hooks.ts` as the single source; if a field is missing, fix the contract there first, not by inventing a client-only name.
- **Nav badge over-fetching** → duplicate full list query. *Mitigation:* one lightweight `limit=1` meta query with a modest `staleTime`; do not reuse the paginated list hook.
- **Colour-only severity** (a11y fail) → *Mitigation:* every badge is icon + text label; severe rows also carry an `aria-label`ed alert icon.
- **File bloat** (queue file > 200 lines) → *Mitigation:* summary cards + badges already split into own files; move column defs into a small helper if needed.
- **`AdminDataTable` constraint** requires `{id:string}` → feedback rows have `id`; ensure the list maps API items to include `id` (report id), not `clientReportId`, as the React key.

## Security & Privacy Considerations

- All routes/data behind the existing `sbt_admin` cookie; the `proxy.ts` boundary already 401s `/admin` APIs, and every fetch is same-origin so the cookie authenticates automatically — no token handling in client code.
- Internal fields (`notes`, `staffAnswerText`, admin action `note`, `before`/`after` snapshots) are rendered **only** inside `app/admin/*`; never re-exported to public components or copy.
- No allergy/profile data in any URL — detail routing keys on `reportId` only; filters use ids/enums, never profile payloads.
- Admin copy passes `copy:check`: avoid all denylisted/forbidden phrases (`reported safe`, `user verified`, `community verified`, `verified_safe`, `guaranteed safe`, `100% safe`, `allergy-proof`, `this dish is safe`).
- Actor is `admin`/`system` per Phase 03 auth (no richer identity); display verbatim, do not fabricate a user name.

## Next Steps

- Unblocks [[phase-09-seed-tests-docs]] admin e2e (queue shows seeded urgent report; admin resolves/clears flag) and the README manual-QA rows for admin review.
- With this + [[phase-06-public-feedback-ux]] landed, the end-to-end loop (submit → escalate → admin resolve → recommendation reflects) is demonstrable.
