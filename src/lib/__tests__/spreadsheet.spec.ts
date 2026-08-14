import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { parseWorkbook, SheetData } from '../spreadsheet';

async function makeXlsxBuffer(sheets: { name: string; rows: unknown[][] }[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    for (const row of s.rows) ws.addRow(row as never);
  }
  const data = await wb.xlsx.writeBuffer();
  const u8 = data instanceof ArrayBuffer ? new Uint8Array(data) : (data as Uint8Array);
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy.buffer;
}

function makeXlsBuffer(rows: unknown[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { bookType: 'biff8', type: 'array' }) as ArrayBuffer;
}

describe('parseWorkbook', () => {
  it('parses a real XLSX with multiple sheets, values and empty cells', async () => {
    const buffer = await makeXlsxBuffer([
      {
        name: 'Invoices',
        rows: [
          ['Invoice No', 'Vendor', 'Tax', 'Total'],
          ['INV-001', 'ABC Ltd', 500, 5500],
          ['INV-002', 'XYZ Ltd', '', 7700],
        ],
      },
      {
        name: 'Sheet2',
        rows: [
          ['Name', 'Age'],
          ['Bhoomi', 23],
        ],
      },
    ]);

    const sheets: SheetData[] = await parseWorkbook(buffer, 'xlsx');
    expect(sheets.map((s) => s.name)).toEqual(['Invoices', 'Sheet2']);
    expect(sheets[0].rows).toEqual([
      ['Invoice No', 'Vendor', 'Tax', 'Total'],
      ['INV-001', 'ABC Ltd', '500', '5500'],
      ['INV-002', 'XYZ Ltd', '', '7700'],
    ]);
    expect(sheets[1].rows[1]).toEqual(['Bhoomi', '23']);
  });

  it('parses a real BIFF .xls (legacy format) with real values', async () => {
    const buffer = makeXlsBuffer([
      ['name', 'age', 'city'],
      ['Alice', 25, 'Bangalore'],
      ['Rahul', 28, 'Mangalore'],
      ['Priya', 24, 'Udupi'],
    ]);

    const sheets: SheetData[] = await parseWorkbook(buffer, 'xls');
    expect(sheets.map((s) => s.name)).toEqual(['Sheet1']);
    expect(sheets[0].rows).toEqual([
      ['name', 'age', 'city'],
      ['Alice', '25', 'Bangalore'],
      ['Rahul', '28', 'Mangalore'],
      ['Priya', '24', 'Udupi'],
    ]);
  });

  it('rejects a non-workbook buffer for xlsx', async () => {
    await expect(parseWorkbook(new Uint8Array([1, 2, 3]).buffer, 'xlsx')).rejects.toBeTruthy();
  });

  it('returns a sheet with no rows for an empty sheet (empty handling is a UI decision)', async () => {
    const buffer = await makeXlsxBuffer([{ name: 'Empty', rows: [] }]);
    const sheets = await parseWorkbook(buffer, 'xlsx');
    expect(sheets).toEqual([{ name: 'Empty', rows: [] }]);
  });
});