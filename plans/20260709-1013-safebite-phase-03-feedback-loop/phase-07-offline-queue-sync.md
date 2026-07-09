# Phase 07 — Offline Feedback Queue + Foreground Sync

## Context Links
- Spec: `docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md` §12 (12.1 Dexie schema, 12.2 offline submit, 12.3 foreground sync, 12.4 sync API, 12.5 offline privacy); §11.10 offline states.
- Reality map: `plans/20260709-1013-safebite-phase-03-feedback-loop/research/codebase-reality-map.md` §5 (Dexie/repo/SW/profile), §6 (copy guard).
- Contract: `plans/20260709-1013-safebite-phase-03-feedback-loop/research/interface-contract.md` (Client/UI + Dexie rows).
- Depends on: [[phase-03-public-feedback-api]] (idempotency: `POST /api/v1/feedback` returns existing on duplicate `clientReportId`), [[phase-06-public-feedback-ux]] (submit seam in `feedback-client.ts` / `feedback-form.tsx`).

## Overview
- **Priority:** High (blocks the offline acceptance criterion §22 and the "Sync now" UX).
- **Current status:** Not started.
- Add a Dexie v3 `pendingFeedbackReports` table + `pendingFeedbackRepo`, a pure-ish submit-or-queue orchestrator (`offline-feedback-queue.ts`) that decides POST-vs-queue by the behavior matrix, and a foreground flush hook (`use-feedback-sync.ts`) that drains the queue on app startup, on the `window` online event (via the existing `useOnlineStatus()`), and on a manual "Sync now" trigger. Idempotency is guaranteed server-side by `clientReportId @unique`, so re-flushing a report that already synced is safe.

## Key Insights
- **Dexie is at v2** (`lib/dexie.ts:72-75`). Add `this.version(3).stores({ pendingFeedbackReports: 'clientReportId, status, createdAt' })` — additive, no `.upgrade()` callback needed (§5 reality map). `clientReportId` is the primary key; `status` + `createdAt` are secondary indexes for querying/ordering.
- **`clearAllLocalData()` (`local-repo.ts:157-173`) must gain the new table** in BOTH the `db.transaction` store list AND the `Promise.all` clear list — otherwise "delete my data" leaves queued reports behind (privacy regression).
- **Reuse `useOnlineStatus()`** (`components/app-shell/use-online-status.ts`) — it already wires `window` `online`/`offline`. Do NOT add a second window listener. Mirror the online-gated effect pattern in `use-restaurant-recommendations.ts:65-80` (guard with `active` flag, cleanup on unmount).
- **Service worker needs no change:** all non-GET requests hit `NetworkOnly` (`service-worker.ts:22-26`), so feedback POSTs are never cached — offline POSTs fail fast and fall through to the queue.
- **`assertNoSecrets` does NOT catch geo keys** (§5 reality map). Offline privacy is enforced by the *record shape*: we store only `payload: FeedbackReportInput` (the exact validated sync DTO from [[phase-03-public-feedback-api]]), never the full profile object, geolocation (lat/lon/distance), or tokens. Still call `assertNoSecrets(row)` in `save` for the token/cookie guard.
- **Spec §12.1 row has `retryCount` + `synced` status**; but we delete on success rather than keep `synced` rows (no dupe accumulation). Keep `retryCount`/`lastError` for the failed-report banner. Statuses actually used: `pending | syncing | failed` (drop `synced` — a synced row is deleted).
- **`clientReportId` = `crypto.randomUUID()`** generated once at draft/submit time (§ contract) and reused across retries so the server dedups.
- No background sync (§12.3) — foreground only.

