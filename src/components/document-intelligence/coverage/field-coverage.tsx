'use client';

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { ragAPI } from '@/lib/api/rag';
import { useDocumentView } from '../context/document-view-context';

interface CoverageItem {
  fieldName: string;
  type?: string;
  totalDocs?: number;
  coveredDocs?: number;
  coveragePct?: number;
}

export function FieldCoverage() {
  const { datasetId } = useDocumentView();
  const [cov, setCov] = useState<CoverageItem[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    ragAPI
      .coverage(datasetId)
      .then((data) => {
        setCov(Array.isArray(data) ? data : []);
        setState('ready');
      })
      .catch(() => setState('unavailable'));
  }, [datasetId]);

  if (state === 'loading') return <p className="text-xs text-gray-400">Loading coverage…</p>;
  if (state === 'unavailable') {
    return (
      <p className="text-xs text-gray-500">
        Field coverage is not available for this dataset yet.
      </p>
    );
  }
  if (cov.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        No annotation fields to measure coverage for yet.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {cov.map((c) => {
        const pct = Math.max(0, Math.min(100, c.coveragePct ?? 0));
        const total = c.totalDocs ?? 0;
        const covered = c.coveredDocs ?? 0;
        return (
          <div key={c.fieldName}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-medium text-gray-700">{c.fieldName}</span>
              <span className="text-gray-500">
                {covered}/{total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="flex items-center gap-1 pt-1 text-[11px] text-gray-400">
        <BarChart3 className="h-3 w-3" /> Based on actual indexed documents.
      </p>
    </div>
  );
}