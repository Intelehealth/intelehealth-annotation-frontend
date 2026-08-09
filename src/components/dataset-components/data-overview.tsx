'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ExportDropdown, ExportOption } from '@/components/ui/export-dropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CloneGroup } from '@/types/feature1';
import {
  Upload,
  Database,
  FileText,
  Image as ImageIcon,
  Calendar,
  BarChart3,
  Loader2,
  RefreshCw,
  AlertCircle,
  Settings,
  Play,
  Download,
  ChevronDown,
  Users,
  Scale,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CSVImport, CSVImportsAPI } from '@/lib/api/csv-imports';
import { DatasetMergedRowsAPI, AnnotationProgress } from '@/lib/api/dataset-merged-rows';
import { fieldSelectionAPI } from '@/lib/api/field-config';
import { datasetsAPI } from '@/lib/api/datasets';
import { processingAPI, DocumentAssetResponse } from '@/lib/api/processing';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast';
import { exportSelectedColumnsToCSV, exportAllColumnsToCSV } from '@/lib/dataset-export-helper';

interface DataOverviewProps {
  datasetId: string;
  onNavigateToUpload?: () => void;
  onNavigateToFieldConfig?: () => void;
  className?: string;
}

export function DataOverview({
  datasetId,
  onNavigateToUpload,
  onNavigateToFieldConfig,
  className,
}: DataOverviewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [csvImports, setCsvImports] = useState<CSVImport[]>([]);
  const [documents, setDocuments] = useState<DocumentAssetResponse[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFieldConfig, setHasFieldConfig] = useState<boolean | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [hasMergedRows, setHasMergedRows] = useState<boolean | null>(null);
  const [checkingMergedRows, setCheckingMergedRows] = useState(false);
  const [annotationProgress, setAnnotationProgress] = useState<AnnotationProgress | null>(null);
  const [checkingAnnotationProgress, setCheckingAnnotationProgress] = useState(false);
  const [datasetData, setDatasetData] = useState<any>(null);
  const [annotationConfig, setAnnotationConfig] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState<{ name: string; description: string } | null>(null);
  const { showToast } = useToast();

  // ── Consensus clone panel state ────────────────────────────────────────────
  const [cloneGroup, setCloneGroup] = useState<CloneGroup | null>(null);
  const [loadingCloneGroup, setLoadingCloneGroup] = useState(false);

  useEffect(() => {
    loadCSVImports();
    loadDocuments();
    checkFieldConfiguration();
    checkMergedRows();
    checkAnnotationProgress();
    loadDatasetData();
    loadDatasetInfo();
    loadCloneGroup();
  }, [datasetId]);

  // Load clone group (annotators assigned to this dataset)
  const loadCloneGroup = async () => {
    if (!datasetId) return;
    try {
      setLoadingCloneGroup(true);
      const group = await datasetsAPI.getCloneGroup(datasetId);
      // Only show if there are actual clones
      setCloneGroup(group?.totalClones > 0 ? group : null);
    } catch {
      // Dataset may not be a parent — that's fine, just hide the panel
      setCloneGroup(null);
    } finally {
      setLoadingCloneGroup(false);
    }
  };

  const loadCSVImports = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading CSV imports for dataset:', datasetId);

      const data = await CSVImportsAPI.getByDataset(datasetId);
      console.log('CSV imports loaded:', data);
      setCsvImports(data);
    } catch (err) {
      console.error('Error loading CSV imports:', err);
      setError('Failed to load CSV imports');
    } finally {
      setLoading(false);
    }
  };

  // Load document-based sources (images, PDFs, office docs, links, generic).
  // These are the backing data for non-CSV datasets and must be treated as
  // "uploaded data" so the overview never shows an empty state for them.
  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const data = await processingAPI.listDocuments(datasetId);
      console.log('Document sources loaded:', data);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading document sources:', err);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const checkFieldConfiguration = async () => {
    try {
      setCheckingConfig(true);
      console.log('Checking field configuration for dataset:', datasetId);
      const result = await fieldSelectionAPI.checkDatasetFieldConfig(datasetId);
      console.log('Field configuration check result:', result);
      setHasFieldConfig(result.hasConfig);
    } catch (err: any) {
      console.error('Error checking field configuration:', err);
      setHasFieldConfig(false);
    } finally {
      setCheckingConfig(false);
    }
  };

  const checkMergedRows = async () => {
    try {
      setCheckingMergedRows(true);
      console.log('Checking merged rows for dataset:', datasetId);
      const hasRows = await DatasetMergedRowsAPI.hasMergedRows(datasetId);
      console.log('Merged rows check result:', hasRows);
      setHasMergedRows(hasRows);
    } catch (err: any) {
      console.error('Error checking merged rows:', err);
      setHasMergedRows(false);
    } finally {
      setCheckingMergedRows(false);
    }
  };

  const checkAnnotationProgress = async () => {
    try {
      setCheckingAnnotationProgress(true);
      console.log('Checking annotation progress for dataset:', datasetId);
      const progress = await DatasetMergedRowsAPI.getAnnotationProgress(datasetId);
      console.log('Annotation progress result:', progress);
      setAnnotationProgress(progress);
    } catch (err: any) {
      console.error('Error checking annotation progress:', err);
      setAnnotationProgress(null);
    } finally {
      setCheckingAnnotationProgress(false);
    }
  };

  const loadDatasetData = async () => {
    try {
      console.log('Loading dataset data for export functionality...');
      const mergedData = await DatasetMergedRowsAPI.getDatasetData(datasetId);
      console.log('Dataset data loaded:', mergedData);
      setDatasetData(mergedData);

      // Load annotation config
      const config = await fieldSelectionAPI.getDatasetFieldConfig(datasetId);
      console.log('Annotation config loaded:', config);
      setAnnotationConfig(config);
    } catch (err: any) {
      console.error('Error loading dataset data:', err);
      setDatasetData(null);
      setAnnotationConfig(null);
    }
  };

  const loadDatasetInfo = async () => {
    try {
      console.log('Loading dataset info for header...');
      const dataset = await datasetsAPI.getById(datasetId);
      console.log('Dataset info loaded:', dataset);
      setDatasetInfo({
        name: dataset.name,
        description: dataset.description || ''
      });
    } catch (err: any) {
      console.error('Error loading dataset info:', err);
      setDatasetInfo(null);
    }
  };


  const refreshFieldConfiguration = () => {
    checkFieldConfiguration();
  };

  // Listen for field configuration saved events
  useEffect(() => {
    const handleFieldConfigSaved = (event: CustomEvent) => {
      // Only refresh if the event is for this dataset
      if (event.detail?.datasetId === datasetId) {
        console.log(
          'Field config saved event received for dataset:',
          datasetId,
        );
        refreshFieldConfiguration();
      }
    };

    window.addEventListener(
      'fieldConfigSaved',
      handleFieldConfigSaved as EventListener,
    );
    return () => {
      window.removeEventListener(
        'fieldConfigSaved',
        handleFieldConfigSaved as EventListener,
      );
    };
  }, [datasetId]);


  const handleStartDatasetAnnotation = async () => {
    // Always redirect to dataset annotation workbench
    router.push(`/dataset/${datasetId}/annotation`);
  };

  const handleExportSelectedColumns = useCallback(async () => {
    if (!datasetData || !annotationConfig) {
      console.log('Cannot export: missing dataset data or annotation config');
      return;
    }

    setIsExporting(true);
    try {
      await exportSelectedColumnsToCSV(
        datasetData,
        {
          annotationFields: annotationConfig.annotationFields.map((field: any) => ({
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
            showToast({
              type: 'error',
              title: 'Export Failed',
              description: 'Failed to export CSV file',
            });
          },
        }
      );
    } catch (error) {
      console.error('Export error:', error);
      showToast({
        type: 'error',
        title: 'Export Failed',
        description: 'Failed to export CSV file',
      });
    } finally {
      setIsExporting(false);
    }
  }, [datasetData, annotationConfig, showToast, datasetId]);

  const handleExportAllColumns = useCallback(async () => {
    if (!datasetData || !annotationConfig) {
      console.log('Cannot export: missing dataset data or annotation config');
      return;
    }

    setIsExporting(true);
    try {
      await exportAllColumnsToCSV(
        datasetData,
        {
          annotationFields: annotationConfig.annotationFields.map((field: any) => ({
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
            showToast({
              type: 'error',
              title: 'Export Failed',
              description: 'Failed to export CSV file',
            });
          },
        }
      );
    } catch (error) {
      console.error('Export error:', error);
      showToast({
        type: 'error',
        title: 'Export Failed',
        description: 'Failed to export CSV file',
      });
    } finally {
      setIsExporting(false);
    }
  }, [datasetData, annotationConfig, showToast, datasetId]);

  // Export options for the dropdown
  const exportOptions: ExportOption[] = [
    {
      id: 'selected',
      label: 'Selected Columns',
      description: 'Export only configured metadata and annotation fields',
      action: handleExportSelectedColumns,
    },
    {
      id: 'all',
      label: 'All Columns',
      description: 'Export all original CSV columns plus annotation fields',
      action: handleExportAllColumns,
    },
  ];


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // A dataset has real uploaded data if it has CSV imports, document-based
  // sources (images, PDFs, office, links, generic), and/or merged annotation rows.
  const hasUploadedData =
    csvImports.length > 0 ||
    documents.length > 0 ||
    hasMergedRows === true;

  // Don't flash an empty state while we're still discovering whether data exists.
  const stillAssessing =
    loading ||
    documentsLoading ||
    checkingMergedRows ||
    hasMergedRows === null;

  // Initial View (No Uploaded Data)
  if (!stillAssessing && !hasUploadedData) {
    return (
      <div className={cn('space-y-6 overflow-x-hidden', className)}>
        {/* Header with Upload and Configure Fields Buttons */}
        <div className="flex flex-col md:flex-row items-start gap-4 md:items-center md:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">
              {datasetInfo?.name || 'Data Overview'}
            </h1>
            <p className="text-gray-600 mt-1">
              {'Data Overview - Manage and monitor your uploaded data files'}
            </p>
          </div>
          <div className="flex flex-row items-center gap-2 w-full min-w-0 flex-nowrap md:flex-wrap md:gap-3 md:w-auto">
            <Button
              onClick={onNavigateToFieldConfig}
              className="flex-1 min-w-0 h-[44px] px-2 rounded-lg bg-[#1a56db] hover:bg-[#1a56db] text-white md:w-auto md:flex-initial md:h-9 md:px-4 md:rounded-md md:bg-blue-600 md:hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-sm">Configure Fields</span>
            </Button>
            <div className="flex-1 min-w-0 md:w-auto md:flex-none">
              <ExportDropdown
                options={exportOptions}
                disabled={!hasFieldConfig || !annotationProgress || annotationProgress.completedRows === 0 || isExporting}
              />
            </div>
            <Button
              onClick={handleStartDatasetAnnotation}
              disabled={!hasFieldConfig || checkingConfig || checkingAnnotationProgress}
              className="flex-1 min-w-0 h-[44px] px-2 rounded-lg bg-[#16a34a] hover:bg-[#16a34a] text-white disabled:bg-gray-400 disabled:cursor-not-allowed md:w-auto md:flex-initial md:h-9 md:px-4 md:rounded-md md:bg-green-600 md:hover:bg-green-700"
            >
              {checkingConfig || checkingAnnotationProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {checkingConfig ? 'Checking Config...' : 'Checking Progress...'}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-sm">{annotationProgress && annotationProgress.completedRows > 0 ? 'Resume Annotation' : 'Start Annotation'}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Database className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Data Uploaded Yet
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Get started by uploading your CSV files or other data formats to
              begin the annotation process.
            </p>
            <Button onClick={onNavigateToUpload} size="lg" className="bg-black hover:bg-gray-800 text-white">
              <Upload className="h-5 w-5 mr-2" />
              Upload Your First File
            </Button>
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">
                  1. Upload Data
                </h4>
                <p className="text-sm text-gray-600">
                  Upload CSV files or other supported formats
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">
                  2. Configure Fields
                </h4>
                <p className="text-sm text-gray-600">
                  Set up annotation fields and data mapping
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">
                  3. Start Annotating
                </h4>
                <p className="text-sm text-gray-600">
                  Begin the annotation process
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading State
  if (stillAssessing) {
    return (
      <div className={cn('space-y-6 overflow-x-hidden', className)}>
        <div className="flex flex-col md:flex-row items-start gap-4 md:items-center md:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">
              {datasetInfo?.name || 'Data Overview'}
            </h1>
            <p className="text-gray-600 mt-1">
              {'Data Overview - Manage and monitor your uploaded data files'}
            </p>
          </div>
          <div className="flex flex-row items-center gap-2 w-full min-w-0 flex-nowrap md:flex-wrap md:gap-3 md:w-auto">
            <Button
              onClick={onNavigateToFieldConfig}
              className="flex-1 min-w-0 h-[44px] px-2 rounded-lg bg-[#1a56db] hover:bg-[#1a56db] text-white md:w-auto md:flex-initial md:h-9 md:px-4 md:rounded-md md:bg-blue-600 md:hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-sm">Configure Fields</span>
            </Button>
            <div className="flex-1 min-w-0 md:w-auto md:flex-none">
              <ExportDropdown
                options={exportOptions}
                disabled={!hasFieldConfig || !annotationProgress || annotationProgress.completedRows === 0 || isExporting}
              />
            </div>
            <Button
              onClick={handleStartDatasetAnnotation}
              disabled={!hasFieldConfig || checkingConfig || checkingAnnotationProgress}
              className="flex-1 min-w-0 h-[44px] px-2 rounded-lg bg-[#16a34a] hover:bg-[#16a34a] text-white disabled:bg-gray-400 disabled:cursor-not-allowed md:w-auto md:flex-initial md:h-9 md:px-4 md:rounded-md md:bg-green-600 md:hover:bg-green-700"
            >
              {checkingConfig || checkingAnnotationProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {checkingConfig ? 'Checking Config...' : 'Checking Progress...'}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-sm">{annotationProgress && annotationProgress.completedRows > 0 ? 'Resume Annotation' : 'Start Annotation'}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading data...</span>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={cn('space-y-6 overflow-x-hidden', className)}>
        <div className="flex flex-col md:flex-row items-start gap-4 md:items-center md:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">
              {datasetInfo?.name || 'Data Overview'}
            </h1>
            <p className="text-gray-600 mt-1">
              {'Data Overview - Manage and monitor your uploaded data files'}
            </p>
          </div>
          <div className="flex flex-row items-center gap-2 w-full min-w-0 flex-nowrap md:flex-wrap md:gap-3 md:w-auto">
            <Button
              onClick={onNavigateToFieldConfig}
              className="flex-1 min-w-0 h-[44px] px-2 rounded-lg bg-[#1a56db] hover:bg-[#1a56db] text-white md:w-auto md:flex-initial md:h-9 md:px-4 md:rounded-md md:bg-blue-600 md:hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-sm">Configure Fields</span>
            </Button>
            <div className="flex-1 min-w-0 md:w-auto md:flex-none">
              <ExportDropdown
                options={exportOptions}
                disabled={!hasFieldConfig || !annotationProgress || annotationProgress.completedRows === 0 || isExporting}
              />
            </div>
            <Button
              onClick={handleStartDatasetAnnotation}
              disabled={!hasFieldConfig || checkingConfig || checkingAnnotationProgress}
              className="flex-1 min-w-0 h-[44px] px-2 rounded-lg bg-[#16a34a] hover:bg-[#16a34a] text-white disabled:bg-gray-400 disabled:cursor-not-allowed md:w-auto md:flex-initial md:h-9 md:px-4 md:rounded-md md:bg-green-600 md:hover:bg-green-700"
            >
              {checkingConfig || checkingAnnotationProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {checkingConfig ? 'Checking Config...' : 'Checking Progress...'}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-sm">{annotationProgress && annotationProgress.completedRows > 0 ? 'Resume Annotation' : 'Start Annotation'}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">
                Failed to Load Data
              </h3>
              <p className="text-red-700 mb-4">{error}</p>
              <Button
                onClick={loadCSVImports}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // View with Existing Data
  return (
    <div className={cn('space-y-6 overflow-x-hidden', className)}>
      {/* Header */}
        <div className="flex flex-col md:flex-row items-start gap-4 md:items-center md:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">
              {datasetInfo?.name || 'Data Overview'}
            </h1>
            <p className="text-gray-600 mt-1">
              {"Data Overview - Manage and monitor your uploaded data files"}
            </p>
          </div>
          <div className="flex flex-row items-center gap-2 w-full min-w-0 flex-nowrap md:flex-wrap md:gap-3 md:w-auto">
          <Button
            onClick={onNavigateToFieldConfig}
            className="flex-1 min-w-0 h-[44px] px-2 rounded-lg bg-[#1a56db] hover:bg-[#1a56db] text-white border-blue-600 md:w-auto md:flex-initial md:h-9 md:px-4 md:rounded-md md:bg-blue-600 md:hover:bg-blue-700"
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-sm">Configure Fields</span>
          </Button>
          <div className="flex-1 min-w-0 md:w-auto md:flex-none">
            <ExportDropdown
              options={exportOptions}
              disabled={!hasFieldConfig || !annotationProgress || annotationProgress.completedRows === 0 || isExporting}
            />
          </div>
          <Button
            onClick={handleStartDatasetAnnotation}
            disabled={!hasFieldConfig || checkingConfig || checkingAnnotationProgress}
            className="flex-1 min-w-0 h-[44px] px-2 rounded-lg bg-[#16a34a] hover:bg-[#16a34a] text-white disabled:bg-gray-400 disabled:cursor-not-allowed md:w-auto md:flex-initial md:h-9 md:px-4 md:rounded-md md:bg-green-600 md:hover:bg-green-700"
          >
            {checkingConfig || checkingAnnotationProgress ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {checkingConfig ? 'Checking Config...' : 'Checking Progress...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 flex-shrink-0" />
                <span className="truncate text-sm">{annotationProgress && annotationProgress.completedRows > 0 ? 'Resume Annotation' : 'Start Annotation'}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* CSV Imports List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
            <CardTitle className="flex items-center gap-2 min-w-0">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
              Uploaded Files
            </CardTitle>
            <Button
              onClick={onNavigateToUpload}
              className="mt-3 sm:mt-0 w-full md:w-auto justify-center flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
            >
              <Upload className="h-4 w-4" />
              Upload Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
<div className="space-y-6">
            {/* CSV / Excel imports */}
            {csvImports.length === 0 ? null : (
              <div className="space-y-4">
                {csvImports.map((csvImport) => (
                  <div
                    key={csvImport._id}
                    className="w-full min-w-0 flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 break-all">
                          {csvImport.originalFileName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 min-w-0">
                          <span>{csvImport.totalRows} rows</span>
                          <span>•</span>
                          <span>
                            {csvImport.metadata?.totalColumns || 0} columns
                          </span>
                          <span>•</span>
                          <span>{formatFileSize(csvImport.fileSize)}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Uploaded {formatDate(csvImport.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Document-based sources (images, PDFs, office, links, generic) */}
            {documents.length === 0 ? null : (
              <div className="space-y-4">
                {documents.map((document) => (
                  <div
                    key={document._id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {document.originalFileName}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{document.fileType}</span>
                          <span>•</span>
                          <span>{formatFileSize(document.fileSize)}</span>
                          <span>•</span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                              document.status === 'COMPLETED'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200',
                            )}
                          >
                            {document.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Uploaded {formatDate(document.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Configure Fields Button - Centered - Only show when fields are not configured */}
          {!hasFieldConfig && (
            <div className="flex justify-center pt-6 border-t border-gray-100">
              <div className="text-center space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    Ready to Start Annotating?
                  </h4>
                  <p className="text-xs text-gray-600 mb-3">
                    Configure your annotation fields first
                  </p>
                </div>
                <div className="flex justify-center">
                  <Button
                    onClick={onNavigateToFieldConfig}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Settings className="h-4 w-4" />
                    Configure Fields
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Consensus Annotation Panel (admin only, visible when clones exist) ─ */}
      {user?.role?.toUpperCase() === 'ADMIN' && (cloneGroup || loadingCloneGroup) && (
        <Card className="shadow-sm border-indigo-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-indigo-600" />
                Consensus Annotation
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadCloneGroup}
                disabled={loadingCloneGroup}
                className="text-gray-400 h-7 w-7 p-0"
                title="Refresh progress"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loadingCloneGroup && 'animate-spin')} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCloneGroup ? (
              <div className="flex items-center gap-2 py-4 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading annotator progress…</span>
              </div>
            ) : cloneGroup ? (
              <div className="space-y-4">
                {/* Per-annotator progress rows */}
                <div className="space-y-3">
                  {(cloneGroup.clones).map((clone) => {
                    const total: number = clone.progress?.totalRows ?? 0;
                    const completed: number = clone.progress?.completedRows ?? 0;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const isDone = total > 0 && completed >= total;
                    const annotatorName =
                      clone.annotator
                        ? `${clone.annotator.firstName ?? ''} ${clone.annotator.lastName ?? ''}`.trim() || clone.annotator.email
                        : `Annotator ${clone.cloneIndex ?? '?'}`;

                    return (
                      <div key={clone._id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5">
                            {isDone
                              ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              : <Clock className="h-3.5 w-3.5 text-amber-400" />
                            }
                            <span className="font-medium text-gray-800">{annotatorName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-xs font-semibold', isDone ? 'text-green-600' : 'text-gray-500')}>
                              {completed} / {total} rows &nbsp;{pct}%
                            </span>
                            <button
                              onClick={() => router.push(`/dataset/${clone._id}/annotation?mode=inspect&returnTo=/dataset/${datasetId}?tab=overview`)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('accessToken');
                                  const res = await fetch(`/api/clones/${clone._id}/export`, {
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  const blob = await res.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${annotatorName.replace(/\s+/g, '_')}_clone.csv`;
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                } catch {
                                  // Fallback: direct download
                                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                                  window.open(`${apiUrl}/clones/${clone._id}/export?token=${localStorage.getItem('accessToken')}`, '_blank');
                                }
                              }}
                              className="text-xs text-gray-500 hover:text-gray-700 font-medium hover:underline"
                            >
                              CSV
                            </button>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              isDone ? 'bg-green-500' : 'bg-indigo-400'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Status summary + action buttons — always visible when clones exist */}
                {(() => {
                  const clones = cloneGroup.clones;
                  return (
                    <div className="flex pt-2 border-t border-gray-100">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/dataset/${datasetId}/consensus`)}
                        className="text-sm border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        <Scale className="h-4 w-4 mr-1.5" />
                        Review Consensus
                      </Button>
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