## Requirements
### Functional
1. Offline OR network-error submit → persist `PendingFeedbackReport{status:'pending'}` and surface the queued screen.
2. Online submit → `POST /api/v1/feedback`; success → done (no queue row); network error → queue; **validation error (400) → surface immediately, NEVER queue.**
3. Foreground flush drains all `pending`/`failed` rows on: (a) app startup, (b) `window` online transition, (c) manual "Sync now".
4. Each flushed report is re-POSTed with `submissionSource:'offline_synced'` + `offlineCreatedAt` (the original queued `createdAt`).
5. Successful flush deletes the row; server-side duplicate (409/existing) is treated as success and also deletes the row.
6. Persistent failure increments `retryCount`, stores `lastError`, sets `status:'failed'` — the row stays for the next flush + banner.

### Non-functional
- Files < 200 lines, kebab-case. YAGNI/KISS/DRY.
- No hardcoded UI strings (any user-facing text uses the `feedback` next-intl namespace); no raw colors; no `next/link`. (Banner UI itself is [[phase-06-public-feedback-ux]] — this phase exposes state + a flush fn it consumes.)
- Queue + orchestrator logic unit-testable with `fake-indexeddb/auto` (no live network, no DB server) — runs in the `quality` CI job.

## Architecture
```
submit(payload)  [offline-feedback-queue.ts]
  ├─ online?
  │   ├─ yes → POST /api/v1/feedback (feedback-client.ts)
  │   │         ├─ 200/201/409 → return {status:'submitted'}
  │   │         ├─ 400 VALIDATION → throw → UI shows errors (NOT queued)
  │   │         └─ network/5xx  → pendingFeedbackRepo.save({status:'pending'}) → {status:'queued'}
  │   └─ no  → pendingFeedbackRepo.save({status:'pending'}) → {status:'queued'}
  │
flush()  [use-feedback-sync.ts → offline-feedback-queue.ts]
  for each row in pendingFeedbackRepo.list(['pending','failed']) ordered by createdAt:
    mark 'syncing' → POST {...payload, submissionSource:'offline_synced', offlineCreatedAt:row.createdAt}
      ├─ ok / duplicate → repo.delete(clientReportId)
      └─ fail → repo.markFailed(clientReportId, error)   // retryCount++, status:'failed'

triggers → use-feedback-sync.ts:
  useEffect(startup) once · useOnlineStatus() false→true edge · syncNow()  (all call flush())
```
Data flow: `feedback-client.ts` owns the fetch+Zod (from [[phase-06-public-feedback-ux]]); `offline-feedback-queue.ts` owns the decision + persistence; `use-feedback-sync.ts` owns the React triggers and exposes `{ pendingCount, isSyncing, syncNow }`.

## Related Code Files
### Modify
- `apps/web/src/lib/dexie.ts` — add `PendingFeedbackReport` interface, `pendingFeedbackReports!: Table<...>` field, `this.version(3).stores({...})`.
- `apps/web/src/lib/local-repo.ts` — add `pendingFeedbackRepo`; add `db.pendingFeedbackReports` to `clearAllLocalData` transaction list + `Promise.all`.

### Create
- `apps/web/src/features/feedback/offline-feedback-queue.ts` — `submitOrQueueFeedback(payload, { online })` + `flushPendingFeedback()` orchestration (uses `feedbackClient` + `pendingFeedbackRepo`).
- `apps/web/src/features/feedback/use-feedback-sync.ts` — `'use client'` hook: startup + online-edge + manual flush; returns `{ pendingCount, isSyncing, syncNow }`.
- `apps/web/src/tests/unit/feedback-repo.test.ts` — `fake-indexeddb/auto` repo + orchestrator tests (mirrors `local-repo.test.ts`).

### Delete
- None.

## Implementation Steps
1. **Dexie v3** (`lib/dexie.ts`): after the `CachedRestaurantDetail` block, add:
   ```ts
   // Phase 03 §12.1 offline feedback queue. Stores ONLY the sync payload (no full profile,
   // no geolocation, no tokens). `payload` is the exact validated FeedbackReportInput.
   export type PendingFeedbackStatus = 'pending' | 'syncing' | 'failed';
   export interface PendingFeedbackReport {
     clientReportId: string;
     payload: FeedbackReportInput; // from @safebite/domain
     createdAt: string;
     updatedAt: string;
     status: PendingFeedbackStatus;
     retryCount: number;
     lastError?: string | null;
   }
   ```
   Import `FeedbackReportInput` from `@safebite/domain`. Add field `pendingFeedbackReports!: Table<PendingFeedbackReport, string>;` and, after `this.version(2)...`, add `this.version(3).stores({ pendingFeedbackReports: 'clientReportId, status, createdAt' });`.
