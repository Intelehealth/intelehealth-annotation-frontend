'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCheck, Inbox, Rows3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MismatchQueue } from '@/components/mismatch/queue';
import { Shell, SyncBar } from '@/components/mismatch/shared';
import { friendlyError } from '@/components/mismatch/shared';
import { mismatchAPI, type MismatchAccess, type MismatchSource, type QueuePage, type QueueTab, type SyncState } from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';

// The dashboard lives only at /ai-dashboard (sidebar); a workspace is for annotating.
type Tab = QueueTab;
const TABS: Tab[] = ['todo', 'done', 'all'];

export default function MismatchWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ws, setWs] = useState<{ name: string; description?: string; icon?: string; source: MismatchSource } | null>(null);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [acl, setAcl] = useState<MismatchAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('todo');
  const [counts, setCounts] = useState<QueuePage['counts'] | null>(null);
  const onCounts = useCallback((c: QueuePage['counts']) => setCounts(c), []);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const wasRunning = useRef(false);
  const lastFinished = useRef<string | undefined>(undefined);
  const [syncFailedAt, setSyncFailedAt] = useState<string | null>(null);
  // "Save & next" on the last visit of a view lands here with ?finished=1 (ticket V3).
  const finished = useSearchParams().get('finished') === '1';

  useEffect(() => {
    try {
      const t = sessionStorage.getItem(`mismatch-tab-${id}`);
      if (TABS.includes(t as Tab)) setTab(t as Tab);
    } catch { /* storage unavailable */ }
  }, [id]);
  const pickTab = (t: Tab) => {
    setTab(t);
    try { sessionStorage.setItem(`mismatch-tab-${id}`, t); } catch { /* ignore */ }
  };

  const onState = useCallback((s: SyncState) => {
    setSync(s);
    const finished = s.lastRun?.finishedAt;
    // A run that ended while this page was open: count its new visits and reload the lists.
    if (finished && lastFinished.current !== undefined && finished !== lastFinished.current) {
      setNewCount((n) => n + (s.lastRun?.inserted ?? 0));
      setRefreshKey((k) => k + 1);
    } else if (wasRunning.current && !s.running) {
      setRefreshKey((k) => k + 1);
    }
    lastFinished.current = finished ?? '';
    wasRunning.current = s.running;
  }, []);

  // Opening the workspace asks the server for a background sync (skipped if one ran in the last 5 minutes).
  useEffect(() => {
    let live = true;
    mismatchAPI.overview(id)
      .then((o) => {
        if (!live) return;
        setWs({ ...o.workspace, source: o.source });
        setAcl(o.access ?? null);
        lastFinished.current = o.sync.lastRun?.finishedAt ?? '';
        onState(o.sync);
        // ACL1: only admins start a sync; everyone else gets the scheduled one and sees read-only status.
        if (!o.access?.canSync) return;
        // The background sync on open goes through the same Q4 failure state as "Sync now", never the page error.
        mismatchAPI.sync(id)
          .then((s) => { if (live) { setSyncFailedAt(null); onState(s); } })
          .catch((e) => live && (e?.response ? setError(friendlyError(e, 'Sync failed to start')) : setSyncFailedAt(new Date().toISOString())));
      })
      .catch((e) => live && setError(friendlyError(e, 'Could not open this workspace')));
    return () => { live = false; };
  }, [id, onState]);

  // Poll quickly while a sync runs, slowly otherwise (picks up the scheduled server sync too).
  useEffect(() => {
    if (!ws) return;
    const t = setTimeout(() => {
      mismatchAPI.syncState(id).then(onState).catch(() => undefined);
    }, sync?.running ? 2500 : 60_000);
    return () => clearTimeout(t);
  }, [id, ws, sync, onState]);

  // Q4: a sync request that cannot reach the server shows in the sync bar as "Sync failed … · Retry", never as a raw "Network Error".
  const syncNow = () => mismatchAPI.sync(id, true)
    .then((s) => { setSyncFailedAt(null); onState(s); })
    .catch((e) => (e?.response ? setError(friendlyError(e, 'Sync failed to start')) : setSyncFailedAt(new Date().toISOString())));

  if (error && !ws) {
    return (
      <Shell>
        <Button variant="ghost" size="sm" onClick={() => router.push('/workspaces')}><ArrowLeft className="mr-1 h-4 w-4" /> Workspaces</Button>
        <p className="mt-4 text-sm text-destructive">{error}</p>
      </Shell>
    );
  }
  if (!ws) return <Shell wide><div className="h-40 animate-pulse rounded-lg bg-muted" /></Shell>;

  return (
    <Shell wide>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push('/workspaces')}><ArrowLeft className="mr-1 h-4 w-4" /> Workspaces</Button>
        {acl?.canManage && (
          <Link href={`/workspaces/${id}?manage=1`} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
            <Settings className="mr-1 h-3.5 w-3.5" /> Members &amp; settings
          </Link>
        )}
      </div>

      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-2xl">{ws.icon || '🩺'}</div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{ws.name}</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">{ws.description}</p>
        </div>
      </header>

      <SyncBar state={sync} onSync={acl?.canSync ? syncNow : undefined} newCount={newCount} clientError={syncFailedAt} />
      {error && <p className="text-sm text-destructive">{error}</p>}

      <nav className="flex flex-wrap gap-1 border-b">
        {([
          ['todo', 'To annotate', Inbox, counts?.todo],
          ['done', 'Annotated', CheckCheck, counts?.done],
          ['all', 'All visits', Rows3, counts?.all],
        ] as const).map(([key, label, Icon, n]) => (
          <button key={key} onClick={() => pickTab(key)}
            className={cn('-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium',
              tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            <Icon className="h-4 w-4" /> {label}
            {n !== undefined && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-xs tabular-nums', tab === key ? 'bg-indigo-100 text-indigo-700' : 'bg-muted text-muted-foreground')}>{n.toLocaleString()}</span>
            )}
          </button>
        ))}
      </nav>

      {finished && (
        <div role="status" className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          <span>You&apos;ve finished this view: no visits are left in it after the one you just saved.</span>
          <button className="text-xs underline" onClick={() => router.replace(`/workspaces/${id}/mismatch`)}>Dismiss</button>
        </div>
      )}

      <MismatchQueue workspaceId={id} tab={tab} refreshKey={refreshKey} onCounts={onCounts} canAnnotate={!!acl?.canAnnotate} />
    </Shell>
  );
}
