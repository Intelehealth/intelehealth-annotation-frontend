'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, History, Plus, Trash2, UserMinus, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { TopNav } from '@/components/top-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { datasetsAPI, type DatasetResponse } from '@/lib/api/datasets';
import { jsonApi } from '@/lib/api';
import type { UserResponse } from '@/lib/api/users';
import {
  apiMessage, SHARING_MODES, WORKSPACE_DOMAINS, workspacesAPI,
  type WorkspaceDataset, type WorkspaceDomain, type WorkspaceMember, type WorkspaceResponse, type WorkspaceSharingMode,
} from '@/lib/api/workspaces';
import { Empty, Section } from '@/components/dashboard/kpi';
import { personName, timeAgo } from '@/components/dashboard/format';

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [ws, setWs] = useState<WorkspaceResponse | null>(null);
  const [datasets, setDatasets] = useState<WorkspaceDataset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, d] = await Promise.all([workspacesAPI.get(id), workspacesAPI.datasets(id)]);
      setWs(w); setDatasets(d); setError(null);
    } catch (e) { setError(apiMessage(e, 'Could not load this workspace')); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN';
  const canManage = isAdmin || (!!ws && ws.ownerId?._id === user?._id);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); setNotice(ok ?? null); setError(null); await load(); }
    catch (e) { setError(apiMessage(e, 'That did not work')); }
  };

  if (error && !ws) {
    return (
      <Shell>
        <Button variant="ghost" size="sm" onClick={() => router.push('/workspaces')}><ArrowLeft className="mr-1 h-4 w-4" /> Workspaces</Button>
        <p className="mt-4 text-sm text-destructive">{error}</p>
      </Shell>
    );
  }
  if (!ws) return <Shell><div className="h-40 animate-pulse rounded-lg bg-muted" /></Shell>;

  return (
    <Shell>
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push('/workspaces')}><ArrowLeft className="mr-1 h-4 w-4" /> Workspaces</Button>

      <Header ws={ws} canManage={canManage} onSave={(patch) => run(() => workspacesAPI.update(id, patch), 'Saved')} onDelete={() => run(async () => { await workspacesAPI.remove(id); router.push('/workspaces'); })} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && !error && <p className="text-sm text-muted-foreground">{notice}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Members ws={ws} canManage={canManage} onAdd={(who) => run(() => workspacesAPI.addMember(id, who), 'Member added')} onRemove={(m) => run(() => workspacesAPI.removeMember(id, m._id), 'Member removed')} />
        <Datasets items={datasets} ws={ws} canManage={canManage} onChanged={load} onAttach={(d) => run(() => workspacesAPI.attachDataset(id, d), 'Dataset attached')} onDetach={(d) => run(() => workspacesAPI.detachDataset(id, d), 'Dataset removed from workspace')} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar className="hidden lg:flex" />
      <main className="flex-1 overflow-auto">
        <TopNav />
        <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

// ── Header: name, domain, description; inline edit for the owner ────────────

