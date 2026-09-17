'use client';

import { useRouter } from 'next/navigation';
import { DatasetList } from './dataset-list';
import { DatasetResponse } from '@/lib/api/datasets';

export function DatasetManagement() {
  const router = useRouter();

  const handleAddDataset = () => {
    router.push('/dataset/add-dataset');
  };

  const handleEditDataset = (dataset: DatasetResponse) => {
    // For now, we'll keep the edit functionality in a modal
    // This could be updated to navigate to an edit page later
  };

  const handleDeleteDataset = (dataset: DatasetResponse) => {
    // The delete is handled in the DatasetList component
    // This is just for any additional cleanup if needed
  };

  return (
    <DatasetList
      onAddDataset={handleAddDataset}
      onEditDataset={handleEditDataset}
      onDeleteDataset={handleDeleteDataset}
    />
  );
}
