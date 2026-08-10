'use client';

import { useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const PAGE_SIZE = 50;

interface SheetData {
  name: string;
  rows: string[][];
}

function parseWorkbook(buffer: ArrayBuffer): Promise<SheetData[]> {
  const workbook = new ExcelJS.Workbook();
  return workbook.xlsx.load(buffer).then((wb) => {
    const sheets: SheetData[] = [];
    wb.eachSheet((sheet) => {
      const rows: string[][] = [];
      sheet.eachRow((row) => {
        const cells: string[] = [];
        row.eachCell((cell) => cells.push(Array.isArray(cell.text) ? cell.text.join('') : String(cell.text ?? '')));
        rows.push(cells);
      });
      sheets.push({ name: sheet.name, rows });
    });
    return sheets;
  });
}

interface SpreadsheetPreviewProps {
  buffer: ArrayBuffer;
}

export function SpreadsheetPreview({ buffer }: SpreadsheetPreviewProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [active, setActive] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    parseWorkbook(buffer)
      .then((s) => {
        setSheets(s);
      })
      .catch(() => setError('This spreadsheet could not be parsed.'))
      .finally(() => setLoading(false));
  }, [buffer]);

  const sheet = sheets[active];
  const dataRows = useMemo(() => (sheet ? sheet.rows.slice(1) : []), [sheet]);
  const totalPages = Math.max(1, Math.ceil(dataRows.length / PAGE_SIZE));
  const startIdx = Math.min(page * PAGE_SIZE, Math.max(0, dataRows.length - PAGE_SIZE));
  const pageRows = dataRows.slice(startIdx, startIdx + PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-red-600">{error}</div>
    );
  }

  if (!sheet) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-500">Empty workbook.</div>;
  }

  const header = sheet.rows[0] || [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
        {sheets.map((s, i) => (
          <button
            key={i}
            onClick={() => {
              setActive(i);
              setPage(0);
            }}
            className={`rounded px-2 py-1 ${i === active ? 'bg-emerald-600 text-white' : 'hover:bg-gray-200'}`}
          >
            {s.name}
          </button>
        ))}
        {totalPages > 1 && (
          <span className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded p-0.5 hover:bg-gray-200 disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span>
              Page {page + 1}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded p-0.5 hover:bg-gray-200 disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0">
            <tr className="bg-gray-100">
              {header.map((c, i) => (
                <th key={i} className="border border-gray-200 px-2 py-1.5 text-left font-medium whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr key={ri} className="even:bg-gray-50 hover:bg-emerald-50">
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-gray-200 px-2 py-1 max-w-xs truncate" title={cell}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}