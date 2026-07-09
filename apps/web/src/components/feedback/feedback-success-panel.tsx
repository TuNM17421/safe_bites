'use client';
import { CircleCheck, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { FeedbackOfflineQueueBanner } from './feedback-offline-queue-banner';

// Post-submission confirmation screen. No user-entered content is echoed back. `queued` shows the
// offline-saved copy; the banner surfaces any pending outbox + a manual sync.
export function FeedbackSuccessPanel({ queued = false }: { queued?: boolean }) {
  const t = useTranslations('feedback');
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 p-4 text-center">
      {queued ? (
        <WifiOff className="size-10 text-sb-status-ask-first-fg" aria-hidden />
      ) : (
        <CircleCheck className="size-10 text-sb-brand" aria-hidden />
      )}
      <h2 className="text-sb-h2 font-semibold text-sb-fg">{queued ? t('success.queuedTitle') : t('success.title')}</h2>
      <p className="text-sb-body-s text-sb-muted">{queued ? t('success.queuedBody') : t('success.body')}</p>
      <div className="w-full">
        <FeedbackOfflineQueueBanner />
      </div>
      <Link
        href="/restaurants"
        className="inline-flex min-h-sb-tap items-center justify-center gap-2 rounded-sb-sm border border-sb-border bg-sb-surface-2 px-4 text-sb-body-s font-bold text-sb-fg focus-visible:shadow-sb-focus"
      >
        {t('success.back')}
      </Link>
    </div>
  );
}
