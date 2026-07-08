'use client';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AdminDataTable, type AdminColumn } from '@/components/admin/admin-data-table';
import { REVIEW_STATUSES } from '@/app/admin/admin-messages';
import { useAdminResource } from './use-admin-resource';

export interface ResourceFormProps<T> {
  initial?: T;
  onSubmit: (body: unknown) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

// Generic list + filter + create/edit panel for an admin CRUD resource. Entity-specific
// columns + form are supplied by the caller (DRY across dishes/ingredients/dish-risks).
export function AdminResourcePage<T extends { id: string }>({
  basePath,
  columns,
  extraQuery,
  renderForm,
}: {
  basePath: string;
  columns: AdminColumn<T>[];
  extraQuery?: Record<string, string>;
  renderForm: (props: ResourceFormProps<T>) => ReactNode;
}) {
  const t = useTranslations('admin');
  const [review, setReview] = useState('all');
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { list, create, update, remove } = useAdminResource<T>(basePath, { review_status: review, ...(extraQuery ?? {}) });

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-sb-muted" htmlFor="review-filter">
          {t('table.filter')}
        </label>
        <select
          id="review-filter"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          className="min-h-10 rounded-sb-sm border border-sb-border bg-sb-surface px-2 text-sm"
        >
          <option value="all">{t('table.all')}</option>
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditing('new');
          }}
          className="ml-auto min-h-10 rounded-sb-sm bg-sb-primary px-3 text-sm font-bold text-sb-primary-foreground"
        >
          {t('table.create')}
        </button>
      </div>

      {editing ? (
        <div className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
          {error ? <p className="mb-3 text-sm text-sb-status-avoid-fg">{error}</p> : null}
          {renderForm({
            initial: editing === 'new' ? undefined : editing,
            onSubmit,
            onCancel: () => setEditing(null),
            submitting: create.isPending || update.isPending,
          })}
        </div>
      ) : null}

      {list.isPending ? (
        <p className="text-sm text-sb-muted">{t('table.loading')}</p>
      ) : list.isError ? (
        <p className="text-sm text-sb-status-avoid-fg">{(list.error as Error).message}</p>
      ) : (
        <AdminDataTable
          columns={columns}
          rows={list.data ?? []}
          onEdit={(row) => {
            setError(null);
            setEditing(row);
          }}
          onDelete={(row) => {
            if (window.confirm(t('table.confirmDelete'))) remove.mutate(row.id);
          }}
          actionsHeader={t('table.actions')}
          editLabel={t('table.edit')}
          deleteLabel={t('table.delete')}
          emptyLabel={t('table.empty')}
        />
      )}
    </div>
  );
}
