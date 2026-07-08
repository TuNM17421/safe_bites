'use client';
import { Check, Search } from 'lucide-react';
import type { ReactNode } from 'react';

// Shared onboarding primitives (mock .chip.sel / .input / .radio) so onboarding-steps stays lean.

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-sb-tap items-center gap-1.5 rounded-sb-sm border px-3 text-sb-body-s focus-visible:shadow-sb-focus ${active ? 'border-sb-brand bg-sb-brand-soft font-bold text-sb-brand-ink' : 'border-sb-border text-sb-fg'}`}
    >
      {active && <Check aria-hidden className="size-4" />}
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-sb-sm border border-sb-border-strong px-3 focus-within:border-sb-brand focus-within:shadow-sb-focus">
      <Search aria-hidden className="size-[18px] shrink-0 text-sb-faint" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-sb-tap w-full border-0 bg-transparent py-3 text-sb-body text-sb-fg outline-none placeholder:text-sb-faint"
      />
    </div>
  );
}

export function SeverityRadio({
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
      className={`flex min-h-sb-tap w-full items-center gap-3 rounded-sb-sm border p-3 text-left focus-visible:shadow-sb-focus ${selected ? 'border-sb-brand bg-sb-brand-soft' : 'border-sb-border bg-sb-surface-2'}`}
    >
      <span
        className={`grid size-[22px] shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-sb-brand' : 'border-sb-border-strong'}`}
      >
        {selected && <span className="size-[11px] rounded-full bg-sb-brand" />}
      </span>
      <span>
        <b className="text-sb-body-s text-sb-fg">{label}</b>
        {note && <small className="mt-0.5 block text-sb-caption text-sb-muted">{note}</small>}
      </span>
    </button>
  );
}
