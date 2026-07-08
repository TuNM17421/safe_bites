'use client';
import { AArrowUp, Copy, Languages, Maximize, Minimize } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';

const btn =
  'inline-flex items-center gap-1.5 rounded-sb-md border border-sb-border px-3 py-2 text-sm text-sb-fg focus-visible:shadow-sb-focus';
const btnOn = 'inline-flex items-center gap-1.5 rounded-sb-md border border-sb-primary bg-sb-primary px-3 py-2 text-sm text-sb-primary-foreground';

export function QuestionCardToolbar({
  targetLanguage,
  onToggleLang,
  largeText,
  onToggleLargeText,
  presentation,
  onTogglePresentation,
  onCopy,
  hasDish,
  includeDish,
  onToggleDish,
}: {
  targetLanguage: LanguageCode;
  onToggleLang: () => void;
  largeText: boolean;
  onToggleLargeText: () => void;
  presentation: boolean;
  onTogglePresentation: () => void;
  onCopy: () => void;
  hasDish: boolean;
  includeDish: boolean;
  onToggleDish: () => void;
}) {
  const t = useTranslations('questionCard');
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onToggleLang} className={btn}>
        <Languages aria-hidden className="size-4" />
        {targetLanguage === 'vi' ? t('showInEn') : t('showInVi')}
      </button>
      <button type="button" onClick={onToggleLargeText} aria-pressed={largeText} className={largeText ? btnOn : btn}>
        <AArrowUp aria-hidden className="size-4" />
        {t('largeText')}
      </button>
      {hasDish && (
        <button type="button" onClick={onToggleDish} aria-pressed={includeDish} className={includeDish ? btnOn : btn}>
          {t('includeDish')}
        </button>
      )}
      <button type="button" onClick={onCopy} className={btn}>
        <Copy aria-hidden className="size-4" />
        {t('copy')}
      </button>
      <button type="button" onClick={onTogglePresentation} className={btn}>
        {presentation ? <Minimize aria-hidden className="size-4" /> : <Maximize aria-hidden className="size-4" />}
        {presentation ? t('exitFullscreen') : t('fullscreen')}
      </button>
    </div>
  );
}
