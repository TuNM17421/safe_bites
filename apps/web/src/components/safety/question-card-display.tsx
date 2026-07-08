import type { LanguageCode, QuestionCardKind, QuestionCardSection } from '@safebite/domain';

// The card body is bilingual DATA (from the deterministic domain template), so this
// component is i18n-agnostic: section texts render as-is; `sectionLabels` (chrome,
// translated by the parent screen) show a small eyebrow per block. Reusable §13
// `QuestionCardDisplay`, used both inline and inside the fullscreen presentation overlay.
// Design system v2 — mock .qcard/.qs: header-free, dashed dividers, big legible blocks.
export interface QuestionCardView {
  targetLanguage: LanguageCode;
  sections: QuestionCardSection[];
  createdAt?: string;
}

export function QuestionCardDisplay({
  card,
  largeText = false,
  sectionLabels,
}: {
  card: QuestionCardView;
  largeText?: boolean;
  sectionLabels?: Partial<Record<QuestionCardKind, string>>;
}) {
  return (
    <article className="rounded-sb-lg border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
      {card.sections.map((section, index) => (
        <div
          key={`${section.kind}-${index}`}
          className="border-b border-dashed border-sb-border py-3 first:pt-0 last:border-0 last:pb-0.5"
        >
          {sectionLabels?.[section.kind] ? (
            <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-sb-brand-ink">
              {sectionLabels[section.kind]}
            </div>
          ) : null}
          <p className={`mt-1.5 leading-snug text-sb-fg ${largeText ? 'text-sb-h2' : 'text-sb-body'}`}>{section.text}</p>
        </div>
      ))}
    </article>
  );
}
