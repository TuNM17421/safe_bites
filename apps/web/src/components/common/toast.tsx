'use client';
import type { ReactNode } from 'react';

// Success/confirmation toast (ADR-UI-03). Bottom-anchored above the nav + safe-area.
// role="status" + aria-live="polite" so it announces without stealing focus. Auto-dismiss
// (4s) is owned by the caller; a toast carrying an `action` (e.g. Undo) should persist.
// Caller passes an already-translated `message` (next-intl) + optional lucide icon.
export function Toast({
  icon,
  message,
  action,
}: {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(var(--nav-height)_+_var(--safe-bottom)_+_8px)] z-50 flex items-center gap-2.5 rounded-sb-md border border-sb-border bg-sb-overlay p-3 shadow-sb-e3"
    >
      {icon && <span className="text-sb-status-suitable-fg">{icon}</span>}
      <span className="flex-1 text-sm font-semibold text-sb-fg">{message}</span>
      {action}
    </div>
  );
}
