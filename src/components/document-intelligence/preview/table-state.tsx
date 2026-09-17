'use client';

import { AlertCircle, Loader2, RotateCw, Table2 } from 'lucide-react';

export function TableLoading({ className }: { className?: string }) {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-2 ${className ?? ''}`}>
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      <p className="text-sm text-gray-500">Loading table preview...</p>
    </div>
  );
}

export function TableEmpty({ className }: { className?: string }) {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-2 px-4 text-center ${className ?? ''}`}>
      <Table2 className="h-6 w-6 text-gray-300" />
      <p className="text-sm text-gray-500">No table data available for this document.</p>
    </div>
  );
}

export function TableError({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-2 px-4 text-center ${className ?? ''}`}>
      <AlertCircle className="h-6 w-6 text-red-500" />
      <p className="text-sm text-gray-600">
        {message || 'Unable to load table preview.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}