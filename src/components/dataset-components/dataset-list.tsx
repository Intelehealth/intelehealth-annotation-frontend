'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Plus,
  Search,
  Database,
  Calendar,
  Loader2,
  Trash2,
  Lock,
  Globe,
  Users,
  Settings,
  GitBranch,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { datasetsAPI, DatasetResponse } from '@/lib/api/datasets';
import { CloneGroup } from '@/types/feature1';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import { DatasetPagination } from './dataset-pagination';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';

interface DatasetListProps {
  onAddDataset?: () => void;
  onEditDataset?: (dataset: DatasetResponse) => void;
  onDeleteDataset?: (dataset: DatasetResponse) => void;
  className?: string;
}

export function DatasetList({
  onAddDataset,
  onEditDataset,
  onDeleteDataset,
  className,
}: DatasetListProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [datasets, setDatasets] = useState<DatasetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDatasets, setFilteredDatasets] = useState<DatasetResponse[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] =
    useState<DatasetResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clone group state (admin only)
  const [expandedCloneGroup, setExpandedCloneGroup] = useState<string | null>(null);
  const [cloneGroupData, setCloneGroupData] = useState<Record<string, CloneGroup>>({});
  const [loadingCloneGroup, setLoadingCloneGroup] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDatasets(datasets);
    } else {
      // Use backend search API for better performance
      searchDatasets(searchQuery);
    }
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchQuery]);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await datasetsAPI.getAll();
      setDatasets(data);
      setFilteredDatasets(data);
    } catch (err) {
      setError('Failed to load datasets');
      showToast({
        title: 'Error',
        description: 'Failed to load datasets',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const searchDatasets = async (query: string) => {
    try {
      const results = await datasetsAPI.search(query);
      setFilteredDatasets(results);
    } catch (err) {
      // Fallback to client-side search if API fails
      const filtered = datasets.filter(
        (dataset) =>
          dataset.name?.toLowerCase().includes(query.toLowerCase()) ||
          dataset.description?.toLowerCase().includes(query.toLowerCase()) ||
          dataset.datasetType?.toLowerCase().includes(query.toLowerCase()),
      );
      setFilteredDatasets(filtered);
    }
  };

  const handleDeleteClick = (dataset: DatasetResponse) => {
    setDatasetToDelete(dataset);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!datasetToDelete) return;

    try {
      setIsDeleting(true);
      await datasetsAPI.delete(datasetToDelete._id);
      await loadDatasets(); // Reload the list
      onDeleteDataset?.(datasetToDelete);

      showToast({
        title: 'Dataset Deleted',
        description: `"${datasetToDelete.name}" has been deleted successfully.`,
        type: 'success',
      });
    } catch (err) {
      setError('Failed to delete dataset');
      showToast({
        title: 'Error',
        description: 'Failed to delete dataset',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDatasetToDelete(null);
    }
  };

  const handleCardClick = (dataset: DatasetResponse) => {
    router.push(`/dataset/${dataset._id}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Non-clone datasets only — clones are implementation details; never show in the list
  const visibleDatasets = filteredDatasets.filter((d: any) => !d.isClone);

  // Get current page datasets (clones already excluded)
  const getCurrentPageDatasets = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return visibleDatasets.slice(startIndex, endIndex);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDatasetTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      text: 'bg-blue-100 text-blue-800',
      image: 'bg-green-100 text-green-800',
      audio: 'bg-purple-100 text-purple-800',
      multimodal: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getAccessTypeIcon = (accessType: string) => {
    switch (accessType) {
      case 'private':
        return <Lock className="h-3 w-3" />;
      case 'public':
        return <Globe className="h-3 w-3" />;
      case 'shared':
        return <Users className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
    }
  };

  const getAccessTypeColor = (accessType: string) => {
    switch (accessType) {
      case 'private':
        return 'bg-gray-100 text-gray-700';
      case 'public':
        return 'bg-blue-100 text-blue-700';
      case 'shared':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const isOwner = (dataset: DatasetResponse) => {
    if (!dataset.userId) return false;
    const userId = typeof dataset.userId === 'string' ? dataset.userId : dataset.userId._id;
    return userId === user?._id;
  };

  const isAdmin = () => user?.role?.toUpperCase() === 'ADMIN';

  const handleToggleCloneGroup = async (datasetId: string) => {
    if (expandedCloneGroup === datasetId) {
      setExpandedCloneGroup(null);
      return;
    }
    setExpandedCloneGroup(datasetId);
    if (cloneGroupData[datasetId]) return; // already fetched
    try {
      setLoadingCloneGroup(datasetId);
      const data = await datasetsAPI.getCloneGroup(datasetId);
      setCloneGroupData(prev => ({ ...prev, [datasetId]: data }));
    } catch {
      showToast({ title: 'Error', description: 'Failed to load clone group', type: 'error' });
      setExpandedCloneGroup(null);
    } finally {
      setLoadingCloneGroup(null);
    }
  };

  const getCloneStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    if (status === 'in_progress') return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    return <AlertCircle className="h-3.5 w-3.5 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading datasets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadDatasets} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 min-h-0', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Datasets</h1>
          <p className="text-gray-600 mt-0.5">
            Manage your data annotation datasets
          </p>
        </div>
        <Button onClick={onAddDataset} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Dataset
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Dataset Grid */}
      {visibleDatasets.length === 0 ? (
        <div className="text-center py-12">
          <Database className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No datasets found' : 'No datasets yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Get started by creating your first dataset'}
          </p>
          {!searchQuery && (
            <Button onClick={onAddDataset}>
              <Plus className="h-4 w-4 mr-2" />
              Create Dataset
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {getCurrentPageDatasets().map((dataset) => (
            <Card
              key={dataset._id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleCardClick(dataset)}
            >
              <CardHeader className="pb-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-2xl font-semibold text-gray-900">
                        {dataset.name || 'Untitled Dataset'}
                      </CardTitle>
                      {/* Access Type Badge */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                          getAccessTypeColor(dataset.accessType || 'private')
                        )}
                      >
                        {getAccessTypeIcon(dataset.accessType || 'private')}
                        {dataset.accessType || 'private'}
                      </span>
                    </div>
                    <CardDescription className="mt-1 text-sm text-gray-600">
                      {dataset.description || 'No description available'}
                    </CardDescription>
                    {/* Owner info for non-owned datasets */}
                    {!isOwner(dataset) && (
                      <div className="mt-1 text-xs text-gray-500">
                        by {dataset.userId && typeof dataset.userId === 'object' ? `${dataset.userId.firstName} ${dataset.userId.lastName}` : 'Unknown'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                     {/* Settings button - for owners and admins */}
                     {(isOwner(dataset) || isAdmin()) && (
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           router.push(`/dataset/${dataset._id}?tab=settings`);
                         }}
                         className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                       >
                         <Settings className="h-4 w-4" />
                       </Button>
                     )}
                    {/* Delete button - only for owners or admins */}
                    {(isOwner(dataset) || isAdmin()) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(dataset);
                        }}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getDatasetTypeColor(dataset.datasetType),
                      )}
                    >
                      {dataset.datasetType?.replace('-', ' ') || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Created {formatDate(dataset.createdAt)}</span>
                  </div>
                  {/* Shared users info */}
                  {dataset.accessType === 'shared' && dataset.sharedWith && dataset.sharedWith.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>
                        Shared with {dataset.sharedWith.length} user{dataset.sharedWith.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {/* Admin: View Clones button */}
                  {isAdmin() && !(dataset as any).isClone && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleCloneGroup(dataset._id); }}
                      className="mt-1 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                      {loadingCloneGroup === dataset._id ? 'Loading...' : expandedCloneGroup === dataset._id ? 'Hide Clones' : 'View Clones'}
                      {expandedCloneGroup === dataset._id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                </div>

                {/* Clone Group Panel */}
                {isAdmin() && expandedCloneGroup === dataset._id && cloneGroupData[dataset._id] && (
                  <div
                    className="mt-3 pt-3 border-t border-indigo-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {cloneGroupData[dataset._id].totalClones === 0 ? (
                      <p className="text-xs text-gray-400 italic">No clones yet. Use Clone &amp; Assign on this dataset.</p>
                    ) : (
                      <div className="space-y-2">
                        {cloneGroupData[dataset._id].clones.map((clone) => {
                          const pct = clone.progress?.percentage ?? 0;
                          const annotatorName = (clone as any).annotator
                            ? `${(clone as any).annotator.firstName} ${(clone as any).annotator.lastName}`.trim()
                            : `Clone ${clone.cloneIndex}`;
                          return (
                            <div key={clone._id} className="bg-indigo-50 rounded-md p-2">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  {getCloneStatusIcon(clone.taskStatus)}
                                  <span className="text-xs font-medium text-gray-700">{annotatorName}</span>
                                </div>
                                <span className="text-xs text-gray-500">{pct}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={cn('h-1.5 rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-indigo-500')}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {clone.progress?.completedRows ?? 0}/{clone.progress?.totalRows ?? 0} rows
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            ))}
          </div>
          
          {/* Pagination */}
          <DatasetPagination
            totalItems={visibleDatasets.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            className="mt-1"
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={datasetToDelete?.name || ''}
        itemType="dataset"
        isLoading={isDeleting}
      />
    </div>
  );
}
