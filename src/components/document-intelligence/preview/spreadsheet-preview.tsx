'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { parseWorkbook, SpreadsheetFormat, SheetData } from '@/lib/spreadsheet';
import { TableEmpty, TableError, TableLoading } from './table-state';

const PAGE_SIZE = 50;

interface SpreadsheetPreviewProps {
  buffer: ArrayBuffer;
  format?: SpreadsheetFormat;
}

export function SpreadsheetPreview({ buffer, format = 'xlsx' }: SpreadsheetPreviewProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [active, setActive] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let on = true;
    setLoading(true);
    setError(null);
    parseWorkbook(buffer, format)
      .then((s) => {
        if (!on) return;
        setSheets(s);
        setActive(0);
        setPage(0);
      })
      .catch(() => {
        if (!on) return;
        setError('Unable to load table preview.');
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, [buffer, format, reloadKey]);

  const hasData = useMemo(
    () => sheets.some((s) => s.rows.some((r) => r.some((c) => c !== ''))),
    [sheets],
  );

  const sheet = sheets[active];
  const dataRows = useMemo(() => (sheet ? sheet.rows.slice(1) : []), [sheet]);
  const totalPages = Math.max(1, Math.ceil(dataRows.length / PAGE_SIZE));
  const startIdx = Math.min(page * PAGE_SIZE, Math.max(0, dataRows.length - PAGE_SIZE));
  const pageRows = dataRows.slice(startIdx, startIdx + PAGE_SIZE);

  if (loading) {
    return <TableLoading />;
  }

  if (error) {
    return (
      <TableError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
    );
  }

  if (!hasData || !sheet) {
    return <TableEmpty />;
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
            className={`rounded px-2 py-1 ${i === active ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
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
              <tr key={ri} className="even:bg-gray-50 hover:bg-blue-50">
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-gray-200 px-2 py-1 max-w-xs truncate" title={cell}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={Math.max(1, header.length)} className="px-3 py-8 text-center text-gray-400">
                  No rows in this sheet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}