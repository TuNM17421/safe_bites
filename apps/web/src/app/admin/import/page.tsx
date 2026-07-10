'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImportDropzone } from '@/features/admin/import/import-dropzone';
import { ImportPreviewTable } from '@/features/admin/import/import-preview-table';
import { useImport } from '@/features/admin/import/use-import';

// v2 admin Excel/CSV import (Phase 11). Preview → commit; imported restaurants stay unverified.
export default function AdminImportPage() {
  const t = useTranslations('admin');
  const [file, setFile] = useState<File | null>(null);
  const { preview, commit } = useImport();
  const validCount = preview.data?.rows.filter((r) => r.status === 'valid').length ?? 0;

  const onFile = (f: File) => {
    setFile(f);
    commit.reset();
    preview.mutate(f);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-extrabold text-sb-fg">{t('nav.import')}</h1>
        <a href="/api/v1/admin/import/template" className="text-sm font-bold text-sb-brand underline">
          {t('import.template')}
        </a>
      </div>
      <p className="text-sm text-sb-muted">{t('import.subheading')}</p>

      <ImportDropzone onFile={onFile} disabled={preview.isPending || commit.isPending} fileName={file?.name} />

      {preview.isPending ? <p className="text-sm text-sb-muted">{t('import.parsing')}</p> : null}
      {preview.isError ? <p role="alert" className="text-sm text-sb-status-avoid-fg">{(preview.error as Error).message}</p> : null}

      {preview.data ? (
        <>
          <ImportPreviewTable columns={preview.data.columns} rows={preview.data.rows} />
          <div>
            <button
              type="button"
              disabled={validCount === 0 || commit.isPending || !file}
              onClick={() => file && commit.mutate(file)}
              className="min-h-10 rounded-sb-sm bg-sb-primary px-4 text-sm font-bold text-sb-primary-foreground disabled:opacity-50"
            >
              {commit.isPending ? t('import.committing') : t('import.commit', { count: validCount })}
            </button>
          </div>
        </>
      ) : null}

      {commit.isError ? <p role="alert" className="text-sm text-sb-status-avoid-fg">{(commit.error as Error).message}</p> : null}
      {commit.data ? (
        <div className="rounded-sb-md border border-sb-status-suitable-border bg-sb-status-suitable-bg p-3 text-sm text-sb-status-suitable-fg">
          {t('import.success', {
            read: commit.data.counts.read,
            inserted: commit.data.counts.inserted,
            updated: commit.data.counts.updated,
            skipped: commit.data.counts.skipped,
          })}{' '}
          <Link href="/admin/restaurants" className="font-bold underline">
            {t('import.backToRestaurants')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
