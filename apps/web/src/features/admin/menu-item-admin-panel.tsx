'use client';
import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AllergenStatusEditor } from './menu-item-allergen-status-editor';
import { MenuItemForm } from './menu-item-form';
import { useMenuItems, type MenuItemRow } from './menu-admin-hooks';

export function MenuItemAdminPanel({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations('admin');
  const { list, create, update, remove } = useMenuItems(restaurantId);
  const [editing, setEditing] = useState<MenuItemRow | 'new' | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Move keyboard/SR focus into the create/edit form when it opens.
  useEffect(() => {
    if (editing) panelRef.current?.focus();
  }, [editing]);

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

  const doDelete = async (id: string) => {
    if (!window.confirm(t('table.confirmDelete'))) return;
    setError(null);
    try {
      await remove.mutateAsync(id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const rows = list.data ?? [];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-sb-fg">{t('restaurant.menuItems')}</h2>
        <button
          type="button"
          onClick={() => { setError(null); setEditing('new'); }}
          className="ml-auto min-h-10 rounded-sb-sm bg-sb-primary px-3 text-sm font-bold text-sb-primary-foreground"
        >
          {t('restaurant.newMenuItem')}
        </button>
      </div>

      {error ? <p role="alert" className="text-sm text-sb-status-avoid-fg">{error}</p> : null}

      {editing ? (
        <div ref={panelRef} tabIndex={-1} className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1 focus-visible:shadow-sb-focus focus-visible:outline-none">
          <MenuItemForm
            initial={editing === 'new' ? undefined : editing}
            onSubmit={onSubmit}
            onCancel={() => setEditing(null)}
            submitting={create.isPending || update.isPending}
          />
        </div>
      ) : null}

      {list.isPending ? (
        <p className="text-sm text-sb-muted">{t('table.loading')}</p>
      ) : list.isError ? (
        <p className="text-sm text-sb-status-avoid-fg">{(list.error as Error).message}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-sb-muted">{t('restaurant.noMenuItems')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((m) => (
            <li key={m.id} className="rounded-sb-md border border-sb-border bg-sb-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sb-fg">{m.nameEn || m.rawName}</span>
                <span className="text-xs text-sb-faint">
                  {m.id}
                  {m.dishId ? ` · ${m.dishId}` : ''} · {m.menuStatus}
                </span>
                <span className="rounded-sb-sm bg-sb-surface-2 px-2 py-0.5 text-xs text-sb-muted">
                  {t('restaurant.allergenStatuses')}: {m.allergenStatuses?.length ?? 0}
                </span>
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => (v === m.id ? null : m.id))}
                    aria-expanded={expanded === m.id}
                    aria-controls={`allergen-editor-${m.id}`}
                    className="min-h-9 rounded-sb-sm border border-sb-border px-2 text-xs text-sb-fg hover:bg-sb-surface-2"
                  >
                    {t('restaurant.allergenStatuses')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setError(null); setEditing(m); }}
                    aria-label={t('table.edit')}
                    className="grid size-9 place-items-center rounded-sb-sm border border-sb-border text-sb-muted hover:bg-sb-surface-2 focus-visible:shadow-sb-focus focus-visible:outline-none"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => doDelete(m.id)}
                    aria-label={t('table.delete')}
                    className="grid size-9 place-items-center rounded-sb-sm border border-sb-status-avoid-border text-sb-status-avoid-fg hover:bg-sb-status-avoid-bg focus-visible:shadow-sb-focus focus-visible:outline-none"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
              {expanded === m.id ? (
                <div id={`allergen-editor-${m.id}`} className="mt-3 border-t border-sb-border pt-3">
                  <AllergenStatusEditor menuItemId={m.id} restaurantId={restaurantId} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
