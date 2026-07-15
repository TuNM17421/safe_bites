'use client';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronsUpDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';

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
  sortable?: boolean; // when true (+ onSort provided), the header toggles sorting on this key
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
  sortKey,
  sortDir,
  onSort,
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
  // Sorting is presentational here: the parent owns the state + does the actual sort (it knows the
  // value types); this renders the sortable header affordance + aria-sort and calls onSort(key).
  sortKey?: string | null;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}) {
  const hasActions = Boolean(onEdit || onDelete);
  const colSpan = columns.length + (hasActions ? 1 : 0);
  const th = 'px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-sb-faint';

  return (
    <div className="overflow-x-auto rounded-sb-md border border-sb-border shadow-sb-e1">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-sb-border bg-sb-surface-2">
            {columns.map((column) => {
              const canSort = Boolean(column.sortable && onSort);
              const isActive = canSort && column.key === sortKey;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={canSort ? (isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                  className={`${th} ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {canSort ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(column.key)}
                      className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-sb-fg focus-visible:shadow-sb-focus focus-visible:outline-none ${column.align === 'right' ? 'flex-row-reverse' : ''} ${isActive ? 'text-sb-fg' : ''}`}
                    >
                      {column.header}
                      {isActive ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="size-3.5" aria-hidden />
                        ) : (
                          <ChevronDown className="size-3.5" aria-hidden />
                        )
                      ) : (
                        // Discoverability hint (column is sortable). Use sb-muted (meets WCAG 1.4.11
                        // 3:1) not a faint/low-opacity glyph; the up/down SHAPE distinguishes it from
                        // the active directional chevron, so it needn't be dimmed to read as inactive.
                        <ChevronsUpDown className="size-3.5 text-sb-muted" aria-hidden />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
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
