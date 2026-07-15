'use client';
import { Store, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AdminDataTable, type AdminColumn } from '@/components/admin/admin-data-table';
import { AdminTableSkeleton } from '@/components/admin/admin-table-skeleton';
import {
  RESTAURANT_MENU_STATUSES,
  REVIEW_STATUSES,
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
} from '@/app/admin/admin-messages';
import { AdminProvenanceBadge } from './admin-provenance-badge';
import { AdminStatusBadge } from './admin-status-badge';
import { FilterSelect } from './admin-filter-select';
import { RestaurantForm, type RestaurantRow } from './restaurant-form';
import { RestaurantReviewActions } from './restaurant-review-actions';
import { RestaurantStatCards, type AdminStat } from './restaurant-stat-cards';
import { useAdminResource } from './use-admin-resource';

// Admin restaurant console (§5.2). Richer than AdminResourcePage (filters + review actions +
// manage-menu links), so it composes the same primitives directly. Admin uses next/link so
// URLs stay unprefixed (phase-12 ADR — the /admin island is deliberately not locale-routed).
const BASE = '/api/v1/admin/restaurants';

// Leaf Leaflet view — lazy, client-only.
const RestaurantAdminMap = dynamic(() => import('./restaurant-admin-map').then((m) => m.RestaurantAdminMap), {
  ssr: false,
});

