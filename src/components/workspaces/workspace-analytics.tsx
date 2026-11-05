'use client';

import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  apiMessage, workspacesAPI,
  type AnalyticsDataset, type AnalyticsField, type WorkspaceAnalytics as AnalyticsData,
} from '@/lib/api/workspaces';

export function WorkspaceAnalytics({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    workspacesAPI.analytics(workspaceId)
      .then((d) => { if (live) setData(d); })
      .catch((e) => { if (live) setError(apiMessage(e, 'Could not load analytics')); });
    return () => { live = false; };
  }, [workspaceId]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review analytics</h2>
        <p className="text-sm text-gray-500">How each reviewer corrected the prefilled answers.</p>
      </div>
      {error ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
          <p className="font-medium text-gray-900">Analytics unavailable</p>
          <p className="mt-1 text-gray-500">{error}</p>
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">Loading analytics…</div>
      ) : data.datasets.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
          No reviewed datasets yet — assign a dataset to reviewers to see analytics.
        </div>
      ) : (
        data.datasets.map((d) => <DatasetAnalytics key={d.datasetId} ds={d} />)
      )}
    </section>
  );
}

function DatasetAnalytics({ ds }: { ds: AnalyticsDataset }) {
  const [showZero, setShowZero] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const total = (f: AnalyticsField) => Object.values(f.byReviewer).reduce((a, r) => a + r.corrected, 0);
  // Review-only fields (Verdict…) have no original: no corrections, but their
  // distribution is the headline answer, so they're always shown, first.
  const isReview = (f: AnalyticsField) => f.hasOriginal === false;
  const isZero = (f: AnalyticsField) => !isReview(f) &&
    f.correctedByAll === 0 && Object.values(f.byReviewer).every((r) => r.corrected === 0 && r.pendingFilled === 0);
  const sorted = [...ds.fields].sort((a, b) =>
    Number(isReview(b)) - Number(isReview(a)) || total(b) - total(a) || a.displayName.localeCompare(b.displayName));
  const zeros = sorted.filter(isZero);
  const rows = showZero ? sorted : sorted.filter((f) => !isZero(f));
  const colSpan = ds.reviewers.length + 2;

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">
        {ds.name} <span className="font-normal text-gray-500">· {ds.totalRows} rows</span>
      </h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ds.reviewers.map((r) => {
          const pct = ds.totalRows > 0 ? Math.min(100, (r.rowsReviewed / ds.totalRows) * 100) : 0;
          return (
            <div key={r.userId} className="rounded-xl border border-gray-200 p-3 text-sm">
              <p className="truncate font-medium text-gray-900">{r.name}</p>
              <p className="mt-2 text-gray-700">Reviewed {r.rowsReviewed}/{ds.totalRows}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-gray-600">{r.rowsCorrected} rows corrected</p>
              <p className="text-gray-600">{r.fieldsCorrectedPct}% fields corrected</p>
              {r.pendingRemaining > 0 && <p className="text-amber-600">{r.pendingRemaining} rows still PENDING</p>}
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 pr-3 font-medium">Field</th>
              {ds.reviewers.map((r) => <th key={r.userId} className="px-3 py-2 font-medium">{r.name}</th>)}
              <th className="px-3 py-2 font-medium">{ds.reviewers.length > 2 ? 'All' : 'Both'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => {
              const expandable = f.categorical && !!f.distribution;
              const isOpen = open === f.fieldName;
              return (
                <Fragment key={f.fieldName}>
                  <tr
                    className={cn('border-b border-gray-100', expandable && 'cursor-pointer hover:bg-gray-50')}
                    onClick={expandable ? () => setOpen(isOpen ? null : f.fieldName) : undefined}
                  >
                    <td className="py-2 pr-3 text-gray-900">
                      <span className="inline-flex items-center gap-1">
                        {expandable ? (isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />) : <span className="w-4" />}
                        {f.displayName}
                        {isReview(f) && <span className="ml-1 rounded bg-gray-100 px-1.5 text-[10px] text-gray-500">review field</span>}
                      </span>
                    </td>
                    {isReview(f) ? (
                      <td colSpan={ds.reviewers.length + 1} className="px-3 py-2 text-xs text-gray-400">
                        {expandable ? 'Click to see answers' : '—'}
                      </td>
                    ) : ds.reviewers.map((r) => {
                      const s = f.byReviewer[r.userId];
                      return (
                        <td key={r.userId} className="px-3 py-2 text-gray-900">
                          {s?.corrected ?? 0}
                          {!!s && s.pendingFilled > 0 && <span className="ml-1 text-xs text-gray-400">+{s.pendingFilled} PENDING filled</span>}
                        </td>
                      );
                    })}
                    {!isReview(f) && <td className="px-3 py-2 text-gray-900">{f.correctedByAll}</td>}
                  </tr>
                  {expandable && isOpen && f.distribution && (
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td colSpan={colSpan} className="p-3"><Distribution f={f} ds={ds} /></td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {zeros.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setShowZero((v) => !v)}>
          {showZero ? 'Hide fields with no corrections' : `Show ${zeros.length} fields with no corrections`}
        </Button>
      )}
    </div>
  );
}

function Distribution({ f, ds }: { f: AnalyticsField; ds: AnalyticsDataset }) {
  const dist = f.distribution!;
  const cols: { key: string; label: string; counts: Record<string, number> }[] = [
    ...(f.hasOriginal === false ? [] : [{ key: 'original', label: 'Consensus', counts: dist.original ?? {} }]),
    ...ds.reviewers.map((r) => ({ key: r.userId, label: r.name, counts: dist.byReviewer?.[r.userId] ?? {} })),
  ];
  const values = Array.from(new Set(cols.flatMap((c) => Object.keys(c.counts))))
    .sort((a, b) => (dist.original?.[b] ?? 0) - (dist.original?.[a] ?? 0) || a.localeCompare(b));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cols.map((c) => {
        const max = Math.max(1, ...Object.values(c.counts));
        return (
          <div key={c.key} className="min-w-0">
            <p className="mb-2 truncate text-xs font-medium text-gray-500">{c.label}</p>
            <ul className="space-y-1.5">
              {values.map((v) => {
                const n = c.counts[v] ?? 0;
                return (
                  <li key={v} className="text-xs">
                    <div className="flex justify-between gap-2 text-gray-700">
                      <span className="truncate">{v}</span><span className="tabular-nums">{n}</span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-blue-400" style={{ width: `${(n / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