function Header({ ws, canManage, onSave, onDelete }: {
  ws: WorkspaceResponse; canManage: boolean;
  onSave: (patch: { name?: string; description?: string; domain?: WorkspaceDomain; sharingMode?: WorkspaceSharingMode }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ws.name);
  const [description, setDescription] = useState(ws.description ?? '');
  const [domain, setDomain] = useState<WorkspaceDomain>(ws.domain);
  const [sharingMode, setSharingMode] = useState<WorkspaceSharingMode>(ws.sharingMode);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { setName(ws.name); setDescription(ws.description ?? ''); setDomain(ws.domain); setSharingMode(ws.sharingMode); }, [ws]);

  if (editing) {
    return (
      <form className="space-y-3 rounded-lg border bg-card p-4" onSubmit={(e) => { e.preventDefault(); onSave({ name: name.trim(), description: description.trim(), domain, sharingMode }); setEditing(false); }}>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Input value={name} onChange={(e) => setName(e.target.value)} required aria-label="Workspace name" />
          <select value={domain} onChange={(e) => setDomain(e.target.value as WorkspaceDomain)} className="h-9 rounded-md border bg-background px-3 text-sm" aria-label="Domain">
            {WORKSPACE_DOMAINS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" aria-label="Description" />
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">How people work on datasets</legend>
          {SHARING_MODES.map((m) => (
            <label key={m.value} className={`flex cursor-pointer gap-2 rounded-md border p-3 text-sm ${sharingMode === m.value ? 'border-foreground/60 bg-muted/40' : ''}`}>
              <input type="radio" name="sharingModeEdit" value={m.value} checked={sharingMode === m.value} onChange={() => setSharingMode(m.value)} className="mt-0.5" />
              <span><span className="font-medium">{m.label}</span><span className="block text-xs text-muted-foreground">{m.hint}</span></span>
            </label>
          ))}
        </fieldset>
        <p className="text-xs text-muted-foreground">Changing the mode affects new assignments only; existing copies and shares are kept.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          <Button type="submit" size="sm" disabled={!name.trim()}>Save</Button>
        </div>
      </form>
    );
  }

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight">{ws.name}</h1>
          <Badge variant="outline">{ws.domain}</Badge>
          <Badge variant="secondary" title={SHARING_MODES.find((m) => m.value === ws.sharingMode)?.hint}>{ws.sharingMode === 'SHARED' ? 'Shared dataset' : 'Copy per person'}</Badge>
          {!ws.isActive && <Badge variant="secondary">archived</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Owner {personName(ws.ownerId)} · {ws.ownerId?.email} · created {timeAgo(ws.createdAt)}
        </p>
        {ws.description && <p className="mt-2 max-w-2xl text-sm">{ws.description}</p>}
      </div>
      {canManage && (
        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-sm text-muted-foreground">Delete this workspace? Datasets are kept.</span>
              <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              <Button size="sm" variant="ghost" aria-label="Delete workspace" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /></Button>
            </>
          )}
        </div>
      )}
    </header>
  );
}

// ── Members ────────────────────────────────────────────────────────────────

