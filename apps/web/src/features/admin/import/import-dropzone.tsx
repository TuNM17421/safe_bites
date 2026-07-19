'use client';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export function ImportDropzone({
  onFile,
  disabled,
  fileName,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  fileName?: string;
}) {
  const t = useTranslations('admin');
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const accept = (f: File | undefined | null) => {
    if (!f) return;
    const n = f.name.toLowerCase();
    if (n.endsWith('.csv') || n.endsWith('.xlsx')) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        accept(e.dataTransfer.files[0]);
      }}
      className={`rounded-sb-md border-2 border-dashed p-8 text-center ${drag ? 'border-sb-brand bg-sb-brand-soft' : 'border-sb-border bg-sb-surface-2'}`}
    >
      <Upload aria-hidden className="mx-auto size-8 text-sb-brand" />
      <p className="mt-2 font-bold text-sb-fg">{t('import.dropzone')}</p>
      {fileName ? <p className="mt-1 text-xs text-sb-muted">{fileName}</p> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-3 min-h-10 rounded-sb-sm bg-sb-primary px-4 text-sm font-bold text-sb-primary-foreground disabled:opacity-50"
      >
        {t('import.choose')}
      </button>
      <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => accept(e.target.files?.[0])} />
    </div>
  );
}
