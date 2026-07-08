'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AdminColumn } from '@/components/admin/admin-data-table';
import { AdminResourcePage } from '@/features/admin/admin-resource-page';
import { DishRiskForm, type DishRiskRow } from '@/features/admin/dish-risk-form';

// Dish-risks are scoped to a dish (the GET requires ?dishId=), so the admin picks a dish first.
export default function AdminDishRisksPage() {
  const t = useTranslations('admin');
  const [dishId, setDishId] = useState('');
  const columns: AdminColumn<DishRiskRow>[] = [
    { key: 'allergenId', header: t('fields.allergenId') },
    { key: 'riskLevel', header: t('fields.riskLevel') },
    { key: 'confidence', header: t('fields.confidence'), align: 'right' },
    { key: 'reviewStatus', header: t('fields.reviewStatus') },
  ];
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{t('fields.dishId')}</span>
        <input
          value={dishId}
          onChange={(e) => setDishId(e.target.value.trim())}
          className="min-h-10 rounded-sb-sm border border-sb-border-strong bg-sb-surface px-2 text-base"
        />
      </label>
      {dishId ? (
        <AdminResourcePage<DishRiskRow>
          key={dishId}
          basePath="/api/v1/admin/dish-risks"
          extraQuery={{ dishId }}
          columns={columns}
          renderForm={(p) => <DishRiskForm {...p} defaultDishId={dishId} />}
        />
      ) : (
        <p className="text-sm text-sb-muted">{t('table.empty')}</p>
      )}
    </div>
  );
}
