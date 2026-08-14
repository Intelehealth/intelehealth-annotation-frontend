'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Search,
} from 'lucide-react';
import type { CsvPreviewResult } from '@/lib/api/rag';
import { parseCsv } from '@/lib/csv';
import { isTableEmpty } from '@/lib/table-data';
import { TableEmpty, TableError, TableLoading } from './table-state';

const PAGE_SIZE = 200;
const DEFAULT_COL_WIDTH = 140;

function columnLetter(index: number): string {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

interface CsvTablePreviewProps {
  text?: string;
  rows?: string[][];
  fetchPage?: (page: number, pageSize: number) => Promise<CsvPreviewResult>;
  focusRow?: number;
}

interface Selection {
  r: number; // data row index (0-based within loaded page)
  c: number;
}

export function CsvTablePreview({
  text,
  rows,
  fetchPage,
  focusRow,
}: CsvTablePreviewProps) {
  // Server-paged mode
  const [loadedColumns, setLoadedColumns] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Static mode
  const staticParsed = useMemo(() => {
    if (rows && rows.length) {
      return { columns: rows[0] || [], rows: rows.slice(1) };
    }
    if (text) return parseCsv(text);
    return { columns: [] as string[], rows: [] as string[][] };
  }, [rows, text]);
  const staticMode = useMemo(() => !fetchPage, [fetchPage]);
  const columns = staticMode
    ? staticParsed.columns
    : loadedColumns;
  const data = staticMode
    ? staticParsed.rows
    : searchQuery
      ? dataRows.filter((row) =>
          row.some((cell) => cell.toLowerCase().includes(searchQuery.toLowerCase())),
        )
      : dataRows;

  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [sel, setSel] = useState<Selection | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  const loadPage = useCallback(
    async (p: number) => {
      if (!fetchPage) return;
      setPageLoading(true);
      setPageError(null);
      try {
        const res = await fetchPage(p, PAGE_SIZE);
        setLoadedColumns(res.columns || []);
        setDataRows(res.rows || []);
        setTotalRows(res.totalRows || 0);
        setTotalPages(res.totalPages && Number.isFinite(res.totalPages) ? res.totalPages : 1);
        setPage(Number.isFinite(res.page) ? res.page : p);
        setSel(null);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      } catch {
        setPageError('The CSV rows could not be loaded.');
      } finally {
        setPageLoading(false);
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    if (staticMode) return;
    const t = window.setTimeout(() => loadPage(0), 0);
    return () => window.clearTimeout(t);
  }, [fetchPage, staticMode, loadPage]);

  // Navigate to an external focused row (citation "jump to row") — global index.
  useEffect(() => {
    if (focusRow === undefined || focusRow === null) return;
    if (staticMode) {
      const body = tableBodyRef.current;
      body
        ?.querySelector(`[data-csv-row="${focusRow}"]`)
        ?.scrollIntoView({ block: 'center' });
      return;
    }
    const targetPage = Math.max(0, Math.min(totalPages - 1, Math.floor(focusRow / PAGE_SIZE)));
    const t = window.setTimeout(() => loadPage(targetPage), 0);
    requestAnimationFrame(() => {
      const local = focusRow - targetPage * PAGE_SIZE;
      scrollRef.current
        ?.querySelector(`[data-csv-row-local="${local}"]`)
        ?.scrollIntoView({ block: 'center' });
    });
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRow]);

  const widthOf = (i: number) => colWidths[i] ?? DEFAULT_COL_WIDTH;

  const handleResizeStart = (ci: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = widthOf(ci);
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setColWidths((prev) => ({ ...prev, [ci]: Math.max(60, startW + delta) }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const copySelection = async () => {
    if (!sel) return;
    const row = data[sel.r];
    const value = row?.[sel.c] ?? '';
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard unavailable */
    }
  };

  const copyRow = async (r: number) => {
    const row = data[r];
    if (!row) return;
    try {
      await navigator.clipboard.writeText(row.join('\t'));
    } catch {
      /* ignore */
    }
  };

  const formattedTotal = useMemo(
    () => (staticMode ? staticParsed.rows.length : totalRows),
    [staticMode, staticParsed.rows.length, totalRows],
  );

  const renderedHeader = columns;
  const renderedRows = data;
  const selValue =
    sel && data[sel.r] ? data[sel.r][sel.c] ?? '' : '';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
        <span className="font-medium">
          {Math.max(0, formattedTotal)} data rows
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-400">{columns.length} columns</span>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1 text-gray-400">
          <Search className="h-3 w-3" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search current page…"
            className="rounded border bg-white px-2 py-0.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
        {!staticMode && (
          <span className="ml-auto flex items-center gap-2">
            <button
              onClick={() => loadPage(Math.max(0, page - 1))}
              disabled={page <= 0 || pageLoading}
              className="rounded p-0.5 hover:bg-gray-200 disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span>
              Page {page + 1}/{totalPages}
            </span>
            <button
              onClick={() => loadPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1 || pageLoading}
              className="rounded p-0.5 hover:bg-gray-200 disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>

      {/* Formula bar */}
      <div className="flex items-center gap-2 border-b bg-white px-3 py-1 text-xs">
        <span className="flex items-center gap-1 text-gray-400">
          <Copy className="h-3 w-3" />
          <button onClick={copySelection} disabled={!sel} className="text-blue-700 hover:underline disabled:text-gray-300">
            Copy cell
          </button>
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-500">
            {sel ? `${columnLetter(sel.c)}${(sel.r + 1)}` : '—'}
          </span>
          <span className="min-w-0 truncate font-mono text-gray-800" title={selValue}>
            {selValue || <span className="text-gray-300">Select a cell to see its value</span>}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {pageLoading && !staticMode ? (
          <TableLoading />
        ) : pageError ? (
          <TableError onRetry={() => loadPage(page)} />
        ) : isTableEmpty(columns, data) && !searchQuery ? (
          <TableEmpty />
        ) : (
          <div className="inline-block min-w-full align-top">
            <table className="text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <colgroup>
                <col style={{ width: 44 }} />
                {renderedHeader.map((_, ci) => (
                  <col key={ci} style={{ width: widthOf(ci) }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 border-b border-r border-gray-300 bg-gray-200 px-1 text-center text-[10px] font-medium text-gray-500">
                    #
                  </th>
                  {renderedHeader.map((h, ci) => (
                    <th
                      key={ci}
                      className="group relative border-b border-r border-gray-300 bg-gray-100 px-2 py-1.5 text-left font-medium text-gray-700"
                      style={{ width: widthOf(ci), minWidth: widthOf(ci), whiteSpace: 'nowrap' }}
                    >
                      <div className="flex flex-col leading-tight">
                        <span className="text-[9px] font-semibold text-blue-700">
                          {columnLetter(ci)}
                        </span>
                        <span className="truncate">{h}</span>
                      </div>
                      <span
                        onMouseDown={handleResizeStart(ci)}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                        title="Drag to resize"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody ref={tableBodyRef}>
                {renderedRows.map((row, ri) => {
                  const globalRow = staticMode
                    ? ri
                    : (Number.isFinite(page) ? page : 0) * PAGE_SIZE + ri;
                  const selected = sel?.r === ri;
                  return (
                    <tr
                      key={ri}
                      data-csv-row={globalRow}
                      data-csv-row-local={ri}
                      className="group"
                      onClick={() => setSel({ r: ri, c: Math.max(0, sel?.c ?? 0) })}
                    >
                      <td
                        className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-100 px-1 text-right text-[10px] text-gray-400"
                        onDoubleClick={() => copyRow(ri)}
                        title="Double-click to copy row"
                      >
                        {globalRow + 1}
                      </td>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          onClick={() => setSel({ r: ri, c: ci })}
                          title={cell}
                          className={
                            'max-w-[320px] truncate border-b border-r border-gray-200 px-2 py-1 ' +
                            (selected && sel?.c === ci
                              ? 'bg-blue-100 outline outline-2 outline-blue-500'
                              : cell.trim() === ''
                                ? 'bg-gray-50 text-gray-300'
                                : Number.isFinite(Number(cell)) && cell.trim() !== ''
                                  ? 'text-right text-gray-700'
                                  : 'text-gray-700')
                          }
                          style={{
                            width: widthOf(ci),
                            textAlign: Number.isFinite(Number(cell)) && cell.trim() !== '' ? 'right' : 'left',
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {renderedRows.length === 0 && (
                  <tr>
                    <td colSpan={Math.max(1, renderedHeader.length) + 1} className="px-3 py-8 text-center text-gray-400">
                      {searchQuery ? 'No rows match your search.' : 'No rows to display.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
