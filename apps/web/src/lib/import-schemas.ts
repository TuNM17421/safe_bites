import { z } from 'zod';

// A derived import row (not the raw multipart body) must carry the importer's required columns;
// lat/lon, when present, must be numeric. Extra columns pass through to the importer.
const numericOrBlank = z
  .string()
  .optional()
  .refine((v) => v == null || v.trim() === '' || Number.isFinite(Number(v.trim())), { message: 'must be a number' });

export const importRestaurantRowSchema = z
  .object({
    restaurant_id: z.string().trim().min(1, 'required'),
    canonical_name: z.string().trim().min(1, 'required'),
    city: z.string().trim().min(1, 'required'),
    lat: numericOrBlank,
    lon: numericOrBlank,
  })
  .passthrough();

export const importModeSchema = z.enum(['preview', 'commit']);

export interface PreviewRow {
  rowNumber: number;
  values: Record<string, string>;
  status: 'valid' | 'needs_fix';
  issues: string[];
}

export interface ImportPreview {
  columns: string[];
  rows: PreviewRow[];
}

export interface ImportCommitResult {
  counts: { read: number; inserted: number; updated: number; skipped: number };
  skippedRows: number;
}
