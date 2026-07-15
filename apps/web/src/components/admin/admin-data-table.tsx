'use client';
import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

// Generic desktop-first admin table (§13 `AdminDataTable`, phase-12). Presentational and
// i18n-agnostic: the parent page (which owns `useTranslations('admin')`) passes already-
// translated header/label strings and a `render` per column, so this file needs no message
// keys and no data assumptions. Design system v2: sb-* tokens + lucide only (no raw hex,
// no emoji). Status cells render via the phase-10 StatusBadge passed through `render`.

export interface AdminColumn<T> {
  key: string;
  header: string; // already translated by the caller
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right';
}

export function AdminDataTable<T extends { id: string }>({
  columns,
  rows,
  onEdit,
  onDelete,
  actionsHeader,
  editLabel,
  deleteLabel,
  emptyLabel,
  emptyState,
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  actionsHeader?: string;
  editLabel: string;
  deleteLabel: string;
  emptyLabel: string;
  // Optional rich empty state (icon + message + CTA). Falls back to the plain emptyLabel line so
  // other admin tables that don't pass one are unaffected.
  emptyState?: ReactNode;
}) {
  const hasActions = Boolean(onEdit || onDelete);
  const colSpan = columns.length + (hasActions ? 1 : 0);
  const th = 'px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-sb-faint';

  return (
    <div className="overflow-x-auto rounded-sb-md border border-sb-border shadow-sb-e1">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-sb-border bg-sb-surface-2">
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`${th} ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                {column.header}
              </th>
            ))}
            {hasActions ? (
              <th scope="col" className={`${th} text-right`}>
                {actionsHeader}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8">
                {emptyState ?? <p className="text-center text-sb-muted">{emptyLabel}</p>}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-sb-border last:border-0 hover:bg-sb-surface-2">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-2.5 align-middle text-sb-fg ${column.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                  >
                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                  </td>
                ))}
                {hasActions ? (
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      {onEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          aria-label={editLabel}
                          className="grid size-9 place-items-center rounded-sb-sm border border-sb-border text-sb-muted hover:bg-sb-surface-2 focus-visible:shadow-sb-focus focus-visible:outline-none"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          aria-label={deleteLabel}
                          className="grid size-9 place-items-center rounded-sb-sm border border-sb-status-avoid-border text-sb-status-avoid-fg hover:bg-sb-status-avoid-bg focus-visible:shadow-sb-focus focus-visible:outline-none"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
