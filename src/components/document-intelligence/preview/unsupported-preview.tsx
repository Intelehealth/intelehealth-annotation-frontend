'use client';

import { FileText, Download } from 'lucide-react';

interface UnsupportedPreviewProps {
  fileName?: string;
  downloadUrl?: string;
  message?: string;
}

export function UnsupportedPreview({ fileName, downloadUrl, message }: UnsupportedPreviewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-sm text-gray-500">
      <FileText className="h-12 w-12 text-gray-300 mb-3" />
      <p>{message || 'Preview unavailable'}</p>
      <p className="text-xs text-gray-400 mt-1">The original file is still available.</p>
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={fileName}
          className="mt-4 flex items-center gap-1 text-xs text-blue-700 hover:underline"
        >
          <Download className="h-3.5 w-3.5" /> Download {fileName || 'original'}
        </a>
      )}
    </div>
  );
}