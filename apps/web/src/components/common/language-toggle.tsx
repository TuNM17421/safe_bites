'use client';
import type { LanguageCode } from '@safebite/domain';

// Segmented control that flips the displayed DATA language only (not the /en /vi URL locale).
export function LanguageToggle({ value, onChange }: { value: LanguageCode; onChange: (l: LanguageCode) => void }) {
  const options: LanguageCode[] = ['en', 'vi'];
  return (
    <div className="inline-flex rounded-full border border-sb-border p-0.5">
      {options.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={value === l}
          className={`inline-flex min-h-sb-tap items-center rounded-full px-4 text-sb-body-s font-semibold ${value === l ? 'bg-sb-primary text-sb-primary-foreground' : 'text-sb-muted'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