function Members({ ws, canManage, onAdd, onRemove }: {
  ws: WorkspaceResponse; canManage: boolean;
  onAdd: (who: { userId?: string; email?: string }) => void;
  onRemove: (m: WorkspaceMember) => void;
}) {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [pick, setPick] = useState('');
  const [email, setEmail] = useState('');
  // GET /users is open to any signed-in user; usersAPI.getAll hits an admin-only route.
  useEffect(() => { if (canManage) jsonApi.get<UserResponse[]>('/users').then((r) => setUsers(r.data)).catch(() => setUsers([])); }, [canManage]);

  const inWs = useMemo(() => new Set([ws.ownerId?._id, ...ws.members.map((m) => m._id)]), [ws]);
  const candidates = users.filter((u) => !inWs.has(u._id) && u.status !== 'DELETED');
  const people: (WorkspaceMember & { isOwner?: boolean })[] = [{ ...ws.ownerId, isOwner: true }, ...ws.members];

  return (
    <Section title="People" description={`${people.length} in this workspace.`}>
      <ul className="divide-y">
        {people.map((m) => (
          <li key={m._id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {(m.firstName?.[0] ?? m.email[0] ?? '?').toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{personName(m)}</div>
              <div className="truncate text-xs text-muted-foreground">{m.email}</div>
            </div>
            {m.isOwner ? <Badge>Owner</Badge> : <Badge variant="outline">{m.role === 'ADMIN' ? 'Admin' : 'Annotator'}</Badge>}
            <StatusDot status={m.status} online={m.isOnline} />
            {canManage && !m.isOwner && (
              <Button size="sm" variant="ghost" aria-label={`Remove ${personName(m)}`} onClick={() => onRemove(m)}><UserMinus className="h-4 w-4" /></Button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <form className="flex flex-wrap items-end gap-2 border-t px-4 py-3" onSubmit={(e) => { e.preventDefault(); if (pick) { onAdd({ userId: pick }); setPick(''); } else if (email.trim()) { onAdd({ email: email.trim() }); setEmail(''); } }}>
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Add a person</span>
            {candidates.length > 0 ? (
              <select value={pick} onChange={(e) => { setPick(e.target.value); setEmail(''); }} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Choose from existing users…</option>
                {candidates.map((u) => <option key={u._id} value={u._id}>{personName(u)} · {u.email}</option>)}
              </select>
            ) : (
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email of an existing user" />
            )}
          </label>
          <Button type="submit" size="sm" disabled={!pick && !email.trim()}>Add</Button>
          <p className="basis-full text-xs text-muted-foreground">
            Only registered users can be added. New people are invited from <Link href="/users" className="underline">Users</Link> first.
          </p>
        </form>
      )}
    </Section>
  );
}

function StatusDot({ status, online }: { status: string; online?: boolean }) {
  const label = online ? 'online' : status.toLowerCase();
  const color = online ? 'bg-emerald-500' : status === 'ACTIVE' ? 'bg-muted-foreground/40' : 'bg-amber-500';
  return (
    <span className="flex w-16 items-center gap-1.5 text-xs text-muted-foreground" title={label}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${color}`} />{label}
    </span>
  );
}

// ── Datasets ───────────────────────────────────────────────────────────────

// Each dataset shows who is on it and lets the owner put a member on it. What
// "assign" does depends on the workspace mode: CLONE creates the person's own
// copy (clone-assign); SHARED gives them access to the one dataset (share).
function Datasets({ items, ws, canManage, onChanged, onAttach, onDetach }: {
  items: WorkspaceDataset[]; ws: WorkspaceResponse; canManage: boolean; onChanged: () => void;
  onAttach: (datasetId: string) => void; onDetach: (datasetId: string) => void;
}) {
  const [all, setAll] = useState<DatasetResponse[]>([]);
  const [pick, setPick] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (canManage) datasetsAPI.getAll().then(setAll).catch(() => setAll([])); }, [canManage, items]);
  const here = new Set(items.map((d) => d._id));
  const candidates = all.filter((d) => !d.isClone && !here.has(d._id));
  const members = [ws.ownerId, ...ws.members];
  const shared = ws.sharingMode === 'SHARED';

  const assign = async (datasetId: string, userId: string) => {
    setAssigning(datasetId); setError(null);
    try {
      if (shared) await datasetsAPI.shareWithUsers(datasetId, [userId]);
      else await datasetsAPI.cloneAndAssign(datasetId, [userId]);
      onChanged();
    } catch (e) { setError(apiMessage(e, 'Could not assign')); }
    finally { setAssigning(null); }
  };

  return (
    <Section title="Datasets" description={shared ? 'One shared copy per dataset. Assigning gives a person access to it.' : 'Assigning gives a person their own copy to annotate.'}>
      {error && <p className="px-4 pt-3 text-sm text-destructive">{error}</p>}
      {items.length === 0 ? <Empty>No datasets yet.</Empty> : (
        <ul className="divide-y">
          {items.map((d) => {
            const on = new Set((d.assignees ?? []).map((a) => a._id));
            const free = members.filter((m) => !on.has(m._id));
            return (
              <li key={d._id} className="space-y-2 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/dataset/${d._id}`} className="truncate font-medium hover:underline">{d.name}</Link>
                    <div className="text-xs text-muted-foreground">{d.datasetType} · updated {timeAgo(d.updatedAt)}</div>
                  </div>
                  <Button asChild size="sm" variant="ghost" title="Who changed what"><Link href={`/dataset/${d._id}/history`}><History className="mr-1 h-4 w-4" /> History</Link></Button>
                  {canManage && <Button size="sm" variant="ghost" aria-label={`Remove ${d.name} from workspace`} onClick={() => onDetach(d._id)}><X className="h-4 w-4" /></Button>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(d.assignees ?? []).length === 0 && <span className="text-xs text-muted-foreground">Nobody assigned yet.</span>}
                  {(d.assignees ?? []).map((a) => (
                    <Badge key={a._id} variant="outline" className="gap-1 font-normal">
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${a.isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      {personName(a)}
                    </Badge>
                  ))}
                  {canManage && free.length > 0 && (
                    <select
                      value=""
                      disabled={assigning === d._id}
                      onChange={(e) => { if (e.target.value) assign(d._id, e.target.value); }}
                      aria-label={`Assign someone to ${d.name}`}
                      className="h-7 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value="">{assigning === d._id ? 'Assigning…' : shared ? '+ Give access' : '+ Assign a copy'}</option>
                      {free.map((m) => <option key={m._id} value={m._id}>{personName(m)}</option>)}
                    </select>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {canManage && (
        <div className="space-y-3 border-t px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Create a dataset here, then upload data, configure fields and assign people to it.</p>
            <Button asChild size="sm"><Link href={`/dataset/add-dataset?workspaceId=${ws._id}`}><Plus className="mr-1 h-4 w-4" /> New dataset</Link></Button>
          </div>
          {candidates.length > 0 && (
            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (pick) { onAttach(pick); setPick(''); } }}>
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Or attach an existing dataset</span>
                <select value={pick} onChange={(e) => setPick(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">Choose a dataset…</option>
                  {candidates.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </label>
              <Button type="submit" size="sm" variant="outline" disabled={!pick}>Attach</Button>
            </form>
          )}
        </div>
      )}
    </Section>
  );
}
