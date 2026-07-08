'use client';
import { useTranslations } from 'next-intl';

export function SafetyNotice({ className }: { className?: string }) {
  const t = useTranslations('safety');
  return (
    <p
      role="note"
      className={`rounded-lg border border-border bg-safety p-3 text-sm text-safety-foreground ${className ?? ''}`}
    >
      {t('disclaimer')}
    </p>
  );
}
