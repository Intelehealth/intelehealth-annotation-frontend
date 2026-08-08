'use client';

import { ArrowLeft, FileText } from 'lucide-react';
import { useDocumentView } from '../context/document-view-context';
import { DocumentList } from '../documents/document-list';
import { DocumentPreview } from '../preview/document-preview';
import { DocumentStatus } from '../documents/document-status';

export function LeftDocumentPanel({ documents }: { documents: any[] }) {
  const {
    datasetId,
    selectedDocumentId,
    setSelectedDocumentId,
    selectedDocument,
    currentPage,
    setCurrentPage,
    zoom,
    setZoom,
    citationPulse,
    focusedCitation,
  } = useDocumentView();

  if (selectedDocumentId && selectedDocument) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-2">
          <button
            onClick={() => setSelectedDocumentId(null)}
            className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Documents
          </button>
        </div>
        <div className="flex items-center gap-2 border-b bg-white px-3 py-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
            {selectedDocument.fileName}
          </span>
          <DocumentStatus document={selectedDocument} />
        </div>
        <DocumentPreview
          document={selectedDocument}
          datasetId={datasetId}
          currentPage={currentPage}
          zoom={zoom}
          citationPulse={citationPulse}
          focusRow={focusedCitation?.rowIndex}
          onPageChange={setCurrentPage}
          onZoomChange={setZoom}
        />
      </div>
    );
  }

  return <DocumentList documents={documents} />;
}