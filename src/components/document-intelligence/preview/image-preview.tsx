'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus, AlertCircle, RotateCw, Download, Loader2 } from 'lucide-react';

interface ImagePreviewProps {
  url: string;
  name?: string;
  zoom: number;
  onZoomChange?: (zoom: number) => void;
}

/** Renders only the actual uploaded image bytes (never an OCR reconstruction). */
export function ImagePreview({ url, name, zoom, onZoomChange }: ImagePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [url]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
        <button
          onClick={() => onZoomChange?.((zoom || 1) - 0.25)}
          className="rounded p-0.5 hover:bg-gray-200"
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-14 text-center tabular-nums">{Math.round((zoom || 1) * 100)}%</span>
        <button
          onClick={() => onZoomChange?.((zoom || 1) + 0.25)}
          className="rounded p-0.5 hover:bg-gray-200"
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-auto bg-gray-100 p-4">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Loading image preview...</p>
          </div>
        )}
        {failed ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 text-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm text-gray-600">Unable to display this image.</p>
            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setFailed(false);
                  setLoading(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
              >
                <RotateCw className="h-3.5 w-3.5" /> Retry
              </button>
              <a
                href={url}
                download={name || 'image'}
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> Download original image
              </a>
            </div>
          </div>
        ) : (
          <img
            src={url}
            alt={name || 'Document preview'}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            style={{ transform: `scale(${zoom || 1})` }}
            className="max-h-full max-w-full object-contain bg-white shadow"
          />
        )}
      </div>
    </div>
  );
}