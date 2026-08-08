'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { motion } from 'framer-motion';

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
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete dataset';
      setError(message);
      showToast({
        title: 'Error',
        description: message,
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDatasetToDelete(null);
    }
  };

  const handleCardClick = (dataset: DatasetResponse) => {
    if (dataset?._id) {
      router.push(`/dataset/${dataset._id}`);
    }
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
    <div className={cn('space-y-5 min-h-0', className)}>
      {/* Header row — title inline with Add button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Datasets</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your data annotation datasets</p>
        </div>
        <motion.button
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ y: 1, scale: 0.98 }}
          onClick={onAddDataset}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white
            bg-gradient-to-br from-blue-600 to-blue-700
            shadow-[0_4px_14px_rgba(37,99,235,0.3),0_2px_4px_rgba(37,99,235,0.15)]
            hover:shadow-[0_6px_20px_rgba(37,99,235,0.4),0_3px_6px_rgba(37,99,235,0.2)]
            active:shadow-[0_1px_3px_rgba(37,99,235,0.2)]
            transition-shadow duration-200 flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Dataset
        </motion.button>
      </div>

      {/* Stats row — minimal context cards */}
      <div className="flex flex-wrap gap-3">
        <div className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-50/80 to-white border border-blue-200/40 shadow-sm">
          <p className="text-xs text-gray-500">Total Datasets</p>
          <p className="text-lg font-bold text-gray-900">{visibleDatasets.length}</p>
        </div>
        <div className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-200/40 shadow-sm">
          <p className="text-xs text-gray-500">Private</p>
          <p className="text-lg font-bold text-gray-900">{visibleDatasets.filter((d: any) => d.accessType === 'private').length}</p>
        </div>
        <div className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-200/40 shadow-sm">
          <p className="text-xs text-gray-500">Public / Shared</p>
          <p className="text-lg font-bold text-gray-900">{visibleDatasets.filter((d: any) => d.accessType !== 'private').length}</p>
        </div>
      </div>

      {/* Search bar — glassmorphism */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search datasets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-white/80 backdrop-blur-sm border-gray-200/70 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl"
        />
      </div>

      {/* Dataset Grid */}
      {visibleDatasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center py-12 px-4">
          <Database className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No datasets found' : 'No datasets yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Get started by creating your first dataset'}
          </p>
          {!searchQuery && (
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ y: 1, scale: 0.98 }}
              onClick={onAddDataset}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                bg-gradient-to-br from-blue-600 to-blue-700
                shadow-[0_4px_14px_rgba(37,99,235,0.3),0_2px_4px_rgba(37,99,235,0.15)]
                hover:shadow-[0_6px_20px_rgba(37,99,235,0.4),0_3px_6px_rgba(37,99,235,0.2)]
                active:shadow-[0_1px_3px_rgba(37,99,235,0.2)]
                transition-shadow duration-200"
            >
              <Plus className="h-4 w-4" />
              Create Dataset
            </motion.button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getCurrentPageDatasets().map((dataset) => (
              <motion.div
                key={dataset._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -3 }}
                className="relative rounded-xl border border-gray-200/70 bg-white shadow-sm
                  hover:shadow-lg hover:border-blue-200/50 cursor-pointer transition-all duration-200
                  flex flex-col"
                onClick={() => handleCardClick(dataset)}
              >
                {/* Card body */}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  {/* Title row + action icons */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {dataset.name || 'Untitled Dataset'}
                        </h3>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0',
                          getAccessTypeColor(dataset.accessType || 'private')
                        )}>
                          {getAccessTypeIcon(dataset.accessType || 'private')}
                          {dataset.accessType || 'private'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {dataset.description || 'No description available'}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {(isOwner(dataset) || isAdmin()) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); router.push(`/dataset/${dataset._id}?tab=settings`); }}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(isOwner(dataset) || isAdmin()) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(dataset); }}
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Owner info */}
                  {!isOwner(dataset) && (
                    <p className="text-[11px] text-gray-400">
                      by {dataset.userId && typeof dataset.userId === 'object' ? `${dataset.userId.firstName} ${dataset.userId.lastName}` : 'Unknown'}
                    </p>
                  )}

                  {/* Tags + Meta row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium',
                      getDatasetTypeColor(dataset.datasetType),
                    )}>
                      {dataset.datasetType?.replace('-', ' ') || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {formatDate(dataset.createdAt)}
                    </span>
                    {dataset.accessType === 'shared' && dataset.sharedWith && dataset.sharedWith.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Users className="h-3 w-3" />
                        {dataset.sharedWith.length} shared
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer: View Clones (admin only) */}
                {isAdmin() && !dataset.isClone && (
                  <div className="px-4 pb-3 pt-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleCloneGroup(dataset._id); }}
                      className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      <GitBranch className="h-3 w-3" />
                      {loadingCloneGroup === dataset._id ? 'Loading...' : expandedCloneGroup === dataset._id ? 'Hide Clones' : 'View Clones'}
                      {expandedCloneGroup === dataset._id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                )}

                {/* Clone Group Panel */}
                {isAdmin() && expandedCloneGroup === dataset._id && cloneGroupData[dataset._id] && (
                  <div className="px-4 pb-4 pt-0 border-t border-indigo-100" onClick={(e) => e.stopPropagation()}>
                    {cloneGroupData[dataset._id].totalClones === 0 ? (
                      <p className="text-xs text-gray-400 italic mt-2">No clones yet. Use Clone &amp; Assign on this dataset.</p>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {cloneGroupData[dataset._id].clones.map((clone) => {
                          const pct = clone.progress?.percentage ?? 0;
                          const annotatorName = clone.annotator
                            ? `${clone.annotator.firstName} ${clone.annotator.lastName}`.trim()
                            : `Clone ${clone.cloneIndex}`;
                          return (
                            <div key={clone._id} className="bg-indigo-50/60 rounded-lg p-2.5">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  {getCloneStatusIcon(clone.taskStatus)}
                                  <span className="text-xs font-medium text-gray-700">{annotatorName}</span>
                                </div>
                                <span className="text-xs text-gray-500">{pct}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className={cn('h-1.5 rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-indigo-500')} style={{ width: `${pct}%` }} />
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
              </motion.div>
            ))}

            {/* Ghost card — hint to add more */}
            {visibleDatasets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                onClick={onAddDataset}
                className="rounded-xl border-2 border-dashed border-gray-200/60 bg-gray-50/40
                  flex items-center justify-center p-6 cursor-pointer
                  hover:border-blue-300/60 hover:bg-blue-50/30 transition-all duration-200 min-h-[160px]"
              >
                <div className="text-center">
                  <Plus className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-500">Create another dataset</p>
                </div>
              </motion.div>
            )}
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
