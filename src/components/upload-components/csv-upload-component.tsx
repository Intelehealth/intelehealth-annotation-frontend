'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  X,
  CloudUpload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  csvProcessingAPI,
  HeaderValidationResult,
} from '@/lib/api/csv-processing';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { CSVImportsAPI } from '@/lib/api/csv-imports';
import { fieldSelectionAPI } from '@/lib/api/field-config';
import * as ExcelJS from 'exceljs';

interface CSVUploadComponentProps {
  selectedDatasetId: string;
  onCSVUploaded?: (
    csvImportId: string,
    fileName: string,
    totalRows: number,
  ) => void;
  className?: string;
}

export function CSVUploadComponent({
  selectedDatasetId,
  onCSVUploaded,
  className,
}: CSVUploadComponentProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [csvPreview, setCSVPreview] = useState<{
    columns: string[];
    sampleRows: Record<string, any>[];
    totalRows: number;
    duplicateColumns?: string[];
  } | null>(null);
  const [headerValidation, setHeaderValidation] =
    useState<HeaderValidationResult | null>(null);
  const [isValidatingHeaders, setIsValidatingHeaders] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  // Auto-preview when a file is selected
  useEffect(() => {
    if (selectedFile && !csvPreview) {
      previewCSV();
    }
  }, [selectedFile]);

  // Auto-validate headers after preview is generated
  useEffect(() => {
    if (csvPreview && csvPreview.totalRows > 0 && !headerValidation && selectedDatasetId) {
      validateHeaders();
    }
  }, [csvPreview, headerValidation, selectedDatasetId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
      setCSVPreview(null);
      setHeaderValidation(null);
    }
  };

  const handleFileDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setSelectedFile(file);
      setUploadStatus('idle');
      setCSVPreview(null);
      setHeaderValidation(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setCSVPreview(null);
    setHeaderValidation(null);
    setUploadProgress(0);
    // Reset the file input value so the same file can be selected again
    const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedDatasetId) {
      showToast({
        type: 'error',
        title: 'Dataset Required',
        description: 'Please select a dataset first',
      });
      return;
    }

    if (!selectedFile) {
      showToast({
        type: 'error',
        title: 'No File Selected',
        description: 'Please select a CSV file to upload',
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      const result = await csvProcessingAPI.uploadCSV(
        selectedDatasetId,
        selectedFile,
      );

      setUploadStatus('success');
      setUploadProgress(100);

      // Call callback with upload result
      if (onCSVUploaded) {
        onCSVUploaded(result.csvImportId, result.fileName, result.totalRows);
      }

      // Show success toast and redirect
      showToast({
        type: 'success',
        title: 'CSV Upload Successful',
        description: `${result.totalRows} rows processed successfully`,
      });

      // Reset form and redirect after successful upload
      setTimeout(() => {
        removeFile();
        // Check if this is the first CSV upload by checking existing CSV imports
        checkAndRedirectAfterUpload();
      }, 2000);
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      const serverMessage = error?.response?.data?.message || error?.message;
      showToast({
        type: 'error',
        title: 'Upload Failed',
        description:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Failed to upload CSV file. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to find duplicate columns
  const findDuplicateColumns = (columns: string[]): string[] => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    
    for (const column of columns) {
      if (seen.has(column)) {
        duplicates.add(column);
      } else {
        seen.add(column);
      }
    }
    
    return Array.from(duplicates);
  };

  const previewCSV = async () => {
    if (!selectedFile) return;

    // Check if it's an Excel file
    const isExcelFile =
      selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

    if (isExcelFile) {
      // For Excel files, use exceljs to parse
      try {
        const workbook = new ExcelJS.Workbook();
        const buffer = await selectedFile.arrayBuffer();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('No worksheet found');
        }

        // Helper function to convert Excel values to displayable strings
        const formatExcelValue = (value: any): string => {
          if (value === null || value === undefined) {
            return '';
          }
          if (value instanceof Date) {
            return value.toLocaleDateString();
          }
          if (typeof value === 'object') {
            // Handle arrays by joining with newlines
            if (Array.isArray(value)) {
              return value
                .map(item => String(item))
                .filter(item => item.trim() !== '')
                .join('\n');
            }
            // Handle objects with proper stringification
            try {
              const stringified = JSON.stringify(value);
              // If it's a simple object with URL-like properties, extract them
              if (stringified.includes('url') || stringified.includes('href') || stringified.includes('src')) {
                const parsed = JSON.parse(stringified);
                if (parsed.url) return parsed.url;
                if (parsed.href) return parsed.href;
                if (parsed.src) return parsed.src;
                if (parsed.value) return parsed.value;
              }
              return stringified;
            } catch (e) {
              return String(value);
            }
          }
          return String(value);
        };

        // Get the first row as headers
        const headerRow = worksheet.getRow(1);
        const columns = headerRow.values as any[];
        // Remove the first element (ExcelJS includes undefined as first element)
        const cleanColumns = columns
          .slice(1)
          .map((col: any) => formatExcelValue(col));

        // Get sample rows (rows 2-6) - process once for both duplicate and normal cases
        const sampleRows: Record<string, any>[] = [];
        for (let i = 2; i <= Math.min(6, worksheet.rowCount); i++) {
          const row = worksheet.getRow(i);
          const values = row.values as any[];
          const cleanValues = values.slice(1); // Remove first undefined element

          const rowData: Record<string, any> = {};
          cleanColumns.forEach((col, index) => {
            rowData[col] = formatExcelValue(cleanValues[index]);
          });
          sampleRows.push(rowData);
        }

        // Check for duplicate columns
        const duplicateColumns = findDuplicateColumns(cleanColumns);
        if (duplicateColumns.length > 0) {
          showToast({
            type: 'error',
            title: 'Duplicate Columns Found',
            description: `The following columns appear multiple times: ${duplicateColumns.join(', ')}`,
          });
        }

        setCSVPreview({
          columns: cleanColumns,
          sampleRows,
          totalRows: worksheet.rowCount - 1, // Subtract header row
          duplicateColumns: duplicateColumns.length > 0 ? duplicateColumns : undefined, // Store duplicate columns info only if found
        });
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        showToast({
          type: 'error',
          title: 'Excel Parse Error',
          description:
            'Failed to parse Excel file. Please check the file format.',
        });

        // Fallback to error message
        setCSVPreview({
          columns: ['Error'],
          sampleRows: [
            {
              Error:
                'Failed to parse Excel file. Please check the file format.',
            },
          ],
          totalRows: 0,
        });
      }
      return;
    }

    // For CSV files, use the existing text parsing
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const columns = lines[0]?.split(',').map((col) => col.trim()) || [];
      
      // Process sample rows once for both duplicate and normal cases
      const sampleRows = lines.slice(1, 6).map((line) => {
        const values = line.split(',').map((val) => val.trim());
        const row: Record<string, any> = {};
        columns.forEach((col, index) => {
          row[col] = values[index] || '';
        });
        return row;
      });

      // Check for duplicate columns
      const duplicateColumns = findDuplicateColumns(columns);
      if (duplicateColumns.length > 0) {
        showToast({
          type: 'error',
          title: 'Duplicate Columns Found',
          description: `The following columns appear multiple times: ${duplicateColumns.join(', ')}`,
        });
      }

      setCSVPreview({
        columns,
        sampleRows,
        totalRows: lines.length - 1,
        duplicateColumns: duplicateColumns.length > 0 ? duplicateColumns : undefined, // Store duplicate columns info only if found
      });
    };
    reader.readAsText(selectedFile);
  };

  const validateHeaders = async (showToasts = true) => {
    if (!selectedFile || !selectedDatasetId) return;

    setIsValidatingHeaders(true);
    try {
      const validation = await csvProcessingAPI.validateHeaders(
        selectedDatasetId,
        selectedFile,
      );
      setHeaderValidation(validation);

      if (showToasts) {
        if (validation.isDuplicate) {
          showToast({
            type: 'error',
            title: 'Duplicate File',
            description: 'This file already exists in the dataset. Upload is blocked.',
          });
        } else if (validation.errors.some(error => error.message.includes('Primary key conflicts detected'))) {
          const pkError = validation.errors.find(error => error.message.includes('Primary key conflicts detected'));
          showToast({
            type: 'error',
            title: 'Primary Key Conflict',
            description: pkError?.message || 'Primary key values conflict with existing data.',
          });
        } else if (!validation.isValid) {
          showToast({
            type: 'error',
            title: 'Header Validation Failed',
            description: `Found ${validation.errors.length} header mismatch(es). Please check the details below.`,
          });
        } else {
          showToast({
            type: 'success',
            title: 'Headers Validated',
            description: 'CSV headers match existing files in this dataset.',
          });
        }
      }
    } catch (error: any) {
      console.error('Header validation failed:', error);
      if (showToasts) {
        showToast({
          type: 'error',
          title: 'Validation Error',
          description: 'Failed to validate CSV headers. Please try again.',
        });
      }
    } finally {
      setIsValidatingHeaders(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'idle':
        return <div className="h-3 w-3 rounded-full bg-gray-300" />;
      case 'uploading':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const checkAndRedirectAfterUpload = async () => {
    try {
      // Check existing CSV imports for this dataset
      const existingImports = await CSVImportsAPI.getByDataset(selectedDatasetId);
      
      // Check if field configuration exists
      const fieldConfig = await fieldSelectionAPI.checkDatasetFieldConfig(selectedDatasetId);
      
      // If this is the first CSV upload and no field config exists, redirect to field config
      if (existingImports.length === 1 && !fieldConfig.hasConfig) {
        console.log('First CSV upload detected, redirecting to field configuration');
        router.push(`/dataset/${selectedDatasetId}?tab=field-configuration`);
      } else {
        // For subsequent uploads or if field config already exists, redirect to overview
        console.log('Subsequent CSV upload or field config exists, redirecting to overview');
        router.push(`/dataset/${selectedDatasetId}?tab=overview`);
      }
    } catch (error) {
      console.error('Error checking redirect conditions:', error);
      // Fallback to overview if there's an error
      router.push(`/dataset/${selectedDatasetId}?tab=overview`);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload Area - Only show when no file is selected */}
      {!selectedFile && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer',
            isDragOver
              ? 'border-blue-400 bg-blue-50 scale-105'
              : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50',
          )}
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('csvFileInput')?.click()}
        >
        <div className="flex flex-col items-center space-y-3">
          <div
            className={cn(
              'p-3 rounded-full transition-colors',
              isDragOver ? 'bg-blue-100' : 'bg-gray-100',
            )}
          >
            <CloudUpload
              className={cn(
                'h-8 w-8 transition-colors',
                isDragOver ? 'text-blue-600' : 'text-gray-500',
              )}
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-medium text-gray-900">
              {isDragOver
                ? 'Drop files here'
                : 'Drag & drop files'}
            </h3>
             <p className="text-sm text-gray-500">
               CSV or Excel ( .xlsx, .xls )
             </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById('csvFileInput')?.click();
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Select files
          </Button>
        </div>

        </div>
      )}

      {/* Hidden file input - always present */}
      <input
        id="csvFileInput"
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Selected File */}
      {selectedFile && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Selected file
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-3">
              {getFileIcon(selectedFile)}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate max-w-48">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <Button
                variant="outline"
                size="sm"
                onClick={() => validateHeaders(true)}
                disabled={isValidatingHeaders}
                className="h-7 px-2"
              >
                {isValidatingHeaders ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                Validate Headers
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={previewCSV}
                className="h-7 px-2"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
            </div>
          </div>

          {/* File Preview */}
          {csvPreview && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">
                  File Preview
                </h4>
                {csvPreview.totalRows > 0 && (
                  <span className="text-xs text-gray-500">
                    {csvPreview.totalRows} total rows
                  </span>
                )}
              </div>

               {csvPreview.totalRows === 0 ? (
                 // Error message for failed parsing
                 <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                   <div className="flex items-center space-x-2 mb-2">
                     <AlertCircle className="h-4 w-4 text-red-600" />
                     <span className="text-sm font-medium text-red-900">
                       Parse Error
                     </span>
                   </div>
                   <p className="text-sm text-red-700">
                     {csvPreview.sampleRows[0]?.[csvPreview.columns[0]] ||
                       'Failed to parse file'}
                   </p>
                 </div>
               ) : (
                 // File preview table (works for both CSV and Excel)
                 <>
                   <div className="overflow-x-auto max-h-64">
                     <table className="min-w-full text-xs">
                       <thead className="sticky top-0 bg-white">
                         <tr className="border-b border-gray-200">
                           {csvPreview.columns.map((column, index) => (
                             <th
                               key={index}
                               className="text-left py-2 px-2 font-medium text-gray-700 max-w-32 truncate"
                               title={column}
                             >
                               {column}
                             </th>
                           ))}
                         </tr>
                       </thead>
                       <tbody>
                         {csvPreview.sampleRows.map((row, rowIndex) => (
                           <tr key={rowIndex} className="border-b border-gray-100">
                             {csvPreview.columns.map((column, colIndex) => (
                               <td
                                 key={colIndex}
                                 className="py-1 px-2 text-gray-600 max-w-32 truncate"
                                 title={row[column] || ''}
                               >
                                 {row[column] || ''}
                               </td>
                             ))}
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   
                   {/* Duplicate Column Error Display */}
                   {csvPreview.duplicateColumns && csvPreview.duplicateColumns.length > 0 && (
                     <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                       <div className="flex items-center space-x-2 mb-2">
                         <AlertCircle className="h-4 w-4 text-red-600" />
                         <span className="text-sm font-medium text-red-900">
                           Duplicate Columns Found
                         </span>
                       </div>
                       <p className="text-sm text-red-700">
                         The following columns appear multiple times: <span className="font-mono bg-red-100 px-1 rounded">{csvPreview.duplicateColumns.join(', ')}</span>. Please fix column names before uploading.
                       </p>
                     </div>
                   )}
                 </>
               )}
            </div>
          )}

          {/* Header Validation Results */}
          {headerValidation && (
            <div
              className={cn(
                'rounded-lg border p-4',
                headerValidation.isValid && !headerValidation.isDuplicate
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200',
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <h4
                  className={cn(
                    'text-sm font-medium',
                    headerValidation.isValid
                      ? 'text-green-900'
                      : 'text-red-900',
                  )}
                >
                  Header Validation Results
                </h4>
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    headerValidation.isValid && !headerValidation.isDuplicate
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800',
                  )}
                >
                  {headerValidation.isValid && !headerValidation.isDuplicate
                    ? 'Valid'
                    : headerValidation.isDuplicate
                      ? 'Duplicate File'
                      : headerValidation.errors.some(error => error.message.includes('Primary key conflicts detected'))
                        ? 'Primary Key Conflict'
                        : `${headerValidation.errors.length} Error(s)`}
                </span>
              </div>

              {headerValidation.isDuplicate ? (
                <div className="space-y-3">
                  <div className="text-sm text-red-700">
                    <p className="mb-2">❌ Duplicate file detected. Please upload a different file.</p>
                  </div>
                </div>
              ) : headerValidation.errors.some(error => error.message.includes('Primary key conflicts detected')) ? (
                <div className="space-y-3">
                  <div className="text-sm text-red-700">
                    <p className="mb-2">❌ {headerValidation.errors.find(error => error.message.includes('Primary key conflicts detected'))?.message}</p>
                  </div>
                </div>
              ) : headerValidation.isValid ? (
                <div className="text-sm text-green-700">
                  <p className="mb-2">
                    ✅ CSV headers match existing files in this dataset.
                  </p>
                  <p className="text-xs text-green-600">
                    Found {headerValidation.existingImportCount} existing CSV
                    file(s) with matching headers.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-red-700">
                    <p className="mb-2">
                      ❌ Header validation failed. The following issues were
                      found:
                    </p>
                  </div>

                  <div className="space-y-2">
                    {headerValidation.errors.map((error, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-2 p-2 bg-white rounded border border-red-200"
                      >
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-red-700">
                          <p className="font-medium">{error.message}</p>
                          {error.errorType === 'MISSING_COLUMN' && (
                            <p className="text-red-600 mt-1">
                              Expected column:{' '}
                              <span className="font-mono bg-red-100 px-1 rounded">
                                {error.columnName}
                              </span>
                            </p>
                          )}
                          {error.errorType === 'EXTRA_COLUMN' && (
                            <p className="text-red-600 mt-1">
                              Unexpected column:{' '}
                              <span className="font-mono bg-red-100 px-1 rounded">
                                {error.columnName}
                              </span>
                            </p>
                          )}
                          {error.errorType === 'DUPLICATE_COLUMN' && (
                            <p className="text-red-600 mt-1">
                              Duplicate column:{' '}
                              <span className="font-mono bg-red-100 px-1 rounded">
                                {error.columnName}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-red-600 bg-white p-2 rounded border border-red-200">
                    <p className="font-medium mb-1">Expected headers:</p>
                    <div className="flex flex-wrap gap-1">
                      {headerValidation.expectedHeaders.map((header, index) => (
                        <span
                          key={index}
                          className="font-mono bg-red-100 text-red-800 px-1 rounded text-xs"
                        >
                          {header}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-red-600 bg-white p-2 rounded border border-red-200">
                    <p className="font-medium mb-1">Your CSV headers:</p>
                    <div className="flex flex-wrap gap-1">
                      {headerValidation.newHeaders.map((header, index) => (
                        <span
                          key={index}
                          className="font-mono bg-red-100 text-red-800 px-1 rounded text-xs"
                        >
                          {header}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button
              className="w-full"
              size="sm"
              onClick={handleUpload}
              disabled={
                isUploading ||
                !selectedDatasetId ||
                headerValidation?.isValid === false ||
                headerValidation?.isDuplicate === true ||
                headerValidation?.errors?.some(error => error.message.includes('Primary key conflicts detected')) ||
                csvPreview?.totalRows === 0 ||
                (csvPreview?.duplicateColumns && csvPreview.duplicateColumns.length > 0)
              }
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload file
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadStatus === 'uploading' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* File Requirements */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div className="flex items-center space-x-2 mb-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            File requirements
          </span>
        </div>
         <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
           <div>Formats: CSV, Excel (.xlsx, .xls)</div>
           <div>Encoding: UTF‑8</div>
           <div>Max size: 10 MB per file</div>
           <div>Notes: Metadata columns supported</div>
         </div>
      </div>
    </div>
  );
}
