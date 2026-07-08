'use client';
import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { REVIEW_STATUSES, SOURCE_TYPES } from '@/app/admin/admin-messages';
import { FormActions, SelectField, TextAreaField, TextField } from './admin-fields';
import type { ResourceFormProps } from './admin-resource-page';

export interface DishRow {
  id: string;
  canonicalNameVi: string;
  canonicalNameEn: string;
  dishCategory: string;
  cuisine: string;
  descriptionVi?: string | null;
  descriptionEn?: string | null;
  sourceType: string;
  reviewStatus: string;
}

export function DishForm({ initial, onSubmit, onCancel, submitting }: ResourceFormProps<DishRow>) {
  const t = useTranslations('admin');
  const [f, setF] = useState({
    canonicalNameVi: initial?.canonicalNameVi ?? '',
    canonicalNameEn: initial?.canonicalNameEn ?? '',
    dishCategory: initial?.dishCategory ?? '',
    cuisine: initial?.cuisine ?? '',
    descriptionVi: initial?.descriptionVi ?? '',
    descriptionEn: initial?.descriptionEn ?? '',
    sourceType: initial?.sourceType ?? 'manual_seed',
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
      <TextField label={t('fields.category')} value={f.dishCategory} onChange={set('dishCategory')} />
      <TextField label={t('fields.cuisine')} value={f.cuisine} onChange={set('cuisine')} />
      <TextAreaField label={t('fields.descriptionVi')} value={f.descriptionVi} onChange={set('descriptionVi')} />
      <TextAreaField label={t('fields.descriptionEn')} value={f.descriptionEn} onChange={set('descriptionEn')} />
      <SelectField label={t('fields.source')} value={f.sourceType} options={SOURCE_TYPES} onChange={set('sourceType')} />
      <SelectField label={t('fields.reviewStatus')} value={f.reviewStatus} options={REVIEW_STATUSES} onChange={set('reviewStatus')} />
      <FormActions onCancel={onCancel} submitting={submitting} saveLabel={t('table.save')} cancelLabel={t('table.cancel')} />
    </form>
  );
}
