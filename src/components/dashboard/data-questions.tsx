'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboardDataAPI, AgentTool } from '@/lib/api/dashboard-data';
import type { DatasetResponse } from '@/lib/api/datasets';
import { Section } from './kpi';

// The backend's "analytics agent" is a set of eight deterministic queries over
// a dataset (no language model involved). Presented as the questions they
// answer; the result is shown verbatim.
const QUESTIONS: { tool: AgentTool; label: string; params?: 'field-value' }[] = [
  { tool: 'get_dataset_summary', label: 'Summarise this dataset' },
  { tool: 'get_annotation_progress', label: 'How far along is annotation?' },
  { tool: 'get_pending_reviews', label: 'What is waiting for review?' },
  { tool: 'get_consensus_conflicts', label: 'Where do annotators disagree?' },
  { tool: 'get_low_confidence_fields', label: 'Which fields have low confidence?' },
  { tool: 'get_processing_failures', label: 'Did any documents fail processing?' },
  { tool: 'find_duplicate_candidates', label: 'Are there likely duplicate rows?' },
  { tool: 'find_rows_by_field_value', label: 'Find rows where a field has a value', params: 'field-value' },
];

export function DataQuestions({ datasets }: { datasets: DatasetResponse[] }) {
  const parents = datasets.filter((d) => !d.isClone);
  const [datasetId, setDatasetId] = useState(parents[0]?._id ?? '');
  const [active, setActive] = useState<AgentTool | null>(null);
  const [field, setField] = useState('');
  const [value, setValue] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: (typeof QUESTIONS)[number]) => {
    if (!datasetId) return;
    setActive(q.tool);
    if (q.params === 'field-value' && (!field || !value)) { setResult(null); return; }
    setBusy(true); setError(null);
    try {
      const res = await dashboardDataAPI.queryAgent(datasetId, q.tool, q.params ? { fieldName: field, value } : undefined);
      setResult(typeof res.result === 'string' ? res.result : JSON.stringify(res.result, null, 2));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? 'The query failed.');
    } finally { setBusy(false); }
  };

  return (
    <Section title="Ask about a dataset" description="Eight questions the platform can answer directly from its data.">
      <div className="space-y-3 px-4 py-4">
        <select
          value={datasetId}
          onChange={(e) => { setDatasetId(e.target.value); setResult(null); }}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          aria-label="Dataset"
        >
          {parents.length === 0 && <option value="">No datasets</option>}
          {parents.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>

        <div className="flex flex-wrap gap-1.5">
          {QUESTIONS.map((q) => (
            <Button key={q.tool} size="sm" variant={active === q.tool ? 'default' : 'outline'} disabled={!datasetId || busy} onClick={() => ask(q)}>
              {q.label}
            </Button>
          ))}
        </div>

        {active === 'find_rows_by_field_value' && (
          <div className="flex gap-2">
            <Input placeholder="Field name" value={field} onChange={(e) => setField(e.target.value)} className="h-9" />
            <Input placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} className="h-9" />
            <Button size="sm" disabled={!field || !value || busy} onClick={() => ask(QUESTIONS[QUESTIONS.length - 1])}>Find</Button>
          </div>
        )}

        {busy && <p className="text-sm text-muted-foreground">Working…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && !busy && (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">{result}</pre>
        )}
      </div>
    </Section>
  );
}
