'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flag, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Empty } from '@/components/dashboard/kpi';
import { apiMessage } from '@/lib/api/workspaces';
import {
  DDX_VERDICTS, mismatchAPI, TTX_VERDICTS,
  type Facets, type QueueItem, type QueuePage, type QueueQuery, type QueueTab,
} from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';
import { fmtDate, HighlightChip, StatusBadge, TypeBadge } from './shared';

type Opt = { value: string; label: string };

const MISMATCH: Opt[] = [
  { value: '', label: 'All' },
  { value: 'ddx', label: 'Diagnosis' },
  { value: 'ttx', label: 'Treatment' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'No mismatch' },
];
const DDX: Opt[] = [
  { value: '', label: 'Any diagnosis outcome' },
  { value: 'not_in_top5', label: 'Doctor picked none of AI top 5' },
  { value: 'picked_top1', label: 'Doctor picked AI #1' },
  { value: 'picked_2_5', label: 'Doctor picked AI #2–#5' },
  { value: 'by_name', label: 'Picked by typing the AI name' },
  { value: 'doctor_added', label: 'Doctor added own diagnosis' },
  { value: 'follow_up', label: 'Follow-up visit' },
  { value: 'no_ai', label: 'No AI diagnosis' },
];
const TTX: Opt[] = [
  { value: '', label: 'Any treatment outcome' },
  { value: 'any_change', label: 'Any change to AI plan' },
  { value: 'dose_changed', label: 'Dose / frequency changed' },
  { value: 'not_used', label: 'AI medicine not used' },
  { value: 'added', label: 'Doctor added a medicine' },
  { value: 'exact_only', label: 'AI plan accepted exactly' },
  { value: 'no_ai', label: 'No AI treatment' },
];
const AGES: Opt[] = [
  { value: '', label: 'Any age' }, { value: 'lt5', label: 'Under 5' }, { value: '5to17', label: '5–17' },
  { value: '18to59', label: '18–59' }, { value: '60plus', label: '60+' },
];
const GENDERS: Opt[] = [{ value: '', label: 'Any gender' }, { value: 'F', label: 'Female' }, { value: 'M', label: 'Male' }];
const STATUS: Opt[] = [{ value: '', label: 'Any status' }, { value: 'pending', label: 'Not opened' }, { value: 'in_progress', label: 'Opened by someone' }];
const VERDICTS: Opt[] = [
  { value: '', label: 'Any verdict' },
  ...DDX_VERDICTS.map((v) => ({ value: v.value, label: v.label })),
  ...TTX_VERDICTS.filter((t) => !DDX_VERDICTS.some((d) => d.value === t.value)).map((v) => ({ value: v.value, label: v.label })),
];
const SORTS: Opt[] = [{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }];

const istDay = (offset = 0) => new Date(Date.now() + 5.5 * 3600_000 - offset * 86400_000).toISOString().slice(0, 10);
const DATE_PRESETS = [
  { key: 'today', label: 'Today', from: () => istDay(0) },
  { key: '7', label: 'Last 7 days', from: () => istDay(6) },
  { key: '30', label: 'Last 30 days', from: () => istDay(29) },
];

const field = 'h-9 w-full rounded-md border bg-background px-2 text-sm';
const DEFAULT: QueueQuery = { sort: 'newest', page: 1, limit: 25 };
// Keys that count as user filters (shown as chips, cleared by "Clear all").
const FILTER_KEYS: (keyof QueueQuery)[] = ['mismatch', 'ddx', 'ttx', 'status', 'from', 'to', 'specialty', 'gender', 'age', 'dx', 'med', 'reviewer', 'verdict', 'followUp', 'images', 'q'];

