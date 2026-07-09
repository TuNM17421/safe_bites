'use client';
import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Inline alert shown in the wizard when a severe/anaphylaxis reaction is selected.
export function FeedbackSevereNotice() {
  const t = useTranslations('feedback');
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-sb-md border border-sb-status-avoid-border bg-sb-status-avoid-bg p-3 text-sb-status-avoid-fg"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <b>{t('severeNotice.title')}</b>
        <p className="text-sb-body-s">{t('severeNotice.body')}</p>
      </div>
    </div>
  );
}
