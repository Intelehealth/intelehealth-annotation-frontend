'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { RagDocumentInfo, ragAPI } from '@/lib/api/rag';
import { processingAPI } from '@/lib/api/processing';
import { cn } from '@/lib/utils';
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

function kindFor(mime: string, fileName: string): PreviewKind {
  const m = (mime || '').toLowerCase();
  const f = (fileName || '').toLowerCase();
  if (m === 'application/pdf' || f.endsWith('.pdf')) return 'pdf';
  if (m === 'image/svg+xml' || f.endsWith('.svg')) return 'svg';
  if (m.startsWith('image/')) return 'image';
  if (m.includes('csv') || f.endsWith('.csv')) return 'csv';
  if (
    m.includes('spreadsheet') ||
    m === 'application/vnd.ms-excel' ||
    f.endsWith('.xls') ||
    f.endsWith('.xlsx')
  ) {
    return 'spreadsheet';
  }
  if (m.includes('zip') || f.endsWith('.zip')) return 'zip';
  return 'unsupported';
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
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setCsvRows(null);
      setBuffer(null);
      setError(null);
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setLoading(true);
    setError(null);
    setCsvText(null);
    setCsvRows(null);
    setBuffer(null);

    // CSV imports store real rows in the backend (not a blob) — render the HTML
    // table from those real rows so no content endpoint is needed.
    if (document.source === 'CSV' && datasetId) {
      ragAPI
        .csvPreview(datasetId, document.id)
        .then((p) => {
          const combined: string[][] = [p.columns || [], ...((p.rows || []) as string[][])];
          setCsvRows(combined);
          setKind('csv');
        })
        .catch(() => {
          setError('The CSV rows could not be loaded.');
          setKind('unsupported');
        })
        .finally(() => setLoading(false));
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
        if (k === 'spreadsheet') setBuffer(await blob.arrayBuffer());
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
  }, [document, datasetId]);

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
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-sm text-red-600">
          <AlertCircle className="h-5 w-5 mb-2" />
          {error}
        </div>
      );
    }
    if (!document || !url) return null;
    switch (kind) {
      case 'pdf':
        return (
          <PdfPreview
            url={url}
            currentPage={currentPage}
            zoom={zoom}
            onPageChange={onPageChange}
            onZoomChange={onZoomChange}
          />
        );
      case 'image':
        return <ImagePreview url={url} name={document.fileName} zoom={zoom} onZoomChange={onZoomChange} />;
      case 'svg':
        return <SvgPreview url={url} name={document.fileName} />;
      case 'csv':
        return csvRows
          ? <CsvTablePreview rows={csvRows} focusRow={focusRow} />
          : csvText !== null
            ? <CsvTablePreview text={csvText} focusRow={focusRow} />
            : null;
      case 'spreadsheet':
        return buffer ? <SpreadsheetPreview buffer={buffer} /> : null;
      case 'zip':
        return <ZipPreview fileName={document.fileName} size={document.size} downloadUrl={url} />;
      default:
        return <UnsupportedPreview fileName={document.fileName} downloadUrl={url} />;
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden transition-shadow',
        pulseActive && 'ring-2 ring-emerald-500 rounded-lg',
        className,
      )}
    >
      {renderBody()}
    </div>
  );
}