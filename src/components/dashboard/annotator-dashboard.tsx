'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { datasetsAPI } from '@/lib/api/datasets';
import { notificationsAPI, NotificationResponse } from '@/lib/api/notifications';
import { computeTaskStatus, type AnnotationTask } from '@/types/feature1';
import { Bar, Empty, Kpi, Section } from './kpi';
import { NotificationList } from './inbox';
import { pct } from './format';

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_started: { label: 'Not started', variant: 'outline' },
  pending: { label: 'Not started', variant: 'outline' },
  in_progress: { label: 'In progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'secondary' },
};

// The annotator's view: what to do next, what is in progress, what came back
// for rework, and the rest of the assigned work.
export function AnnotatorDashboard({ firstName }: { firstName?: string }) {
  const [tasks, setTasks] = useState<AnnotationTask[] | null>(null);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, n] = await Promise.all([datasetsAPI.getMyTasks(), notificationsAPI.getAll().catch(() => [])]);
      setTasks(t); setNotifications(n); setError(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load your tasks');
      setTasks([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (tasks === null) return <div className="h-40 animate-pulse rounded-lg bg-muted" aria-busy="true" />;

  const status = (t: AnnotationTask) => computeTaskStatus(t.progress, t.taskStatus);
  const rework = tasks.filter((t) => t.assignmentStatus === 'REWORK_REQUIRED');
  const submitted = tasks.filter((t) => ['SUBMITTED', 'UNDER_REVIEW'].includes(t.assignmentStatus ?? ''));
  const approved = tasks.filter((t) => ['APPROVED', 'COMPLETED'].includes(t.assignmentStatus ?? ''));
  const open = tasks.filter((t) => !rework.includes(t) && !submitted.includes(t) && !approved.includes(t));
  const inProgress = open.filter((t) => status(t) === 'in_progress');
  const notStarted = open.filter((t) => status(t) !== 'in_progress' && status(t) !== 'completed');
  const readyToSubmit = open.filter((t) => status(t) === 'completed');
  const totalRows = tasks.reduce((s, t) => s + (t.progress?.totalRows ?? 0), 0);
  const doneRows = tasks.reduce((s, t) => s + (t.progress?.completedRows ?? 0), 0);

  // what to do next: rework first, then the task furthest along, then anything new
  const next = rework[0] ?? [...inProgress].sort((a, b) => (b.progress?.percentage ?? 0) - (a.progress?.percentage ?? 0))[0] ?? notStarted[0];
  const workUrl = (t: AnnotationTask) => `/dataset/${t._id}/annotation${t.taskId ? `?taskId=${t.taskId}` : ''}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{firstName ? `Good to see you, ${firstName}` : 'Your work'}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {tasks.length} task{tasks.length === 1 ? '' : 's'} · {doneRows}/{totalRows} rows labelled
        </p>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Needs rework" value={rework.length} tone={rework.length ? 'warn' : 'default'} hint="sent back by a reviewer" />
        <Kpi label="In progress" value={inProgress.length} hint={`${notStarted.length} not started`} />
        <Kpi label="Awaiting review" value={submitted.length} hint="submitted" />
        <Kpi label="Approved" value={approved.length} tone={approved.length ? 'good' : 'default'} />
      </div>

      {next && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{rework.includes(next) ? 'Sent back for rework' : status(next) === 'in_progress' ? 'Continue where you left off' : 'Start here'}</p>
            <p className="mt-0.5 truncate font-medium">{next.parentName ?? next.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <Bar value={next.progress?.percentage ?? 0} className="w-40" />
              <span className="text-xs tabular-nums text-muted-foreground">{next.progress?.completedRows ?? 0}/{next.progress?.totalRows ?? 0} rows</span>
            </div>
          </div>
          <Button asChild><Link href={workUrl(next)}>{rework.includes(next) ? 'Fix and resubmit' : status(next) === 'in_progress' ? 'Continue' : 'Start'}</Link></Button>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section title="Tasks" description="Everything assigned to you.">
          {tasks.length === 0 ? <Empty>No tasks assigned yet. An administrator will assign datasets to you.</Empty> : (
            <ul className="divide-y">
              {[...rework, ...readyToSubmit, ...inProgress, ...notStarted, ...submitted, ...approved].map((t) => {
                const s = STATUS[status(t)] ?? STATUS.not_started;
                const isRework = rework.includes(t);
                const done = submitted.includes(t) || approved.includes(t);
                return (
                  <li key={t._id} className="flex items-center gap-4 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{t.parentName ?? t.name}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Bar value={t.progress?.percentage ?? 0} className="w-32" />
                        <span className="text-xs tabular-nums text-muted-foreground">{pct(t.progress?.percentage ?? 0)} · {t.datasetType}</span>
                      </div>
                    </div>
                    {isRework ? <Badge variant="destructive">Rework required</Badge>
                      : done ? <Badge variant="secondary">{(t.assignmentStatus ?? '').replace('_', ' ').toLowerCase()}</Badge>
                      : <Badge variant={s.variant}>{s.label}</Badge>}
                    {!done && <Button asChild size="sm" variant={isRework ? 'default' : 'outline'}><Link href={workUrl(t)}>{status(t) === 'not_started' || status(t) === 'pending' ? 'Start' : 'Open'}</Link></Button>}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Notifications" description="Reviews, approvals and rework requests.">
          <NotificationList items={notifications} onChange={load} limit={6} />
        </Section>
      </div>
    </div>
  );
}
