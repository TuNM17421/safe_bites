'use client';
import { Globe, ScanText, User, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Maps a SourceType to a labelled provenance badge (v2 admin). Discovered / OCR / user rows read
// as UNVERIFIED and must never be relabelled as verified (human-in-the-loop trust surface).
const MAP: Record<string, { key: string; Icon: typeof Globe }> = {
  manual_seed: { key: 'adminSeed', Icon: User },
  admin_verified: { key: 'adminSeed', Icon: User },
  expert_review: { key: 'adminSeed', Icon: User },
  openstreetmap: { key: 'openMapUnverified', Icon: Globe },
  openmapvn: { key: 'openMapUnverified', Icon: Globe },
  google_places: { key: 'discovered', Icon: Globe },
  foursquare: { key: 'discovered', Icon: Globe },
  restaurant_submitted: { key: 'restaurant', Icon: User },
  menu_observed: { key: 'restaurant', Icon: User },
  user_submitted: { key: 'userContribution', Icon: Users },
  user_contribution: { key: 'userContribution', Icon: Users },
  ocr: { key: 'ocr', Icon: ScanText },
};

export function AdminProvenanceBadge({ source }: { source: string }) {
  const t = useTranslations('admin');
  const entry = MAP[source];
  const Icon = entry?.Icon ?? Globe;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sb-border bg-sb-surface-2 px-2 py-0.5 text-xs text-sb-muted">
      <Icon aria-hidden className="size-3 text-sb-faint" />
      {entry ? t(`provenance.${entry.key}`) : source}
    </span>
  );
}
