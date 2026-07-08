import type { ReactNode } from 'react';

// Shared empty / error state (ADR-UI-03). Caller supplies an already-translated
// title/body (next-intl) and an optional lucide icon node + primary action, so this
// component stays presentational and dependency-free. Design: mockup "States & inputs".
export function StateView({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xs py-10 text-center">
      {icon && (
        <div className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-sb-surface-2 text-sb-muted">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-bold text-sb-fg">{title}</h2>
      {body && <p className="mt-1 text-sm text-sb-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
