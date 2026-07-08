'use client';
import { useCallback, useEffect, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
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

export function QuestionCardScreen({ dishId }: { dishId?: string }) {
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

  const qc = useQuestionCard({ profile, targetLanguage, dishId, includeDish });

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
            className="inline-block rounded-sb-md bg-sb-primary px-4 py-2 font-semibold text-sb-primary-foreground"
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
          className="self-end rounded-sb-md border border-sb-border px-3 py-2 text-sm text-sb-fg"
        >
          {t('exitFullscreen')}
        </button>
        <QuestionCardDisplay card={qc.card} largeText />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <QuestionCardToolbar
        targetLanguage={targetLanguage}
        onToggleLang={() => setTargetLanguage((l) => (l === 'vi' ? 'en' : 'vi'))}
        largeText={largeText}
        onToggleLargeText={() => setLargeText((v) => !v)}
        presentation={presentation}
        onTogglePresentation={() => setPresentation(true)}
        onCopy={copy}
        hasDish={Boolean(dishId)}
        includeDish={includeDish}
        onToggleDish={() => setIncludeDish((v) => !v)}
      />
      {qc.card ? (
        <QuestionCardDisplay card={qc.card} largeText={largeText} />
      ) : qc.isGenerating ? (
        <SkeletonCard />
      ) : (
        <StateView title={t('generating')} />
      )}
      {copied && <Toast icon={<CircleCheck className="size-5" />} message={t('copied')} />}
    </div>
  );
}
