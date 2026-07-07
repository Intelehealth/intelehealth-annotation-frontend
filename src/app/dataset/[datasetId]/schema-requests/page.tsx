'use client';

import { useParams, useRouter } from 'next/navigation';
import { SchemaRequestsTab } from '@/components/dataset-components/schema-requests-tab';

export function SchemaRequestsPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.datasetId as string;

  return (
    <div className="p-6">
      <SchemaRequestsTab
        datasetId={datasetId}
        onNavigateToOverview={() => router.push(`/dataset/${datasetId}`)}
      />
    </div>
  );
}

export default SchemaRequestsPage;
