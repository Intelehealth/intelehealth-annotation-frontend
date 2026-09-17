'use client';

import { useRef, useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fieldSelectionAPI, type MergedColumn } from '@/lib/api/field-config';

// Export a dataset's annotation workflow — its fields, manual columns, field
// groups and merged columns — as one JSON file, and import such a file into
// another dataset. Import is deliberately loose: a field whose CSV column is
// missing in the new dataset becomes a manually created field instead of an
// error, so one workflow can be reused across CSVs with different columns.

export interface WorkflowFile {
  version: 1;
  exportedAt: string;
  source: { datasetId: string; name: string };
  annotationFields: WorkflowField[];
  newColumns: WorkflowColumn[];
  fieldGroups: unknown[];
  mergedColumns: MergedColumn[];
}

type WorkflowField = {
  id: string;
  csvColumnName: string;
  fieldName: string;
  fieldType: string;
  isNewColumn?: boolean;
  newColumnId?: string;
  isPrimaryKey?: boolean;
  isRequired?: boolean;
  columnType?: string;
  options?: string[];
  [k: string]: unknown;
};
type WorkflowColumn = { id: string; columnName: string; columnType: string; [k: string]: unknown };

export interface ImportSummary {
  mapped: string[];
  manual: string[];
  merged: string[];
  mergeSkipped: string[];
}

const normalise = (v: string) => v.toLowerCase().replace(/[\s_-]+/g, '');
const MEDIA = ['image', 'audio', 'video'];

/** Match a column name from the file to one in this dataset, forgiving case, spaces, underscores. */
function matchColumn(name: string, available: string[]): string | undefined {
  return available.find((c) => c === name) ?? available.find((c) => normalise(c) === normalise(name));
}

/**
 * Fit an exported workflow onto this dataset's columns. Pure, so it can be
 * checked without a browser.
 */
export function remapWorkflow(
  file: Pick<WorkflowFile, 'annotationFields' | 'newColumns' | 'fieldGroups'>,
  available: string[],
): { annotationFields: WorkflowField[]; newColumns: WorkflowColumn[]; fieldGroups: unknown[]; mapped: string[]; manual: string[] } {
  const stamp = Date.now();
  const newColumns: WorkflowColumn[] = [...(file.newColumns || [])];
  const mapped: string[] = [];
  const manual: string[] = [];

  const annotationFields = (file.annotationFields || []).map((f, i) => {
    if (f.isNewColumn) {
      // A manual field travels as is; make sure its column definition came along.
      if (f.newColumnId && !newColumns.some((c) => c.id === f.newColumnId)) {
        newColumns.push({ id: f.newColumnId, columnName: f.fieldName, columnType: f.columnType || 'text', isRequired: !!f.isRequired, options: f.options || [] });
      }
      return f;
    }
    const hit = matchColumn(f.csvColumnName, available);
    if (hit) {
      mapped.push(f.fieldName);
      return { ...f, csvColumnName: hit };
    }
    // No such column here: keep the question, drop the data link.
    manual.push(f.fieldName);
    const id = `${stamp}-${i}`;
    const columnType = f.columnType || (MEDIA.includes(f.fieldType) ? undefined : 'text');
    newColumns.push({ id, columnName: f.fieldName, columnType: columnType || 'text', isRequired: !!f.isRequired, options: f.options || [] });
    return {
      ...f,
      id: `${id}_field`,
      csvColumnName: f.fieldName,
      isNewColumn: true,
      newColumnId: id,
      isAnnotationField: true,
      isPrimaryKey: false,
      columnType,
    };
  });

  return { annotationFields, newColumns, fieldGroups: file.fieldGroups || [], mapped, manual };
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export function WorkflowTransfer({
  datasetId,
  datasetName,
  availableColumns,
  current,
  onImport,
  onColumnsChanged,
  onError,
}: {
  datasetId: string;
  datasetName: string;
  availableColumns: string[];
  current: { annotationFields: unknown[]; newColumns: unknown[]; fieldGroups: unknown[] };
  onImport: (next: { annotationFields: WorkflowField[]; newColumns: WorkflowColumn[]; fieldGroups: unknown[] }, summary: ImportSummary) => void;
  onColumnsChanged: () => void;
  onError: (message: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const exportWorkflow = async () => {
    setBusy('export');
    try {
      const mergedColumns = await fieldSelectionAPI.listMergedColumns(datasetId).catch(() => [] as MergedColumn[]);
      const file: WorkflowFile = {
        version: 1,
        exportedAt: new Date().toISOString(),
        source: { datasetId, name: datasetName },
        annotationFields: current.annotationFields as WorkflowField[],
        newColumns: current.newColumns as WorkflowColumn[],
        fieldGroups: current.fieldGroups,
        mergedColumns,
      };
      const slug = (datasetName || 'dataset').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
      download(`${slug}-workflow.json`, JSON.stringify(file, null, 2));
    } finally {
      setBusy(null);
    }
  };

  const importWorkflow = async (picked: File) => {
    setBusy('import');
    try {
      const file = JSON.parse(await picked.text()) as Partial<WorkflowFile>;
      if (!Array.isArray(file.annotationFields)) {
        onError('That file is not an exported workflow: it has no fields.');
        return;
      }
      // Recreate merged columns whose sources exist here, so fields that
      // read from them can map. Ones that already exist are fine.
      const merged: string[] = [];
      const mergeSkipped: string[] = [];
      let available = [...availableColumns];
      for (const m of file.mergedColumns || []) {
        const sources = m.sourceColumns.map((c) => matchColumn(c, available));
        if (sources.some((c) => !c)) { mergeSkipped.push(m.name); continue; }
        if (matchColumn(m.name, available)) { merged.push(m.name); continue; }
        try {
          await fieldSelectionAPI.mergeColumns(datasetId, { name: m.name, sourceColumns: sources as string[], delimiter: m.delimiter, skipEmpty: m.skipEmpty });
          merged.push(m.name);
          available = [...available, m.name];
        } catch {
          mergeSkipped.push(m.name);
        }
      }
      if (merged.length) onColumnsChanged();

      const next = remapWorkflow(
        { annotationFields: file.annotationFields, newColumns: file.newColumns || [], fieldGroups: file.fieldGroups || [] },
        available,
      );
      onImport(next, { mapped: next.mapped, manual: next.manual, merged, mergeSkipped });
    } catch (e) {
      onError(e instanceof SyntaxError ? 'That file is not valid JSON.' : (e as Error).message || 'Could not import the workflow.');
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={exportWorkflow} disabled={busy !== null} className="h-8 px-3 text-sm" title="Download this dataset's fields, groups and merged columns as a file">
        {busy === 'export' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
        Export workflow
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={busy !== null} className="h-8 px-3 text-sm" title="Apply a workflow exported from another dataset. Fields whose column is missing here become manual fields.">
        {busy === 'import' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
        Import workflow
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Workflow file"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importWorkflow(f); }}
      />
    </div>
  );
}
