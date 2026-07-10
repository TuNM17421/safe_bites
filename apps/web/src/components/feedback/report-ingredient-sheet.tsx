'use client';
import { Check, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FeedbackReportInputSchema } from '@safebite/domain';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { searchIngredients, type IngredientOption } from '@/features/restaurants/dish-ingredients-client';
import { submitOrQueueFeedback } from '@/features/feedback/offline-feedback-queue';
import { useProfileStore } from '@/lib/profile-store';

// In-context "report wrong ingredient" (v2) — replaces the 6-step reaction wizard for this flow.
// The user picks an ingredient + whether the dish contains it + optional note; it submits through
// the SAME offline-capable feedback path. An admin applies it via approve_ingredient_correction.
export function ReportIngredientSheet({
  restaurantId,
  menuItemId,
  lang,
  onDone,
}: {
  restaurantId: string;
  menuItemId: string;
  lang: 'en' | 'vi';
  onDone: () => void;
}) {
  const t = useTranslations('feedback');
  const online = useOnlineStatus();
  const profile = useProfileStore((s) => s.profile);
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<IngredientOption[]>([]);
  const [selected, setSelected] = useState<IngredientOption | null>(null);
  const [present, setPresent] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'submitted' | 'queued' | null>(null);
  const [error, setError] = useState(false);

  async function runSearch(next: string) {
    setQ(next);
    try {
      setOptions(await searchIngredients(next.trim()));
    } catch {
      setOptions([]);
    }
  }

  async function submit() {
    if (!selected) return;
    setBusy(true);
    setError(false);
    const payload = {
      clientReportId: crypto.randomUUID(),
      restaurantId,
      menuItemId,
      city: profile?.destinationCity ?? 'hanoi',
      allergenIds: profile?.allergies.map((a) => a.allergenId) ?? [],
      reaction: 'not_sure' as const,
      notes: note.trim() || null,
      correctionIngredientId: selected.id,
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
      <div className="flex flex-col gap-2 rounded-sb-md border border-sb-status-suitable-border bg-sb-status-suitable-bg p-3">
        <p className="inline-flex items-center gap-2 text-sb-body-s font-bold text-sb-status-suitable-fg">
          <Check aria-hidden className="size-4" />
          {t(result === 'queued' ? 'reportIngredient.queued' : 'reportIngredient.submitted')}
        </p>
        <button type="button" onClick={onDone} className="self-start text-sb-body-s font-bold text-sb-brand underline">
          {t('reportIngredient.close')}
        </button>
      </div>
    );
  }

  const seg = 'min-h-sb-tap flex-1 rounded-sb-sm px-3 text-sb-body-s font-bold';
  return (
    <div className="flex flex-col gap-2 rounded-sb-md border border-sb-status-avoid-border bg-sb-surface-2 p-3">
      <p className="text-sb-body-s font-bold text-sb-fg">{t('reportIngredient.title')}</p>
      <label className="flex items-center gap-2 rounded-full border border-sb-border bg-sb-surface px-3">
        <Search aria-hidden className="size-4 text-sb-faint" />
        <input
          value={selected ? selected.name[lang] : q}
          onChange={(e) => {
            setSelected(null);
            void runSearch(e.target.value);
          }}
          placeholder={t('reportIngredient.searchIngredient')}
          aria-label={t('reportIngredient.searchIngredient')}
          className="min-h-sb-tap min-w-0 flex-1 border-0 bg-transparent text-sb-body-s text-sb-fg outline-none"
        />
      </label>
      {!selected && options.length > 0 ? (
        <ul className="flex flex-col rounded-sb-sm border border-sb-border bg-sb-surface">
          {options.slice(0, 6).map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => setSelected(o)}
                className="w-full border-b border-dashed border-sb-border px-3 py-2 text-left text-sb-body-s text-sb-fg last:border-0"
              >
                {o.name[lang]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2 rounded-sb-sm border border-sb-border bg-sb-surface p-0.5">
        <button type="button" aria-pressed={present} onClick={() => setPresent(true)} className={`${seg} ${present ? 'bg-sb-primary text-sb-primary-foreground' : 'text-sb-muted'}`}>
          {t('reportIngredient.contains')}
        </button>
        <button type="button" aria-pressed={!present} onClick={() => setPresent(false)} className={`${seg} ${!present ? 'bg-sb-primary text-sb-primary-foreground' : 'text-sb-muted'}`}>
          {t('reportIngredient.notContains')}
        </button>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder={t('reportIngredient.notePlaceholder')}
        aria-label={t('reportIngredient.notePlaceholder')}
        className="rounded-sb-sm border border-sb-border bg-sb-surface p-2 text-sb-body-s text-sb-fg outline-none focus-visible:shadow-sb-focus"
      />

      {error ? <p role="alert" className="text-sb-caption text-sb-status-avoid-fg">{t('reportIngredient.error')}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!selected || busy}
          onClick={submit}
          className="min-h-sb-tap flex-1 rounded-sb-sm bg-sb-primary px-4 text-sb-body-s font-bold text-sb-primary-foreground disabled:opacity-50 focus-visible:shadow-sb-focus"
        >
          {busy ? t('reportIngredient.submitting') : t('reportIngredient.submit')}
        </button>
        <button type="button" onClick={onDone} className="min-h-sb-tap rounded-sb-sm border border-sb-border px-4 text-sb-body-s font-bold text-sb-fg">
          {t('reportIngredient.cancel')}
        </button>
      </div>
    </div>
  );
}
