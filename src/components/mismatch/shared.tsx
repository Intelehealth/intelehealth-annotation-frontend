'use client';

import { ReactNode, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Search, TriangleAlert } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { TopNav } from '@/components/top-nav';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/components/dashboard/format';
import { cn } from '@/lib/utils';
import { MISMATCH_LABEL, type Highlight, type MismatchType, type ReviewStatus, type SyncState } from '@/lib/api/mismatch';

export function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar className="hidden lg:flex" />
      <main className="flex-1 overflow-auto">
        <TopNav />
        <div className={cn('mx-auto space-y-6 p-4 md:p-6', wide ? 'max-w-7xl' : 'max-w-6xl')}>{children}</div>
      </main>
    </div>
  );
}

const TYPE_STYLE: Record<MismatchType, string> = {
  none: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ddx: 'bg-rose-50 text-rose-700 ring-rose-200',
  ttx: 'bg-amber-50 text-amber-800 ring-amber-200',
  both: 'bg-purple-50 text-purple-700 ring-purple-200',
};

export function TypeBadge({ type }: { type: MismatchType }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TYPE_STYLE[type])}>
      {MISMATCH_LABEL[type]}
    </span>
  );
}

const STATUS_STYLE: Record<ReviewStatus, [string, string]> = {
  pending: ['To review', 'bg-gray-100 text-gray-700'],
  in_progress: ['In review', 'bg-blue-50 text-blue-700'],
  done: ['Annotated', 'bg-emerald-50 text-emerald-700'],
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  const [label, cls] = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return <span className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', cls)}>{label}</span>;
}

const HL_STYLE: Record<Highlight['type'], string> = {
  not_in_top5: 'border-rose-200 bg-rose-50 text-rose-800',
  doctor_added: 'border-slate-200 bg-slate-50 text-slate-700',
  modified: 'border-amber-200 bg-amber-50 text-amber-900',
  ignored: 'border-gray-200 bg-gray-50 text-gray-700',
  added: 'border-sky-200 bg-sky-50 text-sky-800',
  doctor_flag: 'border-red-400 bg-red-100 text-red-900',
};

export function HighlightChip({ h, full }: { h: Highlight; full?: boolean }) {
  return (
    <span className={cn('inline-flex max-w-full flex-col rounded-md border px-2 py-1 text-xs', HL_STYLE[h.type])}>
      <span className="truncate font-medium">{h.text}</span>
      {full && h.detail && <span className="mt-0.5 opacity-80">{h.detail}</span>}
    </span>
  );
}

/** Background-sync status line with a manual "sync now". */
/** A failed run's stored error in plain words (the raw text stays in the tooltip). Ticket Q4. */
export function syncProblem(err?: string | null): string {
  const e = String(err ?? '');
  if (/network|fetch failed|ECONN|ENOTFOUND|timed? ?out|abort|HTTP 50[234]/i.test(e)) return 'OpenMRS could not be reached';
  if (/HTTP 40[13]|api key|unauthor/i.test(e)) return 'OpenMRS refused the sync key';
  return 'OpenMRS returned an error';
}

export function SyncBar({ state, onSync, newCount, clientError }: { state: SyncState | null; onSync: () => void; newCount: number; /** ISO time of a sync request that never reached the server (network down). */ clientError?: string | null }) {
  if (!state) return null;
  const run = state.lastRun;
  if (!state.configured) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
        <TriangleAlert className="h-4 w-4" /> OpenMRS sync is not configured on the server (ESGQL_API_KEY missing).
      </div>
    );
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-sm',
      state.running ? 'border-blue-200 bg-blue-50 text-blue-900' : state.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'bg-card')}>
      {state.running ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            Fetching new visits from OpenMRS in the background{run ? ` (${run.window})` : ''}
            {run?.total ? `: ${run.fetched.toLocaleString()} / ${run.total.toLocaleString()}` : '…'}. You can keep annotating.
          </span>
        </>
      ) : state.status === 'error' || clientError ? (
        <>
          <TriangleAlert className="h-4 w-4" />
          <span title={clientError ? undefined : run?.error ?? undefined}>
            Sync failed {timeAgo(clientError ?? run?.finishedAt ?? run?.startedAt)} · {clientError ? 'could not reach the server' : syncProblem(run?.error)}
            {state.lastSuccessAt && <span className="text-rose-800/80"> · Last synced {timeAgo(state.lastSuccessAt)}</span>}
          </span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>
            Synced with OpenMRS {timeAgo(state.lastSuccessAt)}
            {run ? ` · last run ${run.inserted.toLocaleString()} new, ${run.updated.toLocaleString()} changed${run.unchanged != null ? `, ${run.unchanged.toLocaleString()} unchanged` : ''}` : ''}
            {newCount > 0 && <span className="ml-1 font-medium text-emerald-700">· {newCount.toLocaleString()} new since you opened</span>}
          </span>
        </>
      )}
      <Button variant="ghost" size="sm" className="ml-auto h-7" disabled={state.running} onClick={onSync}>
        <RefreshCw className="mr-1 h-3.5 w-3.5" /> {state.status === 'error' || clientError ? 'Retry' : 'Sync now'}
      </Button>
    </div>
  );
}

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—';

export const rate = (n: number, d: number) => (d ? (100 * n) / d : 0);

/** Case-insensitive text filter for long dashboard tables. */
export function useRowFilter<T>(rows: T[], text: (r: T) => string) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => text(r).toLowerCase().includes(s)) : rows;
  }, [rows, q, text]);
  return { q, setQ, filtered };
}

/** Search box for a section header: "Search… (12 of 240)". */
export function TableSearch({ q, setQ, shown, total, placeholder = 'Search…' }: { q: string; setQ: (v: string) => void; shown: number; total: number; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
        <input className="h-8 w-44 rounded-md border bg-white pl-7 pr-2 text-xs" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} aria-label={placeholder} />
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">{shown === total ? `${total.toLocaleString()} rows` : `${shown.toLocaleString()} of ${total.toLocaleString()}`}</span>
    </div>
  );
}
