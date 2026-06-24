'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Square, Circle, Move, Trash2, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnotationLabel {
  name: string;
  type: 'bbox' | 'polygon' | 'point' | 'line' | 'text' | 'classification';
  color: string;
  description?: string;
}

interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  imageUrl: string; // Add imageUrl to track which image this annotation belongs to
}

interface ImageAnnotationToolProps {
  imageUrl: string;
  annotations: BoundingBox[];
  labels: string[];
  annotationLabels: AnnotationLabel[];
  selectedLabel?: string | null;
  onAnnotationChange: (annotations: BoundingBox[]) => void;
  disabled?: boolean;
  columnName?: string;
}

export function ImageAnnotationTool({
  imageUrl,
  annotations,
  labels,
  annotationLabels,
  selectedLabel: externalSelectedLabel,
  onAnnotationChange,
  disabled = false,
  columnName,
}: ImageAnnotationToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<Partial<BoundingBox> | null>(
    null,
  );
  const [internalSelectedLabel, setInternalSelectedLabel] =
    useState<string>('');
  const [editingAnnotation, setEditingAnnotation] =
    useState<BoundingBox | null>(null);

  // Use external selectedLabel if provided, otherwise use internal state
  const selectedLabel = externalSelectedLabel || internalSelectedLabel;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [lastLoadedUrl, setLastLoadedUrl] = useState<string>('');
  // Memoize URL parsing to prevent unnecessary recalculations
  const parsedUrls = useMemo(() => {
    return imageUrl
      .split(/[,\n]/) // Handle both comma and newline separators
      .map((url) => url.trim())
      .filter((url) => url && url.startsWith('http'));
  }, [imageUrl]);

  const [selectedImageUrl, setSelectedImageUrl] = useState(() => {
    console.log('Available image URLs:', parsedUrls);
    console.log('Original imageUrl:', imageUrl);
    console.log('First URL to load:', parsedUrls[0]);
    return parsedUrls.length > 0 ? parsedUrls[0] : '';
  });

  useEffect(() => {
    if (!selectedImageUrl) {
      console.log('No selected image URL');
      setImageLoaded(false);
      return;
    }

    // Prevent reloading the same image
    if (lastLoadedUrl === selectedImageUrl && imageLoaded) {
      console.log('Image already loaded, skipping reload:', selectedImageUrl);
      return;
    }

    console.log('Loading image:', selectedImageUrl);
    console.log('Image URL type:', typeof selectedImageUrl);
    console.log('Image URL length:', selectedImageUrl.length);

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Allow cross-origin images

    img.onload = () => {
      console.log(
        'Image loaded successfully:',
        selectedImageUrl,
        'Size:',
        img.width,
        'x',
        img.height,
      );
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);
      setLastLoadedUrl(selectedImageUrl); // Track the loaded URL
      drawCanvas();
    };

    img.onerror = (error) => {
      console.error('Failed to load image:', selectedImageUrl, error);
      console.error('Error details:', {
        url: selectedImageUrl,
        error: error,
        type: typeof selectedImageUrl,
        length: selectedImageUrl.length,
      });
      setImageLoaded(false);
    };

    try {
      img.src = selectedImageUrl;
    } catch (error) {
      console.error('Error setting image src:', error);
      setImageLoaded(false);
    }
  }, [selectedImageUrl, lastLoadedUrl, imageLoaded]);

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [imageLoaded, annotations, currentBox]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw existing annotations for the current image only
      annotations
        .filter((annotation) => annotation.imageUrl === selectedImageUrl)
        .forEach((annotation) => {
          drawBoundingBox(ctx, annotation, '#3b82f6', 2);
        });

      // Draw current box being created
      if (
        currentBox &&
        currentBox.x !== undefined &&
        currentBox.y !== undefined &&
        currentBox.width !== undefined &&
        currentBox.height !== undefined
      ) {
        drawBoundingBox(ctx, currentBox as BoundingBox, '#ef4444', 2);
      }
    };
    img.src = selectedImageUrl;
  };

  const drawBoundingBox = (
    ctx: CanvasRenderingContext2D,
    box: BoundingBox,
    color: string,
    lineWidth: number,
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Draw label background
    ctx.fillStyle = color;
    ctx.fillRect(box.x, box.y - 20, ctx.measureText(box.label).width + 10, 20);

    // Draw label text
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(box.label, box.x + 5, box.y - 5);
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !selectedLabel) return;

    const pos = getMousePos(e);
    setStartPoint(pos);
    setIsDrawing(true);
    setCurrentBox({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      label: selectedLabel,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentBox) return;

    const pos = getMousePos(e);
    const newBox = {
      ...currentBox,
      width: Math.abs(pos.x - startPoint.x),
      height: Math.abs(pos.y - startPoint.y),
      x: Math.min(pos.x, startPoint.x),
      y: Math.min(pos.y, startPoint.y),
    };
    setCurrentBox(newBox);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !currentBox.width || !currentBox.height) {
      setIsDrawing(false);
      setCurrentBox(null);
      return;
    }

    const newAnnotation: BoundingBox = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: currentBox.x!,
      y: currentBox.y!,
      height: currentBox.height,
      width: currentBox.width,
      label: currentBox.label!,
      imageUrl: selectedImageUrl, // Add the selected image URL
    };

    onAnnotationChange([...annotations, newAnnotation]);
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const removeAnnotation = (id: string) => {
    onAnnotationChange(annotations.filter((ann) => ann.id !== id));
  };

  const editAnnotation = (annotation: BoundingBox) => {
    setEditingAnnotation(annotation);
  };

  const saveEdit = (newLabel: string) => {
    if (!editingAnnotation) return;

    const updatedAnnotations = annotations.map((ann) =>
      ann.id === editingAnnotation.id ? { ...ann, label: newLabel } : ann,
    );

    onAnnotationChange(updatedAnnotations);
    setEditingAnnotation(null);
  };

  return (
    <div>
      <Card>
        <CardContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {/* All Available Images - Simple Display */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2">
                All Available Images{columnName ? ` - ${columnName}` : ''} (
                {(() => {
                  return parsedUrls.length;
                })()}
                )
              </Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(() => {
                  // Use memoized URLs to prevent unnecessary recalculations
                  console.log('Display URLs:', parsedUrls);
                  return parsedUrls;
                })().map((url, index) => {
                  const trimmedUrl = url.trim();
                  if (
                    !trimmedUrl ||
                    trimmedUrl === '[object Object]' ||
                    !trimmedUrl.startsWith('http')
                  )
                    return null;

                  return (
                    <div
                      key={index}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedImageUrl === trimmedUrl
                          ? 'border-blue-500 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedImageUrl(trimmedUrl)}
                    >
                      <img
                        src={trimmedUrl}
                        alt={`Image ${index + 1}`}
                        className="w-12 h-12 object-cover"
                        onLoad={(e) => {
                          console.log('Grid image loaded:', trimmedUrl);
                          const target = e.target as HTMLImageElement;
                          target.style.opacity = '1';
                          target.style.backgroundColor = 'transparent';
                        }}
                        onError={(e) => {
                          console.log('Grid image failed to load:', trimmedUrl);
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
                          target.src = `data:image/svg+xml;base64,${btoa(
                            svgContent,
                          )}`;
                          target.style.opacity = '1';
                        }}
                        onLoadStart={() => {
                          console.log(
                            'Starting to load grid image:',
                            trimmedUrl,
                          );
                        }}
                        style={{
                          opacity: '0',
                          transition: 'opacity 0.3s ease-in-out',
                          backgroundColor: '#f3f4f6',
                          minHeight: '48px',
                          maxHeight: '48px',
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
              </div>
            </div>

            {/* Canvas - More compact */}
            <div>
              <Label className="text-sm font-medium">Annotation Canvas</Label>
              <div className="mt-1 border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  className="cursor-crosshair w-full"
                  style={{ maxHeight: '400px' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedLabel
                  ? `Drawing with label: ${selectedLabel}`
                  : 'Select a label from the ⋮ menu to start annotating'}
              </p>
            </div>

            {/* Existing Annotations - Compact */}
            {(() => {
              const currentImageAnnotations = annotations.filter(
                (ann) => ann.imageUrl === selectedImageUrl,
              );
              return currentImageAnnotations.length > 0 ? (
                <div>
                  <Label className="text-sm font-medium">
                    Annotations ({currentImageAnnotations.length})
                  </Label>
                  <div className="mt-1 max-h-32 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
                    {currentImageAnnotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="flex items-center justify-between p-2 border border-gray-100 rounded bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {annotation.label}
                            </Badge>
                            <span className="text-xs text-gray-500 truncate">
                              {Math.round(annotation.width)}×
                              {Math.round(annotation.height)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => editAnnotation(annotation)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeAnnotation(annotation.id)}
                            disabled={disabled}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Edit Annotation Modal */}
            {editingAnnotation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-4 rounded-lg max-w-sm w-full mx-4">
                  <h3 className="text-base font-medium mb-3">Edit Label</h3>
                  <div className="space-y-3">
                    <select
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      value={editingAnnotation.label}
                      onChange={(e) => saveEdit(e.target.value)}
                    >
                      {labels.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingAnnotation(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
