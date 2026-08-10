'use client';

import { FileText, FileImage, Table, Archive } from 'lucide-react';
import { RagDocumentInfo } from '@/lib/api/rag';
import { cn } from '@/lib/utils';
import { DocumentStatus } from './document-status';

export function documentKind(d: RagDocumentInfo): 'pdf' | 'image' | 'table' | 'archive' {
  const f = (d.fileName || '').toLowerCase();
  const m = (d.mimeType || '').toLowerCase();
  if (m === 'application/pdf' || f.endsWith('.pdf')) return 'pdf';
  if (m === 'image/svg+xml' || m.startsWith('image/')) return 'image';
  if (
    m.includes('spreadsheet') ||
    m.includes('csv') ||
    f.endsWith('.csv') ||
    f.endsWith('.xls') ||
    f.endsWith('.xlsx')
  ) {
    return 'table';
  }
  if (m.includes('zip') || f.endsWith('.zip')) return 'archive';
  return 'pdf';
}

const KIND_ICON: Record<string, typeof FileText> = {
  pdf: FileText,
  image: FileImage,
  table: Table,
  archive: Archive,
};

const KIND_TEXT: Record<string, string> = {
  pdf: 'PDF',
  image: 'IMG',
  table: 'TABLE',
  archive: 'ZIP',
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

interface DocumentListItemProps {
  document: RagDocumentInfo;
  active: boolean;
  onClick: () => void;
}

export function DocumentListItem({ document, active, onClick }: DocumentListItemProps) {
  const Icon = KIND_ICON[documentKind(document)];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
        active
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-gray-200 bg-white hover:bg-gray-50',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-800">{document.fileName}</p>
        <p className="mt-0.5 text-[11px] text-gray-500">
          {KIND_TEXT[documentKind(document)]}
          {document.pageCount ? ` · ${document.pageCount} pages` : ''}
          {' · '}
          {formatSize(document.size)}
        </p>
      </div>
      <DocumentStatus document={document} />
    </button>
  );
}