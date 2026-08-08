'use client';

import { RagDocumentInfo } from '@/lib/api/rag';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  INDEXED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  READY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};

export function DocumentStatus({ document }: { document: RagDocumentInfo }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
          STATUS_STYLES[document.status] || 'bg-gray-50 text-gray-600 border-gray-200',
        )}
      >
        {document.status}
      </span>
      {document.profile && document.profile !== 'GENERIC_DOCUMENT' && (
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">
          {document.profile}
        </span>
      )}
    </div>
  );
}