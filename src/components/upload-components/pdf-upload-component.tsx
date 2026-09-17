'use client';

import { MultiSourceUploadComponent } from './multi-source-upload-component';
import { cn } from '@/lib/utils';

const PDF_EXTENSIONS = ['.pdf'];

interface PdfUploadComponentProps {
  datasetId: string;
  onUploaded?: (document: unknown) => void;
  className?: string;
}

export function PdfUploadComponent({
  datasetId,
  onUploaded,
  className,
}: PdfUploadComponentProps) {
  return (
    <MultiSourceUploadComponent
      datasetId={datasetId}
      onUploaded={onUploaded}
      className={cn(className)}
      acceptedExtensions={PDF_EXTENSIONS}
      dropLabel="Drop PDF files here or browse files"
      allowUrl
      category="pdf"
    />
  );
}
