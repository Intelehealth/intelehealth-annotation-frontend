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
import { AnnotationsAPI, Annotation } from '@/lib/api/annotations';
import {
  CSVImport,
  AnnotationConfig,
  AnnotationField,
  CSVImportsAPI,
  PatchAnnotationConfigRequest,
  PatchRowAnnotationRequest,
} from '@/lib/api/csv-imports';
import { fieldSelectionAPI } from '@/lib/api/field-config';
import { csvProcessingAPI } from '@/lib/api/csv-processing';
import { RowFooter, NewColumnDataPanel } from '@/components/new-column-components';
import { MetadataDisplay } from './metadata-display';
import { ImageOverlay, AudioOverlay, VideoOverlay } from './media-overlays';
import { useToast } from '@/components/ui/toast';
import { exportToCsv, ExportData } from '@/lib/csv-export-helper';
import { DragDropHelper, DragDropParams } from '@/lib/drag-drop-helper';

interface Task {
  id: string;
  rowIndex: number;
  fileName: string;
  fileType: 'text' | 'image' | 'audio';
  filePath: string;
  status: 'pending' | 'in_progress' | 'completed' | 'needs_review';
  assignedTo?: string;
  metadata?: Record<string, any>;
  annotations?: Annotation[];
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
  audioUrls: string[];
  currentIndex: number;
}

interface VideoOverlay {
  isOpen: boolean;
  videoUrl: string;
  videoUrls: string[];
  currentIndex: number;
}

interface AnnotationWorkbenchProps {
  csvImportId: string;
  datasetId: string;
}

