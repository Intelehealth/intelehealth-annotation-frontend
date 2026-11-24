'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChevronDown, ChevronUp, Download, Info, Loader2 } from 'lucide-react';
import { Empty, Section } from '@/components/dashboard/kpi';
import { pct } from '@/components/dashboard/format';
import { friendlyError } from '@/components/mismatch/shared';
import {
  doctorLabel, EQUIV_REASON_LABEL, mismatchAPI, PLAN_TYPE_LABEL, RULE_LABEL, type ChangeType, type DashboardData, type DxAgg, type TatRow,
} from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';
import { DiagnosisPatterns, DoctorProgress } from './insights';
import { exportDashboardExcel } from './export-excel';
import { OverviewTab } from './overview';
import { CasePatternsSection } from './case-patterns';
import { earlierRanges, presetRange } from '@/lib/period-range';
import { MIN_DOCTOR_N } from '@/lib/dashboard-tables';
import { adviceEnglish, displayName } from '@/lib/format-display';
import { rate, TableSearch, useRowFilter } from './shared';
import { Drill, DrillProvider } from './drill-link';
import { useWrittenView, WrittenViewProvider } from './dx-view';
import { bucketRange, drillHref, type DrillSpec } from '@/lib/drill';
import { barTop, FloatingTip, inSection, RechartsTip, useFloatingTip } from './chart-tip';
import { countTip, partsTip, tipLabel } from '@/lib/chart-tooltip';

// White / blue / navy palette.
// Theme variables (globals.css), so the charts follow light / dark.
const C = { navy: 'var(--c-navy)', blue: 'var(--c-blue)', sky: 'var(--c-sky)', light: 'var(--c-light)', slate: 'var(--c-slate)', faint: 'var(--grid)' };

// ---------- period presets (IST calendar; B2: built by the pure presetRange) ----------
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const PERIODS: { key: string; label: string; range: () => [string | undefined, string | undefined] }[] = [
  { key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' }, { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' }, { key: 'quarter', label: 'This quarter' }, { key: 'year', label: 'This year' },
  { key: '7', label: 'Last 7 days' }, { key: '30', label: 'Last 30 days' }, { key: 'all', label: 'All time' },
].map((p) => ({ ...p, range: () => presetRange(p.key) }));

