'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, History, RefreshCw, Search } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { TopNav } from '@/components/top-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { historyAPI, type HistoryFilters, type HistoryPage, type HistorySummary } from '@/lib/api/history';
import { apiMessage } from '@/lib/api/workspaces';
import { Empty, Section } from '@/components/dashboard/kpi';
import { timeAgo } from '@/components/dashboard/format';

// Who changed what, when — for one shared dataset or a parent and its clones.
// Filters are server-side (person, field, copy, text, date range) so the
// list stays fast on large histories; the page refreshes every 20s.
export default function DatasetHistoryPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [filters, setFilters] = useState<HistoryFilters>({ page: 1, limit: 50 });
  const [q, setQ] = useState('');
  const [data, setData] = useState<HistoryPage | null>(null);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [d, s] = await Promise.all([historyAPI.list(datasetId, filters), historyAPI.summary(datasetId)]);
      setData(d); setSummary(s); setError(null);
    } catch (e) { setError(apiMessage(e, 'Could not load the history')); }
    finally { setBusy(false); }
  }, [datasetId, filters]);

  useEffect(() => { if (!isLoading && !isAuthenticated) router.push('/login'); }, [isLoading, isAuthenticated, router]);
  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);
  useEffect(() => {
    if (!isAuthenticated) return;
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 20000);
    return () => window.clearInterval(t);
  }, [isAuthenticated, load]);
  // debounce free-text search
  useEffect(() => { const t = window.setTimeout(() => setFilters((f) => ({ ...f, q, page: 1 })), 350); return () => window.clearTimeout(t); }, [q]);

  const set = (patch: HistoryFilters) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const isClone = (data?.mode ?? summary?.mode) === 'CLONE';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar className="hidden lg:flex" />
      <main className="flex-1 overflow-auto">
        <TopNav />
        <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/dataset/${datasetId}`)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><History className="h-5 w-5" /></div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">History</h1>
                <p className="text-xs text-muted-foreground">
                  {isClone ? 'Each annotator works in their own copy; every change is listed with the copy it belongs to.' : 'Everyone works on the same dataset; every change is listed with who made it.'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className={`mr-1 h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</Button>
          </header>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {summary && <People summary={summary} onPick={(id) => set({ user: id })} active={filters.user} />}

          <Section title="Changes" description={data ? `${data.total.toLocaleString()} change${data.total === 1 ? '' : 's'} match.` : 'Loading…'}>
            <div className="grid gap-2 border-b px-4 py-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
              <label className="relative text-sm">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search values or fields" className="pl-8" aria-label="Search history" />
              </label>
              <Select value={filters.user ?? ''} onChange={(v) => set({ user: v })} label="Person" options={(data?.people ?? []).map((p) => [p.id, p.name])} />
              <Select value={filters.field ?? ''} onChange={(v) => set({ field: v })} label="Field" options={(data?.fields ?? []).map((f) => [f, f])} />
              {isClone && <Select value={filters.dataset ?? ''} onChange={(v) => set({ dataset: v })} label="Copy" options={(data?.copies ?? []).map((c) => [c.id, c.isClone ? (c.annotator?.name ?? c.name) : 'Parent'])} />}
              <div className="flex gap-2">
                <Input type="date" value={filters.from ?? ''} onChange={(e) => set({ from: e.target.value })} aria-label="From date" className="text-xs" />
                <Input type="date" value={filters.to ?? ''} onChange={(e) => set({ to: e.target.value ? `${e.target.value}T23:59:59` : '' })} aria-label="To date" className="text-xs" />
              </div>
            </div>

            {!data ? <div className="h-40 animate-pulse bg-muted/40" /> : data.items.length === 0 ? <Empty>No changes match these filters.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-4 py-2 font-medium">When</th>
                      <th className="px-4 py-2 font-medium">Who</th>
                      {isClone && <th className="px-4 py-2 font-medium">Copy</th>}
                      <th className="px-4 py-2 font-medium">Row</th>
                      <th className="px-4 py-2 font-medium">Field</th>
                      <th className="px-4 py-2 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.items.map((h) => (
                      <tr key={h.id} className="align-top">
                        <td className="whitespace-nowrap px-4 py-2 text-xs tabular-nums text-muted-foreground" title={new Date(h.at).toLocaleString()}>{timeAgo(h.at)}</td>
                        <td className="whitespace-nowrap px-4 py-2">
                          <button type="button" className="hover:underline" onClick={() => h.by && set({ user: h.by.id })}>{h.by?.name ?? '—'}</button>
                        </td>
                        {isClone && <td className="max-w-[160px] truncate px-4 py-2 text-xs text-muted-foreground" title={h.dataset?.name}>{h.dataset?.isClone ? h.dataset.name.replace(/^.*Clone \d+ ?/, 'Clone ') : 'Parent'}</td>}
                        <td className="px-4 py-2 tabular-nums">{h.rowIndex}</td>
                        <td className="px-4 py-2"><button type="button" className="hover:underline" onClick={() => set({ field: h.fieldName })}>{h.fieldName}</button></td>
                        <td className="px-4 py-2">
                          <Value v={h.oldValue} muted /> <span className="text-muted-foreground">→</span> <Value v={h.newValue} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data && pages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
                <span>Page {data.page} of {pages}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={data.page >= pages} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>Next</Button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </main>
    </div>
  );
}

function People({ summary, onPick, active }: { summary: HistorySummary; onPick: (id: string) => void; active?: string }) {
  const last = summary.lastChange;
  return (
    <Section title="People" description={last ? `Last change ${timeAgo(last.at)} by ${last.by?.name ?? 'unknown'}: ${last.fieldName} on row ${last.rowIndex}${last.dataset && summary.mode === 'CLONE' ? ` (${last.dataset})` : ''}.` : 'No changes recorded yet.'}>
      {summary.people.length === 0 ? <Empty>Nobody has changed this dataset yet.</Empty> : (
        <ul className="divide-y">
          {summary.people.map((p) => (
            <li key={`${p.id}-${p.dataset?.id}`}>
              <button type="button" onClick={() => onPick(active === p.id ? '' : p.id)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/40 ${active === p.id ? 'bg-muted/60' : ''}`}>
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${p.workingNow ? 'bg-emerald-500' : p.isOnline ? 'bg-amber-400' : 'bg-muted-foreground/30'}`} title={p.workingNow ? 'working now' : p.isOnline ? 'online' : 'offline'} />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{p.name}</span>
                  {summary.mode === 'CLONE' && p.dataset && <span className="ml-2 text-xs text-muted-foreground">{p.dataset.isClone ? 'own copy' : 'parent'}</span>}
                  <span className="block truncate text-xs text-muted-foreground">{p.changes.toLocaleString()} changes across {p.rowsTouched} rows · last {timeAgo(p.lastAt)}</span>
                </span>
                {p.workingNow && <Badge variant="secondary">working now</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Select({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
      <option value="">{label}: all</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function Value({ v, muted }: { v: unknown; muted?: boolean }) {
  const text = v === null || v === undefined || v === '' ? 'empty' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const isEmpty = text === 'empty';
  return <span className={`${muted || isEmpty ? 'text-muted-foreground' : 'font-medium'} ${isEmpty ? 'italic' : ''} break-all`}>{text}</span>;
}
