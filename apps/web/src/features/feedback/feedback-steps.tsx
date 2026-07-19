'use client';
import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type {
  FeedbackReaction,
  FeedbackReactionTiming,
  LocalUserProfile,
  StaffAnswer,
} from '@safebite/domain';
import { FeedbackSevereNotice } from '@/components/feedback/feedback-severe-notice';
import { OptionRadio, RadioGroup, ToggleGroup, ToggleOption } from './feedback-controls';
import { profileAllergenIds } from './build-feedback-snapshot';
import { useFeedbackDraft } from './use-feedback-draft';
import type { useFeedbackOptions } from './use-feedback-options';

export const FEEDBACK_STEP_COUNT = 6;

type OptionsData = NonNullable<ReturnType<typeof useFeedbackOptions>['data']>;
type Ternary = 'yes' | 'no' | 'not_sure';
type T = ReturnType<typeof useTranslations<'feedback'>>;

const REACTIONS: FeedbackReaction[] = ['none', 'mild', 'moderate', 'severe', 'anaphylaxis_or_emergency', 'not_sure', 'prefer_not_to_say'];
const TIMINGS: FeedbackReactionTiming[] = ['during_meal', 'within_2_hours', 'later_same_day', 'next_day_or_later', 'not_sure', 'not_applicable'];
const STAFF_ANSWERS: StaffAnswer[] = ['confirmed_no_allergen', 'confirmed_contains_allergen', 'confirmed_can_remove', 'confirmed_cannot_remove', 'kitchen_checked', 'not_sure', 'language_barrier', 'no_answer', 'other'];
const SEVERE: FeedbackReaction[] = ['severe', 'anaphylaxis_or_emergency'];
const RATINGS = [1, 2, 3, 4, 5];

function TernaryGroup({ t, label, value, onChange }: { t: T; label: string; value?: Ternary; onChange: (v: Ternary) => void }) {
  return (
    <RadioGroup label={label}>
      {(['yes', 'no', 'not_sure'] as Ternary[]).map((v) => (
        <OptionRadio key={v} selected={value === v} onClick={() => onChange(v)} label={t(`ternary.${v}`)} />
      ))}
    </RadioGroup>
  );
}

function ContextStep({ t, options }: { t: T; options?: OptionsData }) {
  const { menuItemId, patch } = useFeedbackDraft();
  const items = options?.menuItems ?? [];
  const select = (id: string | null, dishId: string | null) => patch({ menuItemId: id, dishId });
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sb-h2 text-sb-fg">{options?.restaurant.name ?? t('step1.title')}</h2>
      <RadioGroup label={t('step1.menuItemLabel')}>
        {items.map((item) => (
          <OptionRadio key={item.id} selected={menuItemId === item.id} onClick={() => select(item.id, item.dishId)} label={item.name} note={item.dishName ?? undefined} />
        ))}
        <OptionRadio selected={menuItemId === null} onClick={() => select(null, null)} label={t('step1.otherNotListed')} />
        <OptionRadio selected={menuItemId === undefined} onClick={() => patch({ menuItemId: undefined, dishId: undefined })} label={t('step1.dontRemember')} />
      </RadioGroup>
    </div>
  );
}

function HappenedStep({ t }: { t: T }) {
  const { ateHere, visitedAt, patch } = useFeedbackDraft();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sb-h2 text-sb-fg">{t('step2.title')}</h2>
      <TernaryGroup t={t} label={t('step2.title')} value={ateHere} onChange={(v) => patch({ ateHere: v })} />
      <label className="flex flex-col gap-1 text-sb-label text-sb-fg">
        {t('step2.visitedAtLabel')}
        <input
          type="date"
          value={visitedAt}
          onChange={(e) => patch({ visitedAt: e.target.value })}
          className="min-h-sb-tap rounded-sb-sm border border-sb-border bg-sb-surface-2 px-3 text-sb-fg focus-visible:shadow-sb-focus"
        />
      </label>
      <p className="text-sb-caption text-sb-muted">{t('step2.helper')}</p>
    </div>
  );
}

