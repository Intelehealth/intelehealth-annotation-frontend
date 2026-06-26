'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { AnnotationWorkbench } from '@/components/annotation-components/annotation-workbench';
import { DatasetAnnotationWorkbench } from '@/components/annotation-components/dataset-annotation-workbench';

export default function AnnotationPage() {
  const searchParams = useSearchParams();
  const params = useParams();

  const csvImportId = searchParams.get('csvImportId');
  const datasetId = params.datasetId as string;

  // Feature 1: read taskId from URL — set by My Tasks "Open" button.
  const taskId = searchParams.get('taskId') ?? undefined;

  // Sprint B: inspection mode — admin views clone in read-only
  const mode = searchParams.get('mode') || 'annotation';
  const returnTo = searchParams.get('returnTo') || undefined;

  // Determine annotation mode
  const isDatasetLevel = !csvImportId;

  if (isDatasetLevel) {
    return (
      <div className="h-screen">
        <DatasetAnnotationWorkbench
          datasetId={datasetId}
          taskId={taskId}
          mode={mode as 'annotation' | 'inspect'}
          returnTo={returnTo}
        />
      </div>
    );
  } else {
    return (
      <div className="h-screen">
        <AnnotationWorkbench csvImportId={csvImportId} datasetId={datasetId} />
      </div>
    );
  }
}