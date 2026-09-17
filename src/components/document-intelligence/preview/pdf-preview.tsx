'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type * as PDFJS from 'pdfjs-dist';
import {
  Loader2,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCw,
  Download,
} from 'lucide-react';

// pdf.js v6 evaluates `new DOMMatrix()` at module load, which Node (used by
// Next for SSR) does not provide. Import it lazily on the client only.
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsPromise) pdfjsPromise = import('pdfjs-dist');
  return pdfjsPromise;
}

let workerConfigured = false;
function ensurePdfWorker(pdfjs: typeof import('pdfjs-dist')) {
  if (workerConfigured || typeof window === 'undefined') return;
  workerConfigured = true;
  const url = '/lib/pdf.worker.min.mjs';
  if (typeof url === 'string' && url) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = url;
    } catch {
      // never let a worker-config failure take down the app
    }
  }
}

interface PdfPreviewProps {
  url: string;
  name?: string;
  currentPage: number;
  zoom: number;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
}

export function PdfPreview({
  url,
  name,
  currentPage,
  zoom,
  onPageChange,
  onZoomChange,
}: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFJS.PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFJS.PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Clean up the previous loading task (v6: PDFDocumentProxy.destroy removed).
    const prevTask = loadingTaskRef.current;
    loadingTaskRef.current = null;
    if (prevTask) void prevTask.destroy().catch(() => {});

    loadPdfJs()
      .then((pdfjs) => {
        ensurePdfWorker(pdfjs);
        const task = pdfjs.getDocument({ url });
        loadingTaskRef.current = task;
        return task.promise;
      })
      .then((doc) => {
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages || 0);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Unable to render this PDF.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      const task = loadingTaskRef.current;
      loadingTaskRef.current = null;
      if (task) void task.destroy().catch(() => {});
    };
  }, [url, reloadKey]);

  useEffect(() => {
    if (!canvasRef.current || !docRef.current || loading) return;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    const pageIndex = Math.min(currentPage, numPages || 1);
    docRef.current
      .getPage(pageIndex)
      .then((page) => {
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // pdfjs-dist v6 RenderParameters requires `canvas` (canvasContext optional).
        const renderTask = page.render({ canvas, canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;
        return renderTask.promise;
      })
      .catch(() => {
        // cancelled or render error — render loop will retry on prop change
      })
      .finally(() => {
        renderTaskRef.current = null;
      });
  }, [currentPage, numPages, zoom, loading]);

  const go = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(1, (currentPage || 1) + delta), Math.max(1, numPages));
      if (next !== currentPage) onPageChange?.(next);
    },
    [currentPage, numPages, onPageChange],
  );

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Loading PDF preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-sm text-gray-600">{error}</p>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <RotateCw className="h-3.5 w-3.5" /> Retry
          </button>
          <a
            href={url}
            download={name || 'document.pdf'}
            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Download original PDF
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
        <button
          onClick={() => onZoomChange?.((zoom || 1) - 0.2)}
          className="rounded p-0.5 hover:bg-gray-200"
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-14 text-center tabular-nums">{Math.round((zoom || 1) * 100)}%</span>
        <button
          onClick={() => onZoomChange?.((zoom || 1) + 0.2)}
          className="rounded p-0.5 hover:bg-gray-200"
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="mx-2 text-gray-300">|</span>
        <button
          onClick={() => go(-1)}
          disabled={currentPage <= 1}
          className="rounded p-0.5 hover:bg-gray-200 disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span>
          Page {currentPage} / {numPages || '?'}
        </span>
        <button
          onClick={() => go(1)}
          disabled={currentPage >= numPages}
          className="rounded p-0.5 hover:bg-gray-200 disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-gray-100 p-3">
        <canvas ref={canvasRef} className="mx-auto shadow bg-white" />
      </div>
    </div>
  );
}