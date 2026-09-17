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
                onError={(e) => {
                  console.log('Thumbnail image failed to load:', trimmedUrl);
                  const target = e.target as HTMLImageElement;
                  // Create a fallback SVG
                  const svgContent = `
                    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100" height="100" fill="#e5e7eb"/>
                      <rect x="20" y="20" width="60" height="60" fill="#d1d5db" stroke="#9ca3af" stroke-width="2"/>
                      <circle cx="50" cy="50" r="15" fill="#9ca3af"/>
                      <text x="50" y="55" font-family="Arial, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#374151">${
                        index + 1
                      }</text>
                    </svg>
                  `;
                  target.src = `data:image/svg+xml;base64,${btoa(svgContent)}`;
                  target.style.opacity = '1';
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