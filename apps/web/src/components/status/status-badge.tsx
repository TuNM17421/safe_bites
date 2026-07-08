'use client';
import { CircleCheck, CircleHelp, MessageCircleQuestion, OctagonX, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RecommendationStatus } from '@safebite/domain';

// Status = icon + label + colour (never colour alone). Design: ADR-UI-02.
const MAP = {
  suitable: {
    Icon: CircleCheck,
    c: 'text-sb-status-suitable-fg bg-sb-status-suitable-bg border-sb-status-suitable-border',
  },
  ask_first: {
    Icon: MessageCircleQuestion,
    c: 'text-sb-status-ask-first-fg bg-sb-status-ask-first-bg border-sb-status-ask-first-border',
  },
  risky: {
    Icon: TriangleAlert,
    c: 'text-sb-status-risky-fg bg-sb-status-risky-bg border-sb-status-risky-border',
  },
  avoid: {
    Icon: OctagonX,
    c: 'text-sb-status-avoid-fg bg-sb-status-avoid-bg border-sb-status-avoid-border',
  },
  unknown: {
    Icon: CircleHelp,
    c: 'text-sb-status-unknown-fg bg-sb-status-unknown-bg border-sb-status-unknown-border',
  },
} as const;

export function StatusBadge({ status }: { status: RecommendationStatus }) {
  const t = useTranslations('statuses');
  const { Icon, c } = MAP[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-bold ${c}`}>
      <Icon aria-hidden className="size-3.5" /> {t(status)}
    </span>
  );
}