2. **`pendingFeedbackRepo`** (`local-repo.ts`, after `restaurantCacheRepo`):
   - `save(payload, clientReportId)` → build row `{clientReportId, payload, createdAt:nowIso(), updatedAt:nowIso(), status:'pending', retryCount:0, lastError:null}`, `assertNoSecrets(row)`, `db.pendingFeedbackReports.put(row)`. Idempotent on `clientReportId` (put overwrites — safe for re-tap of same draft).
   - `list(statuses?)` → `db.pendingFeedbackReports.orderBy('createdAt').toArray()` then filter by statuses if given (avoids compound-index need; queue is tiny).
   - `count()` → `db.pendingFeedbackReports.count()`.
   - `markSyncing(id)` / `markFailed(id, error)` → `db.pendingFeedbackReports.update(id, {...})` (`markFailed` increments `retryCount`, sets `status:'failed'`, `lastError`, `updatedAt`).
   - `delete(id)` → `db.pendingFeedbackReports.delete(id)`.
3. **`clearAllLocalData`**: add `db.pendingFeedbackReports` to the transaction store array (`:160`) and `db.pendingFeedbackReports.clear()` to `Promise.all` (`:162-170`).
4. **`offline-feedback-queue.ts`**:
   - `submitOrQueueFeedback(payload, { online })`: if `!online` → `repo.save` → return `{ outcome:'queued', clientReportId }`. If online → `await feedbackClient.submit(payload)`; on success/duplicate return `{ outcome:'submitted' }`; **let a validation error propagate (do NOT catch/queue it)**; catch network/5xx errors only → `repo.save` → return `{ outcome:'queued' }`. Distinguish via the error type from `feedback-client.ts` (e.g. a `FeedbackValidationError` vs generic — coordinate with [[phase-06-public-feedback-ux]]; if only a status code is available, treat `400` as non-queueable, everything else as queueable).
   - `flushPendingFeedback()`: `const rows = await repo.list(['pending','failed'])`; for each (sequential to keep order + avoid burst), `repo.markSyncing(id)`, then `feedbackClient.submit({ ...payload, submissionSource:'offline_synced', offlineCreatedAt: row.createdAt })`; success/duplicate → `repo.delete(id)`; failure → `repo.markFailed(id, message)`. Return `{ synced, failed }` counts. Swallow per-row errors so one bad row does not abort the drain.
5. **`use-feedback-sync.ts`** (`'use client'`):
   - `const online = useOnlineStatus();`
   - `pendingCount` state hydrated from `repo.count()` on mount + after each flush.
   - `flush` callback: guard re-entrancy with an `isSyncing` ref/state; call `flushPendingFeedback()`; refresh `pendingCount`.
   - `useEffect(() => { void flush(); }, [])` — startup drain (only meaningful if online; flush no-ops fast when POSTs fail offline, rows stay).
   - `useEffect` on `online`: track previous value; flush only on the `false → true` edge (mirror `use-restaurant-recommendations.ts` online gating). Do NOT add a raw `window` listener.
   - `syncNow = useCallback(() => void flush(), [flush])` returned for the manual button (Profile / thank-you screen per §12.3).
   - Return `{ pendingCount, isSyncing, syncNow }`.