export function AnnotationWorkbench({
  csvImportId,
  datasetId,
}: AnnotationWorkbenchProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
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
  const [csvImport, setCsvImport] = useState<CSVImport | null>(null);
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
    audioUrls: [],
    currentIndex: 0,
  });
  const [videoOverlay, setVideoOverlay] = useState<VideoOverlay>({
    isOpen: false,
    videoUrl: '',
    videoUrls: [],
    currentIndex: 0,
  });
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [datasetNewColumns, setDatasetNewColumns] = useState<any[]>([]);

  // Initialize ordered metadata fields when annotation config changes
  useEffect(() => {
    if (annotationConfig) {
      // Metadata fields are existing CSV columns that are NOT new columns
      const metadataFields = annotationConfig.annotationFields.filter(
        (field) => !field.isNewColumn
      );
      setOrderedMetadataFields(metadataFields);
    }
  }, [annotationConfig]);

  // Load CSV import data and annotation config
  useEffect(() => {
    console.log('AnnotationWorkbench useEffect triggered');
    console.log('csvImportId:', csvImportId);
    console.log('datasetId:', datasetId);
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading data for csvImportId:', csvImportId);

        // Load CSV import data using csv-processing API
        console.log('Loading CSV import data...');
        const csvData = await csvProcessingAPI.getCSVData(csvImportId);
        console.log('CSV import data loaded:', csvData);
        setCsvImport(csvData);

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
            // Use fields directly from backend
            const normalizedFields = (config.annotationFields || []).map((f: any) => ({
              ...f,
              isAnnotationField: f.isAnnotationField === false ? false : true,
              isNewColumn: Boolean(f.isNewColumn),
              isPrimaryKey: Boolean(f.isPrimaryKey),
              isRequired: Boolean(f.isRequired),
            }));

            // Migrate existing duplicated data fields to linked references
            const migration = DragDropHelper.migrateExistingDataFields(normalizedFields);
            if (migration.migrated) {
              console.log('Migrated existing data fields to linked references:', migration.migrationLog);
              normalizedFields.length = 0;
              normalizedFields.push(...migration.migratedFields);
            }

            // Transform the dataset config to match the expected AnnotationConfig format
            const annotationConfig: AnnotationConfig = {
              _id: config._id || '',
              csvImportId: csvImportId,
              userId: user?._id,
              annotationFields: normalizedFields,
              annotationLabels: config.annotationLabels || [],
              rowAnnotations: [],
              fieldGroups: config.fieldGroups || [],
              totalRows: csvData.totalRows,
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
            csvImportId,
            userId: user?._id,
            annotationFields: [],
            rowAnnotations: [],
            fieldGroups: [],
            totalRows: csvData.totalRows,
            completedRows: 0,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setAnnotationConfig(defaultConfig);
        }

        // Convert CSV rows to tasks
        console.log('CSV data structure:', {
          hasRowData: !!csvData.rowData,
          rowDataLength: csvData.rowData?.length,
          totalRows: csvData.totalRows,
        });

        let taskData: Task[] = [];

        if (csvData.rowData && Array.isArray(csvData.rowData)) {
          taskData = csvData.rowData.map((row: any) => ({
            id: `row-${row.rowIndex}`,
            rowIndex: row.rowIndex,
            fileName: `Row ${row.rowIndex + 1}`, // Display as 1-based for user friendliness
            fileType: 'text', // Default to text, will be determined by annotation fields
            filePath: `/csv/${csvImportId}/row/${row.rowIndex}`,
            status: 'pending',
            metadata: row.data || {},
            annotations: [],
            createdAt: new Date(csvData.createdAt),
            updatedAt: new Date(csvData.updatedAt),
          }));
        } else {
          // If no rowData, create tasks based on totalRows
          console.log(
            'No rowData found, creating tasks based on totalRows:',
            csvData.totalRows,
          );
          taskData = Array.from({ length: csvData.totalRows }, (_, index) => ({
            id: `row-${index}`,
            rowIndex: index, // Keep 0-based for backend consistency
            fileName: `Row ${index + 1}`, // Display as 1-based for user friendliness
            fileType: 'text',
            filePath: `/csv/${csvImportId}/row/${index}`,
            status: 'pending',
            metadata: {},
            annotations: [],
            createdAt: new Date(csvData.createdAt),
            updatedAt: new Date(csvData.updatedAt),
          }));
        }

        // Initialize metadata with actual CSV data
        if (
          taskData.length > 0 &&
          csvData.rowData &&
          csvData.rowData.length > 0
        ) {
          const firstRowData = csvData.rowData[0].data;
          console.log('Initializing metadata with CSV data:', firstRowData);
          setMetadata(firstRowData);
        }

        console.log('Tasks created:', taskData.length, 'tasks');
        setTasks(taskData);

        // Load progress and apply completion status
        try {
          console.log('Loading annotation progress...');
          const progress = await CSVImportsAPI.getDetailedProgress(csvImportId);
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
            isNewColumn: f.isNewColumn
          })));
          const initialNewColumnData: NewColumnData = {};
          annotationFields.forEach((field) => {
            initialNewColumnData[field.fieldName] = '';
          });
          setNewColumnData(initialNewColumnData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
        });
        setError(
          `Failed to load annotation data: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`,
        );
      } finally {
        setLoading(false);
      }
    };

    if (csvImportId) {
      loadData();
    }
  }, [csvImportId, datasetId]);

  const currentTask = tasks[currentTaskIndex];

  // Update metadata when current task changes
  useEffect(() => {
    if (currentTask && currentTask.metadata) {
      console.log('Updating metadata for task:', currentTask.rowIndex, currentTask.metadata);
      setMetadata(currentTask.metadata);
    }
  }, [currentTask]);

  // Load annotations for current task
  useEffect(() => {
    const loadAnnotations = async () => {
      if (!currentTask || !csvImportId) return;

      try {
        const rowAnnotations = await AnnotationsAPI.findByCSVRow(
          csvImportId,
          currentTask.rowIndex,
        );
        setAnnotations(rowAnnotations);
      } catch (err) {
        console.error('Error loading annotations:', err);
      }
    };

    loadAnnotations();
  }, [currentTask, csvImportId]);

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
  const exportSelectedColumnsToCSV = useCallback(async () => {
    if (!csvImport) {
      console.log('Cannot export: missing CSV data');
      return;
    }

    try {
      console.log('Exporting selected columns to CSV...');

      // Get all rows with their annotations
      const allRows = csvImport.rowData || [];

      // Get selected fields (metadata fields + annotation fields)
      const selectedFields = annotationConfig?.annotationFields.filter(
        (field) => !field.isAnnotationField || field.isAnnotationField || field.isNewColumn
      ) || [];

      console.log('Selected fields for export:', selectedFields.map(f => ({
        csvColumnName: f.csvColumnName,
        fieldName: f.fieldName,
        isAnnotationField: f.isAnnotationField,
        isNewColumn: f.isNewColumn
      })));

      // Prepare export data
      const exportRows: Record<string, any>[] = [];
      const headers: string[] = [];

      // Build headers from selected fields
      selectedFields.forEach((field) => {
        if (!field.isAnnotationField && !field.isNewColumn) {
          headers.push(field.csvColumnName);
        } else if (field.isAnnotationField || field.isNewColumn) {
          headers.push(field.fieldName);
        }
      });

      // Build rows
      for (let rowIndex = 0; rowIndex < allRows.length; rowIndex++) {
        const row = allRows[rowIndex];
        const rowAnnotations = annotations.filter(
          (ann) => ann.csvRowIndex === rowIndex,
        );

        const exportedRow: Record<string, any> = {};

        // Add selected fields
        selectedFields.forEach((field) => {
          if (!field.isAnnotationField && !field.isNewColumn) {
            // Original CSV column - check if it exists in stored data
            if (row.data && row.data.hasOwnProperty(field.csvColumnName)) {
              exportedRow[field.csvColumnName] = row.data[field.csvColumnName] || '';
            } else {
              // Column was filtered out during processing, include as empty
              exportedRow[field.csvColumnName] = '';
            }
          } else if (field.isAnnotationField || field.isNewColumn) {
            // New annotation column
            const fieldAnnotation = rowAnnotations.find(
              (ann) => ann.fieldName === field.fieldName,
            );

            if (fieldAnnotation && fieldAnnotation.data?.value) {
              exportedRow[field.fieldName] = fieldAnnotation.data.value;
            } else {
              // Check if data exists in the row's metadata (for new columns)
              exportedRow[field.fieldName] = row.data[field.fieldName] || '';
            }
          }
        });

        exportRows.push(exportedRow);
      }

      const exportData: ExportData = {
        headers,
        rows: exportRows,
      };

      // Generate clean filename with IST timestamp
      const istTime = new Date().toLocaleString('en-CA', { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/[, ]/g, '_').replace(/:/g, '-');
      const baseFileName = csvImport.originalFileName 
        ? csvImport.originalFileName.replace(/\.(csv|xlsx|xls)$/i, '') 
        : 'data';
      const cleanFileName = `selected_columns_${baseFileName}_${istTime}.csv`;

      // Export using helper function
      exportToCsv(
        exportData,
        cleanFileName,
        {
          cleanHtml: true,
          showSuccess: true,
          onSuccess: (message) => {
            console.log('Selected columns CSV exported successfully');
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
    } catch (error) {
      console.error('Error exporting selected columns CSV:', error);
      setError('Failed to export selected columns CSV');
    }
  }, [csvImport, annotations, annotationConfig, showToast]);

  // Export annotations to CSV - All Columns (Fixed to include ALL original columns)
  const exportAllColumnsToCSV = useCallback(async () => {
    if (!csvImport) {
      console.log('Cannot export: missing CSV data');
      return;
    }

    try {
      console.log('Exporting all columns to CSV...');

      // Get all rows with their annotations
      const allRows = csvImport.rowData || [];

      // Get all original CSV columns from the stored columns array
      const originalColumns = csvImport.columns || [];
      
      // Get annotation fields (new columns)
      const annotationFields = annotationConfig?.annotationFields.filter(
        (field) => field.isAnnotationField || field.isNewColumn
      ) || [];

      console.log('Original CSV columns:', originalColumns);
      console.log('Annotation fields (new columns):', annotationFields.map(f => f.fieldName));

      // Prepare export data
      const exportRows: Record<string, any>[] = [];
      const headers: string[] = [...originalColumns, ...annotationFields.map(f => f.fieldName)];

      // Build rows
      for (let rowIndex = 0; rowIndex < allRows.length; rowIndex++) {
        const row = allRows[rowIndex];
        const rowAnnotations = annotations.filter(
          (ann) => ann.csvRowIndex === rowIndex,
        );

        const exportedRow: Record<string, any> = {};
        
        // First, add ALL original CSV columns (even if empty in stored data)
        originalColumns.forEach((columnName) => {
          // Check if this column exists in the stored row data
          if (row.data && row.data.hasOwnProperty(columnName)) {
            exportedRow[columnName] = row.data[columnName] || '';
          } else {
            // Column doesn't exist in stored data (was filtered out during processing)
            // This is the key fix - we include empty columns that were filtered out
            exportedRow[columnName] = '';
          }
        });

        // Then add new annotation columns
        annotationFields.forEach((field) => {
          const fieldAnnotation = rowAnnotations.find(
            (ann) => ann.fieldName === field.fieldName,
          );

          if (fieldAnnotation && fieldAnnotation.data?.value) {
            exportedRow[field.fieldName] = fieldAnnotation.data.value;
          } else {
            // Check if data exists in the row's metadata (for new columns)
            exportedRow[field.fieldName] = row.data[field.fieldName] || '';
          }
        });

        exportRows.push(exportedRow);
      }

      const exportData: ExportData = {
        headers,
        rows: exportRows,
      };

      // Generate clean filename with IST timestamp
      const istTime = new Date().toLocaleString('en-CA', { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/[, ]/g, '_').replace(/:/g, '-');
      const baseFileName = csvImport.originalFileName 
        ? csvImport.originalFileName.replace(/\.(csv|xlsx|xls)$/i, '') 
        : 'data';
      const cleanFileName = `all_columns_${baseFileName}_${istTime}.csv`;

      // Export using helper function
      exportToCsv(
        exportData,
        cleanFileName,
        {
          cleanHtml: true,
          showSuccess: true,
          onSuccess: (message) => {
            console.log('All columns CSV exported successfully');
            showToast({
              type: 'success',
              title: 'Export Complete',
              description: `Exported ${originalColumns.length} original + ${annotationFields.length} new columns`,
            });
          },
          onError: (error) => {
            console.error('Error exporting all columns CSV:', error);
            setError('Failed to export all columns CSV');
          },
        }
      );
    } catch (error) {
      console.error('Error exporting all columns CSV:', error);
      setError('Failed to export all columns CSV');
    }
  }, [csvImport, annotations, annotationConfig, showToast]);

  // Individual field save only - bulk save removed

  // Auto-save disabled - only save when button is clicked

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
      setAnnotations(prevState.annotations);
      setNewColumnData(prevState.newColumnData);
      setHistoryIndex((prev) => prev - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setMetadata(nextState.metadata);
      setAnnotations(nextState.annotations);
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
      if (csvImportId) {
        CSVImportsAPI.updateAnnotationProgress(
          csvImportId, 
          newIndex, 
          tasks.filter(t => t.status === 'completed').length
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

  const jumpToRow = (rowNumber: number) => {
    // Convert 1-based row number to 0-based task index
    const taskIndex = rowNumber - 1;
    if (taskIndex >= 0 && taskIndex < tasks.length) {
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
      // Block cross-panel moves for non-admins before updating state
      const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
      if (!isAdmin && result.changedPanels) {
        showToast({
          type: 'info',
          title: 'Request Sent',
          description: 'Only admins can modify field configuration. Please use the "Request Change" button instead.'
        });
        setDraggedField(null);
        return;
      }

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
            newColumns: datasetNewColumns || [],
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

  // Save field configuration updates immediately to backend (debounced)
  const handleUpdateFieldConfig = useCallback(async (updatedFields: AnnotationField[], updatedGroups?: any[]) => {
    if (!annotationConfig) return;
    
    // Update local state immediately
    setAnnotationConfig((prev) => {
      if (!prev) return null;
      const next = { ...prev, annotationFields: updatedFields };
      if (updatedGroups) {
        next.fieldGroups = updatedGroups;
      }
      return next;
    });

    // Also update orderedMetadataFields since layout depends on it
    const metadataFields = updatedFields.filter((field) => !field.isNewColumn && !field.isAnnotationField);
    setOrderedMetadataFields(metadataFields);
    
    // Debounce backend save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fieldSelectionAPI.saveDatasetFieldConfig({
          datasetId,
          annotationFields: updatedFields,
          annotationLabels: annotationConfig.annotationLabels || [],
          newColumns: datasetNewColumns || [],
          fieldGroups: updatedGroups !== undefined ? updatedGroups : (annotationConfig.fieldGroups || []),
        });
        showToast({
          type: 'success',
          title: 'Auto-saved',
          description: 'Field configuration updated successfully.'
        });
      } catch (error) {
        console.error('Failed to save updated field configuration:', error);
        showToast({
          type: 'error',
          title: 'Save Failed',
          description: 'Failed to auto-save field configuration changes.'
        });
      }
    }, 800);
  }, [annotationConfig, datasetId, datasetNewColumns, showToast]);

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

  // Individual field save handler for CSV row data
  const handleSaveIndividualField = useCallback(async (fieldName: string, fieldValue: string) => {
    if (!csvImportId || !currentTask) return;
    
    setIsSaving(true);
    try {
      const fieldData = { [fieldName]: fieldValue };

      const response = await CSVImportsAPI.patchCSVRowData(
        csvImportId,
        currentTask.rowIndex,
        fieldData
      );

      if (response.success && response.data) {
        // Update local CSV import data
        if (csvImport && csvImport.rowData) {
          const updatedRow = csvImport.rowData.find(row => row.rowIndex === currentTask.rowIndex);
          if (updatedRow) {
            updatedRow.data[fieldName] = fieldValue;
            updatedRow.processed = true;
            setCsvImport({ ...csvImport });
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
  }, [csvImportId, currentTask, csvImport, showToast]);

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
  const openAudioOverlay = (audioUrls: string[], startIndex: number = 0) => {
    setAudioOverlay({
      isOpen: true,
      audioUrl: audioUrls[startIndex] || '',
      audioUrls,
      currentIndex: startIndex,
    });
  };

  const closeAudioOverlay = () => {
    setAudioOverlay({
      isOpen: false,
      audioUrl: '',
      audioUrls: [],
      currentIndex: 0,
    });
  };

  const navigateAudio = (direction: 'prev' | 'next') => {
    const { audioUrls, currentIndex } = audioOverlay;
    let newIndex = currentIndex;
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < audioUrls.length - 1) {
      newIndex = currentIndex + 1;
    }
    setAudioOverlay(prev => ({
      ...prev,
      currentIndex: newIndex,
      audioUrl: audioUrls[newIndex] || '',
    }));
  };

  // Video overlay handlers
  const openVideoOverlay = (videoUrls: string[], startIndex: number = 0) => {
    setVideoOverlay({
      isOpen: true,
      videoUrl: videoUrls[startIndex] || '',
      videoUrls,
      currentIndex: startIndex,
    });
  };

  const closeVideoOverlay = () => {
    setVideoOverlay({
      isOpen: false,
      videoUrl: '',
      videoUrls: [],
      currentIndex: 0,
    });
  };

  const navigateVideo = (direction: 'prev' | 'next') => {
    const { videoUrls, currentIndex } = videoOverlay;
    let newIndex = currentIndex;
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < videoUrls.length - 1) {
      newIndex = currentIndex + 1;
    }
    setVideoOverlay(prev => ({
      ...prev,
      currentIndex: newIndex,
      videoUrl: videoUrls[newIndex] || '',
    }));
  };

  // Save all new column data function
  const saveAllNewColumnData = useCallback(async () => {
    if (!csvImportId || !currentTask) return;

    const annotationFields = annotationConfig?.annotationFields.filter(
      (field) => field.isNewColumn || field.isAnnotationField
    ) || [];

    const dataToSave: Record<string, any> = {};
    let hasActualData = false;

    // Collect only fields that have actual data
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
        response = await CSVImportsAPI.patchCSVRowData(
          csvImportId,
          currentTask.rowIndex,
          dataToSave
        );

        if (response.success && response.data) {
          // Update local CSV import data
          if (csvImport && csvImport.rowData) {
            const updatedRow = csvImport.rowData.find(row => row.rowIndex === currentTask.rowIndex);
            if (updatedRow) {
              Object.entries(dataToSave).forEach(([fieldName, value]) => {
                updatedRow.data[fieldName] = value;
              });
              updatedRow.processed = true;
              setCsvImport({ ...csvImport });
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
        await CSVImportsAPI.markRowCompleted(csvImportId, currentTask.rowIndex);
        
        // Update progress tracking
        const completedCount = tasks.filter(t => t.status === 'completed' || t.rowIndex === currentTask.rowIndex).length;
        await CSVImportsAPI.updateAnnotationProgress(csvImportId, currentTask.rowIndex, completedCount);
        
        console.log(`Row ${currentTask.rowIndex} marked as completed and saved to backend`);
      } catch (completionError) {
        console.error('Error marking row as completed in backend:', completionError);
        // Don't show error toast for completion failure, as the main action (save data) succeeded
      }

      setLastSavedTime(new Date());
      setPendingChanges({});
      
      // Check if this is the last row
      const isLastRow = currentTaskIndex >= tasks.length - 1;

      // Show appropriate toast message based on whether data was saved and if it's the last row
      if (hasActualData && response?.success) {
        showToast({
          type: 'success',
          title: 'Data Saved & Row Completed',
          description: isLastRow 
            ? `Successfully saved ${response.updatedFields} field(s). All rows completed!`
            : `Successfully saved ${response.updatedFields} field(s). Moving to next row...`,
        });
      } else {
        showToast({
          type: 'success',
          title: 'Row Marked as Complete',
          description: isLastRow 
            ? 'Row completed. All rows are now complete!'
            : 'Row completed. Moving to next row...',
        });
      }

      // Auto-navigate to next row after successful save (only if not last row)
      if (!isLastRow) {
        setTimeout(() => {
          navigateTask('next');
        }, 1000); // Small delay to let user see the success message
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
  }, [csvImportId, currentTask, csvImport, newColumnData, annotationConfig, showToast]);

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
      annotations,
      newColumnData: { ...newColumnData, [fieldName]: value },
    });
  }, [metadata, annotations, newColumnData, addToHistory]);

  // Field configuration update methods
  const updateAnnotationFieldConfig = useCallback(async (
    fieldIndex: number, 
    updates: Partial<AnnotationField>
  ) => {
    if (!annotationConfig || !csvImportId) return;

    try {
      setIsSaving(true);

      // Optimistic update - update local state immediately
      const updatedFields = [...annotationConfig.annotationFields];
      updatedFields[fieldIndex] = {
        ...updatedFields[fieldIndex],
        ...updates
      };

      setAnnotationConfig(prev => prev ? {
        ...prev,
        annotationFields: updatedFields
      } : null);

      // Send PATCH request to backend
      const patchData: PatchAnnotationConfigRequest = {
        annotationFields: [updates as AnnotationField]
      };

      const response = await CSVImportsAPI.patchAnnotationField(
        csvImportId,
        fieldIndex,
        patchData
      );

      console.log('Field configuration updated:', response);

      if (response.success) {
        console.log(`Updated ${response.updatedFields} field properties:`, response.changedFields);
      }

    } catch (error) {
      console.error('Error updating field configuration:', error);
      setError('Failed to update field configuration');
      
      // Revert optimistic update on error
      if (annotationConfig) {
        setAnnotationConfig(prev => prev);
      }
    } finally {
      setIsSaving(false);
    }
  }, [annotationConfig, csvImportId]);

  // Annotation configuration update method
  const updateAnnotationConfig = useCallback(async (updates: PatchAnnotationConfigRequest) => {
    if (!csvImportId || !annotationConfig) return;

    try {
      setIsSaving(true);

      // Optimistic update
      setAnnotationConfig(prev => prev ? {
        ...prev,
        ...updates
      } : null);

      // Send PATCH request
      const response = await CSVImportsAPI.patchAnnotationConfig(csvImportId, updates);

      console.log('Annotation configuration updated:', response);

      if (response.success && response.data) {
        // Update with server response
        setAnnotationConfig(response.data);
        console.log(`Updated ${response.updatedFields} configuration fields:`, response.changedFields);
      }

    } catch (error) {
      console.error('Error updating annotation configuration:', error);
      setError('Failed to update annotation configuration');
      
      // Revert optimistic update on error
      if (annotationConfig) {
        setAnnotationConfig(prev => prev);
      }
    } finally {
      setIsSaving(false);
    }
  }, [csvImportId, annotationConfig]);

  // Navigation handler
  const handleNavigateBack = useCallback(() => {
    router.push(`/dataset/${datasetId}`);
  }, [router, datasetId]);


  // Mark row as completed with backend persistence
  const handleMarkAsCompleted = useCallback(async (rowIndex: number) => {
    if (!csvImportId) return;
    
    try {
      // Update local state immediately
      setTasks(prev => prev.map(task => 
        task.rowIndex === rowIndex 
          ? { ...task, status: 'completed' as const, updatedAt: new Date() }
          : task
      ));
      
      // Save to backend
      await CSVImportsAPI.markRowCompleted(csvImportId, rowIndex);
      
      // Update progress tracking
      const completedCount = tasks.filter(t => t.status === 'completed' || t.rowIndex === rowIndex).length;
      await CSVImportsAPI.updateAnnotationProgress(csvImportId, rowIndex, completedCount);
      
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
  }, [csvImportId, tasks, showToast]);

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


  // Load new column data when task changes
  useEffect(() => {
    if (!currentTask || !annotationConfig) return;

    const annotationFields = annotationConfig.annotationFields;

    // Load existing data for this row from CSV row data
    const loadRowData = async () => {
      try {
        // Load annotations from the annotations collection
        const rowAnnotations = await AnnotationsAPI.findByCSVRow(
          csvImportId,
          currentTask.rowIndex,
        );
        setAnnotations(rowAnnotations);

        // Load new column data from CSV row data (where we actually save it)
        const newColumnData: NewColumnData = {};
        annotationFields.forEach((field) => {
          // Check if the field data exists in the current task's metadata (CSV row data)
          const fieldValue = currentTask.metadata?.[field.fieldName];
          newColumnData[field.fieldName] = fieldValue || '';
        });

        setNewColumnData(newColumnData);
        console.log('Loaded new column data from CSV row:', newColumnData);
      } catch (err) {
        console.error('Error loading row data:', err);
      }
    };

    loadRowData();
  }, [currentTask, csvImportId, annotationConfig]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading annotation data...</p>
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
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Metadata Display */}
        <MetadataDisplay
          metadata={{ ...metadata, rowIndex: currentTask?.rowIndex }}
          orderedMetadataFields={orderedMetadataFields}
          linkedFieldNames={new Set(annotationConfig?.annotationFields.filter(f => f.isDataFieldLink).map(f => f.sourceCsvColumnName || f.csvColumnName) ?? [])}
          draggedField={draggedField}
          editingField={editingField}
          expandedTextFields={expandedTextFields}
          imageOverlay={imageOverlay}
          audioOverlay={audioOverlay}
          videoOverlay={videoOverlay}
          onMetadataChange={setMetadata}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={(e, targetFieldName) => handleUnifiedDrop(e, targetFieldName, 'metadata')}
          onEditField={handleEditField}
          onSaveField={handleSaveField}
          onSaveIndividualField={handleSaveIndividualField}
          onCancelEdit={handleCancelEdit}
          onToggleTextExpansion={toggleTextExpansion}
          onOpenImageOverlay={openImageOverlay}
          onOpenAudioOverlay={openAudioOverlay}
          onOpenVideoOverlay={openVideoOverlay}
          onNavigateBack={handleNavigateBack}
          onPanelDragOver={handleDragOver}
          onDropFromAnnotation={() => handleUnifiedDrop(null, '', 'metadata')}
        />

        {/* Right Panel: New Column Data Entry */}
        <NewColumnDataPanel
          annotationConfig={annotationConfig}
          newColumnData={newColumnData}
          onNewColumnChange={handleNewColumnChange}
          onSaveAllNewColumnData={saveAllNewColumnData}
          onExportSelectedColumns={exportSelectedColumnsToCSV}
          onExportAllColumns={exportAllColumnsToCSV}
          isSaving={isSaving}
          completedCount={annotatedTasks.length}
          pendingCount={unannotatedTasks.length}
          currentRowIndex={currentTask?.rowIndex}
          onPanelDragOver={handleDragOver}
          onDropFromMetadata={() => handleUnifiedDrop(null, '', 'annotation')}
          draggedField={draggedField}
          onAnnotationFieldDragStart={handleDragStart}
          onAnnotationFieldDragOver={handleDragOver}
          onAnnotationFieldDrop={(e, targetFieldName) => handleUnifiedDrop(e, targetFieldName, 'annotation')}
          onUpdateFieldConfig={handleUpdateFieldConfig}
          isAdmin={user?.role?.toUpperCase() === 'ADMIN'}
          cloneId={datasetId}
          currentRowId={currentTask?._id}
        />
              </div>

      {/* Fixed Footer: Row Navigation */}
      <RowFooter
        tasks={tasks}
        currentTaskIndex={currentTaskIndex}
        onNavigateTask={navigateTask}
        onJumpToRow={jumpToRow}
        onMarkAsCompleted={handleMarkAsCompleted}
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
        audioUrls={audioOverlay.audioUrls}
        currentIndex={audioOverlay.currentIndex}
        onClose={closeAudioOverlay}
        onNavigate={navigateAudio}
      />

      {/* Video Overlay */}
      <VideoOverlay
        isOpen={videoOverlay.isOpen}
        videoUrl={videoOverlay.videoUrl}
        videoUrls={videoOverlay.videoUrls}
        currentIndex={videoOverlay.currentIndex}
        onClose={closeVideoOverlay}
        onNavigate={navigateVideo}
      />
    </div>
  );
}
