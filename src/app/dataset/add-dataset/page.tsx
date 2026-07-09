'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { datasetsAPI } from '@/lib/api/datasets';
import { createDatasetSchema, CreateDatasetFormData } from '@/schemas/dataset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Database,
  FileText,
  Image,
  AudioLines,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  Globe,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

const datasetTypes = [
  { value: 'text', label: 'Text Dataset', icon: FileText },
  { value: 'image', label: 'Image Dataset', icon: Image },
  { value: 'audio', label: 'Audio Dataset', icon: AudioLines },
  { value: 'multimodal', label: 'Multi-modal Dataset', icon: Database },
];

const accessTypes = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can access this dataset',
    icon: Lock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Visible to all users',
    icon: Globe,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    warning: true,
  },
];

export default function AddDatasetPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameValidation, setNameValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    message: string;
  }>({
    isValidating: false,
    isValid: null,
    message: '',
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateDatasetFormData>({
    resolver: zodResolver(createDatasetSchema),
    defaultValues: {
      name: '',
      description: '',
      datasetType: undefined,
      accessType: 'private',
    },
  });

  const selectedDatasetType = watch('datasetType');
  const selectedAccessType = watch('accessType');
  const watchedName = watch('name');

  // Debounced name validation function
  const validateDatasetName = useCallback(async (name: string) => {
    if (!name || name.trim().length < 2) {
      setNameValidation({
        isValidating: false,
        isValid: null,
        message: '',
      });
      return;
    }

    setNameValidation({
      isValidating: true,
      isValid: null,
      message: '',
    });

    try {
      // Search for existing datasets with the same name
      const existingDatasets = await datasetsAPI.search(name.trim());
      const nameExists = existingDatasets.some(
        (dataset) => dataset.name.toLowerCase() === name.trim().toLowerCase(),
      );

      if (nameExists) {
        setNameValidation({
          isValidating: false,
          isValid: false,
          message: `Dataset name "${name.trim()}" is already taken`,
        });
      } else {
        setNameValidation({
          isValidating: false,
          isValid: true,
          message: 'Dataset name is available',
        });
      }
    } catch (error) {
      setNameValidation({
        isValidating: false,
        isValid: null,
        message: 'Unable to validate name',
      });
    }
  }, []);

  // Debounce effect for name validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedName) {
        validateDatasetName(watchedName);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [watchedName, validateDatasetName]);

  const onSubmit = async (data: CreateDatasetFormData) => {
    // Check if name validation is still in progress
    if (nameValidation.isValidating) {
      showToast({
        title: 'Please wait',
        description: 'Name validation is in progress. Please wait a moment.',
        type: 'info',
      });
      return;
    }

    // Check if name is invalid
    if (nameValidation.isValid === false) {
      showToast({
        title: 'Invalid Dataset Name',
        description: nameValidation.message,
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const newDataset = await datasetsAPI.create({
        name: data.name.trim(),
        description: data.description?.trim() || '',
        datasetType: data.datasetType,
        accessType: data.accessType || 'private',
      });

      showToast({
        title: 'Dataset Created Successfully!',
        description: `Dataset "${data.name}" has been created.`,
        type: 'success',
      });

      setTimeout(() => {
        router.push(`/dataset/${newDataset._id}?tab=upload`);
      }, 500);
    } catch (error: any) {
      console.error('Error creating dataset:', error);

      // Handle specific error cases
      if (error.response?.status === 409) {
        showToast({
          title: 'Dataset Name Already Exists',
          description:
            error.response?.data?.message ||
            'This dataset name is already taken.',
          type: 'error',
        });
      } else if (error.response?.status === 400) {
        showToast({
          title: 'Invalid Data',
          description:
            error.response?.data?.message ||
            'Please check your input and try again.',
          type: 'error',
        });
      } else if (error.response?.status === 401) {
        showToast({
          title: 'Authentication Required',
          description: 'Please log in again to continue.',
          type: 'error',
        });
        router.push('/login');
      } else {
        showToast({
          title: 'Failed to Create Dataset',
          description: 'Please check your connection and try again.',
          type: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-y-auto pb-8">
      {/* Navigation Header - Fixed to left edge */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={() => router.push('/dataset')}
          className="bg-black hover:bg-gray-800 text-white font-medium px-4 py-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Datasets
        </Button>
      </div>
      
      <div className="max-w-2xl mx-auto w-full p-4 mt-16 pb-12">

        {/* Main Form Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-left">
            <h1 className="text-2xl font-semibold text-gray-900 p-3">
              Create New Dataset
            </h1>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Dataset Name */}
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                Dataset Name *
              </Label>
              <div className="relative">
                <Input
                  id="name"
                  placeholder="Enter dataset name"
                  {...register('name')}
                  className={cn(
                    'h-10 pr-10',
                    errors.name &&
                      'border-red-500 focus:border-red-500 focus:ring-red-500',
                    nameValidation.isValid === true &&
                      !errors.name &&
                      'border-green-500 focus:border-green-500 focus:ring-green-500',
                    nameValidation.isValid === false &&
                      !errors.name &&
                      'border-red-500 focus:border-red-500 focus:ring-red-500',
                  )}
                />
                {/* Validation Icon */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {nameValidation.isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : nameValidation.isValid === true ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : nameValidation.isValid === false ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
              </div>

              {/* Error Messages */}
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}

              {/* Validation Messages */}
              {nameValidation.message && !errors.name && (
                <p
                  className={cn(
                    'text-sm',
                    nameValidation.isValid === true && 'text-green-600',
                    nameValidation.isValid === false && 'text-red-600',
                    nameValidation.isValid === null && 'text-gray-500',
                  )}
                >
                  {nameValidation.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-sm font-medium text-gray-700"
              >
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Brief description of your dataset"
                {...register('description')}
                className={cn(
                  'min-h-[80px] resize-none',
                  errors.description &&
                    'border-red-500 focus:border-red-500 focus:ring-red-500',
                )}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Dataset Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Dataset Type *
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {datasetTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedDatasetType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setValue('datasetType', type.value as 'text' | 'image' | 'audio')}
                      className={cn(
                        'flex flex-col items-center space-y-1 p-3 rounded-lg border-2 transition-all hover:shadow-sm',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-medium text-center leading-tight">
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.datasetType && (
                <p className="text-sm text-red-600">
                  {errors.datasetType.message}
                </p>
              )}
            </div>

            {/* Access Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Access Type *
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {accessTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedAccessType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setValue('accessType', type.value as 'private' | 'public')}
                      className={cn(
                        'flex flex-col items-start space-y-1 p-3 rounded-lg border-2 transition-all hover:shadow-sm text-left',
                        isSelected
                          ? `${type.bgColor} ${type.borderColor} shadow-sm ring-2 ring-blue-500 ring-opacity-20`
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                        // Default highlight for Private
                        type.value === 'private' && !selectedAccessType && 'bg-gray-50 border-gray-300 ring-2 ring-gray-400 ring-opacity-20'
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className={cn('h-5 w-5', 
                          isSelected ? type.color : 
                          type.value === 'private' && !selectedAccessType ? 'text-gray-600' : 'text-gray-400'
                        )} />
                        <span className={cn('text-sm font-medium', 
                          isSelected ? type.color : 
                          type.value === 'private' && !selectedAccessType ? 'text-gray-700' : 'text-gray-600'
                        )}>
                          {type.label}
                        </span>
                      </div>
                      <p className={cn('text-xs leading-relaxed',
                        isSelected ? 'text-gray-700' : 
                        type.value === 'private' && !selectedAccessType ? 'text-gray-600' : 'text-gray-500'
                      )}>
                        {type.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              {errors.accessType && (
                <p className="text-sm text-red-600">
                  {errors.accessType.message}
                </p>
              )}
            </div>


            {/* Information Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Dataset type is for organization only.
                  It doesn't affect annotation functionality - you can upload
                  any data type.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dataset')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  nameValidation.isValidating ||
                  nameValidation.isValid === false
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Create Dataset
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
