'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  Loader2,
  Database,
  Lock,
  Globe,
  AlertCircle,
  FileText,
  Image,
  AudioLines,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { datasetsAPI, DatasetResponse, UpdateDatasetRequest } from '@/lib/api/datasets';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast';
import { AccessTypeWarningModal } from '@/components/ui/access-type-warning-modal';
import { AdminDatasetSettings } from './admin-dataset-settings';

interface DatasetSettingsProps {
  datasetId: string;
}

export function DatasetSettings({ datasetId }: DatasetSettingsProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [dataset, setDataset] = useState<DatasetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [datasetType, setDatasetType] = useState<string>('');
  const [accessType, setAccessType] = useState<'private' | 'public'>('private');
  const [showAccessWarning, setShowAccessWarning] = useState(false);
  const [pendingAccessType, setPendingAccessType] = useState<'private' | 'public' | null>(null);
  const [originalAccessType, setOriginalAccessType] = useState<'private' | 'public'>('private');

  useEffect(() => {
    loadDataset();
  }, [datasetId]);

  const loadDataset = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await datasetsAPI.getById(datasetId);
      setDataset(data);
      setName(data.name);
      setDescription(data.description || '');
      setDatasetType(data.datasetType);
      // Map 'shared' to 'private' since we removed shared option
      const mappedAccessType = data.accessType === 'shared' ? 'private' : data.accessType as 'private' | 'public';
      setAccessType(mappedAccessType);
      setOriginalAccessType(mappedAccessType);
    } catch (err) {
      setError('Failed to load dataset');
      showToast({
        title: 'Error',
        description: 'Failed to load dataset settings',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccessTypeChange = (newAccessType: 'private' | 'public') => {
    if (newAccessType !== accessType) {
      setPendingAccessType(newAccessType);
      setShowAccessWarning(true);
    } else {
      setAccessType(newAccessType);
    }
  };

  const confirmAccessTypeChange = async () => {
    if (!pendingAccessType || !dataset) return;

    try {
      setSaving(true);
      const updateData: UpdateDatasetRequest = {
        name,
        description,
        datasetType,
        accessType: pendingAccessType,
      };

      await datasetsAPI.update(datasetId, updateData);
      
      // Update local state
      setAccessType(pendingAccessType);
      setOriginalAccessType(pendingAccessType);
      
      // Close modal
      setShowAccessWarning(false);
      setPendingAccessType(null);
      
      // Reload dataset to get updated data
      await loadDataset();
      
      showToast({
        title: 'Success',
        description: `Dataset access changed to ${pendingAccessType} successfully`,
        type: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Error',
        description: 'Failed to update dataset access type',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelAccessTypeChange = () => {
    setShowAccessWarning(false);
    setPendingAccessType(null);
  };

  const handleSave = async () => {
    if (!dataset) return;

    try {
      setSaving(true);
      const updateData: UpdateDatasetRequest = {
        name,
        description,
        datasetType,
        accessType,
      };

      await datasetsAPI.update(datasetId, updateData);
      
      // Reload dataset to get updated data
      await loadDataset();
      
      showToast({
        title: 'Success',
        description: 'Dataset settings updated successfully',
        type: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Error',
        description: 'Failed to update dataset settings',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const getAccessTypeIcon = (type: string) => {
    switch (type) {
      case 'private':
        return Lock;
      case 'public':
        return Globe;
      default:
        return Lock;
    }
  };

  const getAccessTypeColor = (type: string) => {
    switch (type) {
      case 'private':
        return 'text-red-600';
      case 'public':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getAccessTypeDescription = (type: string) => {
    switch (type) {
      case 'private':
        return 'Only you can access this dataset';
      case 'public':
        return 'All authenticated users can access this dataset';
      default:
        return '';
    }
  };

  // Check if current user is the owner
  const isOwner = dataset && (
    (typeof dataset.userId === 'string' && dataset.userId === user?._id) ||
    (dataset.userId && typeof dataset.userId === 'object' && dataset.userId._id === user?._id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading dataset settings...</span>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-16 w-16 mx-auto text-red-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Dataset not found'}
        </h3>
        <p className="text-gray-600 mb-4">
          {error || 'The dataset you are looking for does not exist or you do not have access to it.'}
        </p>
        <Button onClick={loadDataset} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!isOwner && user?.role !== 'admin') {
    return (
      <div className="text-center p-8">
        <Lock className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 mb-4">
          Only the dataset owner can modify these settings.
        </p>
      </div>
    );
  }

  // Show admin component for admin users
  if (user?.role?.toUpperCase() === 'ADMIN') {
    return <AdminDatasetSettings datasetId={datasetId} />;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col p-4">
        {/* Main Form Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 pb-4 flex flex-col">
          <div className="text-left">
            <h1 className="text-2xl font-semibold text-gray-900 p-3">
              Dataset Settings
            </h1>
           
          </div>
          
          <div className="flex flex-col space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Dataset Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter dataset name"
                  className="mt-1 h-10"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your dataset"
                  className="mt-1 min-h-[80px] resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Dataset Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Dataset Type *
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: 'text', label: 'Text Dataset', icon: FileText },
                  { value: 'image', label: 'Image Dataset', icon: Image },
                  { value: 'audio', label: 'Audio Dataset', icon: AudioLines },
                  { value: 'multimodal', label: 'Multi-modal Dataset', icon: Database },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = datasetType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setDatasetType(type.value)}
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
            </div>

            {/* Access Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Access Type *
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
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
                    description: 'All authenticated users can access',
                    icon: Globe,
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                  },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = accessType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleAccessTypeChange(type.value as 'private' | 'public')}
                      className={cn(
                        'flex flex-col items-start space-y-1 p-3 rounded-lg border-2 transition-all hover:shadow-sm text-left',
                        isSelected
                          ? `${type.bgColor} ${type.borderColor} shadow-sm ring-2 ring-blue-500 ring-opacity-20`
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className={cn('h-5 w-5', 
                          isSelected ? type.color : 'text-gray-400'
                        )} />
                        <span className={cn('text-sm font-medium', 
                          isSelected ? type.color : 'text-gray-600'
                        )}>
                          {type.label}
                        </span>
                      </div>
                      <p className={cn('text-xs leading-relaxed',
                        isSelected ? 'text-gray-700' : 'text-gray-500'
                      )}>
                        {type.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>


            {/* Action Buttons */}
            <div className="flex justify-end p-3 border-t border-gray-100 space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim() || !datasetType}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Access Type Warning Modal */}
      <AccessTypeWarningModal
        isOpen={showAccessWarning}
        onClose={cancelAccessTypeChange}
        onConfirm={confirmAccessTypeChange}
        currentAccessType={originalAccessType}
        newAccessType={pendingAccessType || 'private'}
        isSaving={saving}
      />
    </div>
  );
}
