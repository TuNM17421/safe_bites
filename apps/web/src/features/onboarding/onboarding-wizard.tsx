'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ALLERGY_ALLERGEN_IDS } from '@safebite/domain';
import { useRouter } from '@/i18n/navigation';
import { buildAllergyCard } from '@/features/allergy-card/build-allergy-card';
import { allergyCardRepo, profileRepo } from '@/lib/local-repo';
import { useProfileStore } from '@/lib/profile-store';
import { buildProfile } from './build-profile';
import { StepCity, StepCrossContact, StepDisclaimer, StepLanguage, StepSeverity, StepTemplates } from './onboarding-steps';
import { useAllergens, useClientConfigQuery, useProfileTemplates } from './use-onboarding-data';
import { useOnboardingDraft } from './use-onboarding-draft';

const TOTAL = 6;

export function OnboardingWizard() {
  const t = useTranslations('onboarding');
  const draft = useOnboardingDraft();
  const templates = useProfileTemplates();
  const allergens = useAllergens();
  const config = useClientConfigQuery();
  const router = useRouter();
  const setProfile = useProfileStore((s) => s.setProfile);
  const [saving, setSaving] = useState(false);

  const allergenItems = (allergens.data?.items ?? []).filter((a) => ALLERGY_ALLERGEN_IDS.includes(a.id));
  const templateItems = (templates.data?.items ?? []).filter((tpl) => tpl.profileType !== 'allergy');

  async function finish() {
    setSaving(true);
    const now = new Date().toISOString();
    const profile = buildProfile(draft, crypto.randomUUID(), now);
    const names = {
      allergens: Object.fromEntries((allergens.data?.items ?? []).map((a) => [a.id, a.name])),
      templates: Object.fromEntries((templates.data?.items ?? []).map((tpl) => [tpl.id, tpl.name])),
    };
    const card = buildAllergyCard(profile, names, crypto.randomUUID(), now);
    await profileRepo.saveProfile(profile);
    await allergyCardRepo.saveAllergyCard(card);
    setProfile(profile, card);
    draft.reset();
    router.replace('/home', { locale: draft.language });
  }

  const steps = [
    <StepTemplates key="templates" templates={templateItems} allergens={allergenItems} />,
    <StepSeverity key="severity" allergens={allergenItems} />,
    <StepCrossContact key="cross" allergens={allergenItems} />,
    <StepCity key="city" cities={config.data?.supportedCities ?? ['hanoi']} />,
    <StepLanguage key="language" />,
    <StepDisclaimer key="disclaimer" saving={saving} onFinish={finish} />,
  ];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">{t('stepOf', { current: draft.step + 1, total: TOTAL })}</p>
      {steps[draft.step]}
      <div className="flex justify-between">
        <button
          type="button"
          disabled={draft.step === 0}
          onClick={() => draft.setStep(draft.step - 1)}
          className="rounded-lg border border-border px-4 py-2 disabled:opacity-40"
        >
          {t('back')}
        </button>
        {draft.step < TOTAL - 1 && (
          <button
            type="button"
            onClick={() => draft.setStep(draft.step + 1)}
            className="rounded-lg bg-foreground px-4 py-2 font-semibold text-background"
          >
            {t('next')}
          </button>
        )}
      </div>
    </div>
  );
}
