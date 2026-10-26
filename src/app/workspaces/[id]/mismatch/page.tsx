'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, LayoutDashboard, ListChecks, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MismatchDashboard } from '@/components/mismatch/dashboard';
import { MismatchQueue } from '@/components/mismatch/queue';
import { Shell, SyncBar } from '@/components/mismatch/shared';
import { apiMessage } from '@/lib/api/workspaces';
import { mismatchAPI, type MismatchSource, type SyncState } from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';

type Tab = 'queue' | 'dashboard';

export default function MismatchWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ws, setWs] = useState<{ name: string; description?: string; icon?: string; source: MismatchSource } | null>(null);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('queue');
  const [refreshKey, setRefreshKey] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const wasRunning = useRef(false);
  const lastFinished = useRef<string | undefined>(undefined);

  useEffect(() => {
    try {
      const t = sessionStorage.getItem(`mismatch-tab-${id}`);
      if (t === 'queue' || t === 'dashboard') setTab(t);
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
      .then((o) => { if (!live) return; setWs({ ...o.workspace, source: o.source }); lastFinished.current = o.sync.lastRun?.finishedAt ?? ''; return mismatchAPI.sync(id); })
      .then((s) => { if (live && s) onState(s); })
      .catch((e) => live && setError(apiMessage(e, 'Could not open this workspace')));
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

  const syncNow = () => mismatchAPI.sync(id, true).then(onState).catch((e) => setError(apiMessage(e, 'Sync failed to start')));

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
        <Link href={`/workspaces/${id}?manage=1`} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
          <Settings className="mr-1 h-3.5 w-3.5" /> Members &amp; settings
        </Link>
      </div>

      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-2xl">{ws.icon || '🩺'}</div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{ws.name}</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">{ws.description}</p>
        </div>
      </header>

      <SyncBar state={sync} onSync={syncNow} newCount={newCount} />
      {error && <p className="text-sm text-destructive">{error}</p>}

      <nav className="flex gap-1 border-b">
        {([['queue', 'Mismatch queue', ListChecks], ['dashboard', 'Dashboard', LayoutDashboard]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => pickTab(key)}
            className={cn('-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium',
              tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      {tab === 'queue' ? <MismatchQueue workspaceId={id} refreshKey={refreshKey} /> : <MismatchDashboard workspaceId={id} refreshKey={refreshKey} />}
    </Shell>
  );
}