// D1 period control: these four are pills; the other presets live in the "More periods" select.
const QUICK = ['today', '7', '30', 'month'];
/** P7: the dashboard opens on Last 7 days. */
const DEFAULT_PERIOD = '7';
const fmtDay = (ymdStr: string) => new Date(`${ymdStr}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const POPULATIONS = [
  { key: '', label: 'All patients' },
  { key: 'paediatric', label: 'Paediatric (< 18)' },
  { key: 'adult', label: 'Adult (18+)' },
];

type Grain = 'day' | 'week' | 'month';
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'treatment', label: 'Treatment' },
  { key: 'doctors', label: 'Doctors' },
  { key: 'tat', label: 'Turnaround time' },
  { key: 'orders', label: 'Tests, advice & referrals' },
  { key: 'annotation', label: 'Annotation' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const CHANGE_LABEL: Record<ChangeType, string> = {
  dose: 'Dose', frequency: 'Frequency', duration: 'Duration', instructions: 'Instructions',
  not_in_prescription: 'Not found in prescription', no_visible_difference: 'No visible difference',
};

const fmt = (n: number) => n.toLocaleString();
/** Base population of the AI metrics, named on every count (ticket D4). */
const aiBase = (d: DashboardData) => (d.ai.headline.includeFollowUps ? 'visits (follow-ups included)' : 'visits (follow-ups excluded)');
const pctOf = (n: number, d: number) => (d ? pct(rate(n, d), 1) : '—');

/**
 * AI Use dashboard: the metric set agreed with the Chief of AI, by period,
 * population and section. Lives only at /ai-dashboard.
 */
export function MismatchDashboard({ workspaceId, programme = '', canExport = false }: { workspaceId: string; programme?: string; /** ACL1: admins and reviewers only. */ canExport?: boolean }) {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});
  const [population, setPopulation] = useState('');
  const [grain, setGrain] = useState<Grain>('day');
  // T3: follow-up visits are left out of the AI metrics by default; this switch puts them back.
  const [followUps, setFollowUps] = useState<'exclude' | 'include'>('exclude');
  // Default: only AI diagnoses the doctor clicked; 'assisted' adds AI suggestions the doctor wrote as their own.
  const [dxMatch, setDxMatch] = useState<'clicked' | 'assisted'>('clicked');
  const [tab, setTab] = useState<TabKey>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [from, to] = period === 'custom' ? [custom.from, custom.to] : (PERIODS.find((p) => p.key === period)?.range() ?? [undefined, undefined]);

  const key = [workspaceId, from, to, population, followUps, dxMatch].join('|');
  // D1: the Overview deltas compare with the most recent earlier equal-length window that HAS visits
  // (none for 'All time'). The window just before can be empty (a Sunday before 'Today', a programme
  // break before 'Last 7 days'); comparing with it silently hid every indicator (#13).
  const prevRanges = earlierRanges(from, to);
  const prevKey = prevRanges.length ? [workspaceId, from, to, population, followUps, dxMatch].join('|') : '';
  const [prev, setPrev] = useState<{ key: string; data: DashboardData | null; range: { from: string; to: string } | null } | null>(null);
  useEffect(() => {
    if (!prevRanges.length) return;
    let live = true;
    (async () => {
      for (const r of prevRanges) {
        const d = await mismatchAPI.dashboard(workspaceId, r.from, r.to, population || undefined, followUps === 'include' ? 'include' : undefined, dxMatch);
        if (!live) return;
        if (d.ai.headline.all.visits > 0) { setPrev({ key: prevKey, data: d, range: r }); return; }
      }
      if (live) setPrev({ key: prevKey, data: null, range: null });
    })().catch(() => undefined);
    return () => { live = false; };
    // prevKey captures every input of the ranges
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevKey]);
  const prevDone = prevRanges.length > 0 && prev?.key === prevKey;
  const prevData = prevDone ? prev!.data : null;
  const prevLabel = !prevDone ? null
    : prev!.range ? `deltas vs ${fmtDay(prev!.range.from)} – ${fmtDay(prev!.range.to)}` : 'no earlier visits to compare';
  const loading = loadedKey !== key;
  const viewer = data?.member === false;
  // #20: members open the matching visits in the mismatch queue, with this dashboard's period and patients.
  const queueHref = data?.member ? (extra: Record<string, string>) => {
    const p = new URLSearchParams({ tab: 'all', ...(from || to ? {} : { range: 'all' }), ...(from ? { from } : {}), ...(to ? { to } : {}) });
    if (population) p.set('population', population === 'adult' ? 'general' : population);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `/workspaces/${workspaceId}/mismatch?${p.toString()}`;
  } : undefined;
  useEffect(() => {
    let live = true;
    mismatchAPI.dashboard(workspaceId, from, to, population || undefined, followUps === 'include' ? 'include' : undefined, dxMatch)
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e) => live && setError(friendlyError(e, 'Could not load the dashboard')))
      .finally(() => live && setLoadedKey(key));
    return () => { live = false; };
  }, [workspaceId, from, to, population, followUps, dxMatch, key]);

  // #20/#29 members open the visits behind any number, with this dashboard's period, patients and switches.
  const drillMaker = data?.member
    ? (spec: DrillSpec, label: string) => drillHref({ workspaceId, from, to, population: population || undefined, followUps, dxMatch }, spec, label)
    : null;
  return (
    <DrillProvider value={drillMaker}>
    <WrittenViewProvider value={dxMatch === 'assisted'}>
    <div className="space-y-5">
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-3">
          <span className="mr-1 text-xs font-semibold text-slate-500">Period</span>
          {/* 4 quick pills + "More periods" (all 10 presets kept). */}
          {PERIODS.filter((p) => QUICK.includes(p.key)).map((p) => (
            <Pill key={p.key} active={period === p.key} onClick={() => setPeriod(p.key)}>{p.label}</Pill>
          ))}
          <select aria-label="More periods" value={QUICK.includes(period) ? '' : period} onChange={(e) => e.target.value && setPeriod(e.target.value)}
            className={cn('h-8 rounded-md border px-2 text-xs', !QUICK.includes(period) && 'border-blue-900 font-medium text-blue-900')}>
            <option value="">More periods</option>
            {PERIODS.filter((p) => !QUICK.includes(p.key)).map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            <option value="custom">Custom range</option>
          </select>
          {period === 'custom' && (
            <span className="ml-1 inline-flex items-center gap-1.5 text-xs">
              <input type="date" className="h-8 rounded-md border px-2" value={custom.from ?? ''} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value || undefined }))} />
              <span className="text-slate-400">to</span>
              <input type="date" className="h-8 rounded-md border px-2" value={custom.to ?? ''} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value || undefined }))} />
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <Segmented label="Patients" value={population} onChange={setPopulation} options={POPULATIONS} />
          <Segmented label="Follow-ups" value={followUps} onChange={(v) => setFollowUps(v as 'exclude' | 'include')}
            options={[{ key: 'exclude', label: 'Excluded' }, { key: 'include', label: 'Included' }]} />
          <Segmented label="AI diagnosis" value={dxMatch} onChange={(v) => setDxMatch(v as 'clicked' | 'assisted')}
            options={[{ key: 'clicked', label: 'Clicked by doctor' }, { key: 'assisted', label: '+ Written by doctor' }]} />
          <Segmented label="Trend by" value={grain} onChange={(v) => setGrain(v as Grain)} options={[{ key: 'day', label: 'Day' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }]} />
          <span className="ml-auto text-xs text-slate-500">
            {from || to ? `${from ?? '…'} → ${to ?? '…'}` : 'All time'}
            {data && ` · ${fmt(data.summary.visits)} visits · ${fmt(data.ai.headline.all.dxScored)} scored by AI · ${fmt(data.ai.followUpVisits ?? data.ai.followUpVisitsExcluded)} follow-ups ${data.ai.headline.includeFollowUps ? 'included' : 'excluded'}`}
            {loading && data && ' · updating…'}
          </span>
          {canExport && <button
            disabled={!data || loading || exporting}
            onClick={async () => {
              if (!data) return;
              setExporting(true);
              try {
                await exportDashboardExcel(data, {
                  programme: programme || 'Programme',
                  period: period === 'custom' || from || to ? `${from ?? 'start'} to ${to ?? 'today'}` : 'All time',
                  patients: POPULATIONS.find((p) => p.key === population)?.label ?? 'All patients',
                  followUps: data.ai.headline.includeFollowUps ? 'Follow-ups included' : 'Follow-ups excluded',
                  written: dxMatch === 'assisted',
                  dxMatch: dxMatch === 'assisted' ? 'Clicked + written by doctor (same or equivalent)' : 'Clicked by doctor',
                });
              } catch (e) {
                setError(friendlyError(e, 'Could not export to Excel'));
              } finally {
                setExporting(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export to Excel
          </button>}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Dashboard sections">
        {/* #18: a dashboard viewer outside the workspace does not see annotators' work */}
        {TABS.filter((t) => !(viewer && t.key === 'annotation')).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('-mb-px whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-medium',
              tab === t.key ? 'border-blue-700 text-blue-900' : 'border-transparent text-slate-500 hover:text-slate-900')}>
            {t.label}
          </button>
        ))}
      </nav>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!data ? <div className="h-96 animate-pulse rounded-xl bg-slate-100" /> : (
        <div className={cn('space-y-5 transition-opacity', loading && 'opacity-60')}>
          {tab !== 'tat' && tab !== 'annotation' && <ModeBadge included={data.ai.headline.includeFollowUps} />}
          {tab === 'annotation' && !viewer && (
            <p className="text-xs text-muted-foreground">All visits · follow-ups included</p>
          )}
          {tab === 'overview' && <OverviewTab data={data} prev={prevData} prevLabel={prevLabel} base={aiBase(data)} onTab={(t) => setTab(t)} />}
          {tab === 'diagnosis' && <DiagnosisTab data={data} grain={grain} prev={prevData} prevLabel={prevLabel} />}
          {tab === 'treatment' && <TreatmentTab data={data} grain={grain} prev={prevData} prevLabel={prevLabel} />}
          {tab === 'doctors' && <DoctorsTab data={data} />}
          {tab === 'tat' && <TatTab data={data} />}
          {tab === 'orders' && <OrdersTab data={data} />}
          {tab === 'annotation' && !viewer && <AnnotationTab data={data} queueHref={queueHref} />}
        </div>
      )}
    </div>
    </WrittenViewProvider>
    </DrillProvider>
  );
}

/** Always-visible mode label next to the numbers (ticket T3). */
function ModeBadge({ included }: { included: boolean }) {
  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium', included ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700')}>
      <Info className="h-3.5 w-3.5" /> {included ? 'Follow-ups included' : 'Follow-ups excluded'}
    </div>
  );
}


function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-900')}>
      {children}
    </button>
  );
}

function Segmented({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <div className="inline-flex rounded-lg border bg-slate-50 p-0.5">
        {options.map((o) => (
          <button key={o.key} onClick={() => onChange(o.key)}
            className={cn('rounded-md px-2.5 py-1 text-xs font-medium', value === o.key ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One metric: # and % with what the % is of. */
const MaybeDrill = ({ spec, label, children }: { spec?: DrillSpec; label: string; children: ReactNode }) =>
  spec ? <Drill spec={spec} label={label}>{children}</Drill> : <>{children}</>;

function Stat({ label, n, of, ofLabel, value, note, accent, drill }: {
  label: string; n?: number; of?: number; ofLabel?: string; value?: ReactNode; note?: ReactNode; accent?: boolean;
  /** #20/#29 the visits behind the number. */
  drill?: DrillSpec;
}) {
  return (
    <div className={cn('rounded-xl border bg-white px-4 py-3 shadow-sm', accent && 'border-blue-200 bg-blue-50/40')}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-blue-950">
          <MaybeDrill spec={drill} label={label}>{value ?? (of !== undefined ? pctOf(n ?? 0, of) : fmt(n ?? 0))}</MaybeDrill>
        </span>
        {value === undefined && of !== undefined && <span className="text-sm tabular-nums text-slate-500"><MaybeDrill spec={drill} label={label}>{fmt(n ?? 0)}</MaybeDrill></span>}
      </div>
      {(ofLabel || note) && <div className="mt-0.5 text-xs text-slate-500">{note ?? `of ${fmt(of ?? 0)} ${ofLabel}`}</div>}
    </div>
  );
}


const th = 'px-3 py-2 font-medium';
const thR = 'px-3 py-2 text-right font-medium';
const td = 'px-3 py-2';
const tdR = 'px-3 py-2 text-right tabular-nums';

function Table({ head, children, empty }: { head: ReactNode; children: ReactNode; empty?: boolean }) {
  if (empty) return <Empty>No data in this period.</Empty>;
  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">{head}</thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}

function RankedList({ items, empty = 'None in this period.', wrap, render, drill }: {
  items: { name: string; count: number }[]; empty?: string; wrap?: boolean; render?: (name: string) => ReactNode;
  /** #20/#29 the visits behind a row's count. */
  drill?: (name: string) => { spec: DrillSpec; label: string };
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.length) return <Empty>{empty}</Empty>;
  return (
    <ul className={cn('max-h-[420px] overflow-auto px-4 py-3 text-sm', wrap ? 'space-y-1.5' : 'space-y-1')}>
      {items.map((i) => (
        <li key={i.name} className="relative">
          <div className="absolute inset-y-0 left-0 rounded bg-blue-50" style={{ width: `${(100 * i.count) / max}%` }} />
          <div className={cn('relative flex justify-between gap-3 px-2', wrap ? 'py-1' : 'py-0.5')}>
            <span className={cn('min-w-0', !wrap && 'truncate')} title={i.name}>{render ? render(i.name) : i.name}</span>
            <span className="tabular-nums text-slate-500">{drill ? <Drill {...drill(i.name)}>{fmt(i.count)}</Drill> : fmt(i.count)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Sums daily rows into weeks (Monday) or months.
function bucket<T extends { name: string }>(rows: T[], grain: Grain): T[] {
  if (grain === 'day') return rows;
  const out = new Map<string, T>();
  for (const r of rows) {
    const d = new Date(`${r.name}T00:00:00Z`);
    if (grain === 'week') d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = grain === 'month' ? r.name.slice(0, 7) : ymd(d);
    const cur = out.get(key);
    if (!cur) { out.set(key, { ...r, name: key }); continue; }
    const acc = cur as Record<string, unknown>;
    for (const [k, v] of Object.entries(r)) if (typeof v === 'number') acc[k] = ((acc[k] as number) ?? 0) + v;
  }
  return [...out.values()];
}

const DxHead = ({ first }: { first: string }) => {
  const written = useWrittenView();
  return (
  <tr>
    <th className={th}>{first}</th><th className={thR}>Visits</th><th className={thR}>Scored</th>
    <th className={thR}>Top 5</th><th className={thR}>Top 3</th><th className={thR}>Top 1</th><th className={thR}>Not in AI top 5</th><th className={thR}>Added non-AI Dx</th>
    {!written && <th className={thR} title="Separate metric, not part of the strict picks">Equivalent, not picked</th>}
  </tr>
  );
};
/** #20/#29 each cell opens its visits: `at` = the row's dimensions, `what` = the row's name in the label. */
type At = Omit<DrillSpec, 'm'>;
const D = ({ m, at, what, label, children }: { m: string; at: At; what: string; label: string; children: ReactNode }) =>
  <Drill spec={{ m, ...at }} label={`${what} · ${label}`}>{children}</Drill>;
const DxCells = ({ r, at, what }: { r: DxAgg; at: At; what: string }) => {
  const written = useWrittenView();
  return (
    <>
      <td className={tdR}><D at={at} what={what} m="visits" label="visits">{fmt(r.visits)}</D></td>
      <td className={tdR}><D at={at} what={what} m="dx_scored" label="scored">{fmt(r.scored)}</D></td>
      <td className={tdR}><D at={at} what={what} m="top5" label="top 5">{pctOf(r.top5, r.scored)}</D></td>
      <td className={tdR}><D at={at} what={what} m="top3" label="top 3">{pctOf(r.top3, r.scored)}</D></td>
      <td className={tdR}><D at={at} what={what} m="top1" label="top 1">{pctOf(r.top1, r.scored)}</D></td>
      <td className={tdR}>{r.scored - r.top5 ? <D at={at} what={what} m="not_top5" label="not in the AI top 5">{`${fmt(r.scored - r.top5)} (${pctOf(r.scored - r.top5, r.scored)})`}</D> : '—'}</td>
      <td className={tdR}>{r.addedNonAi ? <D at={at} what={what} m="dx_added" label="added a non-AI Dx">{`${fmt(r.addedNonAi)} (${pctOf(r.addedNonAi, r.scored)})`}</D> : '—'}</td>
      {!written && <td className={tdR}>{r.equivalent ? <D at={at} what={what} m="dx_equiv" label="equivalent, not picked">{`${fmt(r.equivalent)} (${pctOf(r.equivalent, r.scored)})`}</D> : '—'}</td>}
    </>
  );
};

const byName = (r: { name: string }) => r.name;

function DiagnosisTab({ data, grain, prev, prevLabel }: { data: DashboardData; grain: Grain; prev: DashboardData | null; prevLabel: string | null }) {
  // #35 In "+ Written by doctor" the equivalent suggestions already count as picks (inside Top 5).
  const written = useWrittenView();
  const dxSearch = useRowFilter(data.ai.byDx, byName);
  const [doctor, setDoctor] = useState('');
  const days = useMemo(() => [...bucket(data.ai.byDay, grain)].reverse(), [data, grain]);
  const doctors = [...new Set(data.ai.byDoctorDay.map((r) => r.doctor))].sort();
  const dd = data.ai.byDoctorDay.filter((r) => !doctor || r.doctor === doctor);
  return (
    <>
      <CasePatternsSection kind="dx" patterns={data.ai.headline.all.patterns} prev={prev?.ai.headline.all.patterns ?? null}
        prevLabel={prev ? prevLabel : null} rows={days} grain={grain} base={aiBase(data)} />
      {!written && <EquivalentPanel data={data} />}
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title={`Top 5 / 3 / 1 by ${grain}`} description={`% of scored · ${aiBase(data)}`}>
          <Table empty={!days.length} head={<DxHead first={grain === 'day' ? 'Date' : grain === 'week' ? 'Week of' : 'Month'} />}>
            {days.map((r) => <tr key={r.name}><td className={cn(td, 'whitespace-nowrap')}>{r.name}</td><DxCells r={r} at={bucketRange(r.name, grain)} what={r.name} /></tr>)}
          </Table>
        </Section>
        <Section title="Top 5 / 3 / 1 by doctor and day" description={`% of scored · ${aiBase(data)}`}
          action={(
            <select className="h-8 rounded-md border bg-white px-2 text-xs" value={doctor} onChange={(e) => setDoctor(e.target.value)}>
              <option value="">All doctors</option>
              {doctors.map((d) => <option key={d} value={d}>{doctorLabel(d)}</option>)}
            </select>
          )}>
          <Table empty={!dd.length} head={<DxHead first="Date · doctor" />}>
            {dd.map((r) => (
              <tr key={r.name}>
                <td className={cn(td, 'whitespace-nowrap')}>{r.date} <span className="text-slate-500">· {doctorLabel(r.doctor)}</span></td>
                <DxCells r={r} at={{ doctor: r.doctor, day: r.date }} what={`${r.date} · ${doctorLabel(r.doctor)}`} />
              </tr>
            ))}
          </Table>
        </Section>
      </div>
      <Section title="Report by diagnosis" description={`Doctor's final Dx · % of scored · ${aiBase(data)}`}
        action={<TableSearch q={dxSearch.q} setQ={dxSearch.setQ} shown={dxSearch.filtered.length} total={data.ai.byDx.length} placeholder="Find a diagnosis…" />}>
        <Table empty={!dxSearch.filtered.length} head={<DxHead first="Doctor's final diagnosis" />}>
          {dxSearch.filtered.map((r) => <tr key={r.name}><td className={cn(td, 'capitalize')}>{r.name}</td><DxCells r={r} at={{ finalDx: r.name }} what={displayName(r.name)} /></tr>)}
        </Table>
      </Section>
      {/* #29 the diagnoses doctors write themselves (not from the AI list), most common first */}
      <Section title="Diagnoses doctors added" description={`Not from the AI list · ${aiBase(data)}`}>
        <RankedList items={data.ai.addedDiagnoses ?? []} render={(n) => displayName(n)}
          drill={(name) => ({ spec: { m: 'dx_added_name', k: name }, label: `Diagnosis added by the doctor: ${displayName(name)}` })} />
      </Section>
      <DiagnosisPatterns data={data} />
    </>
  );
}

