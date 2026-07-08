'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MenuItemAdminPanel } from '@/features/admin/menu-item-admin-panel';
import { useRestaurant } from '@/features/admin/menu-admin-hooks';
import { RestaurantForm } from '@/features/admin/restaurant-form';

export default function AdminRestaurantDetailPage() {
  const t = useTranslations('admin');
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = String(params.restaurantId);
  const { query, update } = useRestaurant(restaurantId);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (body: unknown) => {
    setError(null);
    try {
      await update.mutateAsync(body);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const r = query.data;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/restaurants" className="text-sm text-sb-muted hover:text-sb-fg">
        ← {t('table.back')}
      </Link>

      {query.isPending ? (
        <p className="text-sm text-sb-muted">{t('table.loading')}</p>
      ) : query.isError || !r ? (
        <p className="text-sm text-sb-status-avoid-fg">{t('restaurant.notFound')}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-extrabold text-sb-fg">{r.canonicalName}</h1>
            <span className="text-xs text-sb-faint">
              {r.verificationStatus} · {r.menuStatus} · {r.reviewStatus}
            </span>
            <button
              type="button"
              onClick={() => { setError(null); setEditing((v) => !v); }}
              className="ml-auto min-h-10 rounded-sb-sm border border-sb-border px-3 text-sm text-sb-fg hover:bg-sb-surface-2"
            >
              {t('restaurant.editRestaurant')}
            </button>
          </div>

          {error ? <p role="alert" className="text-sm text-sb-status-avoid-fg">{error}</p> : null}

          {editing ? (
            <div className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
              <RestaurantForm initial={r} onSubmit={onSubmit} onCancel={() => setEditing(false)} submitting={update.isPending} />
            </div>
          ) : null}

          <MenuItemAdminPanel restaurantId={restaurantId} />
        </>
      )}
    </div>
  );
}
