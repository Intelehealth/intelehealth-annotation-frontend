'use client';

import { cn } from '@/lib/utils';
import { CSVUploadComponent } from './csv-upload-component';

interface DatasetUploadComponentProps {
  datasetId: string;
  onCSVUploaded?: (
    csvImportId: string,
    fileName: string,
    totalRows: number,
  ) => void;
  className?: string;
}

export function DatasetUploadComponent({
  datasetId,
  onCSVUploaded,
  className,
}: DatasetUploadComponentProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* CSV Upload Component - No tabs needed */}
      <CSVUploadComponent
        selectedDatasetId={datasetId}
        onCSVUploaded={onCSVUploaded}
      />
    </div>
  );
}