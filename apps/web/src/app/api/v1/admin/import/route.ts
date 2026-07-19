import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { apiError, apiOk, parseQuery } from '@/lib/api-response';
import { parseRows, runImport, validateRows } from '@/features/admin/import/import-service';
import { importModeSchema } from '@/lib/import-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const querySchema = z.object({ mode: importModeSchema.default('preview') });

// Admin restaurant import. `?mode=preview` returns per-row validation; `?mode=commit` inserts the
// valid rows transactionally + writes an ImportRun. Commit re-parses the uploaded file (never
// trusts client-sent rows). Imported rows stay unverified/needs_review (reused importer).
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const q = parseQuery(req.url, querySchema);
  if (!q.ok) return q.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError('VALIDATION_ERROR', 'Expected multipart/form-data.', { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) return apiError('VALIDATION_ERROR', 'Missing file.', { status: 400 });
  const name = file.name.toLowerCase();
  if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
    return apiError('VALIDATION_ERROR', 'Only .csv or .xlsx files are accepted.', { status: 400 });
  }
  if (file.size > MAX_BYTES) return apiError('VALIDATION_ERROR', 'File too large (max 5 MB).', { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const rows = await parseRows(buffer, file.name);
    if (q.data.mode === 'commit') return apiOk(await runImport(rows, file.name));
    return apiOk(validateRows(rows));
  } catch (e) {
    return apiError('IMPORT_FAILED', (e as Error).message || 'Import failed.', { status: 500 });
  }
}
