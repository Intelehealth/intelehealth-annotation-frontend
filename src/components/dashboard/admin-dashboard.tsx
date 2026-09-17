'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminOverview } from './use-dashboard';
import { Kpi } from './kpi';
import { DatasetHealthTable } from './dataset-health-table';
import { Inbox } from './inbox';
import { ActivityPanel } from './activity-panel';
import { DataQuestions } from './data-questions';
import { pct, timeAgo } from './format';

export function AdminDashboard({ firstName }: { firstName?: string }) {
  const { data, error, loading, refreshing, updatedAt, refresh } = useAdminOverview();

  if (loading) return <DashboardSkeleton />;
  if (error && !data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm">
        <p className="font-medium">The dashboard could not load.</p>
        <p className="mt-1 text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={refresh}>Try again</Button>
      </div>
    );
  }
  if (!data) return null;

  const parents = data.rows;
  const annotators = data.users.filter((u) => u.role !== 'ADMIN');
  const active = annotators.filter((u) => u.status === 'ACTIVE').length;
  const pending = annotators.filter((u) => u.status === 'PENDING').length;
  const online = annotators.filter((u) => u.isOnline).length;
  const conflicts = parents.reduce((s, r) => s + (r.health?.reviews.conflict ?? 0) + (r.health?.reviews.tie ?? 0), 0);
  const withAgreement = parents.filter((r) => r.reliability?.selectedOverall);
  const meanAgreement = withAgreement.length
    ? withAgreement.reduce((s, r) => s + (r.reliability!.selectedOverall!.percentage ?? 0), 0) / withAgreement.length
    : null;
  const metricLabel = withAgreement[0]?.reliability?.selectedOverall?.label;
  const inProgress = parents.filter((r) => r.progress > 0 && r.progress < 100).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{firstName ? `Good to see you, ${firstName}` : 'Dashboard'}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {parents.length} dataset{parents.length === 1 ? '' : 's'} · {annotators.length} annotator{annotators.length === 1 ? '' : 's'}
            {updatedAt && <> · updated {timeAgo(updatedAt)}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refresh} disabled={refreshing} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild variant="outline" size="sm"><Link href="/users">Add user</Link></Button>
          <Button asChild size="sm"><Link href="/dataset/add-dataset">New dataset</Link></Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Datasets" value={parents.length} hint={inProgress ? `${inProgress} in progress` : 'none in progress'} href="/dataset" />
        <Kpi label="Annotators" value={annotators.length} hint={`${active} active · ${online} online${pending ? ` · ${pending} pending` : ''}`} href="/users" />
        <Kpi label="Awaiting review" value={data.reviewQueue.length} hint="submitted clones" href="/assignments/review" tone={data.reviewQueue.length ? 'warn' : 'default'} />
        <Kpi label="Open conflicts" value={conflicts} hint="rows without a majority" tone={conflicts ? 'warn' : 'default'} />
        <Kpi label="Agreement" value={meanAgreement === null ? '—' : pct(meanAgreement)} hint={metricLabel ? `${metricLabel}, mean` : 'no consensus yet'} tone={meanAgreement !== null && meanAgreement >= 80 ? 'good' : 'default'} />
        <Kpi label="Schema requests" value={data.schemaRequests.length} hint="pending approval" tone={data.schemaRequests.length ? 'warn' : 'default'} />
      </div>

      <DatasetHealthTable rows={parents} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Inbox reviewQueue={data.reviewQueue} schemaRequests={data.schemaRequests} notifications={data.notifications} onChange={refresh} />
        <ActivityPanel data={data} />
      </div>

      <DataQuestions datasets={data.datasets} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
