// Submit-or-queue orchestration for offline feedback (spec §12.2/§12.4). Decides POST-vs-queue by
// the behavior matrix and owns the outbox drain. Idempotency (clientReportId @unique) makes a
// re-flush of an already-synced report safe. UI-free; the React triggers live in use-feedback-sync.

import type { FeedbackReportInput } from '@safebite/domain';
import { pendingFeedbackRepo } from '../../lib/local-repo';
import { FeedbackSubmitError, submitFeedback } from './feedback-client';

export type SubmitOutcome = 'submitted' | 'queued';

// A client error that will NOT succeed on retry (bad request / missing entity) must be surfaced,
// never queued. Network failures, rate limits, and 5xx are transient → queue and retry later.
function isNonQueueable(error: unknown): boolean {
  return error instanceof FeedbackSubmitError && (error.status === 400 || error.status === 404);
}

export async function submitOrQueueFeedback(
  payload: FeedbackReportInput,
  opts: { online: boolean },
): Promise<SubmitOutcome> {
  if (!opts.online) {
    await pendingFeedbackRepo.save(payload);
    return 'queued';
  }
  try {
    await submitFeedback(payload);
    return 'submitted';
  } catch (error) {
    if (isNonQueueable(error)) throw error; // validation / not-found → surface, never queue
    await pendingFeedbackRepo.save(payload); // network / rate-limit / 5xx → queue for later
    return 'queued';
  }
}

// Drain the outbox: re-POST each report with offline_synced provenance. Include 'syncing' rows so
// a sync interrupted by a tab close is retried, not orphaned. Per-row errors are swallowed so one
// bad row never aborts the whole drain.
export async function flushPendingFeedback(): Promise<{ synced: number; failed: number }> {
  const rows = await pendingFeedbackRepo.list(['pending', 'failed', 'syncing']);
  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    await pendingFeedbackRepo.markSyncing(row.clientReportId);
    try {
      await submitFeedback({ ...row.payload, submissionSource: 'offline_synced', offlineCreatedAt: row.createdAt });
      await pendingFeedbackRepo.delete(row.clientReportId);
      synced += 1;
    } catch (error) {
      await pendingFeedbackRepo.markFailed(row.clientReportId, error instanceof Error ? error.message : 'sync_failed');
      failed += 1;
    }
  }
  return { synced, failed };
}
