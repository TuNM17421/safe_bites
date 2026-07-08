'use client';
import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { EVIDENCE_TYPES, REVIEW_STATUSES, RISK_LEVELS, SOURCE_TYPES } from '@/app/admin/admin-messages';
import { FormActions, SelectField, TextAreaField, TextField } from './admin-fields';
import type { ResourceFormProps } from './admin-resource-page';

export interface DishRiskRow {
  id: string;
  dishId: string;
  allergenId: string;
  riskLevel: string;
  confidence: number;
  reasonVi: string;
  reasonEn: string;
  recommendedActionVi: string;
  recommendedActionEn: string;
  evidenceType: string;
  sourceType: string;
  reviewStatus: string;
}

export function DishRiskForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  defaultDishId,
}: ResourceFormProps<DishRiskRow> & { defaultDishId?: string }) {
  const t = useTranslations('admin');
  const [f, setF] = useState({
    dishId: initial?.dishId ?? defaultDishId ?? '',
    allergenId: initial?.allergenId ?? '',
    riskLevel: initial?.riskLevel ?? 'possible',
    confidence: String(initial?.confidence ?? 0.7),
    reasonVi: initial?.reasonVi ?? '',
    reasonEn: initial?.reasonEn ?? '',
    recommendedActionVi: initial?.recommendedActionVi ?? '',
    recommendedActionEn: initial?.recommendedActionEn ?? '',
    evidenceType: initial?.evidenceType ?? 'manual_seed',
    sourceType: initial?.sourceType ?? 'manual_seed',
    reviewStatus: initial?.reviewStatus ?? 'needs_review',
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit({ ...f, confidence: Number(f.confidence) });
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <TextField label={t('fields.dishId')} value={f.dishId} onChange={set('dishId')} />
      <TextField label={t('fields.allergenId')} value={f.allergenId} onChange={set('allergenId')} />
      <SelectField label={t('fields.riskLevel')} value={f.riskLevel} options={RISK_LEVELS} onChange={set('riskLevel')} />
      <TextField label={t('fields.confidence')} type="number" value={f.confidence} onChange={set('confidence')} />
      <TextAreaField label={t('fields.reasonVi')} value={f.reasonVi} onChange={set('reasonVi')} />
      <TextAreaField label={t('fields.reasonEn')} value={f.reasonEn} onChange={set('reasonEn')} />
      <TextAreaField label={t('fields.actionVi')} value={f.recommendedActionVi} onChange={set('recommendedActionVi')} />
      <TextAreaField label={t('fields.actionEn')} value={f.recommendedActionEn} onChange={set('recommendedActionEn')} />
      <SelectField label={t('fields.evidence')} value={f.evidenceType} options={EVIDENCE_TYPES} onChange={set('evidenceType')} />
      <SelectField label={t('fields.source')} value={f.sourceType} options={SOURCE_TYPES} onChange={set('sourceType')} />
      <SelectField label={t('fields.reviewStatus')} value={f.reviewStatus} options={REVIEW_STATUSES} onChange={set('reviewStatus')} />
      <FormActions onCancel={onCancel} submitting={submitting} saveLabel={t('table.save')} cancelLabel={t('table.cancel')} />
    </form>
  );
}
