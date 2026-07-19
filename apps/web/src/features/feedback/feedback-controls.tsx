'use client';

import type { ReactNode } from 'react';

export function OptionRadio({
  selected,
  onClick,
  label,
  note,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  note?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex min-h-sb-tap w-full items-center gap-3 rounded-sb-sm border p-3 text-left focus-visible:shadow-sb-focus ${
        selected ? 'border-sb-brand bg-sb-brand-soft' : 'border-sb-border bg-sb-surface-2'
      }`}
    >
      <span>
        {label}
        {note && <small className="mt-0.5 block text-sb-caption text-sb-muted">{note}</small>}
      </span>
    </button>
  );
}

export function RadioGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {children}
    </div>
  );
}

// Multi-select toggle (allergens): aria-pressed, NOT role="radio" (which implies single-select).
export function ToggleOption({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-sb-tap w-full items-center gap-3 rounded-sb-sm border p-3 text-left text-sb-body-s focus-visible:shadow-sb-focus ${
        active ? 'border-sb-brand bg-sb-brand-soft font-bold text-sb-brand-ink' : 'border-sb-border bg-sb-surface-2 text-sb-fg'
      }`}
    >
      {label}
    </button>
  );
}

export function ToggleGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      {children}
    </div>
  );
}
