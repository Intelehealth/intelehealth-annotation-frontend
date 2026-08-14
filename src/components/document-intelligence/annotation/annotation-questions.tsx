'use client';

import { useEffect, useState } from 'react';
import { Plus, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentView } from '../context/document-view-context';
import { fieldSelectionAPI } from '@/lib/api/field-config';
import { AddQuestionDialog } from './add-question-dialog';

export function AnnotationQuestions() {
  const { datasetId, pendingQuestion, clearPendingQuestion } = useDocumentView();
  const [fields, setFields] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openForRequest = pendingQuestion !== null;
  const open2 = dialogOpen || openForRequest;

  const load = async () => {
    try {
      const config = await fieldSelectionAPI.getDatasetFieldConfig(datasetId);
      setFields((config as any)?.annotationFields || []);
    } catch {
      setFields([]);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, [datasetId]);

  return (
    <div className="space-y-3">
      {!loaded ? (
        <p className="text-xs text-gray-400">Loading annotation questions…</p>
      ) : fields.length === 0 ? (
        <p className="text-xs text-gray-500">No annotation questions configured.</p>
      ) : (
        <ul className="space-y-1.5">
          {fields.map((f) => (
            <li
              key={f.id || f.fieldName}
              className="flex items-center gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs"
            >
              <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
              <span className="min-w-0 flex-1 truncate font-medium text-gray-700">{f.fieldName}</span>
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                {f.columnType || f.fieldType || 'text'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button
        size="sm"
        variant="outline"
        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Add Annotation Question
      </Button>
      <AddQuestionDialog
        datasetId={datasetId}
        open={open2}
        initialQuestion={pendingQuestion ?? undefined}
        onOpenChange={(o) => {
          if (!o) clearPendingQuestion();
          setDialogOpen(false);
        }}
        onAdded={() => {
          clearPendingQuestion();
          setDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}