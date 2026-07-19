'use client';
import type { FeedbackSummary } from '@safebite/domain';
import { useTranslations } from 'next-intl';

// Aggregated public banner. Renders only coarse counts + a YYYY-MM-DD date — never raw notes,
// staff answers, or precise timestamps.
export function FeedbackSummaryBanner({ summary }: { summary: FeedbackSummary }) {
  const t = useTranslations('feedback');
  if (!summary.hasActiveFlags) return null;

  const isSevere = summary.publicMessageKey?.includes('severe') ?? false;

  return (
    <div
      role="status"
      className="rounded-sb-md border border-sb-status-ask-first-border bg-sb-status-ask-first-bg p-3 text-sb-status-ask-first-fg"
    >
      <p className="text-sb-label font-semibold">{t('summary.title')}</p>
      <p className="text-sb-body-s">{t('summary.recentReports', { count: summary.recentReportCount })}</p>
      {summary.lastReportAt && (
        <p className="text-sb-caption text-sb-muted">
          {t('summary.lastReport', { date: summary.lastReportAt.slice(0, 10) })}
        </p>
      )}
      {isSevere && <p className="text-sb-body-s font-semibold">{t('summary.severe')}</p>}
      <p className="text-sb-body-s">{t('summary.action')}</p>
    </div>
  );
}