6. **Unit test** `feedback-repo.test.ts` (mirror `local-repo.test.ts` header): `import 'fake-indexeddb/auto'`, `beforeEach` → `clearAllLocalData()`. Cover: save→list roundtrip; `clearAllLocalData` empties the table; `submitOrQueueFeedback` with `online:false` queues; with a stubbed `feedbackClient.submit` rejecting with a network error queues; with a 400/validation error it rethrows and does NOT queue; `flushPendingFeedback` deletes on success, `markFailed` on failure and keeps the row; assert flush payload carries `submissionSource:'offline_synced'` + `offlineCreatedAt === row.createdAt`. Assert the stored row contains no `latitude`/`longitude`/`distanceMeters`/full-profile keys (privacy shape).
7. **Type-check + lint + unit test**: `pnpm --filter @safebite/web typecheck && pnpm --filter @safebite/web test` — must stay DB-free / green in `quality`.

## Todo List
- [ ] Add `PendingFeedbackReport` type + `version(3)` store to `lib/dexie.ts`.
- [ ] Add `pendingFeedbackRepo` (save/list/count/markSyncing/markFailed/delete) to `local-repo.ts`.
- [ ] Add `pendingFeedbackReports` to `clearAllLocalData` transaction + `Promise.all`.
- [ ] Create `offline-feedback-queue.ts` (`submitOrQueueFeedback` + `flushPendingFeedback`).
- [ ] Create `use-feedback-sync.ts` (startup + online-edge + `syncNow`, via `useOnlineStatus`).
- [ ] Create `feedback-repo.test.ts` (fake-indexeddb, behavior matrix + privacy shape).
- [ ] `typecheck` + `test` green; confirm no new `window` listener and SW untouched.

## Success Criteria
- Dexie opens at v3 with the new table; existing v1/v2 data preserved (additive upgrade).
- Behavior matrix holds: offline→queued, online-success→submitted (no row), network-error→queued, validation-error→shown-not-queued.
- Flushing sends `submissionSource:'offline_synced'` + `offlineCreatedAt`; a re-flush of an already-synced report is deduped server-side (no duplicate `FeedbackReport`).
- `clearAllLocalData()` empties `pendingFeedbackReports`.
- `feedback-repo.test.ts` passes under `fake-indexeddb/auto` in the DB-free `quality` job.
- Validate: run the unit test; manually (or in the [[phase-08-e2e-seed-docs]] optional offline e2e) go offline, submit, go online → report appears server-side exactly once.

## Risk Assessment
- **Double-submit while a flush is mid-flight** (startup + online edge fire together) → guard `flush` with an `isSyncing` re-entrancy flag; server idempotency is the backstop.
- **`markSyncing` row stuck if the tab closes mid-POST** → next flush picks up `syncing` too? We only flush `pending`/`failed`; add `syncing` to the flush filter (or reset stale `syncing`→`pending` on startup) so an interrupted sync is retried, not orphaned.
- **Queue growth from a permanently-invalid payload** → validation errors are never queued in the first place; `flushPendingFeedback` only handles reports that were valid at submit time, and `retryCount`/`lastError` surface repeated failures to the user.
- **Geo/PII leaking into `payload`** → the payload is the server DTO (no lat/lon/profile object by construction); the test asserts the stored shape.

## Security & Privacy Considerations
- Store ONLY the sync payload (`FeedbackReportInput`): no exact geolocation (lat/lon/distanceMeters), no full profile object, no auth tokens/cookies (invariant #6). `assertNoSecrets(row)` guards token-like keys in dev; geo exclusion is enforced by the DTO shape + a test assertion.
- Queued rows are wiped by `clearAllLocalData()` (data-deletion path) — verified by test.
- No allergy/profile data in any URL, analytics event, or the queue beyond what the report DTO already carries (aggregate-safe; raw notes remain server-side only per invariant #5).
- POSTs are `NetworkOnly` in the SW — no risk of a cached stale write.

## Next Steps
- Unblocks [[phase-06-public-feedback-ux]] to wire `submitOrQueueFeedback` into `feedback-form.tsx` submit and render `FeedbackOfflineQueueBanner` from `use-feedback-sync.ts` state.
- Feeds the optional offline path of the e2e in [[phase-08-e2e-seed-docs]].
