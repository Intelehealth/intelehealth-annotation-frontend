"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { processingAPI } from "@/lib/api/processing";
import {
  Loader2,
  AlertCircle,
  FileText,
  Eye,
  ArrowLeft,
  Download,
  Table,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type ViewMode = "annotation" | "document-view";

interface AnnotationViewSwitcherProps {
  datasetId: string;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  returnTo?: string;
}

export function AnnotationViewSwitcher({
  datasetId,
  mode,
  onModeChange,
  returnTo,
}: AnnotationViewSwitcherProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.push(returnTo || `/dataset/${datasetId}`);
  }, [router, datasetId, returnTo]);

  const handleModeChange = (newMode: ViewMode) => {
    onModeChange(newMode);
    const params = new URLSearchParams(window.location.search);
    params.set("view", newMode);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  };

  const modes: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      key: "annotation",
      label: "Annotation",
      icon: <Eye className="h-4 w-4" />,
    },
    {
      key: "document-view",
      label: "Document View",
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  return (
    <div className="border-b bg-white">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dataset
        </button>
      </div>
      <div className="flex items-center gap-1 px-4 pb-2">
        {modes.map((m) => (
          <Button
            key={m.key}
            variant={mode === m.key ? "default" : "ghost"}
            size="sm"
            className={cn(
              "flex items-center gap-1.5 text-xs",
              mode === m.key && "bg-emerald-600 text-white hover:bg-emerald-700",
            )}
            onClick={() => handleModeChange(m.key)}
          >
            {m.icon}
            {m.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export interface SourceInfo {
  documentId: string;
  fileName: string;
  mimeType: string;
  sourceType: string;
  storageKey: string;
  processingStatus: string;
  pageCount?: number;
  sourceUrl?: string;
  metadata?: Record<string, any>;
}

// ─── CSV Parsing ───────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
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
      } else if (ch === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (ch === "\n") {
        currentRow.push(currentField);
        if (currentRow.some((f) => f.trim() !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else if (ch === "\r") {
        // skip
      } else {
        currentField += ch;
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim() !== "")) {
      rows.push(currentRow);
    }
  }
  return rows;
}

const ROWS_PER_PAGE = 25;

function CsvTablePreview({ text }: { text: string }) {
  const rows = useMemo(() => parseCsv(text), [text]);
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil((rows.length - 1) / ROWS_PER_PAGE));
  const header = rows.length > 0 ? rows[0] : [];
  const startIdx = 1 + page * ROWS_PER_PAGE;
  const dataRows = rows.slice(startIdx, startIdx + ROWS_PER_PAGE);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-white px-3 py-1.5 text-xs text-gray-600">
        <span className="font-medium">
          <Table className="inline h-3.5 w-3.5 mr-1" />
          {rows.length > 0 ? `${rows.length - 1} data rows` : "Empty"}
        </span>
        {rows.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span>
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 sticky top-0">
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
              <tr key={ri} className="hover:bg-blue-50 even:bg-gray-50/50">
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
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── XLSX Preview ──────────────────────────────────────────────

import ExcelJS from "exceljs";

interface XlsxSheetData {
  name: string;
  rows: string[][];
}

function parseXlsx(buffer: ArrayBuffer): Promise<XlsxSheetData[]> {
  const workbook = new ExcelJS.Workbook();
  return workbook.xlsx.load(buffer).then((wb) => {
    const sheets: XlsxSheetData[] = [];
    wb.eachSheet((sheet) => {
      const rows: string[][] = [];
      sheet.eachRow((row) => {
        const cells: string[] = [];
        row.eachCell((cell) => {
          cells.push(cell.text ?? "");
        });
        rows.push(cells);
      });
      sheets.push({ name: sheet.name, rows });
    });
    return sheets;
  });
}

function XlsxTablePreview({ buffer }: { buffer: ArrayBuffer }) {
  const [sheets, setSheets] = useState<XlsxSheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    parseXlsx(buffer)
      .then((s) => {
        setSheets(s);
        setActiveSheet(0);
        setPage(0);
      })
      .catch(() => setError("Failed to parse spreadsheet"))
      .finally(() => setLoading(false));
  }, [buffer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-red-600">
        <AlertCircle className="h-4 w-4 mr-2" />
        {error}
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500">
        Empty workbook
      </div>
    );
  }

  const sheet = sheets[activeSheet];
  const totalPages = Math.max(1, Math.ceil((sheet.rows.length - 1) / ROWS_PER_PAGE));
  const startIdx = page * ROWS_PER_PAGE;
  const dataRows = sheet.rows.slice(startIdx, startIdx + ROWS_PER_PAGE);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-white px-3 py-1.5 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <Table className="h-3.5 w-3.5" />
          <select
            value={activeSheet}
            onChange={(e) => {
              setActiveSheet(Number(e.target.value));
              setPage(0);
            }}
            className="text-xs border rounded px-1 py-0.5"
          >
            {sheets.map((s, i) => (
              <option key={i} value={i}>
                {s.name} ({s.rows.length > 0 ? s.rows.length - 1 : 0} rows)
              </option>
            ))}
          </select>
        </div>
        {sheet.rows.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span>
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 sticky top-0">
              {(dataRows[0] || []).map((col, i) => (
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
            {dataRows.slice(1).map((row, ri) => (
              <tr key={ri} className="hover:bg-blue-50 even:bg-gray-50/50">
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
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────

function isOfficeMime(mime: string): boolean {
  const officeTypes = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.presentation",
  ];
  return officeTypes.includes(mime);
}

function isCsvMime(mime: string): boolean {
  return mime === "text/csv" || mime === "application/csv";
}

function isXlsxMime(mime: string): boolean {
  return (
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel"
  );
}

function isSvgMime(mime: string): boolean {
  return mime === "image/svg+xml";
}

interface DocumentPreviewProps {
  currentRow?: Record<string, any> | null;
}

export function DocumentPreview({ currentRow }: DocumentPreviewProps) {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);
  const [resolving, setResolving] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [xlsxBuffer, setXlsxBuffer] = useState<ArrayBuffer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const prevDocRef = useRef<string | null>(null);

  const rawDocumentId =
    currentRow?.__document?._id || currentRow?.documentId || null;
  const datasetId = currentRow?.__datasetId;
  const rowIndex = currentRow?.rowIndex;

  // Resolve document source
  useEffect(() => {
    const resolvedId = rawDocumentId;
    setDocumentId(resolvedId);

    if (!resolvedId && datasetId && rowIndex !== undefined) {
      setResolving(true);
      processingAPI
        .getRowSource(datasetId as string, rowIndex as number)
        .then((source) => {
          if (source.hasSource && source.documentId) {
            setDocumentId(source.documentId);
            setSourceInfo({
              documentId: source.documentId,
              fileName: source.fileName || "",
              mimeType: source.mimeType || "",
              sourceType: source.sourceType || "",
              storageKey: "",
              processingStatus: source.processingStatus || "",
              pageCount: source.pageCount,
              sourceUrl: source.sourceUrl,
              metadata: source.metadata,
            });
          }
        })
        .catch(() => {})
        .finally(() => setResolving(false));
    }
  }, [rawDocumentId, datasetId, rowIndex]);

  // Clear stale state when document changes
  useEffect(() => {
    const currentDocId = documentId;
    if (currentDocId !== prevDocRef.current) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setContentUrl(null);
      setMimeType("");
      setCsvText(null);
      setXlsxBuffer(null);
      setError(null);
      prevDocRef.current = currentDocId;
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setCsvText(null);
    setXlsxBuffer(null);

    processingAPI
      .getDocumentContent(documentId)
      .then(async (blob) => {
        const detectedMime = blob.type || "";
        setMimeType(detectedMime);

        if (isCsvMime(detectedMime)) {
          const text = await blob.text();
          setCsvText(text);
        } else if (isXlsxMime(detectedMime)) {
          const buf = await blob.arrayBuffer();
          setXlsxBuffer(buf);
        } else {
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          setContentUrl(url);
        }
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setError("The source document was not found.");
        } else if (err?.response?.status === 403) {
          setError("You do not have permission to access this document.");
        } else {
          setError("The document content could not be loaded.");
        }
      })
      .finally(() => setIsLoading(false));

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [documentId]);

  if (resolving) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm">Resolving document source...</p>
        </div>
      </div>
    );
  }

  if (!documentId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <FileText className="mx-auto mb-2 h-12 w-12 text-gray-300" />
          <p className="text-sm">No source document available for this row</p>
          {sourceInfo?.processingStatus && (
            <p className="text-xs text-gray-400 mt-1">
              Status: {sourceInfo.processingStatus}
            </p>
          )}
        </div>
      </div>
    );
  }

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/") && !isSvgMime(mimeType);
  const isSvg = isSvgMime(mimeType);
  const isOffice = isOfficeMime(mimeType);
  const isCsv = isCsvMime(mimeType);
  const isXlsx = isXlsxMime(mimeType);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading document content...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          {documentId && (
            <button
              onClick={() => {
                setIsLoading(true);
                setError(null);
                setCsvText(null);
                setXlsxBuffer(null);
                processingAPI
                  .getDocumentContent(documentId)
                  .then(async (blob) => {
                    const detectedMime = blob.type || "";
                    setMimeType(detectedMime);
                    if (isCsvMime(detectedMime)) {
                      setCsvText(await blob.text());
                    } else if (isXlsxMime(detectedMime)) {
                      setXlsxBuffer(await blob.arrayBuffer());
                    } else {
                      const url = URL.createObjectURL(blob);
                      objectUrlRef.current = url;
                      setContentUrl(url);
                    }
                  })
                  .catch(() => setError("Retry failed."))
                  .finally(() => setIsLoading(false));
              }}
              className="text-blue-600 hover:underline text-xs"
            >
              Retry
            </button>
          )}
        </div>
      );
    }

    // CSV inline table
    if (isCsv && csvText !== null) {
      return <CsvTablePreview text={csvText} />;
    }

    // XLSX inline table
    if (isXlsx && xlsxBuffer !== null) {
      return <XlsxTablePreview buffer={xlsxBuffer} />;
    }

    // PDF
    if (contentUrl && isPdf) {
      return (
        <iframe
          title="Document preview"
          src={contentUrl}
          className="h-full w-full rounded border border-gray-200 bg-white"
        />
      );
    }

    // Images (including SVG)
    if (contentUrl && (isImage || isSvg)) {
      return (
        <img
          src={contentUrl}
          alt="Document preview"
          className="max-h-full max-w-full object-contain"
        />
      );
    }

    // Office docs & unsupported: download link
    if (contentUrl) {
      return (
        <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
          <FileText className="h-12 w-12 text-gray-300" />
          <p>
            {isOffice
              ? "Browser preview not available for this Office document type"
              : "Preview not available for this file type"}
          </p>
          <a
            href={contentUrl}
            download
            className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download original file
          </a>
        </div>
      );
    }

    return <p className="text-sm text-gray-500">No preview available.</p>;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {sourceInfo && (
        <div className="border-b bg-gray-50 px-3 py-1.5 text-xs text-gray-600 flex items-center gap-3 shrink-0">
          <span className="font-medium truncate">{sourceInfo.fileName}</span>
          <span className="text-gray-400">|</span>
          <span>{mimeType || sourceInfo.mimeType}</span>
          {sourceInfo.pageCount && (
            <>
              <span className="text-gray-400">|</span>
              <span>{sourceInfo.pageCount} pages</span>
            </>
          )}
        </div>
      )}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-gray-100">
        {renderContent()}
      </div>
    </div>
  );
}