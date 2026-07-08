'use client';
import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { LanguageToggle } from '@/components/common/language-toggle';
import { SkeletonCard } from '@/components/common/skeleton-card';
import { StateView } from '@/components/common/state-view';
import { Toast } from '@/components/common/toast';
import { QuestionCardDisplay } from '@/components/safety/question-card-display';
import { Link } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';
import { QuestionCardToolbar } from './question-card-toolbar';
import { useAllergensMeta } from './use-allergens';
import { useQuestionCard } from './use-question-card';

function defaultTargetLanguage(city: string): LanguageCode {
  return ['hanoi', 'da_nang', 'hoi_an'].includes(city) ? 'vi' : 'en';
}

export function QuestionCardScreen({ dishId, menuItemId }: { dishId?: string; menuItemId?: string }) {
  const t = useTranslations('questionCard');
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  useAllergensMeta(); // populate the Dexie allergen cache for offline regen

  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('vi');
  const [largeText, setLargeText] = useState(false);
  const [includeDish, setIncludeDish] = useState(Boolean(dishId));
  const [presentation, setPresentation] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile) setTargetLanguage(defaultTargetLanguage(profile.destinationCity));
  }, [profile]);

  const qc = useQuestionCard({ profile, targetLanguage, dishId, menuItemId, includeDish });

  const sectionLabels = {
    severity_statement: t('sections.severity_statement'),
    ingredient_question: t('sections.ingredient_question'),
    cross_contact_question: t('sections.cross_contact_question'),
    kitchen_check: t('sections.kitchen_check'),
  } as const;

  const copy = useCallback(async () => {
    if (!qc.card) return;
    try {
      await navigator.clipboard.writeText(qc.card.text);
    } catch {
      // clipboard unavailable (insecure ctx / iOS) — the card text is still on screen to copy manually
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [qc.card]);

  useEffect(() => {
    if (!presentation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresentation(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentation]);

  if (!hydrated) return <SkeletonCard />;
  if (!profile) {
    return (
      <StateView
        title={t('noProfile')}
        action={
          <Link
            href="/onboarding"
            className="inline-flex min-h-sb-tap items-center rounded-sb-md bg-sb-primary px-4 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
          >
            {t('startProfile')}
          </Link>
        }
      />
    );
  }

  if (presentation && qc.card) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col gap-4 overflow-auto bg-sb-surface p-6">
        <button
          type="button"
          onClick={() => setPresentation(false)}
          className="min-h-sb-tap self-end rounded-sb-md border border-sb-border px-3 text-sb-body-s text-sb-fg focus-visible:shadow-sb-focus"
        >
          {t('exitFullscreen')}
        </button>
        <div className="mx-auto w-full max-w-md">
          <QuestionCardDisplay card={qc.card} largeText sectionLabels={sectionLabels} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-sb-title text-sb-fg">{t('askTitle')}</h1>
        <LanguageToggle value={targetLanguage} onChange={setTargetLanguage} />
      </header>
      <QuestionCardToolbar
        largeText={largeText}
        onToggleLargeText={() => setLargeText((v) => !v)}
        onTogglePresentation={() => setPresentation(true)}
        hasDish={Boolean(dishId)}
        includeDish={includeDish}
        onToggleDish={() => setIncludeDish((v) => !v)}
      />
      {qc.card ? (
        <QuestionCardDisplay card={qc.card} largeText={largeText} sectionLabels={sectionLabels} />
      ) : qc.isGenerating ? (
        <SkeletonCard />
      ) : (
        <StateView title={t('generating')} />
      )}
      {qc.card && (
        <>
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-sb-tap w-full items-center justify-center gap-2 rounded-sb-md bg-sb-primary px-4 text-sb-body font-bold text-sb-primary-foreground focus-visible:shadow-sb-focus"
          >
            <Copy aria-hidden className="size-5" />
            {t('copyText')}
          </button>
          <p className="text-center text-sb-caption text-sb-faint">{t('sourceNote', { source: qc.card.source })}</p>
        </>
      )}
      {copied && <Toast icon={<CircleCheck className="size-5" />} message={t('copied')} />}
    </div>
  );
}
