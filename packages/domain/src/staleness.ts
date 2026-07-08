// Freshness/confidence helpers shared by the menu-item and readiness evaluators (spec §7.7).

import { DEFAULT_STALENESS_DAYS, STALENESS_DAYS } from './restaurant-constants';
import type { ConfidenceLabel } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// Returns true when `lastCheckedAt` is older than the threshold for its source type.
// A missing date is treated as "not stale" — freshness is unknown, not old; discovery-only
// listings are constrained elsewhere by the readiness caps.
export function isStale(lastCheckedAt: Date | null, sourceType: string, now: Date): boolean {
  if (!lastCheckedAt || Number.isNaN(lastCheckedAt.getTime())) return false;
  const days = STALENESS_DAYS[sourceType] ?? DEFAULT_STALENESS_DAYS;
  return now.getTime() - lastCheckedAt.getTime() > days * DAY_MS;
}

// Parse an ISO date string safely; null/invalid -> null.
export function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Drop confidence one level (stale data / expired verification, §7.7).
export function downgradeConfidence(label: ConfidenceLabel): ConfidenceLabel {
  if (label === 'high') return 'medium';
  if (label === 'medium') return 'low';
  return 'low';
}
