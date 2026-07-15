'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ReviewIngredient {
  id: string;
  ingredientId: string | null;
  rawName: string;
  confidence: number | null;
}
interface ReviewItem {
  id: string;
  dishGuess: { en: string; vi: string };
  photoRef: string | null;
  menuItem: { id: string; name: string } | null;
  restaurant: { id: string; name: string } | null;
  ingredients: ReviewIngredient[];
  createdAt: string;
}

async function fetchItems(): Promise<ReviewItem[]> {
  const res = await fetch('/api/v1/admin/ocr-review');
  if (!res.ok) throw new Error(`ocr_review_failed_${res.status}`);
  return ((await res.json()) as { data: { items: ReviewItem[] } }).data.items;
}
async function postAction(itemId: string, decision: 'approve' | 'reject', approvedIngredientIds: string[]): Promise<void> {
  const res = await fetch(`/api/v1/admin/ocr-review/${itemId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, approvedIngredientIds }),
  });
  if (!res.ok) throw new Error(`ocr_action_failed_${res.status}`);
}

function ReviewCard({
  item,
  onDecide,
  busy,
}: {
  item: ReviewItem;
  onDecide: (itemId: string, decision: 'approve' | 'reject', ids: string[]) => void;
  busy: boolean;
}) {
  const t = useTranslations('admin');
  const [checked, setChecked] = useState<Set<string>>(new Set(item.ingredients.map((i) => i.id)));
  const toggle = (id: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="rounded-sb-md border border-sb-border p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          {item.photoRef ? (
            // Bounded base64 data URL from the scan; a background-image div avoids next/image
            // (inappropriate for data URLs) while still rendering the captured frame.
            <div
              role="img"
              aria-label={item.dishGuess.en}
              className="h-48 w-full rounded-sb-sm bg-sb-surface-2 bg-cover bg-center"
              style={{ backgroundImage: `url(${item.photoRef})` }}
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-sb-sm bg-sb-surface-2 text-sm text-sb-muted">
              {t('ocrReview.noPhoto')}
            </div>
          )}
          <p className="mt-2 text-xs text-sb-muted">
            {t('ocrReview.dishGuess')}: {item.dishGuess.en}
            {item.menuItem ? ` · ${item.menuItem.name}` : ''}
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-sb-faint">{t('ocrReview.aiIngredients')}</p>
          <ul className="flex flex-col gap-1">
            {item.ingredients.map((ing) => (
              <li key={ing.id} className="flex items-center gap-2">
                <input type="checkbox" checked={checked.has(ing.id)} onChange={() => toggle(ing.id)} className="size-4 accent-sb-primary" />
                <span className="flex-1 text-sm text-sb-fg">
                  {ing.rawName}
                  {ing.ingredientId ? '' : ` (${t('ocrReview.unmapped')})`}
                </span>
                {ing.confidence != null ? <span className="text-xs text-sb-faint">{Math.round(ing.confidence * 100)}%</span> : null}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide(item.id, 'approve', [...checked])}
              className="rounded-sb-sm bg-sb-primary px-3 py-1 text-xs font-bold text-sb-primary-foreground disabled:opacity-50"
            >
              {t('ocrReview.approve')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide(item.id, 'reject', [])}
              className="rounded-sb-sm border border-sb-status-avoid-border px-3 py-1 text-xs font-bold text-sb-status-avoid-fg disabled:opacity-50"
            >
              {t('ocrReview.reject')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OcrReviewList() {
  const t = useTranslations('admin');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['ocr-review'], queryFn: fetchItems });
  const act = useMutation({
    mutationFn: (v: { itemId: string; decision: 'approve' | 'reject'; ids: string[] }) => postAction(v.itemId, v.decision, v.ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ocr-review'] }),
  });

  if (query.isLoading) return <p className="text-sm text-sb-muted">{t('ocrReview.loading')}</p>;
  if (query.isError) return <p className="text-sm text-sb-status-avoid-fg">{t('ocrReview.error')}</p>;
  const items = query.data ?? [];
  if (items.length === 0) return <p className="text-sm text-sb-muted">{t('ocrReview.empty')}</p>;

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <ReviewCard key={item.id} item={item} busy={act.isPending} onDecide={(itemId, decision, ids) => act.mutate({ itemId, decision, ids })} />
      ))}
    </div>
  );
}
