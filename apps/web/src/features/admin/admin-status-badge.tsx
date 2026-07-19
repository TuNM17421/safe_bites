// Semantic pill for admin review / verification / menu statuses. Colour is ALWAYS paired with the
// text label (WCAG color-not-only) and uses the app's traffic-light tokens, so the admin table is
// scannable at a glance instead of a wall of gray text. Tones map to sb-status-* tokens.
type Tone = 'suitable' | 'ask-first' | 'risky' | 'avoid' | 'unknown';

const TONE_CLASS: Record<Tone, string> = {
  suitable: 'text-sb-status-suitable-fg bg-sb-status-suitable-bg border-sb-status-suitable-border',
  'ask-first': 'text-sb-status-ask-first-fg bg-sb-status-ask-first-bg border-sb-status-ask-first-border',
  risky: 'text-sb-status-risky-fg bg-sb-status-risky-bg border-sb-status-risky-border',
  avoid: 'text-sb-status-avoid-fg bg-sb-status-avoid-bg border-sb-status-avoid-border',
  unknown: 'text-sb-status-unknown-fg bg-sb-status-unknown-bg border-sb-status-unknown-border',
};

// Flat status→tone map. Values are unique across the review / verification / menu enums; the one
// shared value (admin_verified) maps to the same "good" tone either way.
const STATUS_TONE: Record<string, Tone> = {
  approved: 'suitable',
  needs_review: 'ask-first',
  rejected: 'avoid',
  admin_verified: 'suitable',
  restaurant_confirmed: 'suitable',
  restaurant_contacted: 'ask-first',
  unverified: 'unknown',
  expired: 'risky',
  flagged: 'avoid',
  not_observed: 'unknown',
  menu_url_available: 'ask-first',
  observed_not_verified: 'ask-first',
  restaurant_submitted: 'ask-first',
};

const humanize = (s: string): string => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function AdminStatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'unknown';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${TONE_CLASS[tone]}`}
    >
      {humanize(status)}
    </span>
  );
}
