'use client';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFeedbackSync } from '@/features/feedback/use-feedback-sync';

// Shows the pending-outbox count + a manual "Sync now" (spec §12.3). Renders nothing when the
// outbox is empty. Foreground sync also runs automatically on startup + the online edge.
export function FeedbackOfflineQueueBanner() {
  const t = useTranslations('feedback');
  const { pendingCount, isSyncing, syncNow } = useFeedbackSync();
  if (pendingCount === 0) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-sb-md border border-sb-status-ask-first-border bg-sb-status-ask-first-bg p-3 text-sb-status-ask-first-fg"
    >
      <span className="text-sb-body-s">{t('offline.pending', { count: pendingCount })}</span>
      <button
        type="button"
        onClick={syncNow}
        disabled={isSyncing}
        className="inline-flex min-h-sb-tap shrink-0 items-center gap-1.5 rounded-sb-sm border border-sb-border bg-sb-surface-2 px-3 text-sb-body-s font-bold text-sb-fg focus-visible:shadow-sb-focus disabled:opacity-40"
      >
        <RefreshCw aria-hidden className={`size-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? t('offline.syncing') : t('offline.syncNow')}
      </button>
    </div>
  );
}
