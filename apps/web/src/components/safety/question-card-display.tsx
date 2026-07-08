import type { LanguageCode, QuestionCardKind, QuestionCardSection } from '@safebite/domain';

// The card body is bilingual DATA (from the deterministic domain template), so this
// component is i18n-agnostic: section texts render as-is; optional `sectionLabels`
// (chrome, translated by the parent screen) show a small eyebrow per block. Reusable
// §13 `QuestionCardDisplay`, used both inline and inside the fullscreen presentation
// overlay. Design system v2: sb-* tokens only (mockup "Main flow · Question card").
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
  const bodyType = largeText ? 'text-xl font-semibold' : 'text-base';
  return (
    <article className="rounded-sb-lg border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
      <header className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-sb-brand-soft px-2.5 py-1 text-xs font-bold uppercase text-sb-brand-ink">
          {card.targetLanguage}
        </span>
        {card.createdAt ? (
          <time dateTime={card.createdAt} className="text-xs text-sb-faint">
            {formatTimestamp(card.createdAt)}
          </time>
        ) : null}
      </header>
      <div className="divide-y divide-sb-border">
        {card.sections.map((section, index) => (
          <div key={`${section.kind}-${index}`} className="py-3 first:pt-0 last:pb-0">
            {sectionLabels?.[section.kind] ? (
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-sb-brand-ink">
                {sectionLabels[section.kind]}
              </div>
            ) : null}
            <p className={`mt-1 leading-snug text-sb-fg ${bodyType}`}>{section.text}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
