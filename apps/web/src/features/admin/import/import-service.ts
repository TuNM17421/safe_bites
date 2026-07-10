import { Prisma } from '@prisma/client';
import { parseCsvContent, type CsvRow } from '../../../../scripts/seed/csv';
import { importRestaurants } from '../../../../scripts/seed/import-restaurants';
import { newCounts, type Counts } from '../../../../scripts/seed/types';
import { parseWorkbook } from '../../../../scripts/seed/xlsx';
import { prisma } from '@/lib/db';
import {
  importRestaurantRowSchema,
  type ImportCommitResult,
  type ImportPreview,
  type PreviewRow,
} from '@/lib/import-schemas';

// Server-only. Reuses the CLI importer (which FORCES verificationStatus='unverified' /
// reviewStatus review) so an admin upload can never auto-verify. Preview + commit share the same
// parse + validate so the classification the admin sees is exactly what commit inserts.
const MAX_ROWS = 2000;

const REQUIRED_COLUMNS = ['restaurant_id', 'canonical_name', 'city'];

export async function parseRows(buffer: Buffer, filename: string): Promise<CsvRow[]> {
  const rows = filename.toLowerCase().endsWith('.xlsx')
    ? await parseWorkbook(buffer)
    : parseCsvContent(buffer.toString('utf8'));
  return rows.slice(0, MAX_ROWS);
}

export function validateRows(rows: CsvRow[]): ImportPreview {
  const columns = rows[0] ? Object.keys(rows[0]) : REQUIRED_COLUMNS;
  const previewRows: PreviewRow[] = rows.map((values, i) => {
    const parsed = importRestaurantRowSchema.safeParse(values);
    return parsed.success
      ? { rowNumber: i + 1, values, status: 'valid', issues: [] }
      : {
          rowNumber: i + 1,
          values,
          status: 'needs_fix',
          issues: parsed.error.issues.map((iss) => `${iss.path.join('.') || 'row'}: ${iss.message}`),
        };
  });
  return { columns, rows: previewRows };
}

export async function runImport(rows: CsvRow[], filename: string): Promise<ImportCommitResult> {
  const preview = validateRows(rows);
  const validRows = rows.filter((_, i) => preview.rows[i]?.status === 'valid');
  const skippedRows = rows.length - validRows.length;
  try {
    const counts: Counts = validRows.length
      ? await prisma.$transaction((tx) => importRestaurants(tx, validRows))
      : newCounts();
    counts.skipped += skippedRows;
    await writeImportRun('restaurants (admin import)', filename, 'success', counts);
    return { counts, skippedRows };
  } catch (e) {
    await writeImportRun('restaurants (admin import)', filename, 'failed', newCounts(), e);
    throw e;
  }
}

async function writeImportRun(name: string, path: string, status: string, counts: Counts, error?: unknown): Promise<void> {
  await prisma.importRun.create({
    data: {
      sourceName: name,
      sourcePath: path,
      status,
      rowsRead: counts.read,
      rowsInserted: counts.inserted,
      rowsUpdated: counts.updated,
      rowsSkipped: counts.skipped,
      errors: error === undefined ? Prisma.DbNull : ({ message: String(error) } as Prisma.InputJsonValue),
      finishedAt: new Date(),
    },
  });
}
