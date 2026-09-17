'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
// Note: Using custom implementation instead of react-text-annotator due to React 19 compatibility issues

interface AnnotationLabel {
  name: string;
  type: 'bbox' | 'polygon' | 'point' | 'line' | 'text' | 'classification';
  color: string;
  description?: string;
}

interface TextAnnotation {
  id: string;
  start: number;
  end: number;
  text: string;
  label: string;
}

interface TextAnnotationToolProps {
  content: string;
  annotations: TextAnnotation[];
  labels: string[];
  annotationLabels: AnnotationLabel[];
  selectedLabel?: string | null;
  onAnnotationChange: (annotations: TextAnnotation[]) => void;
  disabled?: boolean;
}

export function TextAnnotationTool({
  content,
  annotations,
  labels,
  annotationLabels,
  selectedLabel: externalSelectedLabel,
  onAnnotationChange,
  disabled = false,
}: TextAnnotationToolProps) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(-1);
  const [selectionEnd, setSelectionEnd] = useState(-1);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [editingAnnotation, setEditingAnnotation] =
    useState<TextAnnotation | null>(null);
  const [internalSelectedLabel, setInternalSelectedLabel] =
    useState<string>('');

  // Use external selectedLabel if provided, otherwise use internal state
  const selectedLabel = externalSelectedLabel || internalSelectedLabel;

  // Initialize selected label
  useEffect(() => {
    if (labels.length > 0 && !internalSelectedLabel && !externalSelectedLabel) {
      setInternalSelectedLabel(labels[0]);
    }
  }, [labels, internalSelectedLabel, externalSelectedLabel]);

  const getColorForLabel = (label: string) => {
    // First try to get color from project annotation labels
    const annotationLabel = annotationLabels.find((al) => al.name === label);
    if (annotationLabel?.color) {
      return annotationLabel.color;
    }

    // Fallback to predefined colors if not found in project
    const fallbackColors = [
      '#3b82f6',
      '#ef4444',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#06b6d4',
    ];
    const index = labels.indexOf(label) % fallbackColors.length;
    return fallbackColors[index];
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();

    if (selectedText.length > 0 && selectedLabel) {
      setSelectedText(selectedText);
      // Calculate start and end positions (improved)
      const startIndex = content.indexOf(selectedText);
      setSelectionStart(startIndex);
      setSelectionEnd(startIndex + selectedText.length);

      // Auto-create annotation if label is selected
      if (selectedLabel) {
        addAnnotation(selectedLabel);
        selection.removeAllRanges(); // Clear selection
      } else {
        setIsAnnotating(true);
      }
    }
  };

  const addAnnotation = (label: string) => {
    if (!selectedText || selectionStart === -1) return;

    const newAnnotation: TextAnnotation = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      start: selectionStart,
      end: selectionEnd,
      text: selectedText,
      label,
    };

    onAnnotationChange([...annotations, newAnnotation]);
    setSelectedText('');
    setSelectionStart(-1);
    setSelectionEnd(-1);
    setIsAnnotating(false);
  };

  const removeAnnotation = (id: string) => {
    onAnnotationChange(annotations.filter((ann) => ann.id !== id));
  };

  const editAnnotation = (annotation: TextAnnotation) => {
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

  const renderContentWithAnnotations = () => {
    if (annotations.length === 0) {
      return content;
    }

    // Sort annotations by start position
    const sortedAnnotations = [...annotations].sort(
      (a, b) => a.start - b.start,
    );

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation) => {
      // Add text before annotation
      if (annotation.start > lastIndex) {
        parts.push(content.substring(lastIndex, annotation.start));
      }

      // Add annotation with color coding
      const color = getColorForLabel(annotation.label);
      parts.push(
        <span
          key={annotation.id}
          className={cn(
            'rounded px-2 py-1 mx-1 cursor-pointer border-2 transition-colors',
            'hover:opacity-80',
          )}
          style={{
            backgroundColor: `${color}20`, // 20% opacity
            borderColor: color,
            color: color,
          }}
          title={`${annotation.label}: ${annotation.text}`}
          onClick={() => editAnnotation(annotation)}
        >
          {annotation.text}
          <Badge
            variant="secondary"
            className="ml-1 text-xs"
            style={{ backgroundColor: color, color: 'white' }}
          >
            {annotation.label}
          </Badge>
        </span>,
      );

      lastIndex = annotation.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {/* Enhanced Content Display */}
        <div>
          <Label className="text-sm font-medium">Content</Label>
          <div
            className="mt-1 p-3 border border-gray-300 rounded-lg max-h-60 overflow-y-auto whitespace-pre-wrap cursor-text select-text text-sm"
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
            style={{ userSelect: 'text' }}
          >
            {renderContentWithAnnotations()}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {selectedLabel
              ? `Using label: ${selectedLabel}`
              : 'Select a label from the ⋮ menu first, then select text to annotate.'}
          </p>
        </div>

        {/* Annotation Controls */}
        {isAnnotating && selectedText && (
          <div className="p-3 border border-blue-300 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Selected Text:</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAnnotating(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-2">
              <Badge variant="outline" className="text-sm">
                "{selectedText}"
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <Button
                  key={label}
                  size="sm"
                  variant="outline"
                  onClick={() => addAnnotation(label)}
                  disabled={disabled}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Existing Annotations */}
        {annotations.length > 0 && (
          <div>
            <Label className="text-sm font-medium">
              Annotations ({annotations.length})
            </Label>
            <div className="mt-1 max-h-32 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="flex items-center justify-between p-2 border border-gray-100 rounded bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {annotation.label}
                      </Badge>
                      <span className="text-xs text-gray-600 truncate">
                        "{annotation.text}"
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
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Annotation Modal */}
      {editingAnnotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-base font-medium mb-3">Edit Annotation</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-gray-600">
                  Text
                </Label>
                <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                  "{editingAnnotation.text}"
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">
                  Label
                </Label>
                <select
                  className="mt-1 w-full p-2 border border-gray-300 rounded text-sm"
                  value={editingAnnotation.label}
                  onChange={(e) => saveEdit(e.target.value)}
                >
                  {labels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
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
  );
}
