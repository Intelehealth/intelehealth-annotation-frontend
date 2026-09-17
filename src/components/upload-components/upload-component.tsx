'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Upload,
  FileText,
  Image,
  FileAudio,
  File,
  X,
  CloudUpload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Database,
  Table,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { datasetsAPI } from '@/lib/api/datasets';
import { CSVUploadComponent } from './csv-upload-component';

interface UploadComponentProps {
  onFilesSelected: (files: File[]) => void;
  onUploadComplete?: (assets: any[]) => void;
  onCSVUploaded?: (
    csvImportId: string,
    fileName: string,
    totalRows: number,
  ) => void;
  datasetId?: string;
  className?: string;
}

export function UploadComponent({
  onFilesSelected,
  onUploadComplete,
  onCSVUploaded,
  datasetId,
  className,
}: UploadComponentProps) {
  const [uploadType, setUploadType] = useState<'files' | 'csv'>('csv');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [uploadStatus, setUploadStatus] = useState<{
    [key: string]: 'pending' | 'uploading' | 'success' | 'error';
  }>({});
  const [datasetInfo, setDatasetInfo] = useState<{ name: string; description: string } | null>(null);

  // Load dataset info when datasetId is provided
  useEffect(() => {
    const loadDatasetInfo = async () => {
      if (datasetId) {
        try {
          const dataset = await datasetsAPI.getById(datasetId);
          setDatasetInfo({
            name: dataset.name,
            description: dataset.description || ''
          });
          setSelectedDatasetId(datasetId);
        } catch (error) {
          console.error('Error loading dataset info:', error);
          setDatasetInfo(null);
        }
      }
    };

    loadDatasetInfo();
  }, [datasetId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);

    // Initialize upload status for new files
    const newStatus: {
      [key: string]: 'pending' | 'uploading' | 'success' | 'error';
    } = {};
    files.forEach((file) => {
      newStatus[file.name] = 'pending';
    });
    setUploadStatus((prev) => ({ ...prev, ...newStatus }));
  };

  const handleFileDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);

    // Initialize upload status for new files
    const newStatus: {
      [key: string]: 'pending' | 'uploading' | 'success' | 'error';
    } = {};
    files.forEach((file) => {
      newStatus[file.name] = 'pending';
    });
    setUploadStatus((prev) => ({ ...prev, ...newStatus }));
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);

    // Remove upload status for removed file
    setUploadStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[fileToRemove.name];
      return newStatus;
    });
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    onFilesSelected([]);
    setUploadStatus({});
    setUploadProgress({});
  };

  const handleUpload = async () => {
    if (!selectedDatasetId) {
      alert('Please select a dataset first');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    setIsUploading(true);

    try {
      // Update status for all files to uploading
      const newStatus: {
        [key: string]: 'pending' | 'uploading' | 'success' | 'error';
      } = {};
      selectedFiles.forEach((file) => {
        newStatus[file.name] = 'uploading';
      });
      setUploadStatus(newStatus);

      // Upload files
      const assets = await datasetsAPI.uploadAssets(
        selectedDatasetId,
        selectedFiles,
      );

      // Update status for all files to success
      const successStatus: {
        [key: string]: 'pending' | 'uploading' | 'success' | 'error';
      } = {};
      selectedFiles.forEach((file) => {
        successStatus[file.name] = 'success';
      });
      setUploadStatus(successStatus);

      // Call callback with uploaded assets
      if (onUploadComplete) {
        onUploadComplete(assets);
      }

      // Clear files after successful upload
      setTimeout(() => {
        clearAllFiles();
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);

      // Update status for all files to error
      const errorStatus: {
        [key: string]: 'pending' | 'uploading' | 'success' | 'error';
      } = {};
      selectedFiles.forEach((file) => {
        errorStatus[file.name] = 'error';
      });
      setUploadStatus(errorStatus);

      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadTypeChange = (type: 'files' | 'csv') => {
    setUploadType(type);
    clearAllFiles(); // Clear selected files when changing upload type
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/'))
      return <Image className="h-5 w-5 text-blue-500" />;
    if (file.type.includes('audio'))
      return <FileAudio className="h-5 w-5 text-green-500" />;
    if (file.type.includes('document') || file.name.endsWith('.docx'))
      return <FileText className="h-5 w-5 text-orange-500" />;
    if (file.type.includes('text') || file.name.endsWith('.txt'))
      return <FileText className="h-5 w-5 text-purple-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getStatusIcon = (
    status: 'pending' | 'uploading' | 'success' | 'error',
  ) => {
    switch (status) {
      case 'pending':
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Dataset Header */}
      {datasetId && datasetInfo && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {datasetInfo.name}
          </h1>
          <p className="text-gray-600 mt-1">
            {'Upload files to this dataset'}
          </p>
        </div>
      )}

      {/* Upload Type Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => handleUploadTypeChange('csv')}
          className={cn(
            'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            uploadType === 'csv'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900',
          )}
        >
          <Table className="h-4 w-4" />
          <span>CSV</span>
        </button>
        <button
          onClick={() => handleUploadTypeChange('files')}
          className={cn(
            'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            uploadType === 'files'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900',
          )}
        >
          <FileText className="h-4 w-4" />
          <span>Files</span>
        </button>
      </div>

      {/* Dataset Selection */}
      <div className="space-y-2">
        <Label htmlFor="dataset-select">Select Dataset</Label>
        <select
          id="dataset-select"
          value={selectedDatasetId}
          onChange={(e) => setSelectedDatasetId(e.target.value)}
          className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Choose a dataset...</option>
          {/* You can add dataset options here if needed */}
        </select>
      </div>

      {/* CSV Upload Component */}
      {uploadType === 'csv' && (
        <CSVUploadComponent
          selectedDatasetId={selectedDatasetId}
          onCSVUploaded={onCSVUploaded}
        />
      )}

      {/* File Upload Component */}
      {uploadType === 'files' && (
        <>
          {/* Upload Area */}
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
            onClick={() => document.getElementById('fileInput')?.click()}
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
                    : 'Click to upload or drag & drop'}
                </h3>
                <p className="text-sm text-gray-500">
                  Support for images, documents, text files, and audio files
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('fileInput')?.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Files
              </Button>
            </div>

            <input
              id="fileInput"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.docx,.doc,.txt,.pdf,.mp3,.wav,.aac,.flac"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Selected Files ({selectedFiles.length})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFiles}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file)}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate max-w-48">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(uploadStatus[file.name] || 'pending')}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleUpload}
                  disabled={isUploading || !selectedDatasetId}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload {selectedFiles.length} Files
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Supported Formats Info */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <File className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Supported Formats
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
              <div>• Images: JPG, PNG, GIF, BMP, WebP</div>
              <div>• Documents: DOCX, DOC, PDF, TXT</div>
              <div>• Audio: MP3, WAV, AAC, FLAC</div>
              <div>• Max Size: 50MB per file</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
