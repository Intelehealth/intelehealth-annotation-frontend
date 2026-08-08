'use client';

import { useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';

interface SvgPreviewProps {
  url: string;
  name?: string;
}

export function SvgPreview({ url, name }: SvgPreviewProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-gray-500">
        <AlertCircle className="h-6 w-6 mb-2 text-gray-300" />
        <p>Preview unavailable</p>
        <p className="text-xs text-gray-400 mt-1">The original file is still available.</p>
        <a href={url} download className="mt-3 flex items-center gap-1 text-xs text-emerald-700 hover:underline">
          <Download className="h-3.5 w-3.5" /> Download original
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-gray-100 p-4">
      <img
        src={url}
        alt={name || 'SVG preview'}
        onError={() => setFailed(true)}
        className="max-h-full max-w-full object-contain bg-white shadow"
      />
    </div>
  );
}