'use client';
import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ALLERGEN_SOURCES, MENU_ITEM_STATUSES, RISK_LEVELS } from '@/app/admin/admin-messages';
import { useAllergenStatuses, type AllergenStatusRow } from './menu-admin-hooks';

interface Draft {
  _key: string;
  allergenId: string;
  riskLevel: string;
  confidence: string;
  source: string;
  reasonEn: string;
  reasonVi: string;
  lastVerifiedAt: string; // YYYY-MM-DD; provenance shown to diners — never silently dropped
  verificationStatus: string;
  confirmed: boolean;
}

let keySeq = 0;
const nextKey = () => `d${keySeq++}`;

const emptyDraft = (): Draft => ({
  _key: nextKey(),
  allergenId: '',
  riskLevel: 'possible',
  confidence: '0.5',
  source: 'admin_manual',
  reasonEn: '',
  reasonVi: '',
  lastVerifiedAt: '',
  verificationStatus: 'observed_not_verified',
  confirmed: false,
});

const toDraft = (s: AllergenStatusRow): Draft => ({
  _key: s.id,
  allergenId: s.allergenId,
  riskLevel: s.riskLevel,
  confidence: String(s.confidence),
  source: s.source,
  reasonEn: s.reasonEn,
  reasonVi: s.reasonVi ?? '',
  lastVerifiedAt: s.lastVerifiedAt ? s.lastVerifiedAt.slice(0, 10) : '',
  verificationStatus: s.verificationStatus,
  confirmed: s.source === 'dish_inferred',
});

const inputCls =
  'min-h-10 w-full rounded-sb-sm border border-sb-border-strong bg-sb-surface px-2 text-sm text-sb-fg focus-visible:shadow-sb-focus focus-visible:outline-none';

export function AllergenStatusEditor({ menuItemId, restaurantId }: { menuItemId: string; restaurantId: string }) {
  const t = useTranslations('admin');
  const { list, replace } = useAllergenStatuses(menuItemId, restaurantId);
  const [rows, setRows] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Seed the draft from server data only once (per mount / menu item) so a background refetch
  // (the admin QueryClient refetches on window focus) can't clobber unsaved edits.
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current && list.data) {
      setRows(list.data.map(toDraft));
      seeded.current = true;
    }
  }, [list.data]);

  const setRow = (i: number, patch: Partial<Draft>) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // Unknown risk caps confidence at 0.5 (mirrors the server rule) — clamp as the admin edits.
  const setRisk = (i: number, riskLevel: string) =>
    setRows((p) =>
      p.map((r, idx) => {
        if (idx !== i) return r;
        const capped = riskLevel === 'unknown' && Number(r.confidence) > 0.5 ? '0.5' : r.confidence;
        return { ...r, riskLevel, confidence: capped };
      }),
    );

  const save = async () => {
    setError(null);
    const statuses = rows.map((r) => ({
      allergenId: r.allergenId.trim(),
      riskLevel: r.riskLevel,
      confidence: Number(r.confidence),
      source: r.source,
      reasonEn: r.reasonEn.trim(),
      reasonVi: r.reasonVi.trim() || undefined,
      lastVerifiedAt: r.lastVerifiedAt.trim() || undefined,
      verificationStatus: r.verificationStatus,
      ...(r.source === 'dish_inferred' ? { confirmed: r.confirmed } : {}),
    }));
    try {
      const saved = await replace.mutateAsync({ statuses });
      setRows(saved.map(toDraft)); // reflect the persisted rows (incl. server-normalized dates)
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (list.isPending) return <p className="text-sm text-sb-muted">{t('table.loading')}</p>;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-sb-fg">{t('restaurant.allergenStatuses')}</p>
      {error ? (
        <p role="alert" className="text-sm text-sb-status-avoid-fg">
          {error}
        </p>
      ) : null}
      {rows.map((r, i) => (
        <fieldset key={r._key} className="grid gap-2 rounded-sb-sm border border-sb-border bg-sb-surface-2 p-2 sm:grid-cols-2">
          <legend className="px-1 text-xs font-semibold text-sb-muted">
            {r.allergenId || `#${i + 1}`}
          </legend>
          <label className="flex flex-col gap-1 text-xs text-sb-muted">
            {t('fields.allergenId')}
            <input className={inputCls} value={r.allergenId} onChange={(e) => setRow(i, { allergenId: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-sb-muted">
            {t('fields.riskLevel')}
            <select className={inputCls} value={r.riskLevel} onChange={(e) => setRisk(i, e.target.value)}>
              {RISK_LEVELS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-sb-muted">
            {t('fields.confidence')}
            <input
              className={inputCls}
              type="number"
              step="0.05"
              min="0"
              max={r.riskLevel === 'unknown' ? '0.5' : '1'}
              value={r.confidence}
              onChange={(e) => setRow(i, { confidence: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-sb-muted">
            {t('fields.source')}
            <select className={inputCls} value={r.source} onChange={(e) => setRow(i, { source: e.target.value })}>
              {ALLERGEN_SOURCES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-sb-muted">
            {t('fields.reasonEn')}
            <input className={inputCls} value={r.reasonEn} onChange={(e) => setRow(i, { reasonEn: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-sb-muted">
            {t('fields.reasonVi')}
            <input className={inputCls} value={r.reasonVi} onChange={(e) => setRow(i, { reasonVi: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-sb-muted">
            {t('fields.lastVerifiedAt')}
            <input className={inputCls} type="date" value={r.lastVerifiedAt} onChange={(e) => setRow(i, { lastVerifiedAt: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-sb-muted">
            {t('fields.verificationStatus')}
            <select className={inputCls} value={r.verificationStatus} onChange={(e) => setRow(i, { verificationStatus: e.target.value })}>
              {MENU_ITEM_STATUSES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end justify-between gap-2 sm:col-span-2">
            {r.source === 'dish_inferred' ? (
              <label className="flex items-center gap-1 text-xs text-sb-muted">
                <input type="checkbox" checked={r.confirmed} onChange={(e) => setRow(i, { confirmed: e.target.checked })} className="size-4" />
                {t('fields.confirmed')}
              </label>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
              aria-label={`${t('table.remove')} ${r.allergenId || `#${i + 1}`}`}
              className="grid size-9 place-items-center rounded-sb-sm border border-sb-status-avoid-border text-sb-status-avoid-fg hover:bg-sb-status-avoid-bg focus-visible:shadow-sb-focus focus-visible:outline-none"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        </fieldset>
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={() => setRows((p) => [...p, emptyDraft()])} className="min-h-10 rounded-sb-sm border border-sb-border px-3 text-sm text-sb-fg hover:bg-sb-surface-2">
          {t('table.add')}
        </button>
        <button type="button" onClick={save} disabled={replace.isPending} className="min-h-10 rounded-sb-sm bg-sb-primary px-3 text-sm font-bold text-sb-primary-foreground disabled:opacity-50">
          {t('restaurant.saveStatuses')}
        </button>
      </div>
    </div>
  );
}