/**
 * D3: AI suggested something clinically the same as the doctor's Dx (by a named
 * rule) but the doctor did not pick it. Shown NEXT to the strict numbers, never
 * merged into them; the pairs table lets a human spot wrong equivalences.
 */
function EquivalentPanel({ data }: { data: DashboardData }) {
  const h = data.ai.headline.all;
  const eqv = data.ai.equivalent;
  const pairs = useRowFilter(eqv?.pairs ?? [], (p) => `${p.aiName} ${p.doctorName}`);
  // #29 one line by default; the stats and the pairs open on click.
  const [open, setOpen] = useState(false);
  if (!eqv) return null;
  const topPair = eqv.pairs[0];
  if (!open) {
    return (
      <section aria-label="Equivalent suggested, not picked" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-card px-4 py-3 text-sm">
        <span className="font-semibold">Equivalent suggested, not picked</span>
        <span className="tabular-nums"><Drill spec={{ m: 'dx_equiv' }} label="Equivalent suggested, not picked">{fmt(h.dxEquivalentNotPicked)}</Drill> of {fmt(h.dxScored)} scored</span>
        {topPair && <span className="text-muted-foreground">· {displayName(topPair.aiName)} → {displayName(topPair.doctorName)} ({fmt(topPair.count)})</span>}
        <button type="button" className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs hover:bg-muted" onClick={() => setOpen(true)} aria-expanded={false}>
          {fmt(eqv.pairs.length)} pair{eqv.pairs.length === 1 ? '' : 's'} <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </section>
    );
  }
  return (
    <Section title="Equivalent suggested, not picked"
      description={`Separate from top 5 / 3 / 1 · ${fmt(h.dxScored)} scored`}
      action={(
        <div className="flex items-center gap-2">
          <TableSearch q={pairs.q} setQ={pairs.setQ} shown={pairs.filtered.length} total={eqv.pairs.length} placeholder="Find a pair…" />
          <button type="button" className="inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted" onClick={() => setOpen(false)} aria-expanded>
            Hide <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      )}>
      <div className="grid grid-cols-2 gap-3 px-4 pt-4 md:grid-cols-4">
        <Stat label="Strict: final Dx in AI top 5" n={h.top5} of={h.dxScored} ofLabel="visits with an AI list" drill={{ m: 'top5' }} />
        <Stat label="Strict: final Dx in AI top 1" n={h.top1} of={h.dxScored} ofLabel="visits with an AI list" drill={{ m: 'top1' }} />
        <Stat label="Equivalent suggested, not picked" n={h.dxEquivalentNotPicked} of={h.dxScored} ofLabel="visits with an AI list" accent drill={{ m: 'dx_equiv' }} />
        <Stat label="Matches overruled by annotators" value={fmt(eqv.byRule.reduce((s, r) => s + r.overruled, 0))}
          note={eqv.byRule.map((r) => `${RULE_LABEL[r.rule]}: ${r.overruled} of ${r.reviewed} reviewed`).join(' · ') || 'None reviewed yet'} />
      </div>
      <Table empty={!pairs.filtered.length} head={(
        <tr><th className={th}>AI suggestion</th><th className={th}>Doctor&apos;s diagnosis</th><th className={th}>Matching rule</th><th className={thR}>Avg AI rank</th><th className={thR}>Visits</th><th className={thR}>Reviewed</th><th className={thR}>Overruled</th></tr>
      )}>
        {pairs.filtered.map((p) => (
          <tr key={`${p.aiName}|${p.doctorName}|${p.rule}`}>
            <td className={td}>{displayName(p.aiName)}</td><td className={td}>{displayName(p.doctorName)}</td><td className={td}>{RULE_LABEL[p.rule] ?? p.rule}</td>
            <td className={tdR}>#{p.avgRank}</td>
            <td className={tdR}><Drill spec={{ m: 'dx_equiv', k: JSON.stringify([p.aiName, p.doctorName, p.rule]) }} label={`Equivalent: AI ${displayName(p.aiName)} → doctor ${displayName(p.doctorName)}`}>{fmt(p.count)}</Drill></td>
            <td className={tdR}>{fmt(p.reviewed)}</td>
            <td className={cn(tdR, p.overruled > 0 && 'font-semibold text-red-700')}>{fmt(p.overruled)}</td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

// ---------- Treatment ----------
/** #14: the three case-level treatment outcomes, as tiles and by day / week / month. */
const TTX_CASES = [
  { key: 'casesChanged', m: 'ttx_changed', label: 'AI medicine changed', note: 'At least one AI medicine kept with a change' },
  { key: 'casesNotPicked', m: 'ttx_not_used', label: 'AI medications not used', note: 'At least one AI medicine not selected' },
  { key: 'casesAdded', m: 'ttx_added', label: 'Doctor added a medicine', note: 'At least one medicine the AI did not suggest' },
] as const;

function TreatmentTab({ data, grain, prev, prevLabel }: { data: DashboardData; grain: Grain; prev: DashboardData | null; prevLabel: string | null }) {
  const periods = useMemo(() => [...bucket(data.ai.byDay, grain)].reverse(), [data, grain]);
  const trend = useMemo(() => periods.filter((r) => r.ttxGenerated > 0), [periods]);
  const [sort, setSort] = useState<'suggested' | 'changed' | 'notPicked'>('suggested');
  const ct = data.ai.changeTypes;
  const totalChanges = Object.values(ct).reduce((a, b) => a + b, 0);
  const sorted = useMemo(() => [...data.ai.medicines].sort((a, b) => b[sort] - a[sort]), [data, sort]);
  const medSearch = useRowFilter(sorted, byName);
  const meds = medSearch.filtered;
  const addedSearch = useRowFilter(data.ai.addedMedicines, byName);
  const h = data.ai.headline.all;
  return (
    <>
      <CasePatternsSection kind="ttx" patterns={h.patterns} prev={prev?.ai.headline.all.patterns ?? null}
        prevLabel={prev ? prevLabel : null} rows={periods} grain={grain} base={aiBase(data)} />
      <div className="grid gap-5 md:grid-cols-3">
        {TTX_CASES.map((c) => (
          <Section key={c.key} title={c.label} description={`${c.note} · ${aiBase(data)}`}>
            <div className="flex items-baseline gap-3 px-4 py-3">
              <span className="text-3xl font-semibold tabular-nums text-slate-900"><Drill spec={{ m: c.m }} label={c.label}>{pctOf(h[c.key], h.ttxGenerated)}</Drill></span>
              <span className="text-sm text-slate-500"><Drill spec={{ m: c.m }} label={c.label}>{fmt(h[c.key])}</Drill> of <Drill spec={{ m: 'ttx_generated' }} label="TTx cases">{fmt(h.ttxGenerated)}</Drill> TTx cases</span>
            </div>
          </Section>
        ))}
      </div>
      <Section title={`Changed / not used / added by ${grain}`} description={`% of TTx cases · ${aiBase(data)}`}>
        <Table empty={!trend.length} head={(
          <tr>
            <th className={th}>{grain === 'day' ? 'Date' : grain === 'week' ? 'Week of' : 'Month'}</th>
            <th className={thR}>TTx cases</th>
            {TTX_CASES.map((c) => <th key={c.key} className={thR}>{c.label}</th>)}
          </tr>
        )}>
          {trend.map((r) => (
            <tr key={r.name}>
              <td className={cn(td, 'whitespace-nowrap')}>{r.name}</td>
              <td className={tdR}><Drill spec={{ m: 'ttx_generated', ...bucketRange(r.name, grain) }} label={`${r.name} · TTx cases`}>{fmt(r.ttxGenerated)}</Drill></td>
              {TTX_CASES.map((c) => <td key={c.key} className={tdR}><Drill spec={{ m: c.m, ...bucketRange(r.name, grain) }} label={`${r.name} · ${c.label}`}>{fmt(r[c.key])} ({pctOf(r[c.key], r.ttxGenerated)})</Drill></td>)}
            </tr>
          ))}
        </Table>
      </Section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Section title="Type of change" description={`Changed AI medicines · ${aiBase(data)}`}>
          {!totalChanges ? <Empty>No changed medicines in this period.</Empty> : (
            <div className="h-64 px-2 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={(Object.keys(CHANGE_LABEL) as ChangeType[]).map((k) => ({ name: CHANGE_LABEL[k], n: ct[k] }))} margin={{ top: 0, right: 16, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={C.faint} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip cursor={{ fill: 'var(--raised)' }} isAnimationActive={false} wrapperStyle={{ outline: 'none' }}
                    content={<RechartsTip build={(label, p) => countTip(label, [{ name: 'Medicines', color: C.blue, count: Number(p[0]?.value) || 0 }])} />} />
                  <Bar dataKey="n" name="Medicines" fill={C.blue} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {!!totalChanges && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-xs text-slate-600">
              {(Object.keys(CHANGE_LABEL) as ChangeType[]).filter((k) => ct[k]).map((k) => (
                <span key={k}>{CHANGE_LABEL[k]} <Drill spec={{ m: 'change', k }} label={`Changed AI medicines · ${CHANGE_LABEL[k]}`} className="tabular-nums">{fmt(ct[k])}</Drill></span>
              ))}
            </div>
          )}
        </Section>
        <Section title="Medicines doctors added, by diagnosis" description={aiBase(data)}>
          <RankedList items={data.addedForDiagnosis} drill={(name) => ({ spec: { m: 'added_for', k: name }, label: `Medicine added: ${name}` })} />
        </Section>
      </div>

      <Section title="Report by AI medicine" description={`% of times suggested · ${aiBase(data)}`}
        action={(
          <div className="flex items-center gap-2">
            <TableSearch q={medSearch.q} setQ={medSearch.setQ} shown={meds.length} total={sorted.length} placeholder="Find a medicine…" />
            <select className="h-8 rounded-md border bg-white px-2 text-xs" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="suggested">Most suggested</option>
              <option value="changed">Most changed</option>
              <option value="notPicked">Most not picked</option>
            </select>
          </div>
        )}>
        <div className="flex flex-wrap gap-3 px-4 pt-3 text-xs text-slate-600">
          {[['bg-[#1d5fbf]', 'Unchanged'], ['bg-[#e9a23b]', 'Changed'], ['bg-[#c3c8cf]', 'Not used']].map(([c, l]) => <span key={l} className="inline-flex items-center gap-1.5"><i className={cn('inline-block h-2.5 w-2.5 rounded-sm', c)} />{l}</span>)}
        </div>
        <Table empty={!meds.length} head={(
          <tr>
            <th className={th}>Medicine</th><th className={thR}>Suggested</th><th className={th}>Unchanged · changed · not used</th>
            <th className={th}>What changed</th><th className={thR}>Paediatric</th>
          </tr>
        )}>
          {meds.map((m) => (
            <tr key={m.name}>
              <td className={td}>{displayName(m.name)}</td>
              <td className={tdR}><Drill spec={{ m: 'med_suggested', k: m.name }} label={`${displayName(m.name)} · suggested`}>{fmt(m.suggested)}</Drill></td>
              <td className={cn(td, 'min-w-[200px]')}>
                {/* D8: 100% bar per medicine, with the shares under it */}
                <MedShareBar name={displayName(m.name)} unchanged={m.unchanged} changed={m.changed} notPicked={m.notPicked} suggested={m.suggested} />
                <div className="mt-1 text-[11px] tabular-nums text-slate-500">
                  <Drill spec={{ m: 'med_unchanged', k: m.name }} label={`${displayName(m.name)} · unchanged`}>{pctOf(m.unchanged, m.suggested)}</Drill> · <Drill spec={{ m: 'med_changed', k: m.name }} label={`${displayName(m.name)} · changed`}>{pctOf(m.changed, m.suggested)}</Drill> · <Drill spec={{ m: 'med_not_used', k: m.name }} label={`${displayName(m.name)} · not used`}>{pctOf(m.notPicked, m.suggested)}</Drill>
                </div>
              </td>
              <td className={cn(td, 'text-xs text-slate-500')}>
                {(Object.keys(CHANGE_LABEL) as ChangeType[]).filter((k) => m.changes[k]).map((k) => `${CHANGE_LABEL[k]} ${m.changes[k]}`).join(' · ') || '—'}
              </td>
              <td className={tdR}>{m.paediatric ? fmt(m.paediatric) : '—'}</td>
            </tr>
          ))}
        </Table>
      </Section>

      {/* R2: the whole treatment plan by item type, from the generic model (non-medicine types: AI not suggesting yet). */}
      {data.plan && (
        <Section title="Treatment plan by type" description={`% of visits · ${aiBase(data)}`}>
          <Table head={(
            <tr>
              <th className={th}>Type</th><th className={thR}>AI suggested</th><th className={thR}>Kept</th><th className={thR}>Changed</th>
              <th className={thR}>Not used</th><th className={thR}>Doctor added</th><th className={thR}>Doctor entered</th>
            </tr>
          )}>
            {data.plan.map((p) => (
              <tr key={p.type}>
                <td className={cn(td, 'font-medium')}>{PLAN_TYPE_LABEL[p.type]}</td>
                {p.aiAvailable ? (
                  <>
                    <td className={tdR}>{pctOf(p.generated, p.visits)}</td>
                    <td className={tdR}>{pctOf(p.casesUnchanged, p.generated)}</td>
                    <td className={tdR}>{pctOf(p.casesChanged, p.generated)}</td>
                    <td className={tdR}>{pctOf(p.casesNotPicked, p.generated)}</td>
                    <td className={tdR}>{pctOf(p.casesAdded, p.generated)}</td>
                  </>
                ) : (
                  <td colSpan={5} className={cn(td, 'text-center text-xs text-slate-500')}>AI not suggesting yet</td>
                )}
                <td className={tdR}>{fmt(p.doctorEntered)} <span className="text-xs text-slate-500">({pctOf(p.doctorEntered, p.visits)})</span></td>
              </tr>
            ))}
          </Table>
        </Section>
      )}

      <Section title="Medicines the doctor added" description={`Commonest dose · frequency · duration · ${aiBase(data)}`}
        action={<TableSearch q={addedSearch.q} setQ={addedSearch.setQ} shown={addedSearch.filtered.length} total={data.ai.addedMedicines.length} placeholder="Find a medicine…" />}>
        <Table empty={!addedSearch.filtered.length} head={(
          <tr>
            <th className={th}>Medicine</th><th className={thR}>Times added</th><th className={thR}>Paediatric</th>
            <th className={th}>Dose</th><th className={th}>Frequency</th><th className={th}>Duration</th>
          </tr>
        )}>
          {addedSearch.filtered.map((m) => (
            <tr key={m.name}>
              <td className={td}>{displayName(m.name)}</td>
              <td className={tdR}><Drill spec={{ m: 'med_added', k: m.name }} label={`${displayName(m.name)} · added by the doctor`}>{fmt(m.count)}</Drill></td>
              <td className={tdR}>{m.paediatric ? fmt(m.paediatric) : '—'}</td>
              <td className={cn(td, 'text-xs text-slate-600')}>{m.dose ?? '—'}</td>
              <td className={cn(td, 'text-xs text-slate-600')}>{m.frequency ?? '—'}</td>
              <td className={cn(td, 'text-xs text-slate-600')}>{m.duration ?? '—'}</td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}

/** D8: one medicine's 100% bar (unchanged / changed / not used), with its values on hover, focus or tap. */
function MedShareBar({ name, unchanged, changed, notPicked, suggested }: { name: string; unchanged: number; changed: number; notPicked: number; suggested: number }) {
  const { shown, bind } = useFloatingTip();
  const parts = [
    { name: 'Unchanged', color: '#1d5fbf', count: unchanged }, { name: 'Changed', color: '#e9a23b', count: changed }, { name: 'Not used', color: '#c3c8cf', count: notPicked },
  ];
  const tip = partsTip(name, parts, { total: suggested });
  return (
    <>
      <div tabIndex={tip ? 0 : undefined} aria-label={tip ? tipLabel(tip) : undefined}
        className="flex h-2.5 w-full max-w-[220px] overflow-hidden rounded-sm bg-slate-100 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-data"
        {...bind(tip, inSection, barTop)}>
        {parts.map((p) => (p.count > 0 ? <span key={p.name} style={{ background: p.color, width: `${(100 * p.count) / suggested}%` }} /> : null))}
      </div>
      <FloatingTip shown={shown} />
    </>
  );
}

// ---------- Doctors ----------
function DoctorsTab({ data }: { data: DashboardData }) {
  // D6: one table per consulting doctor (pseudo id only). Rates on fewer than 5 visits show as a dash.
  const rows = data.ai.byDoctor;
  const medBy = new Map((data.plan?.find((x) => x.type === 'medicine')?.byDoctor ?? []).map((d) => [d.doctor, d]));
  const misBy = new Map((data.doctors ?? []).map((d) => [d.doctor, d]));
  const tatBy = (doc: string, kind: 'new' | 'follow_up') => data.tat?.byDoctorKind?.find((r) => r.doctor === doc && r.kind === kind);
  const rate = (n: number, d: number) => (d >= MIN_DOCTOR_N ? pctOf(n, d) : '—');
  const tatCell = (r?: TatRow) => (r && r.consultMedian !== null && r.visits >= MIN_DOCTOR_N ? <>{fmtMin(r.consultMedian)}<span className="ml-1 text-[11px] text-slate-500">p90 {fmtMin(r.consultP90)}</span></> : '—');
  return (
    <Section title="By doctor" description={`Pseudo id · ${aiBase(data)} · TAT and reviews: all visits`}>
      <Table empty={!rows.length} head={(
        <tr>
          <th className={th}>Doctor</th><th className={thR}>Scored</th><th className={thR}>Top 5</th><th className={thR}>Top 3</th><th className={thR}>Top 1</th>
          <th className={thR}>TTx cases</th><th className={thR}>Unchanged</th><th className={thR}>Changed</th><th className={thR}>Not used</th><th className={thR}>Added meds</th>
          <th className={thR}>Mismatches</th><th className={thR}>Reviewed</th><th className={thR}>In note · new</th><th className={thR}>In note · follow-up</th>
        </tr>
      )}>
        {rows.map((r) => {
          const m = medBy.get(r.name);
          const x = misBy.get(r.name);
          return (
            <tr key={r.name}>
              <td className={cn(td, 'whitespace-nowrap font-medium')}>{doctorLabel(r.name)}</td>
              <td className={tdR}>{fmt(r.scored)}</td>
              <td className={tdR}>{rate(r.top5, r.scored)}</td>
              <td className={tdR}>{rate(r.top3, r.scored)}</td>
              <td className={tdR}>{rate(r.top1, r.scored)}</td>
              <td className={tdR}>{fmt(r.ttxGenerated)}</td>
              <td className={tdR}>{rate(r.casesUnchanged, r.ttxGenerated)}</td>
              <td className={tdR}>{rate(r.casesChanged, r.ttxGenerated)}</td>
              <td className={tdR}>{m ? rate(m.casesNotPicked, m.generated) : '—'}</td>
              <td className={tdR}>{m ? rate(m.casesAdded, m.generated) : '—'}</td>
              <td className={tdR}>{x ? fmt(x.mismatches) : '—'}</td>
              <td className={tdR}>{x ? fmt(x.annotated) : '—'}</td>
              <td className={tdR}>{tatCell(tatBy(r.name, 'new'))}</td>
              <td className={tdR}>{tatCell(tatBy(r.name, 'follow_up'))}</td>
            </tr>
          );
        })}
      </Table>
    </Section>
  );
}

// ---------- Turnaround time ----------
// Minutes from the API timestamps; medians, because a few visits stay open for days.
const fmtMin = (m: number | null) => (m == null ? '—' : m < 10 ? `${m.toFixed(1)} min` : m < 120 ? `${Math.round(m)} min` : m < 2880 ? `${(m / 60).toFixed(1)} h` : `${(m / 1440).toFixed(1)} days`);

function TatHead({ first }: { first: string }) {
  return (
    <tr>
      <th className={th}>{first}</th><th className={thR}>Visits</th><th className={thR}>Prescription shared</th>
      <th className={thR}>Wait (median)</th><th className={thR}>Wait (p90)</th>
      <th className={thR}>In the note (median)</th><th className={thR}>In the note (p90)</th>
      <th className={thR}>Total (median)</th><th className={thR}>Total (p90)</th>
      <th className={thR}>Shared within 1 h</th><th className={thR}>Over 24 h</th>
    </tr>
  );
}
function TatCells({ r }: { r: TatRow }) {
  return (
    <>
      <td className={tdR}>{fmt(r.visits)}</td><td className={tdR}>{fmt(r.shared)}</td>
      <td className={tdR}>{fmtMin(r.waitMedian)}</td><td className={tdR}>{fmtMin(r.waitP90)}</td>
      <td className={tdR}>{fmtMin(r.consultMedian)}</td><td className={tdR}>{fmtMin(r.consultP90)}</td>
      <td className={tdR}>{fmtMin(r.totalMedian)}</td><td className={tdR}>{fmtMin(r.totalP90)}</td>
      <td className={tdR}>{pctOf(r.sharedWithin1h, r.shared)}</td><td className={tdR}>{fmt(r.over24h)}</td>
    </>
  );
}

const KIND_LABEL: Record<string, string> = { new: 'New visit', follow_up: 'Follow-up visit' };

function TatTab({ data }: { data: DashboardData }) {
  const t = data.tat;
  const days = useMemo(() => [...(t?.byDay ?? [])].reverse(), [t]);
  const months = useMemo(() => [...(t?.byMonth ?? [])].reverse(), [t]);
  if (!t) return <Empty>Turnaround times need the latest backend.</Empty>;
  const a = t.all;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Wait for the doctor (median)" value={fmtMin(a.waitMedian)} note={`visit started → doctor opened the note · p90 ${fmtMin(a.waitP90)}`} />
        <Stat label="Time in the note (median)" value={fmtMin(a.consultMedian)} note={`doctor opened the note → prescription shared · p90 ${fmtMin(a.consultP90)}`} accent />
        <Stat label="Total turnaround (median)" value={fmtMin(a.totalMedian)} note={`visit started → prescription shared · p90 ${fmtMin(a.totalP90)}`} />
        <Stat label="Prescription shared within 1 hour" n={a.sharedWithin1h} of={a.shared} ofLabel="shared" />
      </div>
      <Section title="Paediatric vs adult" description="All visits · follow-ups included">
        <Table head={<TatHead first="Patients" />}>
          {[a, t.paediatric, t.adult].map((r) => (
            <tr key={r.name}><td className={cn(td, 'font-medium capitalize')}>{r.name === 'all' ? 'All' : r.name}</td><TatCells r={r} /></tr>
          ))}
        </Table>
      </Section>
      {t.byKind && (
        <Section title="New vs follow-up visits" description="All visits">
          <Table head={<TatHead first="Visit type" />}>
            {t.byKind.map((r) => <tr key={r.name}><td className={cn(td, 'font-medium')}>{KIND_LABEL[r.name] ?? r.name}</td><TatCells r={r} /></tr>)}
          </Table>
        </Section>
      )}
      {t.byDoctorKind && (
        <Section title="By doctor: new vs follow-up" description="Pseudo id · all visits">
          <Table empty={!t.byDoctorKind.length} head={<TatHead first="Doctor · visit type" />}>
            {t.byDoctorKind.map((r) => (
              <tr key={r.name}><td className={cn(td, 'whitespace-nowrap font-medium')}>{doctorLabel(r.doctor)} <span className="font-normal text-slate-500">· {KIND_LABEL[r.kind]}</span></td><TatCells r={r} /></tr>
            ))}
          </Table>
        </Section>
      )}
      <Section title="By doctor" description="Pseudo id · all visits · follow-ups included">
        <Table empty={!t.byDoctor.length} head={<TatHead first="Doctor" />}>
          {t.byDoctor.map((r) => <tr key={r.name}><td className={cn(td, 'whitespace-nowrap font-medium')}>{doctorLabel(r.name)}</td><TatCells r={r} /></tr>)}
        </Table>
      </Section>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="By month" description="All visits · follow-ups included">
          <Table empty={!months.length} head={<TatHead first="Month" />}>
            {months.map((r) => <tr key={r.name}><td className={cn(td, 'whitespace-nowrap font-medium')}>{r.name}</td><TatCells r={r} /></tr>)}
          </Table>
        </Section>
        <Section title="By doctor and month" description="All visits · follow-ups included">
          <Table empty={!t.byDoctorMonth.length} head={<TatHead first="Month · doctor" />}>
            {t.byDoctorMonth.map((r) => <tr key={r.name}><td className={cn(td, 'whitespace-nowrap font-medium')}>{r.month} · {doctorLabel(r.doctor)}</td><TatCells r={r} /></tr>)}
          </Table>
        </Section>
      </div>
      <Section title="By day" description="All visits · follow-ups included">
        <Table empty={!days.length} head={<TatHead first="Date" />}>
          {days.map((r) => <tr key={r.name}><td className={cn(td, 'whitespace-nowrap font-medium')}>{r.name}</td><TatCells r={r} /></tr>)}
        </Table>
      </Section>
    </>
  );
}

// ---------- Tests, advice & referrals ----------
function OrdersTab({ data }: { data: DashboardData }) {
  const h = data.ai.headline.all;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Investigations ordered" n={h.investigations} of={h.visits} ofLabel={aiBase(data)} />
        <Stat label="Advice given" n={h.advice} of={h.visits} ofLabel={aiBase(data)} />
        <Stat label="Referred" n={h.referral} of={h.visits} ofLabel={aiBase(data)} />
        <Stat label="Follow-up scheduled" n={h.followUp} of={h.visits} ofLabel={aiBase(data)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Most ordered investigations" description={`Times ordered, ${aiBase(data)}`}><RankedList items={data.ai.orders.investigations} render={(n) => <span className="capitalize">{displayName(n)}</span>} /></Section>
        <Section title="Referred to" description={`Destination · facility · ${aiBase(data)}`}>
          <RankedList items={data.ai.orders.referrals} render={(name) => {
            const [who, where] = name.split(' · ');
            return <>{displayName(who)}{where && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{displayName(where)}</span>}</>;
          }} />
        </Section>
      </div>
      <Section title="Most common advice" description={`As written · ${aiBase(data)}`}>
        {/* L1: English part only (the backend already counts advice by it). */}
        <RankedList items={data.ai.orders.advice} wrap render={(name) => adviceEnglish(name)} />
      </Section>
    </>
  );
}

// ---------- Annotation ----------
const MISMATCH_KEY: Record<string, string> = { 'Diagnosis only': 'ddx', 'Treatment only': 'ttx', 'Diagnosis and treatment': 'both', 'No mismatch': 'none' };

function AnnotationTab({ data, queueHref }: { data: DashboardData; queueHref?: (extra: Record<string, string>) => string }) {
  const s = data.summary;
  const mismatched = s.mismatch.ddx + s.mismatch.ttx + s.mismatch.both;
  // Review status is over the mismatches in the workspace queue (follow-up-only visits are not in it).
  const queued = s.review.done + s.review.in_progress + s.review.pending;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Mismatches in this period" n={mismatched} of={s.visits} ofLabel="visits in the period (follow-ups included)" accent drill={{ m: 'mismatch', k: 'any' }} />
        <Stat label="Annotated" n={s.review.done} of={queued} ofLabel="mismatches in the queue" drill={{ m: 'annotated' }} />
        <Stat label="In review" n={s.review.in_progress} of={queued} ofLabel="mismatches in the queue" drill={{ m: 'in_review' }} />
        <Stat label="To review" n={s.review.pending} of={queued} ofLabel="mismatches in the queue" drill={{ m: 'to_review' }} />
        <Stat label="Discussed with clinical team" n={s.review.discussed ?? 0} of={s.review.done} ofLabel="annotated" drill={{ m: 'discussed' }} />
      </div>
      <DoctorProgress p={data.progress} personHref={queueHref ? (id) => queueHref({ reviewer: id, range: 'all', from: '', to: '' }) : undefined} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Mismatch type" description="All visits · follow-ups included">
          <RankedList items={[
            { name: 'Diagnosis only', count: s.mismatch.ddx },
            { name: 'Treatment only', count: s.mismatch.ttx },
            { name: 'Diagnosis and treatment', count: s.mismatch.both },
            { name: 'No mismatch', count: s.mismatch.none },
          ]} drill={(name) => ({ spec: { m: 'mismatch', k: MISMATCH_KEY[name] }, label: `Mismatch type: ${name}` })} />
        </Section>
        <Section title="Doctor rejected the AI (stated reason)" description="All visits · follow-ups included">
          <RankedList items={data.rejections ?? []} empty="No reasons recorded in this period." />
        </Section>
      </div>
      <Section title="Why the equivalent AI suggestion was not picked" description="Annotators' answers">
        <RankedList items={(data.ai.equivalent?.reasons ?? []).filter((r) => r.count).map((r) => ({ name: EQUIV_REASON_LABEL[r.name] ?? r.name, count: r.count }))} empty="No answers yet in this period." />
      </Section>
      {(data.models ?? []).some((m) => m.model !== 'Not logged') && (
        <Section title="By AI model / engine" description="AI call log · all visits">
          <Table head={(
            <tr><th className={th}>Model · engine</th><th className={thR}>Visits</th><th className={thR}>Top 5</th><th className={thR}>Top 1</th><th className={thR}>AI meds used</th><th className={thR}>Avg latency</th></tr>
          )}>
            {data.models.map((m) => (
              <tr key={m.model}>
                <td className={cn(td, 'font-medium')}>{m.model}</td>
                <td className={tdR}>{fmt(m.visits)}</td>
                <td className={tdR}>{pctOf(m.top5, m.ddxVisits)}</td>
                <td className={tdR}>{pctOf(m.top1, m.ddxVisits)}</td>
                <td className={tdR}>{pctOf(m.ttxUsed, m.ttxVisits)}</td>
                <td className={tdR}>{m.avgLatency != null ? `${m.avgLatency.toFixed(1)} s` : '—'}</td>
              </tr>
            ))}
          </Table>
        </Section>
      )}
    </>
  );
}
