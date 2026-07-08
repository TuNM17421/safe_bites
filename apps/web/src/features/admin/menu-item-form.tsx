'use client';
import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  CAN_CUSTOMIZE,
  MENU_ITEM_STATUSES,
  MENU_SOURCE_TYPES,
  SHARED_COOKWARE,
  SHARED_FRYER,
} from '@/app/admin/admin-messages';
import { FormActions, optNum, optText, SelectField, TextAreaField, TextField } from './admin-fields';
import type { ResourceFormProps } from './admin-resource-page';
import type { MenuItemRow } from './menu-admin-hooks';

const opt = optText;
const num = optNum;

export function MenuItemForm({ initial, onSubmit, onCancel, submitting }: ResourceFormProps<MenuItemRow>) {
  const t = useTranslations('admin');
  const [f, setF] = useState({
    rawName: initial?.rawName ?? '',
    nameVi: initial?.nameVi ?? '',
    nameEn: initial?.nameEn ?? '',
    dishId: initial?.dishId ?? '',
    section: initial?.section ?? '',
    descriptionVi: initial?.descriptionVi ?? '',
    descriptionEn: initial?.descriptionEn ?? '',
    priceAmount: initial?.priceAmount != null ? String(initial.priceAmount) : '',
    currency: initial?.currency ?? 'VND',
    menuSourceType: initial?.menuSourceType ?? 'admin_manual',
    menuSourceUrl: initial?.menuSourceUrl ?? '',
    mappingConfidence: initial?.mappingConfidence != null ? String(initial.mappingConfidence) : '',
    menuStatus: initial?.menuStatus ?? 'observed_not_verified',
    sharedCookware: initial?.sharedCookware ?? 'unknown',
    sharedFryer: initial?.sharedFryer ?? 'unknown',
    canCustomize: initial?.canCustomize ?? 'unknown',
    ingredientNotes: initial?.ingredientNotes ?? '',
    customizationNotes: initial?.customizationNotes ?? '',
    notes: initial?.notes ?? '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit({
      rawName: f.rawName.trim(),
      nameVi: opt(f.nameVi),
      nameEn: opt(f.nameEn),
      dishId: opt(f.dishId),
      section: opt(f.section),
      descriptionVi: opt(f.descriptionVi),
      descriptionEn: opt(f.descriptionEn),
      priceAmount: num(f.priceAmount),
      currency: f.currency.trim() || 'VND',
      menuSourceType: f.menuSourceType,
      menuSourceUrl: opt(f.menuSourceUrl),
      mappingConfidence: num(f.mappingConfidence),
      menuStatus: f.menuStatus,
      sharedCookware: f.sharedCookware,
      sharedFryer: f.sharedFryer,
      canCustomize: f.canCustomize,
      ingredientNotes: opt(f.ingredientNotes),
      customizationNotes: opt(f.customizationNotes),
      notes: opt(f.notes),
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <TextField label={t('fields.rawName')} value={f.rawName} onChange={set('rawName')} required />
      <TextField label={t('fields.dishId')} value={f.dishId} onChange={set('dishId')} />
      <TextField label={t('fields.nameVi')} value={f.nameVi} onChange={set('nameVi')} />
      <TextField label={t('fields.nameEn')} value={f.nameEn} onChange={set('nameEn')} />
      <TextField label={t('fields.section')} value={f.section} onChange={set('section')} />
      <TextField label={t('fields.priceAmount')} type="number" value={f.priceAmount} onChange={set('priceAmount')} />
      <TextField label={t('fields.currency')} value={f.currency} onChange={set('currency')} />
      <SelectField label={t('fields.menuSourceType')} value={f.menuSourceType} options={MENU_SOURCE_TYPES} onChange={set('menuSourceType')} />
      <TextField label={t('fields.menuSourceUrl')} value={f.menuSourceUrl} onChange={set('menuSourceUrl')} />
      <TextField label={t('fields.mappingConfidence')} type="number" step="0.01" value={f.mappingConfidence} onChange={set('mappingConfidence')} />
      <SelectField label={t('fields.menuStatus')} value={f.menuStatus} options={MENU_ITEM_STATUSES} onChange={set('menuStatus')} />
      <SelectField label={t('fields.sharedCookware')} value={f.sharedCookware} options={SHARED_COOKWARE} onChange={set('sharedCookware')} />
      <SelectField label={t('fields.sharedFryer')} value={f.sharedFryer} options={SHARED_FRYER} onChange={set('sharedFryer')} />
      <SelectField label={t('fields.canCustomize')} value={f.canCustomize} options={CAN_CUSTOMIZE} onChange={set('canCustomize')} />
      <TextAreaField label={t('fields.descriptionVi')} value={f.descriptionVi} onChange={set('descriptionVi')} />
      <TextAreaField label={t('fields.descriptionEn')} value={f.descriptionEn} onChange={set('descriptionEn')} />
      <TextAreaField label={t('fields.ingredientNotes')} value={f.ingredientNotes} onChange={set('ingredientNotes')} />
      <TextAreaField label={t('fields.customizationNotes')} value={f.customizationNotes} onChange={set('customizationNotes')} />
      <TextAreaField label={t('fields.notes')} value={f.notes} onChange={set('notes')} />
      <FormActions onCancel={onCancel} submitting={submitting} saveLabel={t('table.save')} cancelLabel={t('table.cancel')} />
    </form>
  );
}
