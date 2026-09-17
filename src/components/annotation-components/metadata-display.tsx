'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Edit3,
  GripVertical,
  Eye,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { ImageThumbnails } from './image-thumbnails';
import { AudioPreview, VideoPreview } from './media-preview';
import { cn } from '@/lib/utils';
import { AnnotationField } from '@/lib/api/csv-imports';
import { DragDropHelper } from '@/lib/drag-drop-helper';

interface ImageOverlayState {
  isOpen: boolean;
  imageUrl: string;
  imageUrls: string[];
  currentIndex: number;
}

interface VideoOverlayState {
  isOpen: boolean;
  videoUrl: string;
}

interface MetadataDisplayProps {
  metadata: Record<string, any>;
  orderedMetadataFields: AnnotationField[];
  draggedField: string | null;
  editingField: string | null;
  expandedTextFields: Set<string>;
  imageOverlay: ImageOverlayState;
  videoOverlay: VideoOverlayState;
  datasetName?: string;
  isAdmin: boolean;
  onMetadataChange: (metadata: Record<string, any>) => void;
  onDragStart: (e: React.DragEvent, fieldName: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetFieldName: string) => void;
  onEditField: (fieldName: string) => void;
  onSaveField: (fieldName: string, newValue: string) => void;
  onSaveIndividualField: (fieldName: string, fieldValue: string) => void;
  onCancelEdit: () => void;
  onToggleTextExpansion: (fieldName: string) => void;
  onOpenImageOverlay: (imageUrls: string[], startIndex?: number) => void;
  onOpenVideoOverlay: (videoUrls: string[], startIndex?: number) => void;
  onNavigateBack: () => void;
  onPanelDragOver?: (e: React.DragEvent) => void;
  onDropFromAnnotation?: () => void;
}


// Helper function to format text content for display
const formatTextContent = (content: any, fieldName: string): string => {
  if (!content) return 'N/A';
  
  let text = '';
  if (typeof content === 'string') {
    text = content;
  } else if (typeof content === 'object') {
    if (Array.isArray(content)) {
      text = content.join('\n');
    } else {
      const urlKeys = ['url', 'href', 'src', 'link', 'value'];
      for (const key of urlKeys) {
        if (content[key] && typeof content[key] === 'string') {
          text = content[key];
          break;
        }
      }
      if (!text) {
        text = JSON.stringify(content, null, 2);
      }
    }
  } else {
    text = String(content);
  }
  
  return text;
};

