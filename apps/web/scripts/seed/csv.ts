import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

export type CsvRow = Record<string, string>;

/** Parse CSV text into header-keyed rows. `bom: true` strips a leading UTF-8 BOM so the
 *  first header is never prefixed by one (the kit writes CSVs as utf-8-sig). */
export function parseCsvContent(content: string): CsvRow[] {
  return parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as CsvRow[];
}

export function parseCsv(path: string): CsvRow[] {
  return parseCsvContent(readFileSync(path, 'utf8'));
}

/** Trimmed field access (rows may lack a column under noUncheckedIndexedAccess). */
export function field(row: CsvRow, key: string): string {
  return (row[key] ?? '').trim();
}

/** Throw if any required column is missing from the parsed header. */
export function requireColumns(rows: CsvRow[], required: string[]): void {
  const header = rows[0] ? Object.keys(rows[0]) : [];
  const missing = required.filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`);
}

/** Comma-separated string -> trimmed non-empty list ("" -> []). */
export function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** CSV numeric string -> number, or null for blank/invalid. */
export function toNumber(value: string | undefined): number | null {
  const v = (value ?? '').trim();
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Optional trimmed text -> string or null (for nullable columns). */
export function orNull(value: string | undefined): string | null {
  const v = (value ?? '').trim();
  return v === '' ? null : v;
}
