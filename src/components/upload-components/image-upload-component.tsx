'use client';

import { MultiSourceUploadComponent } from './multi-source-upload-component';
import { cn } from '@/lib/utils';

const IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.bmp',
  '.tif',
  '.tiff',
  '.svg',
];

interface ImageUploadComponentProps {
  datasetId: string;
  onUploaded?: (document: unknown) => void;
  className?: string;
}

export function ImageUploadComponent({
  datasetId,
  onUploaded,
  className,
}: ImageUploadComponentProps) {
  return (
    <MultiSourceUploadComponent
      datasetId={datasetId}
      onUploaded={onUploaded}
      className={cn(className)}
      acceptedExtensions={IMAGE_EXTENSIONS}
      dropLabel="Drop images here or browse files"
      allowUrl
      category="images"
    />
  );
}
