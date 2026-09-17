'use client';

import { useEffect, useMemo, useState } from 'react';
import { Combine, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { jsonApi } from '@/lib/api';
import { fieldSelectionAPI, type MergedColumn } from '@/lib/api/field-config';
import { cn } from '@/lib/utils';

export interface MergeableColumn {
  name: string;
  sampleData?: string;
  source?: string;
}

const DELIMITERS: { label: string; value: string }[] = [
  { label: 'Space', value: ' ' },
  { label: 'Comma', value: ', ' },
  { label: 'Dash', value: ' - ' },
  { label: 'Pipe', value: ' | ' },
  { label: 'Slash', value: '/' },
  { label: 'New line', value: '\n' },
  { label: 'None', value: '' },
];

const show = (d: string) => (d === '\n' ? '\\n' : d === '' ? '(none)' : d.replace(/ /g, '␣'));

/**
 * Builds one column out of several: pick the columns, pick a delimiter, name
 * it. The value is written into every row of the dataset and its clones, so it
 * behaves like any other data column afterwards (usable as a viewing field,
 * exported, searchable).
 */
export function MergeColumns({
  datasetId,
  columns,
  onChanged,
}: {
  datasetId: string;
  columns: MergeableColumn[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [delimiter, setDelimiter] = useState(' ');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [existing, setExisting] = useState<MergedColumn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sampleRow, setSampleRow] = useState<Record<string, unknown>>({});

  const load = () => { fieldSelectionAPI.listMergedColumns(datasetId).then(setExisting).catch(() => setExisting([])); };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [datasetId]);
  // The column list carries no values, so the preview uses the dataset's first row.
  useEffect(() => {
    jsonApi
      .get(`/dataset-merged-rows/dataset/${datasetId}/rows`, { params: { page: 1, limit: 1 } })
      .then((r) => setSampleRow(r.data?.rows?.[0]?.data ?? {}))
      .catch(() => setSampleRow({}));
  }, [datasetId]);

  const sep = useCustom ? customDelimiter : delimiter;
  const suggested = useMemo(() => picked.join('_').replace(/\s+/g, '_'), [picked]);
  const finalName = (nameTouched ? name : suggested).trim();

  // Preview from the sample value of each column, so the admin sees the real shape.
  const preview = useMemo(() => {
    const value = (col: string) => {
      const v = sampleRow[col];
      if (v !== undefined && v !== null) return String(v);
      return String(columns.find((c) => c.name === col)?.sampleData ?? '');
    };
    return picked.map(value).map((v) => v.trim()).filter((v) => (skipEmpty ? v !== '' : true)).join(sep);
  }, [picked, columns, sampleRow, sep, skipEmpty]);

  const taken = new Set([...columns.map((c) => c.name.toLowerCase()), ...existing.map((e) => e.name.toLowerCase())]);
  const nameClash = finalName !== '' && taken.has(finalName.toLowerCase());
  const canCreate = picked.length >= 2 && finalName !== '' && !nameClash && !busy;

  const toggle = (col: string) =>
    setPicked((p) => (p.includes(col) ? p.filter((c) => c !== col) : [...p, col]));

  const create = async () => {
    setBusy(true); setError(null);
    try {
      await fieldSelectionAPI.mergeColumns(datasetId, { name: finalName, sourceColumns: picked, delimiter: sep, skipEmpty });
      setPicked([]); setName(''); setNameTouched(false); setOpen(false);
      load(); onChanged();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
      const m = err?.response?.data?.message;
      setError((Array.isArray(m) ? m.join(', ') : m) || err?.message || 'Could not merge the columns');
    } finally { setBusy(false); }
  };

  const remove = async (col: string) => {
    setBusy(true); setError(null);
    try { await fieldSelectionAPI.deleteMergedColumn(datasetId, col); load(); onChanged(); }
    catch { setError(`Could not remove "${col}"`); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <Combine className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Merged columns</p>
            <p className="text-xs text-gray-500">Join two or more columns into one, with your own separator and name.</p>
          </div>
        </div>
        <Button size="sm" variant={open ? 'ghost' : 'outline'} onClick={() => setOpen((o) => !o)}>
          {open ? 'Cancel' : <><Plus className="mr-1 h-4 w-4" /> Merge columns</>}
        </Button>
      </div>

      {existing.length > 0 && (
        <ul className="divide-y border-t">
          {existing.map((m) => (
            <li key={m.name} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="font-medium">{m.name}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-gray-500">
                {m.sourceColumns.join(`  ${show(m.delimiter)}  `)}
              </span>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(m.name)} aria-label={`Remove merged column ${m.name}`}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="space-y-4 border-t p-4">
          <div>
            <Label className="text-[10px] font-bold uppercase text-gray-500">Columns to join (order matters)</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {columns.map((c) => {
                const i = picked.indexOf(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggle(c.name)}
                    title={c.sampleData ? `e.g. ${c.sampleData}` : undefined}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs transition-colors',
                      i >= 0 ? 'border-blue-300 bg-blue-50 font-medium text-blue-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    {i >= 0 && <span className="mr-1 text-[10px] tabular-nums text-blue-500">{i + 1}</span>}
                    {c.name}
                  </button>
                );
              })}
            </div>
            {picked.length === 1 && <p className="mt-1 text-xs text-gray-500">Pick at least one more column.</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-[10px] font-bold uppercase text-gray-500">Separator</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {DELIMITERS.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => { setUseCustom(false); setDelimiter(d.value); }}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs',
                      !useCustom && delimiter === d.value ? 'border-blue-300 bg-blue-50 font-medium text-blue-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustom(true)}
                  className={cn('rounded-md border px-2 py-1 text-xs', useCustom ? 'border-blue-300 bg-blue-50 font-medium text-blue-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}
                >
                  Custom
                </button>
                {useCustom && (
                  <Input
                    value={customDelimiter}
                    onChange={(e) => setCustomDelimiter(e.target.value)}
                    placeholder="e.g. — "
                    aria-label="Custom separator"
                    className="h-7 w-24 text-xs"
                  />
                )}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={skipEmpty} onChange={(e) => setSkipEmpty(e.target.checked)} className="rounded border-gray-300" />
                Skip empty values (no double separators)
              </label>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase text-gray-500">New column name</Label>
              <Input
                value={nameTouched ? name : suggested}
                onChange={(e) => { setNameTouched(true); setName(e.target.value); }}
                placeholder="e.g. Patient summary"
                aria-label="Merged column name"
                className="mt-1.5 h-9 text-sm"
              />
              {nameClash && <p className="mt-1 text-xs text-red-600">A column with that name already exists.</p>}
            </div>
          </div>

          {picked.length >= 2 && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-bold uppercase text-gray-500">Preview (first row)</p>
              <p className="mt-1 whitespace-pre-wrap break-all text-sm text-gray-800">{preview || <span className="italic text-gray-400">empty</span>}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={create} disabled={!canCreate}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Create column
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            The value is written into every row, including annotators&apos; copies. Add it as a viewing field below to show it during annotation.
          </p>
        </div>
      )}
    </div>
  );
}
