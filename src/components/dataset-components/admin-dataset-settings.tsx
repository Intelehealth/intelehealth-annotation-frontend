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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Save,
  Loader2,
  Database,
  Lock,
  Globe,
  Users,
  AlertCircle,
  FileText,
  Image,
  AudioLines,
  Check,
  ChevronsUpDown,
  X,
  UserPlus,
  Settings,
  Shield,
  Copy,    // Feature 1: Clone & Assign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { datasetsAPI, DatasetResponse, UpdateDatasetRequest } from '@/lib/api/datasets';
import { usersAPI, UserResponse } from '@/lib/api/users';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast';
import { AccessTypeWarningModal } from '@/components/ui/access-type-warning-modal';
import { CloneAssignModal } from '@/components/dataset-components/clone-assign-modal'; // Feature 1

interface AdminDatasetSettingsProps {
  datasetId: string;
}

export function AdminDatasetSettings({ datasetId }: AdminDatasetSettingsProps) {
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
  const [accessType, setAccessType] = useState<'private' | 'public' | 'shared'>('private');
  const [showAccessWarning, setShowAccessWarning] = useState(false);
  const [pendingAccessType, setPendingAccessType] = useState<'private' | 'public' | 'shared' | null>(null);
  const [originalAccessType, setOriginalAccessType] = useState<'private' | 'public' | 'shared'>('private');
  // Feature 1: Clone & Assign modal
  const [cloneModalOpen, setCloneModalOpen] = useState(false);

  // User management state
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [sharedUsers, setSharedUsers] = useState<UserResponse[]>([]);
  const [userComboOpen, setUserComboOpen] = useState(false);
  const [userSearchValue, setUserSearchValue] = useState('');

  useEffect(() => {
    loadDataset();
    loadUsers();
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
      
      // Check if this dataset has consensus clones assigned to annotators
      let clonesSharedUsers: UserResponse[] = [];
      let isConsensus = false;
      try {
        const group = await datasetsAPI.getCloneGroup(datasetId);
        if (group && group.totalClones > 0) {
          isConsensus = true;
          clonesSharedUsers = group.clones
            .filter((c: any) => c.annotator)
            .map((c: any) => {
              const emailName = c.annotator.email.split('@')[0];
              const nameParts = emailName.split('.');
              const defaultFirst = nameParts[0] || emailName;
              const defaultLast = nameParts[1] || '';
              
              return {
                _id: c.annotator._id,
                email: c.annotator.email,
                firstName: c.annotator.firstName || (defaultFirst.charAt(0).toUpperCase() + defaultFirst.slice(1)),
                lastName: c.annotator.lastName || (defaultLast ? defaultLast.charAt(0).toUpperCase() + defaultLast.slice(1) : ''),
                role: 'ANNOTATOR' as const,
                isActive: true,
                authProvider: 'local' as const,
                status: 'ACTIVE' as const,
                firstLoginCompleted: true,
                invitedByAdmin: true,
                isOnline: false,
                createdAt: '',
                updatedAt: ''
              };
            });
        }
      } catch (e) {
        console.error('Failed to load clone group:', e);
      }

      if (isConsensus) {
        setAccessType('shared');
        setOriginalAccessType('shared');
        setSharedUsers(clonesSharedUsers);
      } else {
        setAccessType(data.accessType);
        setOriginalAccessType(data.accessType);
        
        // Set shared users if access type is shared
        if (data.accessType === 'shared' && data.sharedWith) {
          // Convert sharedWith objects to UserResponse format for display
          const sharedUserObjects = data.sharedWith.map(sharedUser => {
            // Extract name from email if firstName/lastName not available
            const emailName = sharedUser.email.split('@')[0];
            const nameParts = emailName.split('.');
            const firstName = nameParts[0] || emailName;
            const lastName = nameParts[1] || '';
            
            return {
              _id: sharedUser.userId,
              email: sharedUser.email,
              firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
              lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
              role: 'ANNOTATOR' as const,
              isActive: true,
              authProvider: 'local' as const,
              status: 'ACTIVE' as const,
              firstLoginCompleted: true,
              invitedByAdmin: true,
              isOnline: false,
              createdAt: '',
              updatedAt: ''
            };
          });
          setSharedUsers(sharedUserObjects);
        } else {
          setSharedUsers([]);
        }
      }
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

  const loadUsers = async () => {
    try {
      const users = await usersAPI.getAll();
      setAllUsers(users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleAccessTypeChange = (newAccessType: 'private' | 'public' | 'shared') => {
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
        sharedWith: pendingAccessType === 'shared' ? sharedUsers.map(u => ({ userId: u._id, email: u.email })) : [],
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
        sharedWith: accessType === 'shared' ? sharedUsers.map(u => ({ userId: u._id, email: u.email })) : [],
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

  const addUserToShared = (user: UserResponse) => {
    if (!sharedUsers.find(u => u._id === user._id)) {
      setSharedUsers([...sharedUsers, user]);
    }
    setUserComboOpen(false);
    setUserSearchValue('');
  };

  const removeUserFromShared = (userId: string) => {
    setSharedUsers(sharedUsers.filter(u => u._id !== userId));
  };

  const getAccessTypeIcon = (type: string) => {
    switch (type) {
      case 'private':
        return Lock;
      case 'public':
        return Globe;
      case 'shared':
        return Users;
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
      case 'shared':
        return 'text-blue-600';
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
      case 'shared':
        return 'Only specific users can access this dataset';
      default:
        return '';
    }
  };

  // Filter users for combobox (exclude already shared users, current user, and dataset owner)
  const availableUsers = allUsers.filter(
    u => !sharedUsers.find(su => su._id === u._id) && 
         u._id !== user?._id && 
         u._id !== (dataset?.userId && typeof dataset.userId === 'object' ? dataset.userId._id : dataset?.userId)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto w-full p-4">
        {/* Header */}
        <div className="text-left mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Dataset Settings (Admin)
          </h1>
          <p className="text-gray-600">
            Manage dataset configuration and access permissions
          </p>
        </div>

        <div className="space-y-6 mb-6">
          {/* Basic Information Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </div>
              <CardDescription>
                Configure the basic properties of your dataset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dataset Name */}
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

              {/* Description */}
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


              {/* Dataset Type */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Dataset Type *
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'text', label: 'Text Dataset', icon: FileText },
                    { value: 'image', label: 'Image Dataset', icon: Image },
                    { value: 'audio', label: 'Audio Dataset', icon: AudioLines },
                    { value: 'multimodal', label: 'Multi-modal', icon: Database },
                  ].map((type) => {
                    const Icon = type.icon;
                    const isSelected = datasetType === type.value;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setDatasetType(type.value)}
                        className={cn(
                          'flex flex-col items-center space-y-2 p-4 rounded-lg border-2 transition-all hover:shadow-sm',
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                        )}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-sm font-medium text-center">
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Feature 1: Consensus Annotation Card ──────────────────────────
              Visible to admin only. Opens CloneAssignModal which calls
              POST /datasets/:id/clone-assign to create DatasetAnnotationTask
              records for each selected annotator. */}
          <Card className="shadow-sm border-blue-100">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <Copy className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Consensus Annotation</CardTitle>
              </div>
              <CardDescription>
                Assign this dataset to multiple annotators for independent annotation and consensus review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    How consensus annotation works
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Each annotator gets their own <strong>isolated copy</strong> of this dataset
                    and annotates independently — they cannot see each other&apos;s work. After
                    all annotators finish, use <strong>Consensus Review</strong> (in the Dataset
                    sidebar) to compare answers and resolve any disagreements. Recommended: 3 or 5
                    annotators for majority voting.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setCloneModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Copy className="h-4 w-4 mr-2" />
                Clone &amp; Assign to Annotators
              </Button>
            </CardContent>
          </Card>

          {/* Access Management Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Access Management</CardTitle>
              </div>
              <CardDescription>
                Control who can access this dataset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dataset Owner */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Dataset Owner
                </Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-green-600">
                          {dataset.userId && typeof dataset.userId === 'object' 
                            ? `${dataset.userId.firstName[0]}${dataset.userId.lastName[0]}` 
                            : 'U'
                          }
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {dataset.userId && typeof dataset.userId === 'object' 
                            ? `${dataset.userId.firstName} ${dataset.userId.lastName}` 
                            : 'Unknown User'
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {dataset.userId && typeof dataset.userId === 'object' ? dataset.userId.email : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Owner
                    </span>
                  </div>
                </div>
              </div>

              {/* Access Type Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Access Type *
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      color: 'text-green-600',
                      bgColor: 'bg-green-50',
                      borderColor: 'border-green-200',
                    },
                    {
                      value: 'shared',
                      label: 'Shared',
                      description: 'Only specific users can access',
                      icon: Users,
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
                        onClick={() => handleAccessTypeChange(type.value as 'private' | 'public' | 'shared')}
                        className={cn(
                          'flex flex-col items-center space-y-2 p-4 rounded-lg border-2 transition-all hover:shadow-sm text-center',
                          isSelected
                            ? `${type.bgColor} ${type.borderColor} shadow-sm ring-2 ring-blue-500 ring-opacity-20`
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                        )}
                      >
                        <Icon className={cn('h-6 w-6', 
                          isSelected ? type.color : 'text-gray-400'
                        )} />
                        <div className="flex-1">
                          <span className={cn('text-sm font-medium block', 
                            isSelected ? type.color : 'text-gray-600'
                          )}>
                            {type.label}
                          </span>
                          <p className={cn('text-xs mt-1',
                            isSelected ? 'text-gray-700' : 'text-gray-500'
                          )}>
                            {type.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shared Users Management */}
              {accessType === 'shared' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">
                      Shared Users
                    </Label>
                    {sharedUsers.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {sharedUsers.length} user{sharedUsers.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  
                  {/* Add User Combobox */}
                  <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={userComboOpen}
                        className="w-full justify-between h-10"
                      >
                        <div className="flex items-center space-x-2">
                          <UserPlus className="h-4 w-4" />
                          <span className="text-sm">Add user...</span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search users..." 
                          value={userSearchValue}
                          onValueChange={setUserSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {availableUsers.map((user) => (
                              <CommandItem
                                key={user._id}
                                value={`${user.firstName} ${user.lastName} ${user.email}`}
                                onSelect={() => addUserToShared(user)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    sharedUsers.find(u => u._id === user._id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {user.firstName} {user.lastName}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {user.email}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Shared Users List */}
                  {sharedUsers.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sharedUsers.map((sharedUser) => (
                        <div
                          key={sharedUser._id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {sharedUser.firstName?.[0] ?? ''}{sharedUser.lastName?.[0] ?? sharedUser.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {sharedUser.firstName} {sharedUser.lastName || sharedUser.email.split('@')[0]}
                              </p>
                              <p className="text-xs text-gray-500">
                                {sharedUser.email}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUserFromShared(sharedUser._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {sharedUsers.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No users added yet</p>
                      <p className="text-xs">Use the button above to add users</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4 border-t border-gray-200 space-x-3">
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

      {/* Access Type Warning Modal */}
      <AccessTypeWarningModal
        isOpen={showAccessWarning}
        onClose={cancelAccessTypeChange}
        onConfirm={confirmAccessTypeChange}
        currentAccessType={originalAccessType}
        newAccessType={pendingAccessType || 'private'}
        isSaving={saving}
      />

      {/* Feature 1: Clone & Assign Modal */}
      {dataset && (
        <CloneAssignModal
          isOpen={cloneModalOpen}
          onClose={() => setCloneModalOpen(false)}
          onSuccess={() => {
            setCloneModalOpen(false);
            loadDataset(); // Refresh: dataset is now 'shared' with annotators listed
          }}
          datasetId={datasetId}
          datasetName={dataset.name}
        />
      )}
    </div>
  );
}