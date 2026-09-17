'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DatasetHealthRow } from '@/lib/api/dashboard-data';
import { Bar, Empty, Section } from './kpi';
import { pct, timeAgo } from './format';

type SortKey = 'name' | 'progress' | 'agreement' | 'conflicts' | 'updated';

// Where each dataset stands, in one sortable table: how far annotation has
// got, how much annotators agree (the dataset's selected reliability metric),
// how many rows are in conflict, and what needs doing next.
export function DatasetHealthTable({ rows }: { rows: DatasetHealthRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'updated', dir: -1 });

  const sorted = useMemo(() => {
    const val = (r: DatasetHealthRow): number | string => {
      switch (sort.key) {
        case 'name': return r.dataset.name.toLowerCase();
        case 'progress': return r.progress;
        case 'agreement': return r.reliability?.selectedOverall?.percentage ?? -1;
        case 'conflicts': return (r.health?.reviews.conflict ?? 0) + (r.health?.reviews.tie ?? 0);
        default: return new Date(r.dataset.updatedAt ?? r.dataset.createdAt).getTime();
      }
    };
    return [...rows].sort((a, b) => {
      const x = val(a), y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, sort]);

  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'name' ? 1 : -1 }));

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn('px-4 py-2 text-left text-xs font-medium text-muted-foreground', className)}>
      <button type="button" onClick={() => toggle(k)} className={cn('inline-flex items-center gap-1 hover:text-foreground', sort.key === k && 'text-foreground')}>
        {children}<ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    </th>
  );

  return (
    <Section title="Datasets" description="Progress, agreement and open conflicts for every dataset with assigned work."
      action={<Link href="/dataset" className="text-xs font-medium text-muted-foreground hover:text-foreground">All datasets →</Link>}>
      {rows.length === 0 ? <Empty>No datasets yet. Create one to start assigning work.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <Th k="name">Dataset</Th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Annotators</th>
                <Th k="progress" className="w-44">Progress</Th>
                <Th k="agreement">Agreement</Th>
                <Th k="conflicts">Conflicts</Th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                <Th k="updated">Updated</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => <Row key={r.dataset._id} r={r} />)}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function statusOf(r: DatasetHealthRow): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  const conflicts = (r.health?.reviews.conflict ?? 0) + (r.health?.reviews.tie ?? 0);
  if (conflicts > 0) return { label: `${conflicts} to resolve`, variant: 'destructive' };
  if (r.submitted > 0) return { label: `${r.submitted} awaiting review`, variant: 'default' };
  if (r.annotators === 0) return { label: 'Unassigned', variant: 'outline' };
  if (r.progress === 0) return { label: 'Not started', variant: 'outline' };
  if (r.progress < 100) return { label: 'In progress', variant: 'secondary' };
  if (r.health && r.health.reviews.total > 0) return { label: 'Consensus ready', variant: 'secondary' };
  return { label: 'Annotated', variant: 'secondary' };
}

function Row({ r }: { r: DatasetHealthRow }) {
  const status = statusOf(r);
  const agree = r.reliability?.selectedOverall;
  const conflicts = (r.health?.reviews.conflict ?? 0) + (r.health?.reviews.tie ?? 0);
  return (
    <tr className="border-b last:border-0 hover:bg-accent/30">
      <td className="px-4 py-3">
        <Link href={`/dataset/${r.dataset._id}`} className="font-medium hover:underline">{r.dataset.name}</Link>
        <div className="mt-0.5 text-xs text-muted-foreground">{r.dataset.datasetType} · {r.dataset.accessType}</div>
      </td>
      <td className="px-4 py-3 tabular-nums">{r.annotators || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Bar value={r.progress} className="w-24" />
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{r.annotators ? pct(r.progress) : '—'}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        {agree ? (
          <span title={`${agree.label} · ${agree.interpretation} · ${agree.itemsUsed} items`} className="tabular-nums">
            {pct(agree.percentage)} <span className="text-xs text-muted-foreground">{agree.interpretation}</span>
          </span>
        ) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className={cn('px-4 py-3 tabular-nums', conflicts > 0 && 'font-medium text-amber-600 dark:text-amber-400')}>
        {r.health ? conflicts : '—'}
      </td>
      <td className="px-4 py-3"><Badge variant={status.variant}>{status.label}</Badge></td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(r.dataset.updatedAt ?? r.dataset.createdAt)}</td>
    </tr>
  );
}
