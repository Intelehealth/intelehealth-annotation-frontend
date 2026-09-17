'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { TopNav } from '@/components/top-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { apiMessage, SHARING_MODES, workspacesAPI, type WorkspaceResponse, type WorkspaceSharingMode } from '@/lib/api/workspaces';
import { personName, timeAgo } from '@/components/dashboard/format';

export default function WorkspacesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WorkspaceResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await workspacesAPI.list()); setError(null); }
    catch (e) { setError(apiMessage(e, 'Could not load workspaces')); setItems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar className="hidden lg:flex" />
      <main className="flex-1 overflow-auto">
        <TopNav />
        <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Workspaces</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isAdmin ? 'Every workspace in the organisation.' : 'Workspaces you own or belong to.'}
              </p>
            </div>
            {!creating && <Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> New workspace</Button>}
          </header>

          {creating && <CreateForm onDone={(ws) => { setCreating(false); if (ws) load(); }} />}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {items === null ? (
            <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}</div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No workspaces yet. A workspace groups the people and datasets for one client or programme.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((w) => {
                const mine = w.ownerId?._id === user?._id;
                return (
                  <li key={w._id}>
                    <Link href={`/workspaces/${w._id}`} className="block h-full rounded-lg border bg-card p-4 transition-colors hover:border-foreground/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{w.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {mine ? 'You own this' : `Owner: ${personName(w.ownerId)}`} · updated {timeAgo(w.updatedAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          <Badge variant="secondary">{w.sharingMode === 'SHARED' ? 'Shared dataset' : 'Copy per person'}</Badge>
                        </div>
                      </div>
                      {w.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{w.description}</p>}
                      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                        <span><span className="font-medium text-foreground">{w.members.length + 1}</span> people</span>
                        <span><span className="font-medium text-foreground">{w.datasetCount ?? 0}</span> dataset{w.datasetCount === 1 ? '' : 's'}</span>
                        {!w.isActive && <Badge variant="secondary">archived</Badge>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function CreateForm({ onDone }: { onDone: (created: WorkspaceResponse | null) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sharingMode, setSharingMode] = useState<WorkspaceSharingMode>('CLONE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try { onDone(await workspacesAPI.create({ name: name.trim(), description: description.trim(), domain: 'Healthcare', sharingMode })); }
    catch (err) { setError(apiMessage(err, 'Could not create the workspace')); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Name</span>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Intelehealth clinical review" required />
      </label>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">How people work on datasets</legend>
        {SHARING_MODES.map((m) => (
          <label key={m.value} className={`flex cursor-pointer gap-2 rounded-md border p-3 text-sm ${sharingMode === m.value ? 'border-foreground/60 bg-muted/40' : ''}`}>
            <input type="radio" name="sharingMode" value={m.value} checked={sharingMode === m.value} onChange={() => setSharingMode(m.value)} className="mt-0.5" />
            <span><span className="font-medium">{m.label}</span><span className="block text-xs text-muted-foreground">{m.hint}</span></span>
          </label>
        ))}
      </fieldset>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Description <span className="font-normal">(optional)</span></span>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this workspace is for" />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => onDone(null)}>Cancel</Button>
        <Button type="submit" size="sm" disabled={busy || !name.trim()}>Create workspace</Button>
      </div>
    </form>
  );
}
