'use client';

import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { resolveImages, type ImageFieldConfig } from '@/lib/image-source';

interface ImageThumbnailsProps {
  imageUrls: string | string[];
  columnName?: string;
  onImageClick?: (imageUrls: string[], index: number) => void;
  maxDisplay?: number;
  className?: string;
  /** Enables the authenticated image proxy for remote URLs. */
  datasetId?: string;
  /** How the cell stores images: url / base64 / binary, single or delimited. */
  config?: ImageFieldConfig;
}

export function ImageThumbnails({
  imageUrls,
  columnName,
  onImageClick,
  maxDisplay = 4,
  className = '',
  datasetId,
  config,
}: ImageThumbnailsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);

  // One entry per image, already turned into something <img> can load: data
  // URIs pass through, remote URLs go via the dataset's image proxy (which
  // adds stored credentials and avoids CORS/hotlink blocks).
  const images = useMemo(
    () => resolveImages(imageUrls, config ?? {}, datasetId),
    [imageUrls, config, datasetId],
  );
  const parsedUrls = useMemo(() => images.map((i) => i.src), [images]);

  const handleImageClick = (index: number) => {
    setSelectedIndex(index);
    if (onImageClick) {
      onImageClick(parsedUrls, index);
    }
  };

  if (parsedUrls.length === 0) {
    return (
      <div className={`p-3 border border-gray-200 rounded-md bg-white text-sm text-gray-500 text-center ${className}`}>
        No images found
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium">
        {columnName ? `${columnName} Images` : 'Images'} ({parsedUrls.length})
      </Label>
      
      <div className="grid grid-cols-2 gap-2">
        {parsedUrls.slice(0, maxDisplay).map((url, index) => {
          const trimmedUrl = url.trim();
          if (!trimmedUrl) return null;

          if (failed.includes(index)) {
            const needsLogin = images[index]?.kind === 'proxied-url';
            return (
              <div
                key={index}
                title={images[index]?.raw}
                className="flex h-20 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2 text-center"
              >
                <span className="text-[11px] font-medium text-gray-600">
                  {needsLogin ? 'Image needs a login' : 'Image did not load'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {needsLogin ? 'Settings → Image credentials' : `#${index + 1}`}
                </span>
              </div>
            );
          }

          return (
            <div
              key={index}
              className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all bg-[#f3f4f6] ${
                selectedIndex === index
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleImageClick(index)}
            >
              <img
                src={trimmedUrl}
                alt={`Image ${index + 1}`}
                className="w-full h-20 object-cover"
                onLoad={(e) => {
                  console.log('Thumbnail image loaded:', trimmedUrl);
                  const target = e.target as HTMLImageElement;
                  target.style.opacity = '1';
                }}
                onError={() => {
                  // Say why rather than showing an anonymous grey box: the
                  // common cause is a host that needs a login.
                  setFailed((f) => (f.includes(index) ? f : [...f, index]));
                }}
                onLoadStart={() => {
                  console.log('Starting to load thumbnail image:', trimmedUrl);
                }}
                style={{
                  opacity: '0',
                  transition: 'opacity 0.3s ease-in-out',
                  minHeight: '80px',
                  maxHeight: '80px',
                  display: 'block',
                }}
              />

              {/* Image number overlay */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          );
        })}
        
        {parsedUrls.length > maxDisplay && (
          <div className="flex items-center justify-center h-20 bg-gray-100 rounded border border-gray-200 text-xs text-gray-500">
            +{parsedUrls.length - maxDisplay} more
          </div>
        )}
      </div>
    </div>
  );
}