export function MetadataDisplay({
  metadata,
  orderedMetadataFields,
  draggedField,
  editingField,
  expandedTextFields,
  imageOverlay,
  videoOverlay,
  datasetName,
  isAdmin,
  onMetadataChange,
  onDragStart,
  onDragOver,
  onDrop,
  onEditField,
  onSaveField,
  onSaveIndividualField,
  onCancelEdit,
  onToggleTextExpansion,
  onOpenImageOverlay,
  onOpenVideoOverlay,
  onNavigateBack,
  onPanelDragOver,
  onDropFromAnnotation,
}: MetadataDisplayProps) {
  return (
    <div 
      className="h-full bg-white flex flex-col"
      onDragOver={(e) => {
        if (onPanelDragOver) onPanelDragOver(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (onDropFromAnnotation) onDropFromAnnotation();
      }}
    >
      {/* Navigation Header */}
<div className="p-3 sm:p-4 pb-2">
          <Button
            onClick={onNavigateBack}
            className="bg-black hover:bg-gray-800 text-white font-medium px-4 py-2 justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dataset
          </Button>
      </div>

      {/* Data Fields Header */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-b border-gray-100 min-w-0">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center whitespace-nowrap">
          {datasetName && (
            <span className="text-lg sm:text-2xl">{datasetName} - </span>
          )}
          Data Fields
        </h2>
        <p className="text-sm text-gray-500 mt-1 break-words">
          {isAdmin ? 'Drag fields to reorder • Drop to annotation panel' : 'View metadata (admin can configure layout)'}
        </p>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {orderedMetadataFields.map((field, idx) => {
          // Use DragDropHelper to determine if field can be dragged
          const dragValidation = DragDropHelper.canDragField(field, 'metadata');
          const isDraggable = isAdmin && dragValidation.canDrag;
          const restrictionMessage = DragDropHelper.getDragRestrictionMessage(field, 'metadata');
          
          return (
            <div
            key={`${field.csvColumnName}-${idx}`}
            draggable={isDraggable}
            onDragStart={isDraggable ? (e) => onDragStart(e, field.csvColumnName) : undefined}
            onDragOver={onDragOver}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDrop(e, field.csvColumnName);
            }}
            className={cn(
              'p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50 transition-all duration-200',
              draggedField === field.csvColumnName && 'opacity-50 bg-blue-50 border-blue-300',
              isDraggable ? 'hover:shadow-md hover:bg-gray-100 cursor-move' : 'cursor-default'
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2 min-w-0">
                <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
                <Label className="text-sm font-medium text-gray-700 break-all min-w-0">
                  {field.fieldName}
                  {field.isRequired && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                {field.helpText && <FieldInfo text={field.helpText} column={field.csvColumnName} />}
              </div>
              {field.isPrimaryKey && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded shrink-0">
                  Primary Key
                </div>
              )}
            </div>

            {/* Field Content Display */}
            <div className="space-y-2">
              <div className="space-y-2">
                  {/* Text Fields */}
                  {field.fieldType === 'text' && (
                    <div className={`p-3 border border-gray-200 rounded-md ${field.isPrimaryKey ? 'bg-gray-100' : 'bg-white'}`}>
                      <div className={`text-sm whitespace-pre-wrap break-all ${field.isPrimaryKey ? 'text-gray-600 font-medium' : 'text-gray-800'}`}>
                        {(() => {
                          const text = formatTextContent(metadata?.[field.csvColumnName], field.csvColumnName);
                          const isExpanded = expandedTextFields.has(field.csvColumnName);
                          const lines = text.split('\n');
                          const shouldTruncate = lines.length > 8 && !isExpanded;
                          
                          return (
                            <>
                              {shouldTruncate ? lines.slice(0, 8).join('\n') : text}
                              {lines.length > 8 && !field.isPrimaryKey && (
                                <button
                                  onClick={() => onToggleTextExpansion(field.csvColumnName)}
                                  className="text-blue-600 hover:text-blue-800 text-xs ml-2"
                                >
                                  {isExpanded ? 'See Less' : 'See More'}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Image Fields */}
                  {field.fieldType === 'image' && (
                    <ImageThumbnails
                      imageUrls={metadata?.[field.csvColumnName] || ''}
                      columnName={field.fieldName}
                      onImageClick={onOpenImageOverlay}
                      maxDisplay={4}
                    />
                  )}

                  {/* Audio Fields */}
                  {field.fieldType === 'audio' && (
                    <div className="p-3 border border-gray-200 rounded-md bg-white">
                      {(() => {
                        const raw = metadata?.[field.csvColumnName];
                        const urls: string[] = raw
                          ? String(raw).split(/[,\n;]/).map((s: string) => s.trim()).filter(Boolean)
                          : [];
                        return urls.length > 0 ? (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">
                              {field.fieldName} Audio ({urls.length})
                            </Label>
                            {urls.map((url: string, idx: number) => (
                              <AudioPreview
                                key={url + idx}
                                url={url}
                                index={urls.length > 1 ? idx : undefined}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 text-center">No audio found</div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Video Fields */}
                  {field.fieldType === 'video' && (
                    <div className="p-3 border border-gray-200 rounded-md bg-white">
                      {(() => {
                        const raw = metadata?.[field.csvColumnName];
                        const urls: string[] = raw
                          ? String(raw).split(/[,\n;]/).map((s: string) => s.trim()).filter(Boolean)
                          : [];
                        return urls.length > 0 ? (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">
                              {field.fieldName} Video ({urls.length})
                            </Label>
                            {urls.map((url: string, idx: number) => (
                              <VideoPreview
                                key={url + idx}
                                url={url}
                                index={urls.length > 1 ? idx : undefined}
                                onExpand={() => onOpenVideoOverlay(urls, idx)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 text-center">No video found</div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Default display for other field types */}
                  {!['text', 'image', 'audio', 'video'].includes(field.fieldType) && (
                    <div className="p-3 border border-gray-200 rounded-md bg-white text-sm text-gray-800 whitespace-pre-wrap break-all">
                      {formatTextContent(metadata?.[field.csvColumnName], field.csvColumnName)}
                    </div>
                  )}
                </div>
            </div>
          </div>
        );
        })}

        {orderedMetadataFields.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">📋</span>
            </div>
            <h3 className="text-lg font-medium mb-2">No Data Fields</h3>
            <p className="text-sm">
              Configure data fields in the field configuration to see them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Info tip for a data field: the description the admin wrote in field
// configuration, plus the original CSV column it comes from. Click to pin it
// open; hover shows it as a native tooltip.
export function FieldInfo({ text, column }: { text: string; column: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="What this field means"
        aria-expanded={open}
        title={text}
        onClick={() => setOpen((o) => !o)}
        className="rounded p-0.5 text-gray-400 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span role="note" className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white p-2.5 text-xs text-gray-700 shadow-md">
          {text}
          <span className="mt-1.5 block font-mono text-[10px] text-gray-400">column: {column}</span>
        </span>
      )}
    </span>
  );
}
