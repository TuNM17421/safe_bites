'use client';
import { AArrowUp, Maximize } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Secondary meta controls (mock metarow) above the card. EN/VI moved to the header seg and
// Copy demoted to the bottom CTA — this row is just Large text, Show to staff, Include dish.
const meta =
  'inline-flex min-h-sb-tap items-center gap-1.5 rounded-sb-md border border-sb-border bg-sb-surface-2 px-3 text-sb-body-s text-sb-muted focus-visible:shadow-sb-focus';
const metaOn =
  'inline-flex min-h-sb-tap items-center gap-1.5 rounded-sb-md border border-sb-primary bg-sb-primary px-3 text-sb-body-s text-sb-primary-foreground focus-visible:shadow-sb-focus';

export function QuestionCardToolbar({
  largeText,
  onToggleLargeText,
  onTogglePresentation,
  hasDish,
  includeDish,
  onToggleDish,
}: {
  largeText: boolean;
  onToggleLargeText: () => void;
  onTogglePresentation: () => void;
  hasDish: boolean;
  includeDish: boolean;
  onToggleDish: () => void;
}) {
  const t = useTranslations('questionCard');
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onToggleLargeText} aria-pressed={largeText} className={largeText ? metaOn : meta}>
        <AArrowUp aria-hidden className="size-4" />
        {t('largeText')}
      </button>
      <button type="button" onClick={onTogglePresentation} className={meta}>
        <Maximize aria-hidden className="size-4" />
        {t('fullscreen')}
      </button>
      {hasDish && (
        <button type="button" onClick={onToggleDish} aria-pressed={includeDish} className={includeDish ? metaOn : meta}>
          {t('includeDish')}
        </button>
      )}
    </div>
  );
}
