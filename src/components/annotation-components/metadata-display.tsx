'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Edit3,
  GripVertical,
  Eye,
  Volume2,
  Video,
  ArrowLeft,
} from 'lucide-react';
import { ImageThumbnails } from './image-thumbnails';
import { cn } from '@/lib/utils';
import { AnnotationField } from '@/lib/api/csv-imports';
import { DragDropHelper } from '@/lib/drag-drop-helper';

interface ImageOverlay {
  isOpen: boolean;
  imageUrl: string;
  imageUrls: string[];
  currentIndex: number;
}

interface AudioOverlay {
  isOpen: boolean;
  audioUrl: string;
}

interface VideoOverlay {
  isOpen: boolean;
  videoUrl: string;
}

interface MetadataDisplayProps {
  metadata: Record<string, any>;
  orderedMetadataFields: AnnotationField[];
  linkedFieldNames?: Set<string>; // csvColumnNames of data fields linked to annotation panel
  draggedField: string | null;
  editingField: string | null;
  expandedTextFields: Set<string>;
  imageOverlay: ImageOverlay;
  audioOverlay: AudioOverlay;
  videoOverlay: VideoOverlay;
  datasetName?: string;
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
  onOpenAudioOverlay: (audioUrls: string[], startIndex?: number) => void;
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
  linkedFieldNames,
  draggedField,
  editingField,
  expandedTextFields,
  imageOverlay,
  audioOverlay,
  videoOverlay,
  datasetName,
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
  onOpenAudioOverlay,
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
      <div className="p-4 pb-2">
          <Button
            onClick={onNavigateBack}
            className="bg-black hover:bg-gray-800 text-white font-medium px-4 py-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dataset
          </Button>
      </div>

      {/* Data Fields Header */}
      <div className="px-4 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {datasetName && (
            <span className="text-2xl">{datasetName} - </span>
          )}
          Data Fields
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Drag fields to reorder • View metadata
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {orderedMetadataFields.map((field, idx) => {
          // Use DragDropHelper to determine if field can be dragged
          const dragValidation = DragDropHelper.canDragField(field, 'metadata');
          const isDraggable = dragValidation.canDrag;
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
              'p-4 border border-gray-200 rounded-lg bg-gray-50 transition-all duration-200',
              draggedField === field.csvColumnName && 'opacity-50 bg-blue-50 border-blue-300',
              isDraggable ? 'hover:shadow-md hover:bg-gray-100 cursor-move' : 'cursor-default'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <Label className="text-sm font-medium text-gray-700">
                  {field.fieldName}
                  {field.isRequired && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
              </div>
              {field.isPrimaryKey && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Primary Key
                </div>
              )}
              {linkedFieldNames?.has(field.csvColumnName) && (
                <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Linked
                </div>
              )}
            </div>

            {/* Field Content Display */}
            <div className="space-y-2">
              <div className="space-y-2">
                  {/* Text Fields */}
                  {field.fieldType === 'text' && (
                    <div className={`p-3 border border-gray-200 rounded-md ${field.isPrimaryKey ? 'bg-gray-100' : 'bg-white'}`}>
                      <div className={`text-sm whitespace-pre-wrap ${field.isPrimaryKey ? 'text-gray-600 font-medium' : 'text-gray-800'}`}>
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
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {field.fieldName} Audio ({urls.length})
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {urls.slice(0, 4).map((url: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all bg-gray-50"
                                  onClick={() => onOpenAudioOverlay(urls, idx)}
                                >
                                  <div className="flex items-center justify-center h-20 bg-gradient-to-br from-blue-50 to-blue-100">
                                    <Volume2 className="h-8 w-8 text-blue-500" />
                                  </div>
                                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                    {idx + 1}
                                  </div>
                                </div>
                              ))}
                              {urls.length > 4 && (
                                <div className="flex items-center justify-center h-20 bg-gray-100 rounded border border-gray-200 text-xs text-gray-500">
                                  +{urls.length - 4} more
                                </div>
                              )}
                            </div>
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
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {field.fieldName} Video ({urls.length})
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {urls.slice(0, 4).map((url: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-all bg-gray-50"
                                  onClick={() => onOpenVideoOverlay(urls, idx)}
                                >
                                  <div className="flex items-center justify-center h-20 bg-gradient-to-br from-green-50 to-green-100">
                                    <Video className="h-8 w-8 text-green-500" />
                                  </div>
                                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                    {idx + 1}
                                  </div>
                                </div>
                              ))}
                              {urls.length > 4 && (
                                <div className="flex items-center justify-center h-20 bg-gray-100 rounded border border-gray-200 text-xs text-gray-500">
                                  +{urls.length - 4} more
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 text-center">No video found</div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Default display for other field types */}
                  {!['text', 'image', 'audio', 'video'].includes(field.fieldType) && (
                    <div className="p-3 border border-gray-200 rounded-md bg-white text-sm text-gray-800 whitespace-pre-wrap">
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
