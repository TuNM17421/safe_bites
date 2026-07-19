import ExcelJS from 'exceljs';
import type { CsvRow } from './csv';

// Read the first worksheet of an .xlsx buffer into the same header-keyed CsvRow[] shape that
// parseCsvContent produces, so both formats share one downstream importer. Server-only (Node).
export async function parseWorkbook(buffer: Buffer | ArrayBuffer): Promise<CsvRow[]> {
  const wb = new ExcelJS.Workbook();
  // exceljs accepts a Node Buffer at runtime; cast to its declared param type to bridge the
  // @types/node Buffer generic mismatch.
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => {
    headers[col] = String(cell.value ?? '').trim();
  });

  const rows: CsvRow[] = [];
  for (let r = 2; r <= ws.rowCount; r += 1) {
    const obj: CsvRow = {};
    let hasValue = false;
    ws.getRow(r).eachCell((cell, col) => {
      const key = headers[col];
      if (!key) return;
      const value = String(cell.value ?? '').trim();
      obj[key] = value;
      if (value) hasValue = true;
    });
    if (hasValue) rows.push(obj);
  }
  return rows;
}
