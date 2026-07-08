'use client';
import { useTranslations } from 'next-intl';
import type { AdminColumn } from '@/components/admin/admin-data-table';
import { AdminResourcePage } from '@/features/admin/admin-resource-page';
import { IngredientForm, type IngredientRow } from '@/features/admin/ingredient-form';

export default function AdminIngredientsPage() {
  const t = useTranslations('admin');
  const columns: AdminColumn<IngredientRow>[] = [
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
    { key: 'ingredientCategory', header: t('fields.category') },
    { key: 'reviewStatus', header: t('fields.reviewStatus') },
  ];
  return (
    <AdminResourcePage<IngredientRow>
      basePath="/api/v1/admin/ingredients"
      columns={columns}
      renderForm={(p) => <IngredientForm {...p} />}
    />
  );
}
