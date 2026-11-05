'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { consensusAPI } from '@/lib/api/consensus';
import { usersAPI, type UserResponse } from '@/lib/api/users';
import { apiMessage, workspacesAPI, type WorkspaceMember, type WorkspaceResponse } from '@/lib/api/workspaces';

type Preview = Awaited<ReturnType<typeof consensusAPI.sendToVerificationPreview>>;

const today = () => new Date().toISOString().slice(0, 10);
const personName = (m: Pick<WorkspaceMember, 'firstName' | 'lastName' | 'email'>) => [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;

export function SendToVerificationDialog({ open, onOpenChange, datasetId, datasetName }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  datasetName: string;
}) {
  const { showToast } = useToast();
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [membersOf, setMembersOf] = useState<{ id: string; list: WorkspaceMember[] }>({ id: '', list: [] });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Preview | null>(null);
  const [customName, setCustomName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [extra, setExtra] = useState<UserResponse[]>([]);
  const [query, setQuery] = useState('');
  const [addedNote, setAddedNote] = useState('');

  useEffect(() => {
    workspacesAPI.list().then((list) => {
      setWorkspaces(list);
      const pre = list.find((w) => /consensus verification/i.test(w.name));
      if (pre) setWorkspaceId(pre._id);
    }).catch((e) => setError(apiMessage(e, 'Could not load workspaces')));
    usersAPI.getAll().then((u) => setAllUsers(u.filter((x) => x.status === 'ACTIVE' && x.isActive))).catch(() => setAllUsers([]));
    consensusAPI.sendToVerificationPreview(datasetId).then(setPreview).catch(() => setPreview(null));
  }, [datasetId]);

  useEffect(() => {
    if (!workspaceId) return;
    workspacesAPI.get(workspaceId)
      .then((ws) => setMembersOf({ id: workspaceId, list: [ws.ownerId, ...ws.members].filter((m, i, a) => m && a.findIndex((x) => x._id === m._id) === i) }))
      .catch((e) => setError(apiMessage(e, 'Could not load workspace members')));
  }, [workspaceId]);

  const members = membersOf.id === workspaceId ? membersOf.list : [];
  const name = customName ?? `Verification: ${datasetName} · ${today()}${preview?.existing?.length ? ` · v${preview.existing.length + 1}` : ''}`;
  const pickWorkspace = (id: string) => { setWorkspaceId(id); setPicked(new Set()); setExtra([]); setQuery(''); };
  const memberIds = new Set(members.map((m) => m._id));
  const shownExtra = extra.filter((u) => !memberIds.has(u._id));
  const q = query.trim().toLowerCase();
  const matches = q
    ? allUsers.filter((u) => !memberIds.has(u._id) && !extra.some((x) => x._id === u._id)
        && `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.email}`.toLowerCase().includes(q)).slice(0, 6)
    : [];
  const addExtra = (u: UserResponse) => { setExtra((l) => [...l, u]); setPicked((s) => new Set(s).add(u._id)); setQuery(''); };

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const submit = async () => {
    setSubmitting(true); setError('');
    try {
      const r = await consensusAPI.sendToVerification(datasetId, { workspaceId, reviewerIds: [...picked], name: name.trim() || undefined });
      setCreatedId(r.datasetId);
      const n = r.addedToWorkspace?.length ?? 0;
      if (n > 0) setAddedNote(`Added ${n} doctor(s) to ${workspaces.find((w) => w._id === workspaceId)?.name ?? 'the workspace'}.`);
      showToast({ type: 'success', title: 'Sent to verification', description: `${r.name} (${r.rows} rows)` });
    } catch (e) {
      setError(apiMessage(e, 'Could not send to verification'));
    } finally {
      setSubmitting(false);
    }
  };

  const existing = preview?.existing ?? [];
  const notes = [
    preview?.pendingRows ? `${preview.pendingRows} rows still contain PENDING` : '',
    preview?.questionsWithoutFinal ? `${preview.questionsWithoutFinal} questions have no final answer (the consensus value will be used)` : '',
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send to verification</DialogTitle>
          <DialogDescription>Creates a new dataset from the current final answers (consensus where none). This dataset is not changed.</DialogDescription>
        </DialogHeader>
        {createdId ? (
          <div className="space-y-3 text-sm">
            <p>Verification dataset created.</p>
            {addedNote && <p>{addedNote}</p>}
            <Button asChild><Link href={`/dataset/${createdId}/consensus`}>Open verification consensus</Link></Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {existing.length > 0 && (
              <div className="rounded-md border bg-gray-50 p-2 text-xs">
                <div className="mb-1 font-medium text-gray-700">Already sent</div>
                <ul className="space-y-0.5">
                  {existing.map((x) => (
                    <li key={x.datasetId}>
                      <Link href={`/dataset/${x.datasetId}/consensus`} className="text-indigo-600 underline">{x.name}</Link>
                      {' · '}{new Date(x.at).toLocaleDateString()} · {x.accepted}/{x.rows} accepted
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {notes.length > 0 && <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">{notes.join(' · ')}</div>}
            <label className="block space-y-1">
              <span className="font-medium">Name</span>
              <Input value={name} onChange={(e) => { setCustomName(e.target.value); }} />
            </label>
            <div className="space-y-1">
              <span className="font-medium">Workspace</span>
              <Select value={workspaceId} onValueChange={pickWorkspace}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose a workspace" /></SelectTrigger>
                <SelectContent>{workspaces.map((w) => <SelectItem key={w._id} value={w._id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="font-medium">Doctors</span>
              {!workspaceId ? <p className="text-xs text-gray-500">Pick a workspace first.</p> : (
                <>
                  <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                    {members.length === 0 && shownExtra.length === 0 && <p className="text-xs text-gray-500">No members.</p>}
                    {members.map((m) => (
                      <label key={m._id} className="flex items-center gap-2">
                        <Checkbox checked={picked.has(m._id)} onChange={() => toggle(m._id)} />
                        <span>{personName(m)}</span><span className="text-xs text-gray-400">{m.email}</span>
                      </label>
                    ))}
                    {shownExtra.map((u) => (
                      <label key={u._id} className="flex items-center gap-2">
                        <Checkbox checked={picked.has(u._id)} onChange={() => toggle(u._id)} />
                        <span>{personName(u)}</span><span className="text-xs text-gray-400">{u.email}</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">will be added to workspace</span>
                      </label>
                    ))}
                  </div>
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Add a doctor by name or email" />
                  {matches.length > 0 && (
                    <ul className="max-h-32 overflow-auto rounded-md border">
                      {matches.map((u) => (
                        <li key={u._id}>
                          <button type="button" className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-gray-50" onClick={() => addExtra(u)}>
                            <span>{personName(u)}</span><span className="text-xs text-gray-400">{u.email}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              <p className="text-xs text-gray-500">You can change doctors later from the workspace page (members and dataset reviewers).</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
        {!createdId && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting || !workspaceId || picked.size === 0}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send to verification
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