function AllergenStep({ t, options, profile }: { t: T; options?: OptionsData; profile: LocalUserProfile | null }) {
  const locale = useLocale();
  const { allergenIds, toggleAllergen, patch } = useFeedbackDraft();
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;
    if (profile && allergenIds.length === 0) patch({ allergenIds: profileAllergenIds(profile) });
  }, [profile, allergenIds.length, patch]);
  const list = options?.allergens.map((a) => ({ id: a.id, label: locale === 'vi' ? a.nameVi : a.nameEn }))
    ?? profileAllergenIds(profile).map((id) => ({ id, label: id }));
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sb-h2 text-sb-fg">{t('step3.title')}</h2>
      {!profile && <p className="text-sb-body-s text-sb-muted">{t('step3.noProfile')}</p>}
      <ToggleGroup label={t('step3.selectAllergens')}>
        {list.map((a) => (
          <ToggleOption key={a.id} active={allergenIds.includes(a.id)} onClick={() => toggleAllergen(a.id)} label={a.label} />
        ))}
      </ToggleGroup>
    </div>
  );
}

function StaffStep({ t }: { t: T }) {
  const { askedStaff, staffAnswer, staffAnswerText, patch } = useFeedbackDraft();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sb-h2 text-sb-fg">{t('step4.title')}</h2>
      <TernaryGroup t={t} label={t('step4.title')} value={askedStaff} onChange={(v) => patch({ askedStaff: v })} />
      {askedStaff === 'yes' && (
        <>
          <RadioGroup label={t('step4.answerLabel')}>
            {STAFF_ANSWERS.map((a) => (
              <OptionRadio key={a} selected={staffAnswer === a} onClick={() => patch({ staffAnswer: a })} label={t(`staffAnswer.${a}`)} />
            ))}
          </RadioGroup>
          <label className="flex flex-col gap-1 text-sb-label text-sb-fg">
            {t('step4.noteLabel')}
            <textarea
              maxLength={500}
              value={staffAnswerText}
              onChange={(e) => patch({ staffAnswerText: e.target.value })}
              className="min-h-sb-tap rounded-sb-sm border border-sb-border bg-sb-surface-2 p-3 text-sb-fg focus-visible:shadow-sb-focus"
            />
          </label>
          <p className="text-sb-caption text-sb-muted">{t('step4.noMedical')}</p>
        </>
      )}
    </div>
  );
}

function ReactionStep({ t }: { t: T }) {
  const { reaction, reactionTiming, patch } = useFeedbackDraft();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sb-h2 text-sb-fg">{t('step5.title')}</h2>
      <RadioGroup label={t('step5.title')}>
        {REACTIONS.map((r) => (
          <OptionRadio key={r} selected={reaction === r} onClick={() => patch({ reaction: r })} label={t(`reaction.${r}`)} />
        ))}
      </RadioGroup>
      {reaction && SEVERE.includes(reaction) && <FeedbackSevereNotice />}
      <RadioGroup label={t('step5.timingLabel')}>
        {TIMINGS.map((ti) => (
          <OptionRadio key={ti} selected={reactionTiming === ti} onClick={() => patch({ reactionTiming: ti })} label={t(`timing.${ti}`)} />
        ))}
      </RadioGroup>
    </div>
  );
}

function TrustStep({ t }: { t: T }) {
  const { userTrustRating, notes, patch } = useFeedbackDraft();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sb-h2 text-sb-fg">{t('step6.title')}</h2>
      <RadioGroup label={t('step6.trustLabel')}>
        {RATINGS.map((n) => (
          <OptionRadio key={n} selected={userTrustRating === n} onClick={() => patch({ userTrustRating: n })} label={String(n)} />
        ))}
      </RadioGroup>
      <label className="flex flex-col gap-1 text-sb-label text-sb-fg">
        {t('step6.notesLabel')}
        <textarea
          maxLength={500}
          value={notes}
          onChange={(e) => patch({ notes: e.target.value })}
          className="min-h-sb-tap rounded-sb-sm border border-sb-border bg-sb-surface-2 p-3 text-sb-fg focus-visible:shadow-sb-focus"
        />
      </label>
      <p className="text-sb-caption text-sb-muted">{t('step6.notesHint')}</p>
    </div>
  );
}

export function FeedbackStep({ index, options, profile }: { index: number; options?: OptionsData; profile: LocalUserProfile | null }) {
  const t = useTranslations('feedback');
  switch (index) {
    case 0:
      return <ContextStep t={t} options={options} />;
    case 1:
      return <HappenedStep t={t} />;
    case 2:
      return <AllergenStep t={t} options={options} profile={profile} />;
    case 3:
      return <StaffStep t={t} />;
    case 4:
      return <ReactionStep t={t} />;
    case 5:
      return <TrustStep t={t} />;
    default:
      return null;
  }
}
