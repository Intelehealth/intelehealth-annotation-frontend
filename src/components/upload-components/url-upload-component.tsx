'use client';

import { MultiSourceUploadComponent } from './multi-source-upload-component';
import { cn } from '@/lib/utils';

interface UrlUploadComponentProps {
  datasetId: string;
  onUploaded?: (document: unknown) => void;
  className?: string;
}

export function UrlUploadComponent({
  datasetId,
  onUploaded,
  className,
}: UrlUploadComponentProps) {
  return (
    <MultiSourceUploadComponent
      datasetId={datasetId}
      onUploaded={onUploaded}
      className={cn(className)}
      urlOnly
      dropLabel="Paste a direct file URL below"
      category="links"
    />
  );
}
