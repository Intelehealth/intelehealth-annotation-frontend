'use client';

import { useEffect } from 'react';
import { Database } from 'lucide-react';
import { ragAPI } from '@/lib/api/rag';
import { ResizablePanels } from '@/components/ui/resizable-panels';
import { useDocumentView } from './context/document-view-context';
import { LeftDocumentPanel } from './layout/left-document-panel';
import { RightIntelligencePanel } from './layout/right-intelligence-panel';

export function DocumentIntelligencePage({ datasetName }: { datasetName?: string }) {
  const { datasetId, documents, setDocuments, setRagStatus } = useDocumentView();

  useEffect(() => {
    let on = true;
    Promise.allSettled([
      ragAPI.documents(datasetId),
      ragAPI.status(datasetId),
    ]).then(([d, s]) => {
      if (!on) return;
      if (d.status === 'fulfilled') setDocuments(d.value);
      if (s.status === 'fulfilled') setRagStatus(s.value);
    });
    return () => {
      on = false;
    };
  }, [datasetId, setDocuments, setRagStatus]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2.5">
        <Database className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-gray-800">
          {datasetName || 'Document Intelligence'}
        </span>
        <span className="text-xs text-gray-400">{documents.length} document(s)</span>
      </div>
      <ResizablePanels
        leftPanel={<LeftDocumentPanel documents={documents} />}
        rightPanel={<RightIntelligencePanel />}
        defaultLeftWidth={55}
        minLeftWidth={25}
        maxLeftWidth={75}
        className="min-h-0 flex-1"
      />
    </div>
  );
}