'use client';
import { Check, Pencil, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FeedbackReportInputSchema } from '@safebite/domain';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { submitOrQueueFeedback } from '@/features/feedback/offline-feedback-queue';
import type { DataEditProposal } from '@/lib/agent-schemas';
import { useProfileStore } from '@/lib/profile-store';

// The bot's pre-filled data edit. Confirm routes it through the SAME phase-09 ingredient-correction
// feedback path (needs_review, HITL — never auto-verified). Edit only flips contains/does-not before
// sending; the human still submits. An admin later applies it via approve_ingredient_correction.
export function DataEditProposalCard({ proposal, lang }: { proposal: DataEditProposal; lang: 'en' | 'vi' }) {
  const t = useTranslations('agent');
  const online = useOnlineStatus();
  const profile = useProfileStore((s) => s.profile);
  const [present, setPresent] = useState(proposal.present);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'submitted' | 'queued' | null>(null);
  const [error, setError] = useState(false);

  async function confirm() {
    setBusy(true);
    setError(false);
    const payload = {
      clientReportId: crypto.randomUUID(),
      restaurantId: proposal.restaurantId,
      menuItemId: proposal.menuItemId,
      city: profile?.destinationCity ?? 'hanoi',
      allergenIds: profile?.allergies.map((a) => a.allergenId) ?? [],
      reaction: 'not_sure' as const,
      notes: proposal.reason[lang],
      correctionIngredientId: proposal.ingredientId,
      correctionPresent: present,
    };
    const parsed = FeedbackReportInputSchema.safeParse(payload);
    if (!parsed.success) {
      setBusy(false);
      setError(true);
      return;
    }
    try {
      setResult(await submitOrQueueFeedback(parsed.data, { online }));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <p className="inline-flex items-center gap-2 rounded-sb-md border border-sb-status-suitable-border bg-sb-status-suitable-bg px-3 py-2 text-sb-body-s font-bold text-sb-status-suitable-fg">
        <Check aria-hidden className="size-4" />
        {t(result === 'queued' ? 'sentForReviewQueued' : 'sentForReview')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-sb-md border border-sb-status-avoid-border bg-sb-surface-2 p-3">
      <p className="text-sb-body-s font-bold text-sb-fg">{t('proposalTitle')}</p>
      <p className="text-sb-body-s text-sb-muted">
        <b className="text-sb-fg">{proposal.menuItemName}</b>{' '}
        {t(present ? 'contains' : 'notContains', { ingredient: proposal.ingredientName[lang] })}
      </p>
      <p className="text-sb-caption text-sb-muted">{proposal.reason[lang]}</p>

      {error ? (
        <p role="alert" className="text-sb-caption text-sb-status-avoid-fg">
          {t('error')}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={confirm}
          className="min-h-sb-tap flex-1 rounded-sb-sm bg-sb-primary px-4 text-sb-body-s font-bold text-sb-primary-foreground disabled:opacity-50 focus-visible:shadow-sb-focus"
        >
          {busy ? t('confirming') : t('confirm')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setPresent((p) => !p)}
          className="min-h-sb-tap inline-flex items-center gap-1 rounded-sb-sm border border-sb-border px-4 text-sb-body-s font-bold text-sb-fg disabled:opacity-50"
        >
          <Pencil aria-hidden className="size-4" />
          {t('edit')}
        </button>
      </div>

      <p className="inline-flex items-center gap-1.5 text-sb-caption text-sb-faint">
        <ShieldCheck aria-hidden className="size-3.5" />
        {t('hitlNote')}
      </p>
    </div>
  );
}
