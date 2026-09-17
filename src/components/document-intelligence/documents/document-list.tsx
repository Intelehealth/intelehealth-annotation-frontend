'use client';

import { useState, useMemo } from 'react';
import { RagDocumentInfo } from '@/lib/api/rag';
import { useDocumentView } from '../context/document-view-context';
import { DocumentSearch } from './document-search';
import { DocumentListItem, documentKind } from './document-list-item';
import { cn } from '@/lib/utils';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pdf', label: 'PDF' },
  { key: 'image', label: 'Images' },
  { key: 'table', label: 'Tables' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export function DocumentList({ documents }: { documents: RagDocumentInfo[] }) {
  const { selectedDocumentId, setSelectedDocumentId } = useDocumentView();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((d) => {
      if (filter !== 'all' && documentKind(d) !== filter) return false;
      if (q && !d.fileName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [documents, query, filter]);

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <DocumentSearch value={query} onChange={setQuery} />
      <div className="flex items-center gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-1.5 overflow-auto pr-0.5">
        {filtered.map((doc) => (
          <DocumentListItem
            key={doc.id}
            document={doc}
            active={doc.id === selectedDocumentId}
            onClick={() => setSelectedDocumentId(doc.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-gray-400">No documents match.</p>
        )}
      </div>
    </div>
  );
}