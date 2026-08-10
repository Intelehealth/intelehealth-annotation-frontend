'use client';

import { MultiSourceUploadComponent } from './multi-source-upload-component';
import { cn } from '@/lib/utils';

const OFFICE_EXTENSIONS = ['.doc', '.docx', '.odt', '.odp', '.pptx', '.zip'];

interface OfficeUploadComponentProps {
  datasetId: string;
  onUploaded?: (document: unknown) => void;
  className?: string;
}

export function OfficeUploadComponent({
  datasetId,
  onUploaded,
  className,
}: OfficeUploadComponentProps) {
  return (
    <MultiSourceUploadComponent
      datasetId={datasetId}
      onUploaded={onUploaded}
      className={cn(className)}
      acceptedExtensions={OFFICE_EXTENSIONS}
      dropLabel="Drop Office documents here or browse files"
      allowUrl
      category="office"
    />
  );
}
