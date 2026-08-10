'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const PAGE_SIZE = 25;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\n') {
        currentRow.push(currentField);
        if (currentRow.some((f) => f.trim() !== '')) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (ch !== '\r') {
        currentField += ch;
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim() !== '')) rows.push(currentRow);
  }
  return rows;
}

interface CsvTablePreviewProps {
  text?: string;
  rows?: string[][];
  focusRow?: number;
}

export function CsvTablePreview({ text, rows, focusRow }: CsvTablePreviewProps) {
  const parsed = useMemo(() => (rows && rows.length ? rows : text ? parseCsv(text) : []), [text, rows]);
  const header = parsed.length > 0 ? parsed[0] : [];
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusRow === undefined || focusRow === null) return;
    const targetPage = Math.min(totalPages - 1, Math.floor(focusRow / PAGE_SIZE));
    setPage(targetPage);
    requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector(`[data-csv-row="${focusRow}"]`);
      el?.scrollIntoView({ block: 'center' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRow]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parsed.slice(1);
    return parsed.slice(1).filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q)),
    );
  }, [parsed, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIdx = Math.min(page * PAGE_SIZE, Math.max(0, filtered.length - PAGE_SIZE));
  const dataRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
        <span className="font-medium">{Math.max(0, parsed.length - 1)} data rows</span>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1 text-gray-400">
          <Search className="h-3 w-3" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search rows…"
            className="rounded border bg-white px-2 py-0.5 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none"
          />
        </div>
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
              {header.map((col, i) => (
                <th
                  key={i}
                  className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr
                key={ri}
                data-csv-row={startIdx + ri}
                className="even:bg-gray-50 hover:bg-emerald-50"
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border border-gray-200 px-2 py-1 text-gray-700 max-w-xs truncate"
                    title={cell}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {dataRows.length === 0 && (
              <tr>
                <td colSpan={Math.max(1, header.length)} className="px-3 py-6 text-center text-gray-400">
                  No rows match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}