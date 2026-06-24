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
  // Example: /dataset/123/annotation?taskId=abc
  // When present, the workbench scopes all reads/writes to this task (isolation).
  // When absent (admin viewing), workbench behaves exactly as before.
  const taskId = searchParams.get('taskId') ?? undefined;

  // Debug logging — matches existing pattern in this file
  console.log('AnnotationPage - csvImportId:', csvImportId);
  console.log('AnnotationPage - datasetId:', datasetId);
  console.log('AnnotationPage - taskId:', taskId);    // Feature 1
  console.log('AnnotationPage - params:', params);
  console.log('AnnotationPage - searchParams:', searchParams.toString());

  // Determine annotation mode
  const isDatasetLevel = !csvImportId;

  if (isDatasetLevel) {
    // Dataset-level annotation — Feature 1: pass taskId
    return (
      <div className="h-screen">
        <DatasetAnnotationWorkbench datasetId={datasetId} taskId={taskId} />
      </div>
    );
  } else {
    // CSV-level annotation (legacy support) — taskId not applicable here
    return (
      <div className="h-screen">
        <AnnotationWorkbench csvImportId={csvImportId} datasetId={datasetId} />
      </div>
    );
  }
}