export function RestaurantAdminList() {
  const t = useTranslations('admin');
  const [review, setReview] = useState('');
  const [verification, setVerification] = useState('');
  const [menu, setMenu] = useState('');
  const [source, setSource] = useState('');
  const [hasMenu, setHasMenu] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [editing, setEditing] = useState<RestaurantRow | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) panelRef.current?.focus();
  }, [editing]);

  const query = useMemo(() => {
    const q: Record<string, string> = { review_status: review || 'all' };
    if (verification) q.verification_status = verification;
    if (menu) q.menu_status = menu;
    if (source) q.source = source;
    if (hasMenu) q.has_menu_items = hasMenu;
    if (city.trim()) q.city = city.trim();
    if (district.trim()) q.district = district.trim();
    return q;
  }, [review, verification, menu, source, hasMenu, city, district]);

  const { list, create, update, remove } = useAdminResource<RestaurantRow>(BASE, query);

  const onSubmit = async (body: unknown) => {
    setError(null);
    try {
      if (editing && editing !== 'new') await update.mutateAsync({ id: editing.id, body });
      else await create.mutateAsync(body);
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const doReview = async (id: string, body: Record<string, string>) => {
    setError(null);
    try {
      await update.mutateAsync({ id, body });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // DELETE is blocked (409) when menu items exist — surface that message rather than swallow it.
  const doDelete = async (id: string) => {
    if (!window.confirm(t('table.confirmDelete'))) return;
    setError(null);
    try {
      await remove.mutateAsync(id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const columns: AdminColumn<RestaurantRow>[] = [
    {
      key: 'canonicalName',
      header: t('fields.canonicalName'),
      render: (r) => (
        <span>
          <span className="font-semibold">{r.canonicalName}</span>
          <span className="block text-xs text-sb-faint">{r.id}</span>
          <span className="mt-1 block">
            <AdminProvenanceBadge source={r.externalSource} />
          </span>
        </span>
      ),
    },
    { key: 'city', header: t('fields.city') },
    { key: 'district', header: t('fields.district') },
    { key: 'verificationStatus', header: t('fields.verificationStatus'), render: (r) => <AdminStatusBadge status={r.verificationStatus} /> },
    { key: 'menuStatus', header: t('fields.menuStatus'), render: (r) => <AdminStatusBadge status={r.menuStatus} /> },
    { key: 'reviewStatus', header: t('fields.reviewStatus'), render: (r) => <AdminStatusBadge status={r.reviewStatus} /> },
    { key: 'menuItemCount', header: t('restaurant.count'), align: 'right' },
    { key: 'ingredientCount', header: t('restaurant.ingredientCount'), align: 'right', render: (r) => r.ingredientCount ?? 0 },
    {
      key: 'review',
      header: t('table.review'),
      render: (r) => (
        <RestaurantReviewActions
          onApprove={() => doReview(r.id, { reviewStatus: 'approved' })}
          onReject={() => doReview(r.id, { reviewStatus: 'rejected' })}
          onFlag={() => doReview(r.id, { verificationStatus: 'flagged' })}
          approveLabel={t('table.approve')}
          rejectLabel={t('table.reject')}
          flagLabel={t('table.flag')}
        />
      ),
    },
    {
      key: 'menu',
      header: t('table.menu'),
      render: (r) => (
        <Link href={`/admin/restaurants/${r.id}`} className="inline-flex min-h-9 items-center rounded-sb-sm bg-sb-surface-2 px-2 text-xs font-semibold text-sb-brand-ink hover:bg-sb-surface-3 focus-visible:shadow-sb-focus focus-visible:outline-none">
          {t('table.manageMenu')}
        </Link>
      ),
    },
  ];

  const rows = list.data ?? [];
  const hasFilters = Boolean(review || verification || menu || source || hasMenu || city.trim() || district.trim());
  const clearFilters = () => {
    setReview('');
    setVerification('');
    setMenu('');
    setSource('');
    setHasMenu('');
    setCity('');
    setDistrict('');
  };
  // KPI counts over the CURRENT result set (updates as filters narrow).
  const stats: AdminStat[] = [
    { label: t('restaurant.statTotal'), value: rows.length },
    { label: t('restaurant.statNeedsReview'), value: rows.filter((r) => r.reviewStatus === 'needs_review').length, tone: 'ask-first' },
    { label: t('restaurant.statApproved'), value: rows.filter((r) => r.reviewStatus === 'approved').length, tone: 'suitable' },
    { label: t('restaurant.statFlagged'), value: rows.filter((r) => r.verificationStatus === 'flagged').length, tone: 'avoid' },
    { label: t('restaurant.statWithMenu'), value: rows.filter((r) => (r.menuItemCount ?? 0) > 0).length },
  ];

  // Rich empty state: guide toward a next action instead of a blank "No records" line. Filtered-out
  // vs genuinely-empty get different guidance.
  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Store className="size-8 text-sb-faint" aria-hidden />
      <p className="text-sm text-sb-muted">{hasFilters ? t('restaurant.emptyFiltered') : t('restaurant.emptyNone')}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-9 items-center gap-1 rounded-sb-sm border border-sb-border px-3 text-sm font-semibold text-sb-fg hover:bg-sb-surface-2 focus-visible:shadow-sb-focus focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
            {t('restaurant.clearFilters')}
          </button>
        ) : (
          <>
            <Link
              href="/admin/import"
              className="inline-flex min-h-9 items-center rounded-sb-sm border border-sb-border px-3 text-sm font-semibold text-sb-fg hover:bg-sb-surface-2 focus-visible:shadow-sb-focus focus-visible:outline-none"
            >
              {t('nav.import')}
            </Link>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setEditing('new');
              }}
              className="inline-flex min-h-9 items-center rounded-sb-sm bg-sb-primary px-3 text-sm font-bold text-sb-primary-foreground focus-visible:shadow-sb-focus focus-visible:outline-none"
            >
              {t('table.create')}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {!list.isError ? <RestaurantStatCards stats={stats} /> : null}
      <div className="flex flex-wrap items-end gap-2">
        <FilterSelect label={t('table.filter')} value={review} anyLabel={t('table.all')} options={REVIEW_STATUSES} onChange={setReview} />
        <FilterSelect label={t('restaurant.filterVerification')} value={verification} anyLabel={t('restaurant.filterAny')} options={VERIFICATION_STATUSES} onChange={setVerification} />
        <FilterSelect label={t('restaurant.filterMenu')} value={menu} anyLabel={t('restaurant.filterAny')} options={RESTAURANT_MENU_STATUSES} onChange={setMenu} />
        <FilterSelect label={t('restaurant.filterSource')} value={source} anyLabel={t('restaurant.filterAny')} options={SOURCE_TYPES} onChange={setSource} />
        <FilterSelect label={t('restaurant.filterHasMenu')} value={hasMenu} anyLabel={t('restaurant.filterAny')} options={['true', 'false']} onChange={setHasMenu} />
        <label className="flex flex-col gap-1 text-xs text-sb-muted">
          <span>{t('fields.city')}</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} className="min-h-10 rounded-sb-sm border border-sb-border bg-sb-surface px-2 text-sm text-sb-fg" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-sb-muted">
          <span>{t('fields.district')}</span>
          <input value={district} onChange={(e) => setDistrict(e.target.value)} className="min-h-10 rounded-sb-sm border border-sb-border bg-sb-surface px-2 text-sm text-sb-fg" />
        </label>
        <div className="ml-auto flex items-end gap-2">
          <div className="inline-flex self-end rounded-sb-sm border border-sb-border p-0.5">
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`min-h-9 rounded-sb-sm px-3 text-sm font-bold ${view === 'list' ? 'bg-sb-primary text-sb-primary-foreground' : 'text-sb-muted'}`}>
              {t('restaurant.viewList')}
            </button>
            <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')} className={`min-h-9 rounded-sb-sm px-3 text-sm font-bold ${view === 'map' ? 'bg-sb-primary text-sb-primary-foreground' : 'text-sb-muted'}`}>
              {t('restaurant.viewMap')}
            </button>
          </div>
          <button type="button" onClick={() => { setError(null); setEditing('new'); }} className="min-h-10 self-end rounded-sb-sm bg-sb-primary px-3 text-sm font-bold text-sb-primary-foreground">
            {t('table.create')}
          </button>
        </div>
      </div>

      {error ? <p role="alert" className="text-sm text-sb-status-avoid-fg">{error}</p> : null}

      {editing ? (
        <div ref={panelRef} tabIndex={-1} className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1 focus-visible:shadow-sb-focus focus-visible:outline-none">
          <RestaurantForm
            initial={editing === 'new' ? undefined : editing}
            onSubmit={onSubmit}
            onCancel={() => setEditing(null)}
            submitting={create.isPending || update.isPending}
          />
        </div>
      ) : null}

      {!list.isPending && !list.isError && view === 'list' ? (
        <div className="flex items-center justify-between gap-2 text-sm text-sb-muted">
          <span className="tabular-nums">{t('restaurant.resultCount', { count: rows.length })}</span>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-9 items-center gap-1 font-semibold text-sb-brand-ink hover:underline focus-visible:shadow-sb-focus focus-visible:outline-none"
            >
              <X className="size-4" aria-hidden />
              {t('restaurant.clearFilters')}
            </button>
          ) : null}
        </div>
      ) : null}

      {list.isPending ? (
        <AdminTableSkeleton />
      ) : list.isError ? (
        <p className="text-sm text-sb-status-avoid-fg">{(list.error as Error).message}</p>
      ) : view === 'map' ? (
        <RestaurantAdminMap rows={list.data ?? []} />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={list.data ?? []}
          onEdit={(row) => { setError(null); setEditing(row); }}
          onDelete={(row) => doDelete(row.id)}
          actionsHeader={t('table.actions')}
          editLabel={t('table.edit')}
          deleteLabel={t('table.delete')}
          emptyLabel={t('table.empty')}
          emptyState={emptyState}
        />
      )}
    </div>
  );
}
