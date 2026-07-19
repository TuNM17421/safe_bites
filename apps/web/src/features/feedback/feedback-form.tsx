'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { FeedbackReportInputSchema } from '@safebite/domain';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';
import { buildProfileSnapshot } from './build-feedback-snapshot';
import { FeedbackSubmitError } from './feedback-client';
import { submitOrQueueFeedback } from './offline-feedback-queue';
import { FEEDBACK_STEP_COUNT, FeedbackStep } from './feedback-steps';
import { useFeedbackDraft } from './use-feedback-draft';
import { useFeedbackOptions } from './use-feedback-options';

type Ternary = 'yes' | 'no' | 'not_sure';

function ternaryToBool(v?: Ternary): boolean | undefined {
  if (v === 'yes') return true;
  if (v === 'no') return false;
  return undefined;
}

function toIsoDateTime(date: string): string | undefined {
  if (!date) return undefined;
  const t = Date.parse(date);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

export function FeedbackForm({ restaurantId, menuItemId, dishId }: { restaurantId: string; menuItemId?: string; dishId?: string }) {
  const t = useTranslations('feedback');
  const router = useRouter();
  const draft = useFeedbackDraft();
  const options = useFeedbackOptions(restaurantId);
  const profile = useProfileStore((s) => s.profile);
  const hydrated = useProfileStore((s) => s.hydrated);
  const online = useOnlineStatus();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    draft.patch({
      menuItemId: menuItemId ?? draft.menuItemId,
      dishId: dishId ?? draft.dishId,
    });
  }, [menuItemId, dishId, draft]);

  const step = draft.step;
  const isLast = step === FEEDBACK_STEP_COUNT - 1;

  async function onSubmit() {
    setError(null);
    const payload = {
      clientReportId: crypto.randomUUID(),
      restaurantId,
      city: options.data?.restaurant.city ?? 'unknown',
      clientPlatform: 'pwa_web',
      submissionSource: 'online',
      menuItemId: draft.menuItemId ?? undefined,
      dishId: draft.dishId ?? undefined,
      allergenIds: draft.allergenIds,
      profileSnapshot: buildProfileSnapshot(profile, draft.allergenIds),
      ateHere: ternaryToBool(draft.ateHere),
      visitedAt: toIsoDateTime(draft.visitedAt),
      askedStaff: ternaryToBool(draft.askedStaff),
      staffAnswer: draft.staffAnswer,
      staffAnswerText: draft.staffAnswerText || undefined,
      reaction: draft.reaction,
      reactionTiming: draft.reactionTiming,
      userTrustRating: draft.userTrustRating,
      notes: draft.notes || undefined,
    };
    const parsed = FeedbackReportInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(t('form.fixErrors'));
      return;
    }
    setSubmitting(true);
    try {
      const outcome = await submitOrQueueFeedback(parsed.data, { online });
      draft.reset();
      router.replace(outcome === 'queued' ? '/feedback/thanks?queued=1' : '/feedback/thanks');
    } catch (e) {
      // Only non-queueable client errors (400/404) reach here; transient errors were queued.
      if (e instanceof FeedbackSubmitError && e.status === 400) setError(t('form.fixErrors'));
      else setError(t('errors.submitFailed'));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 pb-28">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => draft.setStep(step - 1)}
              aria-label={t('form.back')}
              className="inline-flex min-h-sb-tap items-center gap-1 rounded-sb-sm border border-sb-border bg-sb-surface-2 px-3 text-sb-body-s font-bold text-sb-fg focus-visible:shadow-sb-focus"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {t('form.back')}
            </button>
          )}
          <span className="text-sb-caption text-sb-muted">{t('form.stepOf', { current: step + 1, total: FEEDBACK_STEP_COUNT })}</span>
        </div>
        <div role="presentation" className="flex gap-1.5">
          {Array.from({ length: FEEDBACK_STEP_COUNT }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-1.5 flex-1 rounded-sb-full ${i <= step ? 'bg-sb-brand' : 'bg-sb-surface-2'}`}
            />
          ))}
        </div>
      </header>

      <FeedbackStep index={step} options={options.data} profile={hydrated ? profile : null} />

      {error && (
        <p role="alert" className="text-sb-body-s text-sb-status-avoid-fg">
          {error}
        </p>
      )}

      <footer className="fixed inset-x-0 bottom-0 border-t border-sb-border bg-sb-surface p-4 shadow-sb-e1">
        <div className="mx-auto max-w-md">
          {isLast ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="min-h-sb-tap w-full rounded-sb-md bg-sb-primary px-4 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus disabled:opacity-40"
            >
              {submitting ? t('form.submitting') : t('form.submit')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => draft.setStep(step + 1)}
              className="min-h-sb-tap w-full rounded-sb-md bg-sb-primary px-4 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus disabled:opacity-40"
            >
              {t('form.continue')}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
