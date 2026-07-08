'use client';
import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { REVIEW_STATUSES } from '@/app/admin/admin-messages';
import { FormActions, SelectField, TextField } from './admin-fields';
import type { ResourceFormProps } from './admin-resource-page';

export interface IngredientRow {
  id: string;
  canonicalNameVi: string;
  canonicalNameEn: string;
  ingredientCategory: string;
  reviewStatus: string;
}

export function IngredientForm({ initial, onSubmit, onCancel, submitting }: ResourceFormProps<IngredientRow>) {
  const t = useTranslations('admin');
  const [f, setF] = useState({
    canonicalNameVi: initial?.canonicalNameVi ?? '',
    canonicalNameEn: initial?.canonicalNameEn ?? '',
    ingredientCategory: initial?.ingredientCategory ?? '',
    reviewStatus: initial?.reviewStatus ?? 'needs_review',
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit(f);
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <TextField label={t('fields.nameVi')} value={f.canonicalNameVi} onChange={set('canonicalNameVi')} />
      <TextField label={t('fields.nameEn')} value={f.canonicalNameEn} onChange={set('canonicalNameEn')} />
      <TextField label={t('fields.category')} value={f.ingredientCategory} onChange={set('ingredientCategory')} />
      <SelectField label={t('fields.reviewStatus')} value={f.reviewStatus} options={REVIEW_STATUSES} onChange={set('reviewStatus')} />
      <FormActions onCancel={onCancel} submitting={submitting} saveLabel={t('table.save')} cancelLabel={t('table.cancel')} />
    </form>
  );
}
