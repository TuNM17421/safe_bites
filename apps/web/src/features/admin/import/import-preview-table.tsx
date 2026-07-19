'use client';
import { useTranslations } from 'next-intl';
import type { PreviewRow } from '@/lib/import-schemas';

export function ImportPreviewTable({ columns, rows }: { columns: string[]; rows: PreviewRow[] }) {
  const t = useTranslations('admin');
  const shown = columns.slice(0, 5);
  return (
    <div className="overflow-x-auto rounded-sb-md border border-sb-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-sb-surface-2 uppercase text-sb-faint">
          <tr>
            <th className="p-2">#</th>
            <th className="p-2">{t('import.status')}</th>
            {shown.map((c) => (
              <th key={c} className="p-2">
                {c}
              </th>
            ))}
            <th className="p-2">{t('import.issues')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rowNumber} className="border-t border-sb-border align-top">
              <td className="p-2 text-sb-faint">{r.rowNumber}</td>
              <td className="p-2">
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 font-bold ${
                    r.status === 'valid'
                      ? 'border-sb-status-suitable-border bg-sb-status-suitable-bg text-sb-status-suitable-fg'
                      : 'border-sb-status-ask-first-border bg-sb-status-ask-first-bg text-sb-status-ask-first-fg'
                  }`}
                >
                  {r.status === 'valid' ? t('import.valid') : t('import.needsFix')}
                </span>
              </td>
              {shown.map((c) => (
                <td key={c} className="max-w-[10rem] truncate p-2 text-sb-muted">
                  {r.values[c] ?? ''}
                </td>
              ))}
              <td className="p-2 text-sb-status-avoid-fg">{r.issues.join('; ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
