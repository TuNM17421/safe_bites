'use client';
import { useTranslations } from 'next-intl';

// Confidence is hue-neutral (grey segments + word) — never a ladder hue, never a %.
export function ConfidenceMeter({ level }: { level: 'low' | 'medium' | 'high' }) {
  const t = useTranslations('dishes');
  const on = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 w-4 rounded-full ${i < on ? 'bg-sb-muted' : 'bg-sb-border'}`} />
        ))}
      </span>
      <b className="text-xs text-sb-muted">{t(`confidence.${level}`)}</b>
    </span>
  );
}
