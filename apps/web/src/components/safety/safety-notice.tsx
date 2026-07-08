'use client';
import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Calm neutral safety notice (design system v2) — never the amber alarm tint; amber is
// reserved for the Ask-First status.
export function SafetyNotice({ className }: { className?: string }) {
  const t = useTranslations('safety');
  return (
    <p
      role="note"
      className={`flex items-start gap-2 rounded-sb-md border border-sb-border bg-sb-surface-2 p-3 text-sm text-sb-muted ${className ?? ''}`}
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      {t('disclaimer')}
    </p>
  );
}
