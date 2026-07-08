'use client';
import type { ReactNode } from 'react';

// Small controlled form primitives shared by the admin entity forms (DRY). sb-* tokens,
// 44px+ inputs, 16px text (no iOS zoom), visible focus ring.
const inputCls =
  'min-h-11 w-full rounded-sb-sm border border-sb-border-strong bg-sb-surface px-3 text-base text-sb-fg focus-visible:shadow-sb-focus focus-visible:outline-none';

// Trim-to-undefined helpers shared by the admin forms (so optional fields send undefined, not "").
export const optText = (s: string) => (s.trim() === '' ? undefined : s.trim());
export const optNum = (s: string) => (s.trim() === '' ? undefined : Number(s));

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-sb-fg">
        {label}
        {required ? <span className="text-sb-status-avoid-fg"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <Field label={label} required={required}>
      <input
        className={inputCls}
        type={type}
        step={step}
        required={required}
        aria-required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <textarea className={`${inputCls} min-h-20 py-2`} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 rounded-sb-sm border-sb-border-strong text-sb-primary focus-visible:shadow-sb-focus focus-visible:outline-none"
      />
      <span className="font-semibold text-sb-fg">{label}</span>
    </label>
  );
}

export function FormActions({
  onCancel,
  submitting,
  saveLabel,
  cancelLabel,
}: {
  onCancel: () => void;
  submitting: boolean;
  saveLabel: string;
  cancelLabel: string;
}) {
  return (
    <div className="flex gap-2 pt-1 sm:col-span-2">
      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 rounded-sb-sm bg-sb-primary px-4 font-bold text-sb-primary-foreground disabled:opacity-50"
      >
        {saveLabel}
      </button>
      <button type="button" onClick={onCancel} className="min-h-11 rounded-sb-sm border border-sb-border px-4 text-sb-muted">
        {cancelLabel}
      </button>
    </div>
  );
}