export function MismatchQueue({ workspaceId, tab, refreshKey, onCounts }: {
  workspaceId: string; tab: QueueTab; refreshKey: number; onCounts: (c: QueuePage['counts']) => void;
}) {
  const storeKey = `mismatch-filters-${workspaceId}`;
  const [q, setQ] = useState<QueueQuery>(DEFAULT);
  const [ready, setReady] = useState(false);
  const [more, setMore] = useState(false);
  const [search, setSearch] = useState(q.q ?? '');
  const [dx, setDx] = useState(q.dx ?? '');
  const [med, setMed] = useState(q.med ?? '');
  const [facets, setFacets] = useState<Facets | null>(null);
  const [data, setData] = useState<QueuePage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { mismatchAPI.facets(workspaceId).then(setFacets).catch(() => undefined); }, [workspaceId, refreshKey]);
  // Filters survive navigating to a visit and back (per browser tab).
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storeKey) ?? '{}') as QueueQuery;
      setQ({ ...DEFAULT, ...saved, page: 1 });
      setSearch(saved.q ?? ''); setDx(saved.dx ?? ''); setMed(saved.med ?? '');
    } catch { /* storage unavailable */ }
    setReady(true);
  }, [storeKey]);
  useEffect(() => { setQ((p) => ({ ...p, page: 1 })); }, [tab]);
  useEffect(() => {
    if (!ready) return;
    try { const { page: _p, ...keep } = q; sessionStorage.setItem(storeKey, JSON.stringify(keep)); } catch { /* storage unavailable */ }
  }, [q, storeKey, ready]);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    mismatchAPI.queue(workspaceId, { ...q, tab })
      .then((d) => { if (live) { setData(d); setError(null); onCounts(d.counts); } })
      .catch((e) => live && setError(apiMessage(e, 'Could not load the queue')));
    return () => { live = false; };
  }, [workspaceId, q, tab, refreshKey, onCounts, ready]);

  const set = (patch: Partial<QueueQuery>) => setQ((p) => ({ ...p, ...patch, page: patch.page ?? 1 }));
  const clearAll = () => { setSearch(''); setDx(''); setMed(''); setQ({ ...DEFAULT, sort: q.sort }); };
  const pages = data ? Math.max(1, Math.ceil(data.total / (q.limit ?? 25))) : 1;

  const label = (opts: Opt[], v?: string) => opts.find((o) => o.value === v)?.label ?? v;
  const chips = useMemo(() => {
    const out: { key: keyof QueueQuery; text: string }[] = [];
    for (const k of FILTER_KEYS) {
      const v = q[k];
      if (v === undefined || v === '') continue;
      const text =
        k === 'mismatch' ? `Mismatch: ${label(MISMATCH, String(v))}`
        : k === 'ddx' ? label(DDX, String(v))
        : k === 'ttx' ? label(TTX, String(v))
        : k === 'status' ? label(STATUS, String(v))
        : k === 'from' ? `From ${v}`
        : k === 'to' ? `To ${v}`
        : k === 'gender' ? label(GENDERS, String(v))
        : k === 'age' ? `Age ${label(AGES, String(v))}`
        : k === 'dx' ? `Diagnosis: “${v}”`
        : k === 'med' ? `Medicine: “${v}”`
        : k === 'reviewer' ? `Reviewer: ${facets?.reviewers.find((r) => r._id === v)?.name ?? '…'}`
        : k === 'verdict' ? `Verdict: ${label(VERDICTS, String(v))}`
        : k === 'followUp' ? 'Flagged for follow-up'
        : k === 'images' ? 'Has images'
        : k === 'q' ? `Search: “${v}”`
        : String(v);
      out.push({ key: k, text: text ?? String(v) });
    }
    return out;
  }, [q, facets]);
  const datePreset = DATE_PRESETS.find((p) => q.from === p.from() && !q.to)?.key;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="Mismatch type">
            {MISMATCH.filter((m) => tab === 'all' || m.value !== 'none').map((m) => (
              <button key={m.value} onClick={() => set({ mismatch: m.value || undefined })}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium', (q.mismatch ?? '') === m.value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="inline-flex flex-wrap gap-1">
            {DATE_PRESETS.map((p) => (
              <button key={p.key} onClick={() => set(datePreset === p.key ? { from: undefined, to: undefined } : { from: p.from(), to: undefined })}
                className={cn('rounded-full border px-3 py-1 text-xs font-medium', datePreset === p.key ? 'border-foreground bg-foreground text-background' : 'hover:bg-accent')}>
                {p.label}
              </button>
            ))}
          </div>
          <form className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs" onSubmit={(e) => { e.preventDefault(); set({ q: search.trim() || undefined }); }}>
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="h-9 pl-8" placeholder="Search note, diagnosis, medicine, uuid…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          <Button variant={more ? 'secondary' : 'outline'} size="sm" className="h-9" onClick={() => setMore((m) => !m)}>
            <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Filters{chips.length ? ` (${chips.length})` : ''}
          </Button>
        </div>

        {more && (
          <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <Labeled label="Diagnosis outcome"><Select opts={DDX} value={q.ddx} onChange={(v) => set({ ddx: v })} /></Labeled>
            <Labeled label="Treatment outcome"><Select opts={TTX} value={q.ttx} onChange={(v) => set({ ttx: v })} /></Labeled>
            <Labeled label="From"><input type="date" className={field} value={q.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} /></Labeled>
            <Labeled label="To"><input type="date" className={field} value={q.to ?? ''} onChange={(e) => set({ to: e.target.value || undefined })} /></Labeled>
            <Labeled label="Diagnosis name (doctor or AI)">
              <form onSubmit={(e) => { e.preventDefault(); set({ dx: dx.trim() || undefined }); }}>
                <Input className="h-9" placeholder="e.g. gastritis — press Enter" value={dx} onChange={(e) => setDx(e.target.value)} onBlur={() => set({ dx: dx.trim() || undefined })} />
              </form>
            </Labeled>
            <Labeled label="Medicine name (doctor or AI)">
              <form onSubmit={(e) => { e.preventDefault(); set({ med: med.trim() || undefined }); }}>
                <Input className="h-9" placeholder="e.g. cetirizine — press Enter" value={med} onChange={(e) => setMed(e.target.value)} onBlur={() => set({ med: med.trim() || undefined })} />
              </form>
            </Labeled>
            <Labeled label="Specialty">
              <Select opts={[{ value: '', label: 'Any specialty' }, ...(facets?.specialties ?? []).map((s) => ({ value: s, label: s }))]} value={q.specialty} onChange={(v) => set({ specialty: v })} />
            </Labeled>
            <div className="grid grid-cols-2 gap-2">
              <Labeled label="Gender"><Select opts={GENDERS} value={q.gender} onChange={(v) => set({ gender: v })} /></Labeled>
              <Labeled label="Age"><Select opts={AGES} value={q.age} onChange={(v) => set({ age: v })} /></Labeled>
            </div>
            {tab === 'todo' && <Labeled label="Review status"><Select opts={STATUS} value={q.status} onChange={(v) => set({ status: v })} /></Labeled>}
            {tab !== 'todo' && (
              <Labeled label="Reviewed by">
                <Select opts={[{ value: '', label: 'Anyone' }, ...(facets?.reviewers ?? []).map((r) => ({ value: r._id, label: r.name }))]} value={q.reviewer} onChange={(v) => set({ reviewer: v })} />
              </Labeled>
            )}
            {tab !== 'todo' && <Labeled label="Reviewer verdict"><Select opts={VERDICTS} value={q.verdict} onChange={(v) => set({ verdict: v })} /></Labeled>}
            <Labeled label="Sort"><Select opts={SORTS} value={q.sort} onChange={(v) => set({ sort: v || 'newest' })} /></Labeled>
            <div className="flex items-end gap-4 pb-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={q.followUp === '1'} onChange={(e) => set({ followUp: e.target.checked ? '1' : undefined })} /> Flagged for follow-up</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={q.images === '1'} onChange={(e) => set({ images: e.target.checked ? '1' : undefined })} /> Has images</label>
            </div>
          </div>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t px-4 py-2.5">
            {chips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800">
                {c.text}
                <button aria-label={`Remove ${c.text}`} className="rounded-full hover:bg-indigo-100"
                  onClick={() => { if (c.key === 'q') setSearch(''); if (c.key === 'dx') setDx(''); if (c.key === 'med') setMed(''); set({ [c.key]: undefined }); }}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            <button className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={clearAll}>Clear all</button>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs text-muted-foreground">
          <span className="tabular-nums">{data ? `${data.total.toLocaleString()} visit${data.total === 1 ? '' : 's'}` : 'Loading…'}</span>
          <span>{q.sort === 'oldest' ? 'Oldest first' : 'Newest first'}</span>
        </div>
        {error && <p className="px-4 py-3 text-sm text-destructive">{error}</p>}
        {!data ? (
          <div className="m-4 h-40 animate-pulse rounded-md bg-muted" />
        ) : data.items.length === 0 ? (
          <Empty>{tab === 'todo' ? 'Nothing left to annotate with these filters. New mismatches appear automatically after each sync.' : 'No visits match these filters.'}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Visit</th>
                  <th className="px-4 py-2 font-medium">Complaint</th>
                  <th className="px-4 py-2 font-medium">AI top-1 → doctor</th>
                  <th className="px-4 py-2 font-medium">Mismatch</th>
                  <th className="px-4 py-2 font-medium">What differs</th>
                  <th className="px-4 py-2 font-medium">{tab === 'todo' ? 'Status' : 'Review'}</th>
                </tr>
              </thead>
              <tbody className="divide-y">{data.items.map((v) => <Row key={v.uuid} v={v} workspaceId={workspaceId} />)}</tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
          Page {q.page} of {pages}
          <Button variant="ghost" size="sm" disabled={(q.page ?? 1) <= 1} onClick={() => setQ((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" disabled={(q.page ?? 1) >= pages} onClick={() => setQ((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

const VERDICT_LABEL = Object.fromEntries([...DDX_VERDICTS, ...TTX_VERDICTS].map((v) => [v.value, v.label]));

function Row({ v, workspaceId }: { v: QueueItem; workspaceId: string }) {
  return (
    <tr className="align-top hover:bg-accent/30">
      <td className="whitespace-nowrap px-4 py-3">
        <Link href={`/workspaces/${workspaceId}/mismatch/${v.uuid}`} className="font-medium text-blue-700 hover:underline">{fmtDate(v.encounterAt)}</Link>
        <div className="text-xs text-muted-foreground">{[v.gender, v.age != null ? `${v.age}y` : null, v.specialty].filter(Boolean).join(' · ')}</div>
      </td>
      <td className="max-w-[200px] px-4 py-3 text-xs text-muted-foreground"><span className="line-clamp-2">{v.complaint || '—'}</span></td>
      <td className="max-w-[260px] px-4 py-3 text-xs">
        <div className="text-muted-foreground">
          AI: {v.aiTop1 ?? '—'}
          {v.bestRank ? <span className="ml-1 text-emerald-700">(picked #{v.bestRank}{v.pickedBy === 'name' ? ', typed' : ''})</span> : null}
        </div>
        <div className="font-medium">Dr: {v.doctorDx.join(', ') || '—'}</div>
      </td>
      <td className="px-4 py-3"><TypeBadge type={v.mismatchType} /></td>
      <td className="max-w-[320px] px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {v.highlights.slice(0, 3).map((h, i) => <HighlightChip key={i} h={h} />)}
          {v.highlights.length > 3 && <span className="self-center text-xs text-muted-foreground">+{v.highlights.length - 3} more</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <StatusBadge status={v.review.status} />
          {v.review.followUp && <Flag className="h-3.5 w-3.5 text-rose-600" aria-label="Flagged for follow-up" />}
        </div>
        {(v.review.annotatedBy || v.review.claimedBy) && <div className="mt-1 text-xs text-muted-foreground">{v.review.annotatedBy ?? v.review.claimedBy}</div>}
        {v.review.status === 'done' && (v.review.ddxVerdict || v.review.ttxVerdict) && (
          <div className="mt-0.5 max-w-[180px] text-xs text-muted-foreground">{VERDICT_LABEL[v.review.ddxVerdict ?? v.review.ttxVerdict ?? '']}</div>
        )}
      </td>
    </tr>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Select({ opts, value, onChange }: { opts: Opt[]; value?: string; onChange: (v: string | undefined) => void }) {
  return (
    <select className={field} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

