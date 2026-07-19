'use client';
import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  RESTAURANT_MENU_STATUSES,
  REVIEW_STATUSES,
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
} from '@/app/admin/admin-messages';
import { CheckboxField, FormActions, optText, SelectField, TextAreaField, TextField } from './admin-fields';
import type { ResourceFormProps } from './admin-resource-page';

export interface RestaurantRow {
  id: string;
  externalSource: string;
  slug: string | null;
  canonicalName: string;
  nameVi: string | null;
  nameEn: string | null;
  amenity: string | null;
  brand: string | null;
  operator: string | null;
  cuisineRaw: string | null;
  cuisineNormalized: string[];
  fullAddress: string | null;
  street: string | null;
  housenumber: string | null;
  ward: string | null;
  district: string | null;
  city: string;
  country: string;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  website: string | null;
  websiteMenu: string | null;
  openingHours: string | null;
  sourceUrl: string | null;
  dataLicense: string | null;
  attributionRequired: boolean;
  menuStatus: string;
  verificationStatus: string;
  reviewStatus: string;
  notes: string | null;
  menuItemCount: number | null;
  ingredientCount: number | null;
}

const opt = optText;

export function RestaurantForm({ initial, onSubmit, onCancel, submitting }: ResourceFormProps<RestaurantRow>) {
  const t = useTranslations('admin');
  const [f, setF] = useState({
    canonicalName: initial?.canonicalName ?? '',
    nameVi: initial?.nameVi ?? '',
    nameEn: initial?.nameEn ?? '',
    slug: initial?.slug ?? '',
    amenity: initial?.amenity ?? '',
    brand: initial?.brand ?? '',
    operator: initial?.operator ?? '',
    cuisineRaw: initial?.cuisineRaw ?? '',
    cuisineNormalized: initial?.cuisineNormalized?.join(', ') ?? '',
    fullAddress: initial?.fullAddress ?? '',
    street: initial?.street ?? '',
    housenumber: initial?.housenumber ?? '',
    ward: initial?.ward ?? '',
    district: initial?.district ?? '',
    city: initial?.city ?? 'hanoi',
    country: initial?.country ?? 'Vietnam',
    lat: initial?.lat != null ? String(initial.lat) : '',
    lon: initial?.lon != null ? String(initial.lon) : '',
    phone: initial?.phone ?? '',
    website: initial?.website ?? '',
    websiteMenu: initial?.websiteMenu ?? '',
    openingHours: initial?.openingHours ?? '',
    sourceUrl: initial?.sourceUrl ?? '',
    dataLicense: initial?.dataLicense ?? '',
    externalSource: initial?.externalSource ?? 'manual_seed',
    reviewStatus: initial?.reviewStatus ?? 'needs_review',
    verificationStatus: initial?.verificationStatus ?? 'unverified',
    menuStatus: initial?.menuStatus ?? 'not_observed',
    notes: initial?.notes ?? '',
  });
  const [attribution, setAttribution] = useState(initial?.attributionRequired ?? false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit({
      canonicalName: f.canonicalName.trim(),
      nameVi: opt(f.nameVi),
      nameEn: opt(f.nameEn),
      slug: opt(f.slug),
      amenity: opt(f.amenity),
      brand: opt(f.brand),
      operator: opt(f.operator),
      cuisineRaw: opt(f.cuisineRaw),
      cuisineNormalized: f.cuisineNormalized.split(',').map((s) => s.trim()).filter(Boolean),
      fullAddress: opt(f.fullAddress),
      street: opt(f.street),
      housenumber: opt(f.housenumber),
      ward: opt(f.ward),
      district: f.district.trim(),
      city: f.city.trim() || 'hanoi',
      country: f.country.trim() || 'Vietnam',
      lat: f.lat.trim() ? Number(f.lat) : undefined,
      lon: f.lon.trim() ? Number(f.lon) : undefined,
      phone: opt(f.phone),
      website: opt(f.website),
      websiteMenu: opt(f.websiteMenu),
      openingHours: opt(f.openingHours),
      sourceUrl: opt(f.sourceUrl),
      dataLicense: opt(f.dataLicense),
      attributionRequired: attribution,
      externalSource: f.externalSource,
      reviewStatus: f.reviewStatus,
      verificationStatus: f.verificationStatus,
      menuStatus: f.menuStatus,
      notes: opt(f.notes),
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <TextField label={t('fields.canonicalName')} value={f.canonicalName} onChange={set('canonicalName')} required />
      <TextField label={t('fields.slug')} value={f.slug} onChange={set('slug')} />
      <TextField label={t('fields.nameVi')} value={f.nameVi} onChange={set('nameVi')} />
      <TextField label={t('fields.nameEn')} value={f.nameEn} onChange={set('nameEn')} />
      <TextField label={t('fields.amenity')} value={f.amenity} onChange={set('amenity')} />
      <TextField label={t('fields.cuisineRaw')} value={f.cuisineRaw} onChange={set('cuisineRaw')} />
      <TextField label={t('fields.cuisineNormalized')} value={f.cuisineNormalized} onChange={set('cuisineNormalized')} />
      <TextField label={t('fields.brand')} value={f.brand} onChange={set('brand')} />
      <TextField label={t('fields.operator')} value={f.operator} onChange={set('operator')} />
      <TextField label={t('fields.fullAddress')} value={f.fullAddress} onChange={set('fullAddress')} />
      <TextField label={t('fields.street')} value={f.street} onChange={set('street')} />
      <TextField label={t('fields.housenumber')} value={f.housenumber} onChange={set('housenumber')} />
      <TextField label={t('fields.ward')} value={f.ward} onChange={set('ward')} />
      <TextField label={t('fields.district')} value={f.district} onChange={set('district')} required />
      <TextField label={t('fields.city')} value={f.city} onChange={set('city')} />
      <TextField label={t('fields.country')} value={f.country} onChange={set('country')} />
      <TextField label={t('fields.lat')} type="number" value={f.lat} onChange={set('lat')} />
      <TextField label={t('fields.lon')} type="number" value={f.lon} onChange={set('lon')} />
      <TextField label={t('fields.phone')} value={f.phone} onChange={set('phone')} />
      <TextField label={t('fields.website')} value={f.website} onChange={set('website')} />
      <TextField label={t('fields.websiteMenu')} value={f.websiteMenu} onChange={set('websiteMenu')} />
      <TextField label={t('fields.openingHours')} value={f.openingHours} onChange={set('openingHours')} />
      <TextField label={t('fields.sourceUrl')} value={f.sourceUrl} onChange={set('sourceUrl')} />
      <TextField label={t('fields.dataLicense')} value={f.dataLicense} onChange={set('dataLicense')} />
      <SelectField label={t('fields.externalSource')} value={f.externalSource} options={SOURCE_TYPES} onChange={set('externalSource')} />
      <SelectField label={t('fields.reviewStatus')} value={f.reviewStatus} options={REVIEW_STATUSES} onChange={set('reviewStatus')} />
      <SelectField label={t('fields.verificationStatus')} value={f.verificationStatus} options={VERIFICATION_STATUSES} onChange={set('verificationStatus')} />
      <SelectField label={t('fields.menuStatus')} value={f.menuStatus} options={RESTAURANT_MENU_STATUSES} onChange={set('menuStatus')} />
      <CheckboxField label={t('fields.attributionRequired')} checked={attribution} onChange={setAttribution} />
      <TextAreaField label={t('fields.notes')} value={f.notes} onChange={set('notes')} />
      <FormActions onCancel={onCancel} submitting={submitting} saveLabel={t('table.save')} cancelLabel={t('table.cancel')} />
    </form>
  );
}
