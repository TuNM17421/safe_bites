'use client';
import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

// Post-submission confirmation screen. No user-entered content is echoed back.
export function FeedbackSuccessPanel() {
  const t = useTranslations('feedback');
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <CircleCheck className="size-10 text-sb-brand" aria-hidden />
      <h2 className="text-sb-h2 font-semibold text-sb-fg">{t('success.title')}</h2>
      <p className="text-sb-body-s text-sb-muted">{t('success.body')}</p>
      <Link
        href="/restaurants"
        className="inline-flex min-h-sb-tap items-center justify-center gap-2 rounded-sb-sm border border-sb-border bg-sb-surface-2 px-4 text-sb-body-s font-bold text-sb-fg focus-visible:shadow-sb-focus"
      >
        {t('success.back')}
      </Link>
    </div>
  );
}
