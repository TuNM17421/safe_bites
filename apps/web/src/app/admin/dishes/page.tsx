'use client';
import { useTranslations } from 'next-intl';
import type { AdminColumn } from '@/components/admin/admin-data-table';
import { AdminResourcePage } from '@/features/admin/admin-resource-page';
import { DishForm, type DishRow } from '@/features/admin/dish-form';

export default function AdminDishesPage() {
  const t = useTranslations('admin');
  const columns: AdminColumn<DishRow>[] = [
    {
      key: 'canonicalNameEn',
      header: t('fields.nameEn'),
      render: (r) => (
        <span>
          <span className="font-semibold">{r.canonicalNameEn}</span>
          <span className="block text-xs text-sb-faint">{r.id}</span>
        </span>
      ),
    },
    { key: 'cuisine', header: t('fields.cuisine') },
    { key: 'reviewStatus', header: t('fields.reviewStatus') },
  ];
  return (
    <AdminResourcePage<DishRow>
      basePath="/api/v1/admin/dishes"
      columns={columns}
      renderForm={(p) => <DishForm {...p} />}
    />
  );
}
