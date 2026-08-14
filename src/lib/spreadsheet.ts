import ExcelJS from 'exceljs';
import * as SheetJS from 'xlsx';

export interface SheetData {
  name: string;
  rows: string[][];
}

export type SpreadsheetFormat = 'xlsx' | 'xls';

function cellValueToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Parse a real workbook buffer into per-sheet string grids.
 *
 * - `.xlsx` uses exceljs (existing behavior preserved, including `cell.text`
 *   for formula/rich-text cells).
 * - `.xls` (legacy BIFF, not readable by exceljs) uses SheetJS on the real
 *   byte buffer. No rows are invented — every value comes from the file.
 */
export async function parseWorkbook(
  buffer: ArrayBuffer,
  format: SpreadsheetFormat = 'xlsx',
): Promise<SheetData[]> {
  if (format === 'xls') {
    const workbook = SheetJS.read(new Uint8Array(buffer), {
      type: 'array',
      cellDates: true,
    });
    return workbook.SheetNames.map((name) => {
      const ws = workbook.Sheets[name];
      const grid = SheetJS.utils.sheet_to_json(ws, { header: 1, raw: false });
      const rows = (grid as (string | number | null | undefined | object)[][]).map(
        (row) => (Array.isArray(row) ? row.map((c) => cellValueToString(c)) : []),
      );
      return { name, rows };
    });
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheets: SheetData[] = [];
  workbook.eachSheet((sheet) => {
    const rows: string[][] = [];
    sheet.eachRow((row) => {
      const cells: string[] = [];
      row.eachCell((cell) =>
        cells.push(
          Array.isArray(cell.text) ? cell.text.join('') : String(cell.text ?? ''),
        ),
      );
      rows.push(cells);
    });
    sheets.push({ name: sheet.name, rows });
  });
  return sheets;
}