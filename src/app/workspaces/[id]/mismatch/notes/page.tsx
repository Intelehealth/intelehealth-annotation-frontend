'use client';

/**
 * #23 Notes & daily summary for one mismatch workspace.
 *   Left:  MedGemma summary of what reviewers wrote (daily / 7 days / 30 days). Every line cites the visits it
 *          comes from; counts are computed by the server, not the model; lines can be marked wrong.
 *   Right: notes annotators / reviewers write themselves (author + day; only the author edits).
 */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Flag, Loader2, RefreshCw, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { friendlyError, Shell } from '@/components/mismatch/shared';
import { cn } from '@/lib/utils';
import { mismatchAPI, type MismatchAccess, type MismatchNote, type ReportCategory, type ReportsPage, type ReviewReport } from '@/lib/api/mismatch';

type Win = 'day' | '7d' | '30d';
const WINS: { key: Win; label: string }[] = [{ key: 'day', label: 'Daily' }, { key: '7d', label: 'Last 7 days' }, { key: '30d', label: 'Last 30 days' }];
const CAT: Record<ReportCategory, { label: string; tone: string }> = {
  safety: { label: 'Safety concern', tone: 'bg-rose-100 text-rose-800' },
  ai_wrong: { label: 'AI suggestion questioned', tone: 'bg-amber-100 text-amber-800' },
  doctor_wrong: { label: "Doctor's choice questioned", tone: 'bg-sky-100 text-sky-800' },
  note_unclear: { label: 'Note unclear', tone: 'bg-slate-100 text-slate-700' },
  process: { label: 'Workflow', tone: 'bg-violet-100 text-violet-800' },
  other: { label: 'Other', tone: 'bg-slate-100 text-slate-700' },
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (ymd: string) => `${Number(ymd.slice(8, 10))} ${MONTHS[Number(ymd.slice(5, 7)) - 1]} ${ymd.slice(0, 4)}`;
const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

export default function NotesPage() {
  const { id } = useParams<{ id: string }>();
  const [acl, setAcl] = useState<MismatchAccess | null>(null);
  const [name, setName] = useState('');
  const [win, setWin] = useState<Win>('day');
  const [reports, setReports] = useState<ReportsPage | null>(null);
  const [notes, setNotes] = useState<MismatchNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildDay, setBuildDay] = useState(istToday());

  useEffect(() => {
    mismatchAPI.overview(id).then((o) => { setAcl(o.access ?? null); setName(o.workspace.name); }).catch((e) => setError(friendlyError(e, 'Could not open the workspace')));
  }, [id]);
  const loadReports = useCallback(() => mismatchAPI.reports(id, win).then(setReports).catch((e) => setError(friendlyError(e, 'Could not load the summaries'))), [id, win]);
  const loadNotes = useCallback(() => mismatchAPI.notes(id).then(setNotes).catch((e) => setError(friendlyError(e, 'Could not load the notes'))), [id]);
  useEffect(() => { void loadReports(); }, [loadReports]);
  useEffect(() => { void loadNotes(); }, [loadNotes]);

  const build = async () => {
    setBuilding(true); setError(null);
    try { await mismatchAPI.generateReport(id, win, buildDay); await loadReports(); }
    catch (e) { setError(friendlyError(e, 'Could not build the summary')); }
    finally { setBuilding(false); }
  };

  return (
    <Shell wide>
      <Link href={`/workspaces/${id}/mismatch`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> {name || 'Workspace'}</Link>
      <h1 className="text-xl font-semibold">Notes &amp; daily summary</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-lg border bg-card" aria-label="Summary of review comments">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <h2 className="mr-auto text-base font-semibold">Summary of review comments</h2>
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="Window">
              {WINS.map((w) => (
                <button key={w.key} onClick={() => setWin(w.key)} aria-pressed={win === w.key}
                  className={cn('rounded-md px-3 py-1 text-sm', win === w.key ? 'bg-indigo-600 font-medium text-white' : 'text-muted-foreground hover:text-foreground')}>{w.label}</button>
              ))}
            </div>
            {acl?.canSync && reports?.configured && (
              <div className="flex items-center gap-1.5">
                <input type="date" aria-label="Day" className="h-8 rounded-md border bg-background px-2 text-xs" value={buildDay} max={istToday()} onChange={(e) => setBuildDay(e.target.value || istToday())} />
                <Button size="sm" variant="outline" disabled={building} onClick={build}>
                  {building ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}Build now
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-4 p-4">
            {!reports ? <div className="h-40 animate-pulse rounded-md bg-muted" />
              : !reports.configured ? <p className="text-sm text-muted-foreground">MedGemma is not configured on the server.</p>
              : reports.reports.length === 0 ? <p className="text-sm text-muted-foreground">No summary yet.</p>
              : reports.reports.map((r, i) => <Report key={r._id} r={r} open={i === 0} workspaceId={id} uuidOf={reports.uuidOf} onChange={loadReports} />)}
          </div>
        </section>
        <Notes workspaceId={id} notes={notes} onChange={loadNotes} />
      </div>
    </Shell>
  );
}

function Report({ r, open, workspaceId, uuidOf, onChange }: { r: ReviewReport; open: boolean; workspaceId: string; uuidOf: Record<string, string>; onChange: () => void }) {
  const [show, setShow] = useState(open);
  const c = r.counts;
  const period = r.window === 'day' ? day(r.to) : `${day(r.from)} – ${day(r.to)}`;
  const wrongBy = (i: number) => r.feedback.filter((f) => f.line === i && f.wrong);
  const mark = async (i: number, wrong: boolean) => { await mismatchAPI.reportFeedback(workspaceId, r._id, i, wrong); onChange(); };
  return (
    <article className="rounded-lg border">
      <button onClick={() => setShow((s) => !s)} aria-expanded={show} className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-left">
        <span className="font-semibold">{period}</span>
        {c && <span className="text-xs text-muted-foreground" data-counts>{c.reviews} reviews on {c.visits} visits · {c.flagged} flagged · {c.byPerson.map((p) => `${p.name} ${p.reviews}`).join(', ')}</span>}
        <span className={cn('ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium',
          r.status === 'ok' ? 'bg-emerald-100 text-emerald-800' : r.status === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700')}>
          {r.status === 'ok' ? 'Summary' : r.status === 'insufficient' ? 'Not enough comments' : r.status === 'running' ? 'Building…' : 'Not built'}
        </span>
      </button>
      {show && (
        <div className="space-y-3 border-t px-4 py-3">
          {r.status === 'insufficient' && <p className="text-sm text-muted-foreground">Not enough comments to summarise.</p>}
          {r.status === 'error' && <p className="text-sm text-rose-700">MedGemma could not be reached; no summary for this period.</p>}
          {r.status === 'ok' && (
            <ul className="space-y-2">
              {r.lines.map((l, i) => {
                const wrong = wrongBy(i);
                return (
                  <li key={i} className={cn('rounded-md border px-3 py-2 text-sm', wrong.length && 'border-rose-300 bg-rose-50/40')}>
                    <div className="flex items-start gap-2">
                      {l.category && <span className={cn('mt-0.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium', CAT[l.category]?.tone)}>{l.category === 'safety' && <Flag className="mr-0.5 inline h-3 w-3" />}{CAT[l.category]?.label}</span>}
                      <span className="flex-1">{l.text}</span>
                      <button onClick={() => mark(i, !wrong.length)} title={wrong.length ? `Marked wrong by ${wrong.map((w) => w.by).join(', ')}` : 'Mark this line wrong'}
                        className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs', wrong.length ? 'text-rose-700' : 'text-muted-foreground hover:text-foreground')}>
                        <ThumbsDown className="h-3.5 w-3.5" />{wrong.length ? `Wrong (${wrong.length})` : 'Wrong?'}
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      {l.visitIds.map((v) => uuidOf[v]
                        ? <Link key={v} href={`/workspaces/${workspaceId}/mismatch/${uuidOf[v]}`} className="rounded bg-muted px-1.5 py-0.5 tabular-nums text-blue-700 hover:underline">Visit {v}</Link>
                        : <span key={v} className="rounded bg-muted px-1.5 py-0.5 tabular-nums">Visit {v}</span>)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground">
            {r.model} · {r.promptVersion}{r.fallback ? ' · reviewer findings listed as written' : ''} · {r.droppedCount} statement{r.droppedCount === 1 ? '' : 's'} removed by the checker · counts by the server
          </p>
        </div>
      )}
    </article>
  );
}

function Notes({ workspaceId, notes, onChange }: { workspaceId: string; notes: MismatchNote[] | null; onChange: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!text.trim()) return;
    setBusy(true); setError(null);
    try { await mismatchAPI.addNote(workspaceId, text.trim()); setText(''); onChange(); }
    catch (e) { setError(friendlyError(e, 'Could not save the note')); } finally { setBusy(false); }
  };
  const saveEdit = async () => {
    if (!editing?.text.trim()) return;
    try { await mismatchAPI.editNote(workspaceId, editing.id, editing.text.trim()); setEditing(null); onChange(); }
    catch (e) { setError(friendlyError(e, 'Could not save the note')); }
  };
  return (
    <section className="rounded-lg border bg-card" aria-label="Notes">
      <h2 className="border-b px-4 py-3 text-base font-semibold">Notes</h2>
      <div className="space-y-3 p-4">
        <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={4} placeholder="Today's summary, recurring AI errors, things for the clinical team…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex justify-end"><Button size="sm" disabled={busy || !text.trim()} onClick={save}>Save note</Button></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!notes ? <div className="h-24 animate-pulse rounded-md bg-muted" /> : notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n._id} className="rounded-md border px-3 py-2">
                <div className="mb-1 flex items-baseline gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{n.authorName}</span><span>{day(n.day)}</span>{n.edited && <span>· edited</span>}
                  {n.mine && editing?.id !== n._id && <button className="ml-auto hover:text-foreground" onClick={() => setEditing({ id: n._id, text: n.text })}>Edit</button>}
                </div>
                {editing?.id === n._id ? (
                  <div className="space-y-2">
                    <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={3} value={editing.text} onChange={(e) => setEditing({ id: n._id, text: e.target.value })} />
                    <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" onClick={saveEdit}>Save</Button></div>
                  </div>
                ) : <p className="whitespace-pre-wrap text-sm">{n.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
