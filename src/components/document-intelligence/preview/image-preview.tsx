'use client';

import { Minus, Plus } from 'lucide-react';

interface ImagePreviewProps {
  url: string;
  name?: string;
  zoom: number;
  onZoomChange?: (zoom: number) => void;
}

export function ImagePreview({ url, name, zoom, onZoomChange }: ImagePreviewProps) {
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
      <div className="flex flex-1 items-center justify-center overflow-auto bg-gray-100 p-4">
        <img
          src={url}
          alt={name || 'Document preview'}
          style={{ transform: `scale(${zoom || 1})` }}
          className="max-h-full max-w-full object-contain bg-white shadow"
        />
      </div>
    </div>
  );
}