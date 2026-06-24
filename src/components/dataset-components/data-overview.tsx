'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ExportDropdown, ExportOption } from '@/components/ui/export-dropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  Database,
  FileText,
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
  Wand2,
  Scale,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CSVImport, CSVImportsAPI } from '@/lib/api/csv-imports';
import { DatasetMergedRowsAPI, AnnotationProgress } from '@/lib/api/dataset-merged-rows';
import { fieldSelectionAPI } from '@/lib/api/field-config';
import { datasetsAPI } from '@/lib/api/datasets';
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
  const [cloneGroup, setCloneGroup] = useState<any | null>(null);
  const [loadingCloneGroup, setLoadingCloneGroup] = useState(false);
  const [isGeneratingConsensus, setIsGeneratingConsensus] = useState(false);

  useEffect(() => {
    loadCSVImports();
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

  // Generate consensus — called from clone panel button
  const handleGenerateConsensus = async () => {
    if (!datasetId) return;
    try {
      setIsGeneratingConsensus(true);
      const result = await datasetsAPI.generateConsensus(datasetId);
      showToast({
        title: 'Consensus generated!',
        description: `${result.reviewsCreated} rows compared. Redirecting to review…`,
        type: 'success',
      });
      // Navigate to the consensus review page
      router.push(`/dataset/${datasetId}/consensus`);
    } catch (err: any) {
      const msg: string =
        err?.response?.data?.message ||
        err?.message ||
        'Could not generate consensus.';
      showToast({
        title: 'Cannot generate consensus',
        description: msg,
        type: 'error',
      });
    } finally {
      setIsGeneratingConsensus(false);
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

  // Initial View (No Uploaded Data)
  if (!loading && csvImports.length === 0) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Header with Upload and Configure Fields Buttons */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {datasetInfo?.name || 'Data Overview'}
            </h1>
            <p className="text-gray-600 mt-1">
              {'Data Overview - Manage and monitor your uploaded data files'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onNavigateToFieldConfig}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Settings className="h-4 w-4" />
              Configure Fields
            </Button>
            <ExportDropdown
              options={exportOptions}
              disabled={!hasFieldConfig || !annotationProgress || annotationProgress.completedRows === 0 || isExporting}
            />
            <Button
              onClick={handleStartDatasetAnnotation}
              disabled={!hasFieldConfig || checkingConfig || checkingAnnotationProgress}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {checkingConfig || checkingAnnotationProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {checkingConfig ? 'Checking Config...' : 'Checking Progress...'}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {annotationProgress && annotationProgress.completedRows > 0 ? 'Resume Annotation' : 'Start Annotation'}
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
  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {datasetInfo?.name || 'Data Overview'}
            </h1>
            <p className="text-gray-600 mt-1">
              {'Data Overview - Manage and monitor your uploaded data files'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onNavigateToFieldConfig}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Settings className="h-4 w-4" />
              Configure Fields
            </Button>
            <ExportDropdown
              options={exportOptions}
              disabled={!hasFieldConfig || !annotationProgress || annotationProgress.completedRows === 0 || isExporting}
            />
            <Button
              onClick={handleStartDatasetAnnotation}
              disabled={!hasFieldConfig || checkingConfig || checkingAnnotationProgress}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {checkingConfig || checkingAnnotationProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {checkingConfig ? 'Checking Config...' : 'Checking Progress...'}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {annotationProgress && annotationProgress.completedRows > 0 ? 'Resume Annotation' : 'Start Annotation'}
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
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {datasetInfo?.name || 'Data Overview'}
            </h1>
            <p className="text-gray-600 mt-1">
              {'Data Overview - Manage and monitor your uploaded data files'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onNavigateToFieldConfig}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Settings className="h-4 w-4" />
              Configure Fields
            </Button>
            <ExportDropdown
              options={exportOptions}
              disabled={!hasFieldConfig || !annotationProgress || annotationProgress.completedRows === 0 || isExporting}
            />
            <Button
              onClick={handleStartDatasetAnnotation}
              disabled={!hasFieldConfig || checkingConfig || checkingAnnotationProgress}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {checkingConfig || checkingAnnotationProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {checkingConfig ? 'Checking Config...' : 'Checking Progress...'}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {annotationProgress && annotationProgress.completedRows > 0 ? 'Resume Annotation' : 'Start Annotation'}
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
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {datasetInfo?.name || 'Data Overview'}
          </h1>
          <p className="text-gray-600 mt-1">
            {"Data Overview - Manage and monitor your uploaded data files"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={onNavigateToFieldConfig}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
          >
            <Settings className="h-4 w-4" />
            Configure Fields
          </Button>
          <ExportDropdown
            options={exportOptions}
            disabled={!hasFieldConfig || !annotationProgress || annotationProgress.completedRows === 0 || isExporting}
          />
          <Button
            onClick={handleStartDatasetAnnotation}
            disabled={!hasFieldConfig || checkingConfig || checkingAnnotationProgress}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {checkingConfig || checkingAnnotationProgress ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {checkingConfig ? 'Checking Config...' : 'Checking Progress...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {annotationProgress && annotationProgress.completedRows > 0 ? 'Resume Annotation' : 'Start Annotation'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* CSV Imports List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Uploaded Files
            </CardTitle>
            <Button
              onClick={onNavigateToUpload}
              className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
            >
              <Upload className="h-4 w-4" />
              Upload Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {csvImports.map((csvImport) => (
              <div
                key={csvImport._id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {csvImport.originalFileName}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                  {(cloneGroup.clones as any[]).map((clone: any) => {
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
                          <span className={cn('text-xs font-semibold', isDone ? 'text-green-600' : 'text-gray-500')}>
                            {completed} / {total} rows &nbsp;{pct}%
                          </span>
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

                {/* Status summary + action buttons */}
                {(() => {
                  const clones = cloneGroup.clones as any[];
                  const allDone = clones.every((c: any) => {
                    const total = c.progress?.totalRows ?? 0;
                    const done = c.progress?.completedRows ?? 0;
                    return total > 0 && done >= total;
                  });
                  const incomplete = clones.filter((c: any) => {
                    const total = c.progress?.totalRows ?? 0;
                    const done = c.progress?.completedRows ?? 0;
                    return !(total > 0 && done >= total);
                  });

                  return (
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                      <Button
                        onClick={handleGenerateConsensus}
                        disabled={!allDone || isGeneratingConsensus}
                        className={cn(
                          'flex-1 text-sm font-medium',
                          allDone
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        )}
                        title={
                          !allDone
                            ? `Waiting for ${incomplete.length} annotator${incomplete.length !== 1 ? 's' : ''} to finish`
                            : 'Generate consensus comparison'
                        }
                      >
                        {isGeneratingConsensus ? (
                          <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generating…</>
                        ) : (
                          <><Wand2 className="h-4 w-4 mr-1.5" />
                            {allDone
                              ? 'Generate Consensus'
                              : `Waiting for ${incomplete.length} annotator${incomplete.length !== 1 ? 's' : ''}…`
                            }
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/dataset/${datasetId}/consensus`)}
                        className="flex-1 text-sm border-indigo-200 text-indigo-700 hover:bg-indigo-50"
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
