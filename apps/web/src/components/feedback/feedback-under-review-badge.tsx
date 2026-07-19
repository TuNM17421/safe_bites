'use client';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Coarse public signal that reports are being triaged. Carries no counts, notes, or timestamps.
export function FeedbackUnderReviewBadge() {
  const t = useTranslations('feedback');
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sb-border bg-sb-surface-2 px-2.5 py-1 text-xs text-sb-muted">
      <Clock className="size-3.5 text-sb-faint" aria-hidden />
      {t('underReview')}
    </span>
  );
}
