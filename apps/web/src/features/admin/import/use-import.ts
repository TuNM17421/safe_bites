'use client';
import { useMutation } from '@tanstack/react-query';
import type { ImportCommitResult, ImportPreview } from '@/lib/import-schemas';

async function postImport<T>(mode: 'preview' | 'commit', file: File): Promise<T> {
  const fd = new FormData();
  fd.set('file', file);
  const res = await fetch(`/api/v1/admin/import?mode=${mode}`, { method: 'POST', body: fd });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `import_failed_${res.status}`);
  return json.data as T;
}

export function useImport() {
  const preview = useMutation({ mutationFn: (file: File) => postImport<ImportPreview>('preview', file) });
  const commit = useMutation({ mutationFn: (file: File) => postImport<ImportCommitResult>('commit', file) });
  return { preview, commit };
}
