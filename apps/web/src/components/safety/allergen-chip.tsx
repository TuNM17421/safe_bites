import { MessageCircleQuestion, OctagonX, TriangleAlert, Utensils } from 'lucide-react';
import type { Severity } from '@safebite/domain';

// Allergen-severity affordance for the user's own profile (allergy card, profile). NOT one of
// the five dish RecommendationStatuses — it reuses the status COLOUR TOKENS + status icons purely
// for visual consistency (matching the mock's st--avoid chip) and always pairs colour with an
// icon and label. Never maps a severity to the green "suitable" token; never uses coral.
const SEVERITY_STYLE = {
  anaphylaxis_risk: { Icon: OctagonX, c: 'text-sb-status-avoid-fg bg-sb-status-avoid-bg border-sb-status-avoid-border' },
  severe: { Icon: OctagonX, c: 'text-sb-status-avoid-fg bg-sb-status-avoid-bg border-sb-status-avoid-border' },
  moderate: { Icon: TriangleAlert, c: 'text-sb-status-risky-fg bg-sb-status-risky-bg border-sb-status-risky-border' },
  mild: { Icon: MessageCircleQuestion, c: 'text-sb-status-ask-first-fg bg-sb-status-ask-first-bg border-sb-status-ask-first-border' },
} as const;

const DIETARY = { Icon: Utensils, c: 'text-sb-muted bg-sb-surface-2 border-sb-border' } as const;

export function AllergenChip({ name, severity }: { name: string; severity?: Severity }) {
  const { Icon, c } = severity ? SEVERITY_STYLE[severity] : DIETARY;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sb-body-s font-semibold ${c}`}>
      <Icon aria-hidden className="size-4" />
      {name}
    </span>
  );
}
