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

interface MetadataDisplayProps {
  metadata: Record<string, any>;
  orderedMetadataFields: AnnotationField[];
  draggedField: string | null;
  editingField: string | null;
  expandedTextFields: Set<string>;
  imageOverlay: ImageOverlay;
  audioOverlay: AudioOverlay;
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
  onOpenAudioOverlay: (audioUrl: string) => void;
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
  audioOverlay,
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
          Drag fields to reorder • Click edit to modify content
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {orderedMetadataFields.map((field) => {
          // Use DragDropHelper to determine if field can be dragged
          const dragValidation = DragDropHelper.canDragField(field, 'metadata');
          const isDraggable = dragValidation.canDrag;
          const restrictionMessage = DragDropHelper.getDragRestrictionMessage(field, 'metadata');
          
          return (
            <div
            key={field.csvColumnName}
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
              {!field.isPrimaryKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditField(field.csvColumnName)}
                  className="h-6 w-6 p-0"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
              {field.isPrimaryKey && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Primary Key
                </div>
              )}
            </div>

            {/* Field Content Display */}
            {/* Field Content Display */}
            {/* Field Content Display */}
            {/* Field Content Display */}
            {/* Field Content Display */}
            {/* Field Content Display */}
            <div className="space-y-2">
              {editingField === field.csvColumnName && !field.isPrimaryKey ? (
                <div className="space-y-2">
                  <Textarea
                    value={metadata?.[field.csvColumnName] || ''}
                    onChange={(e) => {
                      onMetadataChange({
                        ...(metadata || {}),
                        [field.csvColumnName]: e.target.value
                      });
                      // Auto-resize textarea
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.max(200, e.target.scrollHeight) + 'px';
                    }}
                    className="min-h-[200px] resize-y overflow-hidden"
                    placeholder="Enter content..."
                    style={{ height: '200px' }}
                  />
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        onSaveIndividualField(field.csvColumnName, metadata?.[field.csvColumnName] || '');
                        onCancelEdit();
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
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
                        const audioUrl = metadata?.[field.csvColumnName];
                        return audioUrl ? (
                          <div className="flex items-center space-x-3">
                            <Button
                              size="sm"
                              onClick={() => onOpenAudioOverlay(audioUrl)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Volume2 className="h-4 w-4 mr-2" />
                              Play Audio
                            </Button>
                            <span className="text-sm text-gray-600 truncate">
                              {audioUrl}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 text-center">
                            No audio found
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Default display for other field types */}
                  {!['text', 'image', 'audio'].includes(field.fieldType) && (
                    <div className="p-3 border border-gray-200 rounded-md bg-white text-sm text-gray-800 whitespace-pre-wrap">
                      {formatTextContent(metadata?.[field.csvColumnName], field.csvColumnName)}
                    </div>
                  )}
                </div>
              )}
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
