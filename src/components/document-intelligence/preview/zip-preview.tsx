'use client';

import { Archive, Download } from 'lucide-react';

interface ZipPreviewProps {
  fileName?: string;
  size?: number;
  downloadUrl?: string;
}

export function ZipPreview({ fileName, size, downloadUrl }: ZipPreviewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-sm text-gray-500">
      <Archive className="h-12 w-12 text-gray-300 mb-3" />
      <p className="font-medium text-gray-700">{fileName || 'ZIP archive'}</p>
      {typeof size === 'number' && size > 0 && (
        <p className="text-xs text-gray-400 mt-1">{(size / 1024).toFixed(1)} KB</p>
      )}
      <p className="mt-2 text-xs text-gray-500">
        Archive contents are extracted during processing; extracted child assets render with the
        format-appropriate preview.
      </p>
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={fileName}
          className="mt-4 flex items-center gap-1 text-xs text-emerald-700 hover:underline"
        >
          <Download className="h-3.5 w-3.5" /> Download original archive
        </a>
      )}
    </div>
  );
}