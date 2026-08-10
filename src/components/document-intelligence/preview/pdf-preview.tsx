'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type * as PDFJS from 'pdfjs-dist';
import { Loader2, Minus, Plus, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

// pdf.js v6 evaluates `new DOMMatrix()` at module load, which Node (used by
// Next for SSR) does not provide. Import it lazily on the client only so the
// module is never evaluated on the server.
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist');
  }
  return pdfjsPromise;
}

// The worker is served as a static asset from the public dir (Turbopack can't
// serialize the ESM worker via `?url`), and is only assigned in the browser.
let workerConfigured = false;

function resolveWorkerUrl(): string {
  return '/lib/pdf.worker.min.mjs';
}

function ensurePdfWorker(pdfjs: typeof import('pdfjs-dist')) {
  if (workerConfigured || typeof window === 'undefined') return;
  workerConfigured = true;
  const url = resolveWorkerUrl();
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
  currentPage: number;
  zoom: number;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
}

export function PdfPreview({
  url,
  currentPage,
  zoom,
  onPageChange,
  onZoomChange,
}: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFJS.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clampPage = (p: number) => Math.min(Math.max(1, p), Math.max(1, numPages));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    docRef.current
      ?.destroy()
      .then(() => {
        docRef.current = null;
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        loadPdfJs()
          .then((pdfjs) => {
            ensurePdfWorker(pdfjs);
            return pdfjs.getDocument(url).promise;
          })
          .then((doc) => {
            if (cancelled) return;
            docRef.current = doc;
            setNumPages(doc.numPages || 0);
            setLoading(false);
          })
          .catch(() => {
            if (cancelled) return;
            setError('This PDF could not be rendered.');
            setLoading(false);
          });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    const pageIndex = Math.min(currentPage, numPages || 1) ;
    docRef.current
      ?.getPage(pageIndex)
      .then((page) => {
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;
        return renderTask.promise;
      })
      .catch(() => {
        // cancelled or error
      })
      .finally(() => {
        renderTaskRef.current = null;
      });
  }, [currentPage, numPages, zoom]);

  const go = useCallback(
    (delta: number) => {
      const next = clampPage((currentPage || 1) + delta);
      if (next !== currentPage) onPageChange?.(next);
    },
    [currentPage, numPages, onPageChange, clampPage],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-red-600">
        <AlertCircle className="h-5 w-5 mb-2" />
        {error}
        <span className="text-xs text-gray-500 mt-1">The original file is still available.</span>
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