'use client';
import { CirclePlus, Flag, MessageSquare, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { Link } from '@/i18n/navigation';
import { searchIngredients, type IngredientOption } from '@/features/restaurants/dish-ingredients-client';

const ghost =
  'inline-flex min-h-sb-tap items-center justify-center gap-2 rounded-sb-sm border px-4 text-sb-body-s font-bold focus-visible:shadow-sb-focus focus-visible:outline-none';

// Add ingredient (writes an unverified user contribution) · Report wrong (feedback spine) ·
// Create question for owner (reuses the question-card route). Human-in-the-loop throughout.
export function IngredientActionBar({
  restaurantId,
  menuItemId,
  lang,
  existingIngredientIds,
  onAdd,
  adding,
}: {
  restaurantId: string;
  menuItemId: string;
  lang: LanguageCode;
  existingIngredientIds: string[];
  onAdd: (ingredientId: string) => void;
  adding: boolean;
}) {
  const t = useTranslations('dishAtRestaurant');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<IngredientOption[]>([]);
  const [loading, setLoading] = useState(false);

  async function runSearch(next: string) {
    setQ(next);
    setLoading(true);
    try {
      const res = await searchIngredients(next.trim());
      setOptions(res.filter((o) => !existingIngredientIds.includes(o.id)));
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next && options.length === 0) void runSearch('');
          }}
          className={`${ghost} border-sb-border bg-sb-surface-2 text-sb-fg`}
        >
          <CirclePlus aria-hidden className="size-4" />
          {t('addIngredient')}
        </button>
        <Link
          href={`/feedback/new?restaurantId=${encodeURIComponent(restaurantId)}&menuItemId=${encodeURIComponent(menuItemId)}`}
          className={`${ghost} border-sb-status-avoid-border text-sb-status-avoid-fg`}
        >
          <Flag aria-hidden className="size-4" />
          {t('reportWrong')}
        </Link>
      </div>

      {open ? (
        <div className="flex flex-col gap-2 rounded-sb-md border border-sb-border bg-sb-surface-2 p-3">
          <label className="flex items-center gap-2 rounded-full border border-sb-border bg-sb-surface px-3">
            <Search aria-hidden className="size-4 text-sb-faint" />
            <input
              value={q}
              onChange={(e) => void runSearch(e.target.value)}
              placeholder={t('searchIngredient')}
              aria-label={t('searchIngredient')}
              className="min-h-sb-tap min-w-0 flex-1 border-0 bg-transparent text-sb-body-s text-sb-fg outline-none"
            />
          </label>
          {loading ? (
            <p className="text-sb-caption text-sb-muted">{t('searching')}</p>
          ) : options.length === 0 ? (
            <p className="text-sb-caption text-sb-muted">{t('noIngredientMatches')}</p>
          ) : (
            <ul className="flex flex-col">
              {options.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    disabled={adding}
                    onClick={() => onAdd(o.id)}
                    className="flex w-full items-center justify-between gap-2 border-b border-dashed border-sb-border py-2 text-left text-sb-body-s text-sb-fg last:border-0 disabled:opacity-50"
                  >
                    {o.name[lang]}
                    <CirclePlus aria-hidden className="size-4 text-sb-brand" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sb-caption text-sb-faint">{t('addDisclaimer')}</p>
        </div>
      ) : null}

      <Link
        href={`/question-card?menuItemId=${encodeURIComponent(menuItemId)}`}
        className="inline-flex min-h-sb-tap w-full items-center justify-center gap-2 rounded-sb-md bg-sb-primary px-4 text-sb-body font-bold text-sb-primary-foreground focus-visible:shadow-sb-focus"
      >
        <MessageSquare aria-hidden className="size-5" />
        {t('createQuestion')}
      </Link>
    </div>
  );
}
