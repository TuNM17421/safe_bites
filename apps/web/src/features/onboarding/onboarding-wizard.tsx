'use client';
import { useState } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { ALLERGY_ALLERGEN_IDS, type LanguageCode } from '@safebite/domain';
import { buildAllergyCard } from '@/features/allergy-card/build-allergy-card';
import { useRouter } from '@/i18n/navigation';
import { allergyCardRepo, profileRepo } from '@/lib/local-repo';
import { useProfileStore } from '@/lib/profile-store';
import { buildProfile } from './build-profile';
import { StepDisclaimer, StepTemplates } from './onboarding-steps';
import { useAllergens, useProfileTemplates } from './use-onboarding-data';
import { useOnboardingDraft } from './use-onboarding-draft';

// v2: onboarding is 2 steps — (1) pick allergens, (2) acknowledge the "app only suggests"
// warning. Severity + cross-contact move to profile-edit (follow-up); until then buildProfile
// applies conservative defaults (moderate / not_sure). City defaults to Hà Nội; language
// follows the active locale.
const TOTAL = 2;

export function OnboardingWizard() {
  const t = useTranslations('onboarding');
  const draft = useOnboardingDraft();
  const templates = useProfileTemplates();
  const allergens = useAllergens();
  const locale = useLocale();
  const router = useRouter();
  const setProfile = useProfileStore((s) => s.setProfile);
  const [saving, setSaving] = useState(false);

  const allergenItems = (allergens.data?.items ?? []).filter((a) => ALLERGY_ALLERGEN_IDS.includes(a.id));
  const templateItems = (templates.data?.items ?? []).filter((tpl) => tpl.profileType !== 'allergy');

  async function finish() {
    setSaving(true);
    const now = new Date().toISOString();
    // Language follows the visited locale (the dedicated language step is gone in v2).
    const lang: LanguageCode = locale === 'vi' ? 'vi' : 'en';
    const profile = buildProfile({ ...draft, language: lang }, crypto.randomUUID(), now);
    const names = {
      allergens: Object.fromEntries((allergens.data?.items ?? []).map((a) => [a.id, a.name])),
      templates: Object.fromEntries((templates.data?.items ?? []).map((tpl) => [tpl.id, tpl.name])),
    };
    const card = buildAllergyCard(profile, names, crypto.randomUUID(), now);
    await profileRepo.saveProfile(profile);
    await allergyCardRepo.saveAllergyCard(card);
    setProfile(profile, card);
    draft.reset();
    router.replace('/home', { locale: lang });
  }

  const steps = [
    <StepTemplates key="templates" templates={templateItems} allergens={allergenItems} />,
    <StepDisclaimer key="disclaimer" />,
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 pt-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => draft.setStep(draft.step - 1)}
            disabled={draft.step === 0}
            aria-label={t('back')}
            className="grid size-12 shrink-0 place-items-center rounded-full text-sb-muted hover:bg-sb-surface-2 focus-visible:shadow-sb-focus disabled:opacity-40"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <h1 className="text-sb-title font-bold text-sb-fg">{t('title')}</h1>
        </div>
        <p className="text-sb-caption font-bold uppercase tracking-wide text-sb-faint">
          {t('stepOf', { current: draft.step + 1, total: TOTAL })}
        </p>
        <div aria-hidden className="flex gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= draft.step ? 'bg-sb-brand' : 'bg-sb-border'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 py-5">{steps[draft.step]}</div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-sb-border bg-sb-surface px-4 py-3">
        {draft.step < TOTAL - 1 ? (
          <button
            type="button"
            onClick={() => draft.setStep(draft.step + 1)}
            className="min-h-sb-tap w-full rounded-sb-md bg-sb-primary px-4 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
          >
            {t('continue')}
          </button>
        ) : (
          <button
            type="button"
            disabled={!draft.accepted || saving}
            onClick={finish}
            className="inline-flex min-h-sb-tap w-full items-center justify-center gap-2 rounded-sb-md bg-sb-primary px-4 font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus disabled:opacity-40"
          >
            {!saving && <Check aria-hidden className="size-5" />}
            {saving ? t('saving') : t('saveCard')}
          </button>
        )}
      </div>
    </div>
  );
}
