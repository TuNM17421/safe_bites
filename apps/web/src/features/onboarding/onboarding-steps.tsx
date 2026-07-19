'use client';
import { useState } from 'react';
import { IdCard, Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { Chip, SearchInput } from './onboarding-controls';
import type { Allergen, Template } from './use-onboarding-data';
import { useOnboardingDraft } from './use-onboarding-draft';

// v2 onboarding: only two steps survive — allergen pick (StepTemplates) and the
// "app only suggests" acknowledgement (StepDisclaimer). Severity, cross-contact, city, and
// language capture moved to defaults / profile-edit (see build-profile.ts).

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
