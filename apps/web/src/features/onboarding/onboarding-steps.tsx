'use client';
import { useState } from 'react';
import { IdCard, Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { LanguageCode, Severity } from '@safebite/domain';
import { routing } from '@/i18n/routing';
import { Chip, SearchInput, SeverityRadio } from './onboarding-controls';
import type { Allergen, Template } from './use-onboarding-data';
import { useOnboardingDraft } from './use-onboarding-draft';

const SEVERITIES: Severity[] = ['mild', 'moderate', 'severe', 'anaphylaxis_risk'];
const CROSS_OPTIONS: Array<{ v: boolean | 'not_sure'; key: string }> = [
  { v: true, key: 'yes' },
  { v: false, key: 'no' },
  { v: 'not_sure', key: 'notSure' },
];

function useLang(): LanguageCode {
  return useLocale() === 'vi' ? 'vi' : 'en';
}

export function StepTemplates({ templates, allergens }: { templates: Template[]; allergens: Allergen[] }) {
  const t = useTranslations('onboarding');
  const lang = useLang();
  const [q, setQ] = useState('');
  const { selectedProfileIds, selectedAllergenIds, toggleProfile, toggleAllergen } = useOnboardingDraft();
  const query = q.trim().toLowerCase();
  const filtered = allergens.filter(
    (a) =>
      query === '' ||
      [a.name.en, a.name.vi, ...a.aliases.en, ...a.aliases.vi].join(' ').toLowerCase().includes(query),
  );
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sb-title font-bold text-sb-fg">{t('allergensQuestion')}</h2>
      <SearchInput value={q} onChange={setQ} placeholder={t('searchAllergens')} />
      {filtered.length === 0 ? (
        <p className="text-sb-body-s text-sb-muted">{t('noSearchResults')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filtered.map((a) => (
            <Chip key={a.id} active={selectedAllergenIds.includes(a.id)} onClick={() => toggleAllergen(a.id)}>
              {a.name[lang]}
            </Chip>
          ))}
        </div>
      )}
      <p className="text-sb-caption text-sb-faint">{t('allergensHint')}</p>
      <h2 className="mt-2 text-sb-title font-bold text-sb-fg">{t('chooseProfiles')}</h2>
      <div className="flex flex-wrap gap-2">
        {templates.map((tpl) => (
          <Chip key={tpl.id} active={selectedProfileIds.includes(tpl.id)} onClick={() => toggleProfile(tpl.id)}>
            {tpl.name[lang]}
          </Chip>
        ))}
      </div>
    </section>
  );
}

export function StepSeverity({ allergens }: { allergens: Allergen[] }) {
  const t = useTranslations('onboarding');
  const tSev = useTranslations('severity');
  const lang = useLang();
  const { selectedAllergenIds, severity, setSeverity } = useOnboardingDraft();
  const selected = allergens.filter((a) => selectedAllergenIds.includes(a.id));
  if (selected.length === 0) return <p className="text-sb-body-s text-sb-muted">{t('noAllergensSelected')}</p>;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sb-title font-bold text-sb-fg">{t('setSeverity')}</h2>
      {selected.map((a) => (
        <div key={a.id} className="flex flex-col gap-2">
          <p className="text-sb-body-s font-semibold text-sb-fg">{a.name[lang]}</p>
          <div role="radiogroup" aria-label={a.name[lang]} className="flex flex-col gap-2">
            {SEVERITIES.map((s) => (
              <SeverityRadio
                key={s}
                selected={severity[a.id] === s}
                onClick={() => setSeverity(a.id, s)}
                label={tSev(s)}
                note={s === 'anaphylaxis_risk' ? t('anaphylaxisNote') : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function StepCrossContact({ allergens }: { allergens: Allergen[] }) {
  const t = useTranslations('onboarding');
  const lang = useLang();
  const { selectedAllergenIds, crossContact, setCrossContact } = useOnboardingDraft();
  const selected = allergens.filter((a) => selectedAllergenIds.includes(a.id));
  if (selected.length === 0) return <p className="text-sb-body-s text-sb-muted">{t('noAllergensSelected')}</p>;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sb-title font-bold text-sb-fg">{t('setCrossContact')}</h2>
      {selected.map((a) => (
        <div key={a.id} className="flex flex-col gap-2">
          <p className="text-sb-body-s font-semibold text-sb-fg">{a.name[lang]}</p>
          <div className="flex flex-wrap gap-2">
            {CROSS_OPTIONS.map((o) => (
              <Chip key={o.key} active={crossContact[a.id] === o.v} onClick={() => setCrossContact(a.id, o.v)}>
                {t(o.key)}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function StepCity({ cities }: { cities: string[] }) {
  const t = useTranslations('onboarding');
  const { destinationCity, setCity } = useOnboardingDraft();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sb-title font-bold text-sb-fg">{t('chooseCity')}</h2>
      <div className="flex flex-wrap gap-2">
        {cities.map((c) => (
          <Chip key={c} active={destinationCity === c} onClick={() => setCity(c)}>
            <span className="capitalize">{c.replace(/_/g, ' ')}</span>
          </Chip>
        ))}
      </div>
    </section>
  );
}

export function StepLanguage() {
  const t = useTranslations('onboarding');
  const { language, setLanguage } = useOnboardingDraft();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sb-title font-bold text-sb-fg">{t('chooseLanguage')}</h2>
      <div className="flex flex-wrap gap-2">
        {routing.locales.map((l) => (
          <Chip key={l} active={language === l} onClick={() => setLanguage(l)}>
            {l === 'vi' ? 'Tiếng Việt' : 'English'}
          </Chip>
        ))}
      </div>
    </section>
  );
}

export function StepDisclaimer() {
  const t = useTranslations('onboarding');
  const tSafety = useTranslations('safety');
  const { accepted, setAccepted } = useOnboardingDraft();
  return (
    <section className="flex flex-col gap-3">
      <section className="rounded-sb-md border border-sb-border bg-sb-brand-soft p-4">
        <h3 className="flex items-center gap-2 text-sb-title font-bold text-sb-fg">
          <Shield aria-hidden className="size-5 text-sb-brand" />
          {t('safetyFirst')}
        </h3>
        <p className="mt-2 text-sb-body-s text-sb-muted">{tSafety('disclaimer')}</p>
      </section>
      <p className="flex items-start gap-2 rounded-sb-sm border border-sb-border bg-sb-surface-3 p-3 text-sb-body-s text-sb-muted">
        <IdCard aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t('offlineSaveNotice')}
      </p>
      <label className="flex min-h-sb-tap items-start gap-3 text-sb-body-s text-sb-fg">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 size-5 accent-sb-primary focus-visible:shadow-sb-focus"
        />
        {t('acceptDisclaimer')}
      </label>
    </section>
  );
}
