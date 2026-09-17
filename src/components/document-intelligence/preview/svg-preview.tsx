'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { hasRenderableContent } from '@/lib/svg';

interface SvgPreviewProps {
  /** Object URL of the actual SVG bytes returned by the content endpoint. */
  url: string;
  name?: string;
  /** The real uploaded SVG text — used only to detect a genuinely empty file. */
  text?: string;
}

/**
 * Renders only the actual uploaded SVG (backend-served bytes as an object URL).
 * Never generates, reconstructs or substitutes SVG content. States:
 * LOADING → "Loading SVG preview..."
 * EMPTY   → "This SVG contains no renderable content."
 * ERROR   → "Unable to load SVG preview." + Retry (same real URL) + Download original.
 * SUCCESS → <img> of the original SVG.
 */
export function SvgPreview({ url, name, text }: SvgPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Reset all state for every document change so a previous SVG is never shown.
  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [url]);

  if (typeof text === 'string' && !hasRenderableContent(text)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm text-gray-500">This SVG contains no renderable content.</p>
        <a
          href={url}
          download
          className="mt-1 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
        >
          <Download className="h-3.5 w-3.5" /> Download original SVG
        </a>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-sm text-gray-600">Unable to load SVG preview.</p>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setLoading(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            Retry
          </button>
          <a
            href={url}
            download
            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Download original SVG
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full items-center justify-center bg-gray-100 p-4">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading SVG preview...</p>
        </div>
      )}
      <img
        src={url}
        alt={name || 'SVG preview'}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        className="max-h-full max-w-full object-contain bg-white shadow"
      />
    </div>
  );
}