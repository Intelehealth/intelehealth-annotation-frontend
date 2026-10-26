'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Empty, Section } from '@/components/dashboard/kpi';
import { apiMessage } from '@/lib/api/workspaces';
import { mismatchAPI, type QueueItem, type QueueQuery } from '@/lib/api/mismatch';
import { fmtDate, HighlightChip, StatusBadge, TypeBadge } from './shared';

const TYPES = [
  { value: 'mismatch', label: 'All mismatches' },
  { value: 'ddx_any', label: 'Diagnosis mismatches' },
  { value: 'ttx_any', label: 'Treatment mismatches' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'Matches (no mismatch)' },
  { value: 'all', label: 'All visits' },
];
const STATUSES = [
  { value: 'open', label: 'Not annotated' },
  { value: 'pending', label: 'To review' },
  { value: 'in_progress', label: 'In review' },
  { value: 'done', label: 'Annotated' },
  { value: 'all', label: 'Any status' },
];

const select = 'h-9 rounded-md border bg-background px-2 text-sm';

export function MismatchQueue({ workspaceId, refreshKey }: { workspaceId: string; refreshKey: number }) {
  const [q, setQ] = useState<QueueQuery>({ type: 'mismatch', status: 'open', page: 1, limit: 25 });
  const [search, setSearch] = useState('');
  const [data, setData] = useState<{ total: number; items: QueueItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    mismatchAPI.queue(workspaceId, q)
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e) => live && setError(apiMessage(e, 'Could not load the queue')));
    return () => { live = false; };
  }, [workspaceId, q, refreshKey]);

  const set = (patch: Partial<QueueQuery>) => setQ((p) => ({ ...p, ...patch, page: patch.page ?? 1 }));
  const pages = data ? Math.max(1, Math.ceil(data.total / (q.limit ?? 25))) : 1;

  return (
    <Section
      title="Mismatch queue"
      description="Newest first. Open a visit to see what the doctor changed and record why."
      action={<span className="text-xs text-muted-foreground tabular-nums">{data ? `${data.total.toLocaleString()} visits` : ''}</span>}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <select className={select} value={q.type} onChange={(e) => set({ type: e.target.value })} aria-label="Mismatch type">
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className={select} value={q.status} onChange={(e) => set({ status: e.target.value })} aria-label="Review status">
          {STATUSES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">From
          <input type="date" className={select} value={q.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">To
          <input type="date" className={select} value={q.to ?? ''} onChange={(e) => set({ to: e.target.value || undefined })} />
        </label>
        <form className="relative ml-auto" onSubmit={(e) => { e.preventDefault(); set({ q: search.trim() || undefined }); }}>
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="h-9 w-56 pl-8" placeholder="Diagnosis, medicine, uuid…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>

      {error && <p className="px-4 py-3 text-sm text-destructive">{error}</p>}
      {!data ? (
        <div className="m-4 h-40 animate-pulse rounded-md bg-muted" />
      ) : data.items.length === 0 ? (
        <Empty>Nothing here. New mismatches appear automatically after each sync.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Visit</th>
                <th className="px-4 py-2 font-medium">Complaint</th>
                <th className="px-4 py-2 font-medium">AI top-1 → doctor</th>
                <th className="px-4 py-2 font-medium">Mismatch</th>
                <th className="px-4 py-2 font-medium">What differs</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((v) => (
                <tr key={v.uuid} className="align-top hover:bg-accent/30">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link href={`/workspaces/${workspaceId}/mismatch/${v.uuid}`} className="font-medium text-blue-700 hover:underline">
                      {fmtDate(v.encounterAt)}
                    </Link>
                    <div className="text-xs text-muted-foreground">{[v.gender, v.age != null ? `${v.age}y` : null, v.specialty].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-muted-foreground"><span className="line-clamp-2">{v.complaint || '—'}</span></td>
                  <td className="max-w-[260px] px-4 py-3 text-xs">
                    <div className="text-muted-foreground">AI: {v.aiTop1 ?? '—'}{v.bestRank ? <span className="ml-1 text-emerald-700">(picked #{v.bestRank})</span> : null}</div>
                    <div className="font-medium">Dr: {v.doctorDx.join(', ') || '—'}</div>
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={v.mismatchType} /></td>
                  <td className="max-w-[320px] px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {v.highlights.slice(0, 3).map((h, i) => <HighlightChip key={i} h={h} />)}
                      {v.highlights.length > 3 && <span className="self-center text-xs text-muted-foreground">+{v.highlights.length - 3} more</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={v.review.status} />
                    {(v.review.annotatedBy || v.review.claimedBy) && (
                      <div className="mt-1 text-xs text-muted-foreground">{v.review.annotatedBy ?? v.review.claimedBy}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
        Page {q.page} of {pages}
        <Button variant="ghost" size="sm" disabled={(q.page ?? 1) <= 1} onClick={() => setQ((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" disabled={(q.page ?? 1) >= pages} onClick={() => setQ((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </Section>
  );
}
