import type { ReactNode } from 'react';

// Shared empty / error state (ADR-UI-03). Caller supplies an already-translated
// title/body (next-intl) and an optional lucide icon node + primary action, so this
// component stays presentational and dependency-free. Design: mockup "States & inputs".
// `tone` tints the illustration circle (never a status verdict — decorative only).
const TONE = {
  brand: 'bg-sb-brand-soft text-sb-brand',
  warm: 'bg-sb-appetite-soft text-sb-appetite',
  ok: 'bg-sb-status-suitable-bg text-sb-status-suitable-fg',
  neutral: 'bg-sb-surface-3 text-sb-muted',
} as const;

export function StateView({
  icon,
  title,
  body,
  action,
  tone = 'brand',
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  tone?: keyof typeof TONE;
}) {
  return (
    <div className="mx-auto max-w-xs py-10 text-center">
      {icon && (
        <div className={`mx-auto mb-3 grid size-[72px] place-items-center rounded-full ${TONE[tone]}`}>
          {icon}
        </div>
      )}
      <h2 className="text-sb-h2 text-sb-fg">{title}</h2>
      {body && <p className="mt-1 text-sb-body-s text-sb-muted">{body}</p>}
      {action && <div className="mt-6 flex flex-col items-center gap-2">{action}</div>}
    </div>
  );
}
