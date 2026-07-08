'use client';
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { LanguageCode, Severity } from '@safebite/domain';
import { routing } from '@/i18n/routing';
import { SafetyNotice } from '@/components/safety/safety-notice';
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

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm focus-visible:shadow-sb-focus ${active ? 'border-sb-primary bg-sb-primary text-sb-primary-foreground' : 'border-sb-border text-sb-fg'}`}
    >
      {children}
    </button>
  );
}

export function StepTemplates({ templates, allergens }: { templates: Template[]; allergens: Allergen[] }) {
  const t = useTranslations('onboarding');
  const lang = useLang();
  const { selectedProfileIds, selectedAllergenIds, toggleProfile, toggleAllergen } = useOnboardingDraft();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">{t('chooseAllergens')}</h2>
      <div className="flex flex-wrap gap-2">
        {allergens.map((a) => (
          <Chip key={a.id} active={selectedAllergenIds.includes(a.id)} onClick={() => toggleAllergen(a.id)}>
            {a.name[lang]}
          </Chip>
        ))}
      </div>
      <h2 className="mt-2 font-semibold">{t('chooseProfiles')}</h2>
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
  if (selected.length === 0) return <p className="text-sm text-sb-muted">{t('noAllergensSelected')}</p>;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold">{t('setSeverity')}</h2>
      {selected.map((a) => (
        <div key={a.id} className="flex flex-col gap-2">
          <p className="text-sm font-medium">{a.name[lang]}</p>
          <div className="flex flex-wrap gap-2">
            {SEVERITIES.map((s) => (
              <Chip key={s} active={severity[a.id] === s} onClick={() => setSeverity(a.id, s)}>
                {tSev(s)}
              </Chip>
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
  if (selected.length === 0) return <p className="text-sm text-sb-muted">{t('noAllergensSelected')}</p>;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold">{t('setCrossContact')}</h2>
      {selected.map((a) => (
        <div key={a.id} className="flex flex-col gap-2">
          <p className="text-sm font-medium">{a.name[lang]}</p>
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
      <h2 className="font-semibold">{t('chooseCity')}</h2>
      <div className="flex flex-wrap gap-2">
        {cities.map((c) => (
          <Chip key={c} active={destinationCity === c} onClick={() => setCity(c)}>
            {c}
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
      <h2 className="font-semibold">{t('chooseLanguage')}</h2>
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

export function StepDisclaimer({ saving, onFinish }: { saving: boolean; onFinish: () => void }) {
  const t = useTranslations('onboarding');
  const { accepted, setAccepted } = useOnboardingDraft();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">{t('reviewDisclaimer')}</h2>
      <SafetyNotice />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
        {t('acceptDisclaimer')}
      </label>
      <button
        type="button"
        disabled={!accepted || saving}
        onClick={onFinish}
        className="rounded-sb-md bg-sb-primary px-4 py-3 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus disabled:opacity-40"
      >
        {saving ? t('saving') : t('finish')}
      </button>
    </section>
  );
}
