'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  Image as ImageIcon,
  AudioLines,
  Loader2,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  DatasetMergedRowsAPI,
  DatasetMergedRowsData,
  RowWithCSVInfo,
  AnnotationProgress,
} from '@/lib/api/dataset-merged-rows';
import {
  AnnotationConfig,
  AnnotationField,
} from '@/lib/api/csv-imports';
import { fieldSelectionAPI } from '@/lib/api/field-config';
import { datasetsAPI } from '@/lib/api/datasets';
import { RowFooter, NewColumnDataPanel } from '@/components/new-column-components';
import { MetadataDisplay } from './metadata-display';
import { ImageOverlay, AudioOverlay } from './media-overlays';
import { useToast } from '@/components/ui/toast';
import { exportSelectedColumnsToCSV, exportAllColumnsToCSV } from '@/lib/dataset-export-helper';
import { DragDropHelper, DragDropParams } from '@/lib/drag-drop-helper';
import { CompletionModal } from '@/components/ui/completion-modal';
import { ResizablePanels } from '@/components/ui/resizable-panels';

interface Task {
  id: string;
  rowIndex: number;
  fileName: string;
  fileType: 'text' | 'image' | 'audio';
  filePath: string;
  status: 'pending' | 'in_progress' | 'completed' | 'needs_review';
  assignedTo?: string;
  metadata?: Record<string, any>;
  csvInfo?: {
    csvImportId: string;
    fileName: string;
    originalCsvRowIndex: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface NewColumnData {
  [fieldName: string]: string;
}

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

interface DatasetAnnotationWorkbenchProps {
  datasetId: string;
  /** Feature 1: When set, all API reads/writes are scoped to this annotation task.
   *  Absent = admin view (existing behaviour, backward compatible). */
  taskId?: string;
}

export function DatasetAnnotationWorkbench({
  datasetId,
  taskId,  // Feature 1: optional task scope
}: DatasetAnnotationWorkbenchProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [newColumnData, setNewColumnData] = useState<NewColumnData>({});
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annotationConfig, setAnnotationConfig] =
    useState<AnnotationConfig | null>(null);
  const [datasetNewColumns, setDatasetNewColumns] = useState<any[]>([]);
  const [datasetData, setDatasetData] = useState<DatasetMergedRowsData | null>(null);
  const [orderedMetadataFields, setOrderedMetadataFields] = useState<AnnotationField[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [expandedTextFields, setExpandedTextFields] = useState<Set<string>>(new Set());
  const [imageOverlay, setImageOverlay] = useState<ImageOverlay>({
    isOpen: false,
    imageUrl: '',
    imageUrls: [],
    currentIndex: 0,
  });
  const [audioOverlay, setAudioOverlay] = useState<AudioOverlay>({
    isOpen: false,
    audioUrl: '',
  });
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionStats, setCompletionStats] = useState<{
    completedCount: number;
    totalCount: number;
    completionTime: string;
  } | null>(null);
  const [datasetName, setDatasetName] = useState<string>('');

  // Initialize ordered metadata fields when annotation config changes
  useEffect(() => {
    if (annotationConfig) {
      // Metadata fields are existing CSV columns that are NOT new columns
      const metadataFields = annotationConfig.annotationFields.filter(
        (field) => !field.isAnnotationField && !field.isNewColumn
      );
      console.log('Metadata fields (existing CSV columns only):', metadataFields.map(f => ({
        csvColumnName: f.csvColumnName,
        fieldName: f.fieldName,
        isAnnotationField: f.isAnnotationField,
        isNewColumn: f.isNewColumn,
        isPrimaryKey: f.isPrimaryKey
      })));
      setOrderedMetadataFields(metadataFields);
    }
  }, [annotationConfig]);

  // Load dataset data and annotation config
  useEffect(() => {
    console.log('DatasetAnnotationWorkbench useEffect triggered');
    console.log('datasetId:', datasetId);
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading dataset data for datasetId:', datasetId);

        // Load dataset info for name
        console.log('Loading dataset info...');
        const datasetInfo = await datasetsAPI.getById(datasetId);
        console.log('Dataset info loaded:', datasetInfo);
        setDatasetName(datasetInfo.name);

        // Load dataset merged rows data
        console.log('Loading dataset merged rows data...');
        const mergedData = await DatasetMergedRowsAPI.getDatasetData(datasetId, taskId);  // Feature 1
        console.log('Dataset merged rows data loaded:', mergedData);
        setDatasetData(mergedData);

        // Load annotation config using datasetId
        console.log('Loading annotation config for dataset:', datasetId);
        try {
          console.log(
            'Making API call to fieldSelectionAPI.getDatasetFieldConfig...',
          );
          const config = await fieldSelectionAPI.getDatasetFieldConfig(
            datasetId,
          );
          console.log('API call completed successfully');
          console.log('Dataset field config loaded:', config);
          console.log('Config annotationFields:', config?.annotationFields);
          console.log('Config annotationLabels:', config?.annotationLabels);
           if (config) {
            // Use expanded fields (which include repeatable groups) if available, otherwise fallback
            const rawFields = (config.expandedFields && config.expandedFields.length > 0)
              ? config.expandedFields
              : config.annotationFields;

            const normalizedFields = (rawFields || []).map((f: any) => ({
              ...f,
              isAnnotationField: f.isAnnotationField === false ? false : true,
              isNewColumn: Boolean(f.isNewColumn),
              isPrimaryKey: Boolean(f.isPrimaryKey),
              isRequired: Boolean(f.isRequired),
              columnType: f.columnType,
            }));

            // Transform the dataset config to match the expected AnnotationConfig format
            const annotationConfig: AnnotationConfig = {
              _id: config._id || '',
              csvImportId: '', // Not used in dataset-level annotation
              userId: user?._id,
              annotationFields: normalizedFields,
              annotationLabels: config.annotationLabels || [],
              rowAnnotations: [],
              fieldGroups: config.fieldGroups || [],
              totalRows: mergedData.totalRows,
              completedRows: 0,
              status: 'active',
              createdAt: config.createdAt || new Date().toISOString(),
              updatedAt: config.updatedAt || new Date().toISOString(),
            };
            console.log('Transformed annotation config:', annotationConfig);
            console.log(
              'Annotation fields count:',
              annotationConfig.annotationFields.length,
            );
            console.log(
              'Annotation labels count:',
              annotationConfig.annotationLabels?.length || 0,
            );
            console.log('All fields:', annotationConfig.annotationFields.map((f) => ({
              csvColumnName: f.csvColumnName,
              fieldName: f.fieldName,
              isAnnotationField: f.isAnnotationField,
              isNewColumn: f.isNewColumn
            })));
            setAnnotationConfig(annotationConfig);
            setDatasetNewColumns(config.newColumns || []);
          } else {
            throw new Error('No field configuration found');
          }
        } catch (configError) {
          console.log('Error loading annotation config:', configError);
          console.log(
            'Config error details:',
            configError instanceof Error
              ? configError.message
              : String(configError),
          );
          console.log('No annotation config found, creating default config...');
          // If no annotation config exists, create a default one
          const defaultConfig: AnnotationConfig = {
            _id: '',
            csvImportId: '',
            userId: user?._id,
            annotationFields: [],
            rowAnnotations: [],
            fieldGroups: [],
            totalRows: mergedData.totalRows,
            completedRows: 0,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setAnnotationConfig(defaultConfig);
        }

        // Convert merged rows to tasks
        console.log('Dataset merged rows structure:', {
          hasMergedRows: !!mergedData.mergedRows,
          mergedRowsLength: mergedData.mergedRows?.length,
          totalRows: mergedData.totalRows,
        });

        let taskData: Task[] = [];

        if (mergedData.mergedRows && Array.isArray(mergedData.mergedRows)) {
          taskData = mergedData.mergedRows.map((row: any) => ({
            id: `row-${row.rowIndex}`,
            rowIndex: row.rowIndex,
            fileName: `Row ${row.rowIndex}`, // Display as 1-based for user friendliness
            fileType: 'text', // Default to text, will be determined by annotation fields
            filePath: `/dataset/${datasetId}/row/${row.rowIndex}`,
            status: row.completed ? 'completed' : 'pending',
            metadata: row.data || {},
            csvInfo: row.csvInfo || null,
            createdAt: new Date(mergedData.createdAt),
            updatedAt: new Date(mergedData.lastUpdatedAt),
          }));
        } else {
          // If no mergedRows, create tasks based on totalRows
          console.log(
            'No mergedRows found, creating tasks based on totalRows:',
            mergedData.totalRows,
          );
          taskData = Array.from({ length: mergedData.totalRows }, (_, index) => ({
            id: `row-${index + 1}`,
            rowIndex: index + 1, // Start from 1
            fileName: `Row ${index + 1}`, // Display as 1-based for user friendliness
            fileType: 'text',
            filePath: `/dataset/${datasetId}/row/${index + 1}`,
            status: 'pending',
            metadata: {},
            csvInfo: undefined,
            createdAt: new Date(mergedData.createdAt),
            updatedAt: new Date(mergedData.lastUpdatedAt),
          }));
        }

        // Initialize metadata with actual merged row data
        if (
          taskData.length > 0 &&
          mergedData.mergedRows &&
          mergedData.mergedRows.length > 0
        ) {
          const firstRowData = mergedData.mergedRows[0].data || {};
          console.log('Initializing metadata with merged row data:', firstRowData);
          setMetadata(firstRowData);
        }

        console.log('Tasks created:', taskData.length, 'tasks');
        setTasks(taskData);

        // Load progress and apply completion status
        try {
          console.log('Loading annotation progress...');
          const progress = await DatasetMergedRowsAPI.getDetailedProgress(datasetId, taskId);  // Feature 1
          console.log('Progress loaded:', progress);

          // Apply completion status to tasks
          const updatedTasks = taskData.map(task => {
            const rowStatus = progress.rowStatuses.find((rs: any) => rs.rowIndex === task.rowIndex);
            return {
              ...task,
              status: rowStatus?.completed ? 'completed' as const : 'pending' as const
            };
          });
          setTasks(updatedTasks);

          // Set current task index to resume position
          if (progress.lastViewedRow > 0 && progress.lastViewedRow < taskData.length) {
            setCurrentTaskIndex(progress.lastViewedRow);
            console.log(`Resuming from row ${progress.lastViewedRow + 1}`);
          } else {
            // Find first incomplete row
            const firstIncompleteIndex = updatedTasks.findIndex(task => task.status !== 'completed');
            if (firstIncompleteIndex >= 0) {
              setCurrentTaskIndex(firstIncompleteIndex);
              console.log(`Starting from first incomplete row ${firstIncompleteIndex + 1}`);
            }
          }
        } catch (progressError) {
          console.error('Error loading progress:', progressError);
          // Continue without progress if it fails
        }

        // Initialize new column data for annotation fields
        if (annotationConfig && annotationConfig.annotationFields.length > 0) {
          const annotationFields = annotationConfig.annotationFields.filter(
            (field) => field.isNewColumn || field.isAnnotationField
          );
          console.log('Annotation fields (new columns):', annotationFields.map(f => ({
            csvColumnName: f.csvColumnName,
            fieldName: f.fieldName,
            isAnnotationField: f.isAnnotationField,
            isNewColumn: f.isNewColumn,
            isPrimaryKey: f.isPrimaryKey
          })));
          // Initialize new column data, preserving any existing values
          setNewColumnData(prevNewColumnData => {
            const initialNewColumnData: NewColumnData = {};
            annotationFields.forEach((field) => {
              // Preserve existing values or initialize with empty string
              initialNewColumnData[field.fieldName] = prevNewColumnData[field.fieldName] || '';
            });
            return initialNewColumnData;
          });
        }
      } catch (err) {
        console.error('Error loading data:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
        });
        setError(
          `Failed to load dataset annotation data: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`,
        );
      } finally {
        setLoading(false);
      }
    };

    if (datasetId) {
      loadData();
    }
  }, [datasetId]);

  const currentTask = tasks[currentTaskIndex];

  // Update metadata when current task changes
  useEffect(() => {
    if (currentTask && currentTask.metadata) {
      console.log('Updating metadata for task:', currentTask.rowIndex, currentTask.metadata);
      setMetadata(currentTask.metadata);
    }
  }, [currentTask]);

  // Determine file type based on annotation fields
  const getFileTypeForTask = (task: Task): 'text' | 'image' | 'audio' => {
    if (!annotationConfig) return 'text';

    const annotationFields = annotationConfig.annotationFields.filter(
      (field) => field.isAnnotationField,
    );
    if (annotationFields.length === 0) return 'text';

    // Check if any field is image or audio type
    const hasImageField = annotationFields.some(
      (field) => field.fieldType === 'image',
    );
    const hasAudioField = annotationFields.some(
      (field) => field.fieldType === 'audio',
    );

    if (hasImageField) return 'image';
    if (hasAudioField) return 'audio';
    return 'text';
  };

  // Get metadata fields (existing CSV columns that are NOT new columns)
  const getMetadataFields = (): AnnotationField[] => {
    if (!annotationConfig) return [];
    return annotationConfig.annotationFields.filter(
      (field) => !field.isAnnotationField && !field.isNewColumn,
    );
  };

  // Get annotation fields (new columns that need annotation)
  const getAnnotationFields = (): AnnotationField[] => {
    if (!annotationConfig) return [];
    return annotationConfig.annotationFields.filter(
      (field) => field.isNewColumn || field.isAnnotationField,
    );
  };

  // Export annotations to CSV - Selected Columns Only
  const handleExportSelectedColumns = useCallback(async () => {
    if (!annotationConfig) {
      console.log('Cannot export: missing annotation config');
      return;
    }

    // Always fetch fresh data from backend so is_completed reflects the true DB state
    let freshData = datasetData;
    try {
      console.log('🔄 [Workbench] Fetching fresh dataset data for export...');
      freshData = await DatasetMergedRowsAPI.getDatasetData(datasetId, taskId);
      // Also update the local state so UI is in sync
      if (freshData) setDatasetData(freshData);
    } catch (fetchErr) {
      console.warn('⚠️ [Workbench] Could not refresh data before export, using cached data:', fetchErr);
    }

    if (!freshData) {
      console.log('Cannot export: missing dataset data');
      return;
    }

    console.log('🔍 [Workbench] Export Selected Columns - Fresh Dataset Data:', {
      totalRows: freshData.totalRows,
      mergedRowsLength: freshData.mergedRows?.length,
      completedRows: freshData.mergedRows?.filter(r => r.completed).length,
    });

    await exportSelectedColumnsToCSV(
      freshData,
      {
        annotationFields: annotationConfig.annotationFields.map(field => ({
          ...field,
          isNewColumn: field.isNewColumn ?? false
        }))
      },
      datasetId,
      {
        cleanHtml: true,
        showSuccess: true,
        onSuccess: (message) => {
          showToast({
            type: 'success',
            title: 'Export Complete',
            description: message,
          });
        },
        onError: (error) => {
          console.error('Error exporting selected columns CSV:', error);
          setError('Failed to export selected columns CSV');
        },
      }
    );
  }, [datasetData, annotationConfig, showToast, datasetId, taskId]);

  // Export annotations to CSV - All Columns
  const handleExportAllColumns = useCallback(async () => {
    if (!annotationConfig) {
      console.log('Cannot export: missing annotation config');
      return;
    }

    // Always fetch fresh data from backend so is_completed reflects the true DB state
    let freshData = datasetData;
    try {
      console.log('🔄 [Workbench] Fetching fresh dataset data for export...');
      freshData = await DatasetMergedRowsAPI.getDatasetData(datasetId, taskId);
      if (freshData) setDatasetData(freshData);
    } catch (fetchErr) {
      console.warn('⚠️ [Workbench] Could not refresh data before export, using cached data:', fetchErr);
    }

    if (!freshData) {
      console.log('Cannot export: missing dataset data');
      return;
    }

    console.log('🔍 [Workbench] Export All Columns - Fresh Dataset Data:', {
      totalRows: freshData.totalRows,
      mergedRowsLength: freshData.mergedRows?.length,
      completedRows: freshData.mergedRows?.filter(r => r.completed).length,
    });

    await exportAllColumnsToCSV(
      freshData,
      {
        annotationFields: annotationConfig.annotationFields.map(field => ({
          ...field,
          isNewColumn: field.isNewColumn ?? false
        }))
      },
      datasetId,
      {
        cleanHtml: true,
        showSuccess: true,
        onSuccess: (message) => {
          showToast({
            type: 'success',
            title: 'Export Complete',
            description: message,
          });
        },
        onError: (error) => {
          console.error('Error exporting all columns CSV:', error);
          setError('Failed to export all columns CSV');
        },
      }
    );
  }, [datasetData, annotationConfig, showToast, datasetId, taskId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Undo/Redo functionality
  const addToHistory = useCallback(
    (state: any) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(state);
        return newHistory.slice(-20); // Keep last 20 states
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 19));
    },
    [historyIndex],
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setMetadata(prevState.metadata);
      setNewColumnData(prevState.newColumnData);
      setHistoryIndex((prev) => prev - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setMetadata(nextState.metadata);
      setNewColumnData(nextState.newColumnData);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [history, historyIndex]);

  const navigateTask = (direction: 'prev' | 'next') => {
    let newIndex = currentTaskIndex;
    
    if (direction === 'prev' && currentTaskIndex > 0) {
      newIndex = currentTaskIndex - 1;
    } else if (direction === 'next' && currentTaskIndex < tasks.length - 1) {
      newIndex = currentTaskIndex + 1;
    }
    
    if (newIndex !== currentTaskIndex) {
      setCurrentTaskIndex(newIndex);
      
      // Update last viewed row in backend
      if (datasetId) {
        DatasetMergedRowsAPI.updateAnnotationProgress(
          datasetId,
          newIndex,
          tasks.filter(t => t.status === 'completed').length,
          taskId  // Feature 1
        ).catch(error => {
          console.error('Error updating navigation progress:', error);
        });
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              redo();
            } else {
              e.preventDefault();
              undo();
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            navigateTask('prev');
            break;
          case 'ArrowRight':
            e.preventDefault();
            navigateTask('next');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, navigateTask]);

  const jumpToRow = (rowIndex: number) => {
    // Find the task with the matching rowIndex
    const taskIndex = tasks.findIndex(task => task.rowIndex === rowIndex);
    if (taskIndex >= 0) {
      setCurrentTaskIndex(taskIndex);
    }
  };

  // Drag and drop handlers for metadata field reordering
  const handleDragStart = (e: React.DragEvent, fieldName: string) => {
    setDraggedField(fieldName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Unified drag handler using the DragDropHelper
  const handleUnifiedDrop = async (e: React.DragEvent | null, targetFieldName: string, targetPanel: 'metadata' | 'annotation') => {
    if (e) {
      e.preventDefault();
    }
    
    if (!draggedField || !annotationConfig) return;

    console.log('handleUnifiedDrop called with:', { draggedField, targetFieldName, targetPanel });

    // Use the DragDropHelper to handle the operation
    const params: DragDropParams = {
      draggedField,
      targetFieldName,
      targetPanel,
      annotationConfig,
      orderedMetadataFields
    };

    const result = await DragDropHelper.handleDragDrop(params);

    if (result.success) {
      // Update state based on result
      if (result.updatedFields) {
        setAnnotationConfig((prev) => (prev ? { ...prev, annotationFields: result.updatedFields! } : prev));
      }
      
      if (result.updatedMetadataFields) {
        setOrderedMetadataFields(result.updatedMetadataFields);
      }

      // Persist changes to backend
      if (result.updatedFields) {
        try {
          await fieldSelectionAPI.saveDatasetFieldConfig({
            datasetId,
            annotationFields: result.updatedFields,
            annotationLabels: annotationConfig.annotationLabels || [],
            newColumns: datasetNewColumns,
          });

          showToast({
            type: 'success',
            title: 'Operation Successful',
            description: result.message
          });
        } catch (error) {
          console.error('Failed to persist changes:', error);
          showToast({
            type: 'error',
            title: 'Save Failed',
            description: 'Failed to save field configuration'
          });
        }
      } else {
        // For metadata-only reordering (no backend persistence needed)
        showToast({
          type: 'success',
          title: 'Fields Reordered',
          description: result.message
        });
      }
    } else {
      // Show error message
      showToast({
        type: 'error',
        title: 'Operation Failed',
        description: result.message
      });
    }

    setDraggedField(null);
  };

  // Unified drag over handler
  const handleUnifiedDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Field editing handlers
  const handleEditField = (fieldName: string) => {
    setEditingField(fieldName);
  };

  const handleSaveField = (fieldName: string, newValue: string) => {
    setMetadata(prev => ({
      ...prev,
      [fieldName]: newValue
    }));
    setEditingField(null);
  };

  // Individual field save handler for dataset row data
  const handleSaveIndividualField = useCallback(async (fieldName: string, fieldValue: string) => {
    if (!datasetId || !currentTask) return;
    
    setIsSaving(true);
    try {
      const fieldData = { [fieldName]: fieldValue };

      const response = await DatasetMergedRowsAPI.patchRowData(
        datasetId,
        currentTask.rowIndex,
        fieldData,
        taskId  // Feature 1: scope write to this annotator's task
      );

      if (response.success && response.data) {
        // Update local dataset data
        if (datasetData && datasetData.mergedRows) {
          const updatedRow = datasetData.mergedRows.find(row => row.rowIndex === currentTask.rowIndex);
          if (updatedRow) {
            updatedRow.data[fieldName] = fieldValue;
            updatedRow.processed = true;
            setDatasetData({ ...datasetData });
          }
        }

        // Update current task metadata to immediately reflect the changes
        const updatedTask = {
          ...currentTask,
          metadata: {
            ...currentTask.metadata,
            [fieldName]: fieldValue
          },
          updatedAt: new Date(),
        };

        // Update the tasks array
        setTasks(prev => prev.map(task => 
          task.id === currentTask.id ? updatedTask : task
        ));

        // Don't update newColumnData during individual saves
        // This preserves any unsaved changes in the right panel
        console.log('Individual save - preserving newColumnData unchanged:', {
          fieldName,
          fieldValue,
          pendingChanges,
          currentNewColumnData: newColumnData
        });

        setLastSavedTime(new Date());
        showToast({
          type: 'success',
          title: 'Field Saved',
          description: `Field "${fieldName}" saved successfully!`,
        });
      }

    } catch (error: any) {
      console.error(`Failed to save field "${fieldName}":`, error);
      showToast({
        type: 'error',
        title: 'Save Failed',
        description: `Failed to save field "${fieldName}": ${error?.message || 'Unknown error'}`,
      });
    } finally {
      setIsSaving(false);
    }
  }, [datasetId, currentTask, datasetData, showToast, pendingChanges]);

  const handleCancelEdit = () => {
    setEditingField(null);
  };

  // Text expansion handlers
  const toggleTextExpansion = (fieldName: string) => {
    setExpandedTextFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldName)) {
        newSet.delete(fieldName);
      } else {
        newSet.add(fieldName);
      }
      return newSet;
    });
  };

  // Image overlay handlers
  const openImageOverlay = (imageUrls: string[], startIndex: number = 0) => {
    setImageOverlay({
      isOpen: true,
      imageUrl: imageUrls[startIndex] || '',
      imageUrls,
      currentIndex: startIndex,
    });
  };

  const closeImageOverlay = () => {
    setImageOverlay({
      isOpen: false,
      imageUrl: '',
      imageUrls: [],
      currentIndex: 0,
    });
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    const { imageUrls, currentIndex } = imageOverlay;
    let newIndex = currentIndex;
    
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < imageUrls.length - 1) {
      newIndex = currentIndex + 1;
    }

    setImageOverlay(prev => ({
      ...prev,
      currentIndex: newIndex,
      imageUrl: imageUrls[newIndex] || '',
    }));
  };

  // Audio overlay handlers
  const openAudioOverlay = (audioUrl: string) => {
    setAudioOverlay({
      isOpen: true,
      audioUrl,
    });
  };

  const closeAudioOverlay = () => {
    setAudioOverlay({
      isOpen: false,
      audioUrl: '',
    });
  };

  // Save all new column data function
  const saveAllNewColumnData = useCallback(async () => {
    if (!datasetId || !currentTask) return;

    const annotationFields = annotationConfig?.annotationFields.filter(
      (field) => field.isNewColumn || field.isAnnotationField
    ) || [];

    const dataToSave: Record<string, any> = {};
    let hasActualData = false;

    // IMPORTANT: First, save any unsaved individual edits from the left panel
    if (editingField && metadata[editingField] !== undefined) {
      try {
        await handleSaveIndividualField(editingField, metadata[editingField]);
        setEditingField(null); // Clear editing state
      } catch (error) {
        console.error('Failed to save individual edit before Save and Continue:', error);
        showToast({
          type: 'error',
          title: 'Save Failed',
          description: 'Could not save individual edit before proceeding'
        });
        return;
      }
    }

    // Collect only fields that have actual data from newColumnData
    for (const field of annotationFields) {
      const fieldValue = newColumnData[field.fieldName];
      if (fieldValue !== undefined && fieldValue !== null && fieldValue.trim() !== '') {
        dataToSave[field.fieldName] = fieldValue;
        hasActualData = true;
      }
    }

    setIsSaving(true);
    try {
      let response = null;
      
      // Only save data if there's actual data to save
      if (hasActualData) {
        response = await DatasetMergedRowsAPI.patchRowData(
          datasetId,
          currentTask.rowIndex,
          dataToSave,
          taskId  // Feature 1
        );

        if (response.success && response.data) {
          // Update local dataset data
          if (datasetData && datasetData.mergedRows) {
            const updatedRow = datasetData.mergedRows.find(row => row.rowIndex === currentTask.rowIndex);
            if (updatedRow) {
              Object.entries(dataToSave).forEach(([fieldName, value]) => {
                updatedRow.data[fieldName] = value;
              });
              updatedRow.processed = true;
              updatedRow.completed = true;  // Ensure CSV export reflects correct completion status
              setDatasetData({ ...datasetData });
            }
          }
        }
      }

      // Always mark row as completed (regardless of whether data was saved)
      const updatedTask = {
        ...currentTask,
        metadata: {
          ...currentTask.metadata,
          ...dataToSave
        },
        status: 'completed' as const,
        updatedAt: new Date(),
      };

      // Update the tasks array
      setTasks(prev => prev.map(task => 
        task.id === currentTask.id ? updatedTask : task
      ));

      // Mark row as completed in backend
      try {
        await DatasetMergedRowsAPI.markRowCompleted(datasetId, currentTask.rowIndex, taskId);  // Feature 1

        // Always update local datasetData.completed flag so CSV export shows TRUE
        if (datasetData && datasetData.mergedRows) {
          const completedRow = datasetData.mergedRows.find(row => row.rowIndex === currentTask.rowIndex);
          if (completedRow) {
            completedRow.completed = true;
            setDatasetData({ ...datasetData });
          }
        }

        // Update progress tracking
        const completedCount = tasks.filter(t => t.status === 'completed' || t.rowIndex === currentTask.rowIndex).length;
        await DatasetMergedRowsAPI.updateAnnotationProgress(datasetId, currentTask.rowIndex, completedCount, taskId);  // Feature 1

        console.log(`Row ${currentTask.rowIndex} marked as completed and saved to backend`);
      } catch (completionError) {
        console.error('Error marking row as completed in backend:', completionError);
        // Don't show error toast for completion failure, as the main action (save data) succeeded
      }

      setLastSavedTime(new Date());
      setPendingChanges({});

      // Check if ALL rows are completed using API
      try {
        const completionStatus = await DatasetMergedRowsAPI.checkAllRowsCompleted(datasetId, taskId);  // Feature 1

        if (completionStatus.allCompleted) {
          // Show completion modal instead of toast
          setCompletionStats({
            completedCount: completionStatus.completedCount,
            totalCount: completionStatus.totalCount,
            completionTime: new Date().toLocaleString('en-IN', { 
              timeZone: 'Asia/Kolkata',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          });
          setShowCompletionModal(true);
        } else {
          // Show regular success toast and navigate to next row
          const isLastRow = currentTaskIndex >= tasks.length - 1;
        
        if (hasActualData && response?.success) {
          const fieldCount = response.updatedFields || 0;
          showToast({
            type: 'success',
            title: 'Data Saved & Row Completed',
            description: fieldCount > 0 
              ? `Successfully saved ${fieldCount} field(s).${isLastRow ? '' : ' Moving to next row...'}`
              : `Row marked as complete.${isLastRow ? '' : ' Moving to next row...'}`,
          });
        } else {
          showToast({
            type: 'success',
            title: 'Row Marked as Complete',
            description: `Row completed.${isLastRow ? '' : ' Moving to next row...'}`,
          });
        }

          // Auto-navigate to next row after successful save (only if not last row)
          if (!isLastRow) {
            setTimeout(() => {
              navigateTask('next');
            }, 1000); // Small delay to let user see the success message
          }
        }
      } catch (completionError) {
        console.error('Error checking completion status:', completionError);
        // Fallback to regular flow if API call fails
        const isLastRow = currentTaskIndex >= tasks.length - 1;
        
        if (hasActualData && response?.success) {
          const fieldCount = response.updatedFields || 0;
          showToast({
            type: 'success',
            title: 'Data Saved & Row Completed',
            description: fieldCount > 0 
              ? `Successfully saved ${fieldCount} field(s).${isLastRow ? '' : ' Moving to next row...'}`
              : `Row marked as complete.${isLastRow ? '' : ' Moving to next row...'}`,
          });
        } else {
          showToast({
            type: 'success',
            title: 'Row Marked as Complete',
            description: `Row completed.${isLastRow ? '' : ' Moving to next row...'}`,
          });
        }

        // Auto-navigate to next row after successful save (only if not last row)
        if (!isLastRow) {
          setTimeout(() => {
            navigateTask('next');
          }, 1000);
        }
      }

    } catch (error: any) {
      console.error('Failed to save new column data:', error);
      showToast({
        type: 'error',
        title: 'Save Failed',
        description: `Failed to save new column data: ${error?.message || 'Unknown error'}`,
      });
    } finally {
      setIsSaving(false);
    }
  }, [datasetId, currentTask, datasetData, newColumnData, annotationConfig, showToast, editingField, metadata, handleSaveIndividualField]);

  // New column data handlers - no auto-save, only manual save
  const handleNewColumnChange = useCallback((fieldName: string, value: string) => {
    setNewColumnData(prev => ({
      ...prev,
      [fieldName]: value,
    }));

    setPendingChanges(prev => ({
      ...prev,
      [fieldName]: value,
    }));

    addToHistory({
      metadata,
      newColumnData: { ...newColumnData, [fieldName]: value },
    });
  }, [metadata, newColumnData, addToHistory]);

  // Navigation handler
  const handleNavigateBack = useCallback(() => {
    router.push(`/dataset/${datasetId}`);
  }, [router, datasetId]);

  // Completion modal handlers
  const handleReturnToDataset = useCallback(() => {
    setShowCompletionModal(false);
    router.push(`/dataset/${datasetId}`);
  }, [router, datasetId]);

  const handleRecheckRows = useCallback(() => {
    setShowCompletionModal(false);
    // Reset to first row to allow rechecking
    setCurrentTaskIndex(0);
    // Optionally refresh the tasks to get latest status
    // This will be handled by the existing useEffect that loads tasks
  }, []);

  // Mark row as completed with backend persistence
  const handleMarkAsCompleted = useCallback(async (rowIndex: number) => {
    if (!datasetId) return;
    
    try {
      // Update local state immediately
      setTasks(prev => prev.map(task => 
        task.rowIndex === rowIndex 
          ? { ...task, status: 'completed' as const, updatedAt: new Date() }
          : task
      ));
      
      // Save to backend
      await DatasetMergedRowsAPI.markRowCompleted(datasetId, rowIndex, taskId);  // Feature 1

      // Update progress tracking
      const completedCount = tasks.filter(t => t.status === 'completed' || t.rowIndex === rowIndex).length;
      await DatasetMergedRowsAPI.updateAnnotationProgress(datasetId, rowIndex, completedCount, taskId);  // Feature 1

      console.log(`Marked row ${rowIndex} as completed and saved to backend`);
      
    } catch (error) {
      console.error('Error marking row as completed:', error);
      // Revert local state on error
      setTasks(prev => prev.map(task => 
        task.rowIndex === rowIndex 
          ? { ...task, status: 'pending' as const }
          : task
      ));
      
      showToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Failed to save completion status. Please try again.',
      });
    }
  }, [datasetId, tasks, showToast]);

  const annotatedTasks = tasks.filter(
    (task) => task.status === 'completed',
  );
  const unannotatedTasks = tasks.filter(
    (task) => task.status !== 'completed',
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'needs_review':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'text':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'image':
        return <ImageIcon className="h-4 w-4 text-green-500" />;
      case 'audio':
        return <AudioLines className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  // Track the previous task to detect navigation
  const prevTaskRef = useRef<Task | null>(null);

  // Effect 1: Load fresh data when navigating to a new task
  useEffect(() => {
    if (!currentTask || !annotationConfig) return;

    // Check if we're navigating to a different task
    const isNewTask = prevTaskRef.current?.id !== currentTask.id;
    
    if (isNewTask) {
      console.log('Navigating to new task:', currentTask.rowIndex);
      
      const annotationFields = annotationConfig.annotationFields.filter(
        (field) => field.isNewColumn || field.isAnnotationField
      );

      // Load fresh data for the new task
      const newColumnData: NewColumnData = {};
      annotationFields.forEach((field) => {
        // First check if the field data exists in the current task's metadata (saved annotation data)
        let fieldValue = currentTask.metadata?.[field.fieldName];
        
        // If no saved annotation data, get the original CSV column data
        if (!fieldValue && field.csvColumnName && currentTask.metadata) {
          fieldValue = currentTask.metadata[field.csvColumnName];
        }
        
        newColumnData[field.fieldName] = fieldValue || '';
      });

      setNewColumnData(newColumnData);
      setPendingChanges({}); // Clear pending changes for new task
      
      console.log('Loaded fresh data for new task:', {
        taskRowIndex: currentTask.rowIndex,
        newColumnData,
        annotationFields: annotationFields.map(f => f.fieldName)
      });
    }

    // Update the previous task reference
    prevTaskRef.current = currentTask;
  }, [currentTask, annotationConfig]);

  // Effect 2: Initialize annotation fields when config changes
  useEffect(() => {
    if (!annotationConfig) return;

    const annotationFields = annotationConfig.annotationFields.filter(
      (field) => field.isNewColumn || field.isAnnotationField
    );

    // Initialize new column data structure
    setNewColumnData(prevNewColumnData => {
      const initialNewColumnData: NewColumnData = {};
      annotationFields.forEach((field) => {
        // Preserve existing values or initialize with empty string
        initialNewColumnData[field.fieldName] = prevNewColumnData[field.fieldName] || '';
      });
      return initialNewColumnData;
    });
  }, [annotationConfig]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dataset annotation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Main Content Area - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanels
          leftPanel={
            <MetadataDisplay
              metadata={metadata}
              orderedMetadataFields={orderedMetadataFields}
              draggedField={draggedField}
              editingField={editingField}
              expandedTextFields={expandedTextFields}
              imageOverlay={imageOverlay}
              audioOverlay={audioOverlay}
              datasetName={datasetName}
              onMetadataChange={setMetadata}
              onDragStart={handleDragStart}
              onDragOver={handleUnifiedDragOver}
              onDrop={(e, targetFieldName) => handleUnifiedDrop(e, targetFieldName, 'metadata')}
              onEditField={handleEditField}
              onSaveField={handleSaveField}
              onSaveIndividualField={handleSaveIndividualField}
              onCancelEdit={handleCancelEdit}
              onToggleTextExpansion={toggleTextExpansion}
              onOpenImageOverlay={openImageOverlay}
              onOpenAudioOverlay={openAudioOverlay}
              onNavigateBack={handleNavigateBack}
              onPanelDragOver={handleUnifiedDragOver}
              onDropFromAnnotation={() => handleUnifiedDrop(null, '', 'metadata')}
            />
          }
          rightPanel={
            <NewColumnDataPanel
              annotationConfig={annotationConfig}
              newColumnData={newColumnData}
              onNewColumnChange={handleNewColumnChange}
              onSaveAllNewColumnData={saveAllNewColumnData}
              onExportSelectedColumns={handleExportSelectedColumns}
              onExportAllColumns={handleExportAllColumns}
              isSaving={isSaving}
              completedCount={annotatedTasks.length}
              pendingCount={unannotatedTasks.length}
              currentRowIndex={currentTask?.rowIndex}
              onPanelDragOver={handleUnifiedDragOver}
              onDropFromMetadata={() => handleUnifiedDrop(null, '', 'annotation')}
              draggedField={draggedField}
              onAnnotationFieldDragStart={handleDragStart}
              onAnnotationFieldDragOver={handleUnifiedDragOver}
              onAnnotationFieldDrop={(e, targetFieldName) => handleUnifiedDrop(e, targetFieldName, 'annotation')}
            />
          }
          defaultLeftWidth={50}
          minLeftWidth={25}
          maxLeftWidth={75}
        />
      </div>

      {/* Fixed Footer: Row Navigation */}
      <RowFooter
        tasks={tasks}
        currentTaskIndex={currentTaskIndex}
        onNavigateTask={navigateTask}
        onJumpToRow={jumpToRow}
        onMarkAsCompleted={handleMarkAsCompleted}
        completedCount={annotatedTasks.length}
        totalCount={tasks.length}
      />

      {/* Image Overlay */}
      <ImageOverlay
        isOpen={imageOverlay.isOpen}
        imageUrl={imageOverlay.imageUrl}
        imageUrls={imageOverlay.imageUrls}
        currentIndex={imageOverlay.currentIndex}
        onClose={closeImageOverlay}
        onNavigate={navigateImage}
      />

      {/* Audio Overlay */}
      <AudioOverlay
        isOpen={audioOverlay.isOpen}
        audioUrl={audioOverlay.audioUrl}
        onClose={closeAudioOverlay}
      />

      {/* Completion Modal */}
      {showCompletionModal && completionStats && (
        <CompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          onReturnToDataset={handleReturnToDataset}
          onRecheckRows={handleRecheckRows}
          completedCount={completionStats.completedCount}
          totalCount={completionStats.totalCount}
          completionTime={completionStats.completionTime}
        />
      )}
    </div>
  );
}