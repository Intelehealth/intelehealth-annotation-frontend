'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { RagDocumentInfo, ragAPI } from '@/lib/api/rag';
import { processingAPI } from '@/lib/api/processing';
import { cn } from '@/lib/utils';
import { previewKindFor } from '@/lib/preview-kind';
import type { SpreadsheetFormat } from '@/lib/spreadsheet';
import { PdfPreview } from './pdf-preview';
import { ImagePreview } from './image-preview';
import { SvgPreview } from './svg-preview';
import { CsvTablePreview } from './csv-table-preview';
import { SpreadsheetPreview } from './spreadsheet-preview';
import { ZipPreview } from './zip-preview';
import { UnsupportedPreview } from './unsupported-preview';

type PreviewKind =
  | 'pdf'
  | 'image'
  | 'svg'
  | 'csv'
  | 'spreadsheet'
  | 'zip'
  | 'unsupported';

/**
 * Single shared kind detector from src/lib/preview-kind.ts. Only table vs
 * non-table mapping happens here; no duplicate MIME/extension logic.
 */
function kindFor(mime: string, fileName: string): PreviewKind {
  const kind = previewKindFor(mime, fileName);
  if (kind === 'csv') return 'csv';
  if (kind === 'xls' || kind === 'xlsx') return 'spreadsheet';
  if (kind === 'pdf') return 'pdf';
  if (kind === 'image') return 'image';
  if (kind === 'svg') return 'svg';
  const m = (mime || '').toLowerCase();
  const f = (fileName || '').toLowerCase();
  if (m.includes('zip') || f.endsWith('.zip')) return 'zip';
  return 'unsupported';
}

function spreadsheetFormat(mime: string, fileName: string): SpreadsheetFormat {
  return previewKindFor(mime, fileName) === 'xls' ? 'xls' : 'xlsx';
}

interface DocumentPreviewProps {
  document: RagDocumentInfo | null;
  datasetId?: string;
  currentPage?: number;
  zoom?: number;
  citationPulse?: number;
  focusRow?: number;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
  className?: string;
}

export function DocumentPreview({
  document,
  datasetId,
  currentPage = 1,
  zoom = 1,
  citationPulse,
  focusRow,
  onPageChange,
  onZoomChange,
  className,
}: DocumentPreviewProps) {
  const [kind, setKind] = useState<PreviewKind>('unsupported');
  const [url, setUrl] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pulseActive, setPulseActive] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!citationPulse) return;
    setPulseActive(true);
    const t = window.setTimeout(() => setPulseActive(false), 2000);
    return () => window.clearTimeout(t);
  }, [citationPulse]);

  useEffect(() => {
    if (!document) {
      setKind('unsupported');
      setUrl(null);
      setCsvText(null);
      setSvgText(null);
      setBuffer(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setLoading(true);
    setError(null);
    setCsvText(null);
    setSvgText(null);
    setBuffer(null);

    // CSV imports store real rows in the backend (not a blob) — render the Excel
    // grid from those real rows, fetching each page on demand from the backend.
    if (document.source === 'CSV' && datasetId) {
      setKind('csv');
      setLoading(false);
      return;
    }

    processingAPI
      .getDocumentContent(document.id)
      .then(async (blob) => {
        const mime = blob.type || document.mimeType;
        const k = kindFor(mime, document.fileName);
        setKind(k);
        const objUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objUrl;
        setUrl(objUrl);
        if (k === 'csv') setCsvText(await blob.text());
        if (k === 'svg') setSvgText(await blob.text());
        if (k === 'spreadsheet' || k === 'zip') setBuffer(await blob.arrayBuffer());
      })
      .catch(() => {
        setError('The document content could not be loaded.');
        setKind('unsupported');
      })
      .finally(() => setLoading(false));

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [document, datasetId, attempt]);

  useEffect(() => {
    const max = document?.pageCount;
    if (document && max && currentPage > max) {
      onPageChange?.(max);
    }
  }, [document, currentPage, onPageChange]);

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-sm text-red-600 gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            Retry
          </button>
        </div>
      );
    }
    if (!document) return null;
    if (!url && kind !== 'csv') return null;
    const contentUrl = url as string | null;
    switch (kind) {
      case 'pdf':
        return (
          <PdfPreview
            url={contentUrl!}
            name={document.fileName}
            currentPage={currentPage}
            zoom={zoom}
            onPageChange={onPageChange}
            onZoomChange={onZoomChange}
          />
        );
      case 'image':
        return <ImagePreview url={contentUrl!} name={document.fileName} zoom={zoom} onZoomChange={onZoomChange} />;
      case 'svg':
        return <SvgPreview url={contentUrl!} name={document.fileName} text={svgText ?? undefined} />;
      case 'csv':
        return document.source === 'CSV' && datasetId ? (
          <CsvTablePreview
            fetchPage={(page, pageSize) =>
              ragAPI.csvPreview(datasetId, document.id, { page, pageSize })
            }
            focusRow={focusRow}
          />
        ) : csvText !== null ? (
          <CsvTablePreview text={csvText} focusRow={focusRow} />
        ) : null;
      case 'spreadsheet':
        return buffer ? (
          <SpreadsheetPreview
            buffer={buffer}
            format={spreadsheetFormat(document.mimeType, document.fileName)}
          />
        ) : null;
      case 'zip':
        return (
          <ZipPreview
            fileName={document.fileName}
            size={document.size}
            downloadUrl={contentUrl!}
            buffer={buffer ?? undefined}
          />
        );
      default:
        return <UnsupportedPreview fileName={document.fileName} downloadUrl={contentUrl!} />;
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden transition-shadow',
        pulseActive && 'ring-2 ring-blue-500 rounded-lg',
        className,
      )}
    >
      {renderBody()}
    </div>
  );
}