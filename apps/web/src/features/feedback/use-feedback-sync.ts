'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { pendingFeedbackRepo } from '@/lib/local-repo';
import { flushPendingFeedback } from './offline-feedback-queue';

// Foreground sync (spec §12.3, no background sync): drains the outbox on app startup, on the
// offline→online edge (via the existing useOnlineStatus — no second window listener), and on a
// manual "Sync now". Re-entrancy is guarded; the server clientReportId dedup is the backstop.
export function useFeedbackSync() {
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);
  const prevOnline = useRef(online);

  const refreshCount = useCallback(async () => {
    setPendingCount(await pendingFeedbackRepo.count());
  }, []);

  const flush = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      await flushPendingFeedback();
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshCount();
    }
  }, [refreshCount]);

  // Startup: show the current count and attempt a drain (no-ops fast when offline; rows stay).
  useEffect(() => {
    void refreshCount();
    void flush();
  }, [flush, refreshCount]);

  // Drain only on the offline→online transition.
  useEffect(() => {
    if (!prevOnline.current && online) void flush();
    prevOnline.current = online;
  }, [online, flush]);

  const syncNow = useCallback(() => void flush(), [flush]);

  return { pendingCount, isSyncing, syncNow };
}
