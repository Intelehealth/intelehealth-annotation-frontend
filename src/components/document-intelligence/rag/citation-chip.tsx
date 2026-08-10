'use client';

import { FileText } from 'lucide-react';

interface CitationChipProps {
  fileName?: string;
  page?: number;
  onClick?: () => void;
}

export function CitationChip({ fileName, page, onClick }: CitationChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Open the cited document / page"
      className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:border-emerald-300 hover:bg-emerald-50"
    >
      <FileText className="h-3 w-3 text-gray-400" />
      {fileName || 'source'}
      {typeof page === 'number' ? ` · p${page}` : ''}
    </button>
  );
}