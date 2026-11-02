'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Download, Info, Loader2 } from 'lucide-react';
import { Empty, Section } from '@/components/dashboard/kpi';
import { pct } from '@/components/dashboard/format';
import { apiMessage } from '@/lib/api/workspaces';
import {
  doctorLabel, EQUIV_REASON_LABEL, mismatchAPI, RULE_LABEL, type AiHeadline, type ChangeType, type DashboardData, type DxAgg, type TatRow,
} from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';
import { ConsultingDoctors, DiagnosisPatterns, DoctorProgress } from './insights';
import { exportDashboardExcel } from './export-excel';
import { displayName } from '@/lib/format-display';
import { rate, TableSearch, useRowFilter } from './shared';

// White / blue / navy palette.
const C = { navy: '#1e3a8a', blue: '#2563eb', sky: '#60a5fa', light: '#bfdbfe', slate: '#94a3b8', faint: '#e2e8f0' };

// ---------- period presets (IST calendar) ----------
const IST = 5.5 * 3600_000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const istNow = () => new Date(Date.now() + IST);
const shift = (d: Date, days: number) => new Date(d.getTime() + days * 86400_000);
const startOf = (unit: 'week' | 'month' | 'quarter' | 'year') => {
  const n = istNow();
  const y = n.getUTCFullYear();
  const m = n.getUTCMonth();
  if (unit === 'week') return shift(n, -((n.getUTCDay() + 6) % 7));
  if (unit === 'month') return new Date(Date.UTC(y, m, 1));
  if (unit === 'quarter') return new Date(Date.UTC(y, m - (m % 3), 1));
  return new Date(Date.UTC(y, 0, 1));
};
const PERIODS: { key: string; label: string; range: () => [string | undefined, string | undefined] }[] = [
  { key: 'today', label: 'Today', range: () => [ymd(istNow()), ymd(istNow())] },
  { key: 'yesterday', label: 'Yesterday', range: () => [ymd(shift(istNow(), -1)), ymd(shift(istNow(), -1))] },
  { key: 'week', label: 'This week', range: () => [ymd(startOf('week')), ymd(istNow())] },
  { key: 'month', label: 'This month', range: () => [ymd(startOf('month')), ymd(istNow())] },
  { key: 'quarter', label: 'This quarter', range: () => [ymd(startOf('quarter')), ymd(istNow())] },
  { key: 'year', label: 'This year', range: () => [ymd(startOf('year')), ymd(istNow())] },
  { key: '7', label: 'Last 7 days', range: () => [ymd(shift(istNow(), -6)), ymd(istNow())] },
  { key: '30', label: 'Last 30 days', range: () => [ymd(shift(istNow(), -29)), ymd(istNow())] },
  { key: 'all', label: 'All time', range: () => [undefined, undefined] },
];

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
export function MismatchDashboard({ workspaceId, programme = '' }: { workspaceId: string; programme?: string }) {
  const [period, setPeriod] = useState('30');
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});
  const [population, setPopulation] = useState('');
  const [grain, setGrain] = useState<Grain>('day');
  // T3: follow-up visits are left out of the AI metrics by default; this switch puts them back.
  const [followUps, setFollowUps] = useState<'exclude' | 'include'>('exclude');
  const [tab, setTab] = useState<TabKey>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [from, to] = period === 'custom' ? [custom.from, custom.to] : (PERIODS.find((p) => p.key === period)?.range() ?? [undefined, undefined]);

  const key = [workspaceId, from, to, population, followUps].join('|');
  const loading = loadedKey !== key;
  useEffect(() => {
    let live = true;
    mismatchAPI.dashboard(workspaceId, from, to, population || undefined, followUps === 'include' ? 'include' : undefined)
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e) => live && setError(apiMessage(e, 'Could not load the dashboard')))
      .finally(() => live && setLoadedKey(key));
    return () => { live = false; };
  }, [workspaceId, from, to, population, followUps, key]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-3">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Period</span>
          {PERIODS.map((p) => (
            <Pill key={p.key} active={period === p.key} onClick={() => setPeriod(p.key)}>{p.label}</Pill>
          ))}
          <Pill active={period === 'custom'} onClick={() => setPeriod('custom')}>Custom</Pill>
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
          <Segmented label="Trend by" value={grain} onChange={(v) => setGrain(v as Grain)} options={[{ key: 'day', label: 'Day' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }]} />
          <span className="ml-auto text-xs text-slate-500">
            {from || to ? `${from ?? '…'} → ${to ?? '…'}` : 'All time'}
            {data && ` · ${fmt(data.summary.visits)} visits · ${fmt(data.ai.headline.all.dxScored)} scored by AI · ${fmt(data.ai.followUpVisits ?? data.ai.followUpVisitsExcluded)} follow-ups ${data.ai.headline.includeFollowUps ? 'included' : 'excluded'}`}
            {loading && data && ' · updating…'}
          </span>
          <button
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
                });
              } catch (e) {
                setError(apiMessage(e, 'Could not export to Excel'));
              } finally {
                setExporting(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export to Excel
          </button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Dashboard sections">
        {TABS.map((t) => (
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
          {tab === 'annotation' && (
            <p className="text-xs text-muted-foreground">Annotation counts every visit in the period, follow-ups included, whatever the follow-up switch says; only “Why the equivalent AI suggestion was not picked” follows the switch ({data.ai.headline.includeFollowUps ? 'follow-ups included' : 'follow-ups excluded'}).</p>
          )}
          {tab === 'overview' && <Overview data={data} grain={grain} population={population} />}
          {tab === 'diagnosis' && <DiagnosisTab data={data} grain={grain} />}
          {tab === 'treatment' && <TreatmentTab data={data} />}
          {tab === 'doctors' && <DoctorsTab data={data} />}
          {tab === 'tat' && <TatTab data={data} />}
          {tab === 'orders' && <OrdersTab data={data} />}
          {tab === 'annotation' && <AnnotationTab data={data} />}
          {tab !== 'tat' && <FollowUpNote included={data.ai.headline.includeFollowUps} n={data.ai.followUpVisits ?? data.ai.followUpVisitsExcluded} />}
        </div>
      )}
    </div>
  );
}

/** Always-visible mode label next to the numbers (ticket T3). */
function ModeBadge({ included }: { included: boolean }) {
  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium', included ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700')}>
      <Info className="h-3.5 w-3.5" /> {included ? 'Follow-up visits INCLUDED in these numbers' : 'Follow-up visits excluded from these numbers'}
    </div>
  );
}

/** Footer on every tab: whether follow-up visits are in these numbers, and why they are left out by default. */
function FollowUpNote({ n, included }: { n: number; included: boolean }) {
  if (included) {
    return (
      <footer className="flex items-start gap-2 border-t pt-4 text-xs text-amber-800">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          <span className="font-medium">Follow-up visits are INCLUDED{n ? ` (${fmt(n)} in this period)` : ''}.</span>{' '}
          A follow-up note only records whether the patient got and took the medicines and how they feel, so the AI has nothing to diagnose or treat from; expect lower Dx and TTx rates in this mode. Switch Follow-ups to “Excluded” for the standard numbers.
        </p>
      </footer>
    );
  }
  return (
    <footer className="flex items-start gap-2 border-t pt-4 text-xs text-slate-500">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        <span className="font-medium text-slate-700">Follow-up visits are not counted{n ? ` (${fmt(n)} in this period)` : ''}.</span>{' '}
        A follow-up note only records whether the patient got and took the medicines and how they feel; it has no symptoms or history for the AI to diagnose or treat from, so the AI suggestions on these visits are not considered.
        They will be included once follow-ups capture a proper patient story.
      </p>
    </footer>
  );
}

// ---------- building blocks ----------
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
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
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
function Stat({ label, n, of, ofLabel, value, note, accent }: {
  label: string; n?: number; of?: number; ofLabel?: string; value?: ReactNode; note?: ReactNode; accent?: boolean;
}) {
  return (
    <div className={cn('rounded-xl border bg-white px-4 py-3 shadow-sm', accent && 'border-blue-200 bg-blue-50/40')}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-blue-950">
          {value ?? (of !== undefined ? pctOf(n ?? 0, of) : fmt(n ?? 0))}
        </span>
        {value === undefined && of !== undefined && <span className="text-sm tabular-nums text-slate-500">{fmt(n ?? 0)}</span>}
      </div>
      {(ofLabel || note) && <div className="mt-0.5 text-xs text-slate-500">{note ?? `of ${fmt(of ?? 0)} ${ofLabel}`}</div>}
    </div>
  );
}

function Group({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-blue-950">{title}</h3>
      {description && <p className="mb-2.5 mt-0.5 max-w-4xl text-xs text-slate-500">{description}</p>}
      {children}
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

function RankedList({ items, empty = 'None in this period.', wrap, render }: {
  items: { name: string; count: number }[]; empty?: string; wrap?: boolean; render?: (name: string) => ReactNode;
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
            <span className="tabular-nums text-slate-500">{fmt(i.count)}</span>
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

// ---------- Overview ----------
function Overview({ data, grain, population }: { data: DashboardData; grain: Grain; population: string }) {
  const h = data.ai.headline.all;
  const scoredLabel = 'visits with an AI list';
  const trend = useMemo(() => bucket(data.ai.byDay, grain).map((d) => ({
    date: grain === 'month' ? d.name : d.name.slice(5),
    visits: d.visits,
    top1: d.scored ? +rate(d.top1, d.scored).toFixed(1) : null,
    top3: d.scored ? +rate(d.top3, d.scored).toFixed(1) : null,
    top5: d.scored ? +rate(d.top5, d.scored).toFixed(1) : null,
    unchanged: d.ttxGenerated ? +rate(d.casesUnchanged, d.ttxGenerated).toFixed(1) : null,
    changed: d.ttxGenerated ? +rate(d.casesChanged, d.ttxGenerated).toFixed(1) : null,
  })), [data, grain]);

  return (
    <>
      <Group title="Diagnosis (DDx)"
        description={`Scored over visits with an AI list (${data.ai.headline.includeFollowUps ? 'follow-up visits INCLUDED' : 'follow-up visits are not counted'}; see the note at the bottom). A pick is the doctor clicking the AI diagnosis or typing the same name; a clinically equivalent but differently worded diagnosis counts as not picked.`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="AI generated a Dx list" n={h.dxGenerated} of={h.visits} ofLabel={aiBase(data)} accent />
          <Stat label="Final Dx was AI top 1" n={h.top1} of={h.dxScored} ofLabel={scoredLabel} />
          <Stat label="…in AI top 3" n={h.top3} of={h.dxScored} ofLabel={scoredLabel} />
          <Stat label="…in AI top 5" n={h.top5} of={h.dxScored} ofLabel={scoredLabel} />
          <Stat label="Doctor added a non-AI Dx" n={h.dxAddedNonAi} of={h.dxScored} ofLabel={scoredLabel} />
          <Stat label="Equivalent suggested, not picked" n={h.dxEquivalentNotPicked} of={h.dxScored} ofLabel={`${scoredLabel} · separate from top 1/3/5`} />
        </div>
      </Group>

      <Group title="Treatment (TTx)" description={`Base: TTx cases = ${aiBase(data)} where the AI suggested medicines. Counted per case: a case counts once in each row that applies (one case can have an unchanged and a changed medicine).`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="AI generated a TTx list" n={h.ttxGenerated} of={h.visits} ofLabel={aiBase(data)} accent />
          <Stat label="AI medicines per case" value={h.ttxGenerated ? (h.aiMedicines / h.ttxGenerated).toFixed(1) : '—'} note={`${fmt(h.aiMedicines)} medicines suggested`} />
          <Stat label="Picked a medicine unchanged" n={h.casesUnchanged} of={h.ttxGenerated} ofLabel="TTx cases" />
          <Stat label="Picked a medicine with changes" n={h.casesChanged} of={h.ttxGenerated} ofLabel="TTx cases" />
          <Stat label="Did not pick an AI medicine" n={h.casesNotPicked} of={h.ttxGenerated} ofLabel="TTx cases" />
          <Stat label="Added a new medicine" n={h.casesAdded} of={h.ttxGenerated} ofLabel="TTx cases" />
        </div>
      </Group>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Diagnosis: top 1 / 3 / 5 over time" description={`% of visits with an AI list (${aiBase(data)}), by ${grain}`}>
          <TrendChart rows={trend} lines={[['top1', 'Top 1', C.navy], ['top3', 'Top 3', C.blue], ['top5', 'Top 5', C.sky]]} />
        </Section>
        <Section title="Treatment: medicines picked over time" description={`% of TTx cases (${aiBase(data)} with AI medicines), by ${grain}`}>
          <TrendChart rows={trend} lines={[['unchanged', 'Picked unchanged', C.navy], ['changed', 'Picked with changes', C.sky]]} />
        </Section>
      </div>

      {!population && <PopulationTable data={data} />}
    </>
  );
}

function TrendChart({ rows, lines }: { rows: Record<string, string | number | null>[]; lines: [string, string, string][] }) {
  if (rows.length < 2) return <Empty>Pick a longer period to see a trend.</Empty>;
  return (
    <div className="h-64 px-2 py-3">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.faint} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={16} />
          <YAxis yAxisId="pct" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <YAxis yAxisId="n" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="n" dataKey="visits" name="Visits" fill={C.faint} />
          {lines.map(([k, name, color]) => (
            <Line key={k} yAxisId="pct" type="monotone" dataKey={k} name={name} stroke={color} strokeWidth={2} dot={false} connectNulls />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function PopulationTable({ data }: { data: DashboardData }) {
  const { all, paediatric: p, adult: a, paediatricMaxAge } = data.ai.headline;
  const rows: [string, (h: AiHeadline) => string][] = [
    ['Visits', (h) => fmt(h.visits)],
    ['AI generated a Dx list', (h) => pctOf(h.dxGenerated, h.visits)],
    ['Top 1', (h) => pctOf(h.top1, h.dxScored)],
    ['Top 3', (h) => pctOf(h.top3, h.dxScored)],
    ['Top 5', (h) => pctOf(h.top5, h.dxScored)],
    ['Doctor added a non-AI Dx', (h) => pctOf(h.dxAddedNonAi, h.dxScored)],
    ['AI generated a TTx list', (h) => pctOf(h.ttxGenerated, h.visits)],
    ['AI medicines per case', (h) => (h.ttxGenerated ? (h.aiMedicines / h.ttxGenerated).toFixed(1) : '—')],
    ['Picked a medicine unchanged', (h) => pctOf(h.casesUnchanged, h.ttxGenerated)],
    ['Picked a medicine with changes', (h) => pctOf(h.casesChanged, h.ttxGenerated)],
    ['Did not pick an AI medicine', (h) => pctOf(h.casesNotPicked, h.ttxGenerated)],
    ['Added a new medicine', (h) => pctOf(h.casesAdded, h.ttxGenerated)],
  ];
  return (
    <Section title="Paediatric vs adult" description={`Paediatric = age ${paediatricMaxAge} or under. Base: ${aiBase(data)}; visits without an age are counted only in “All”.`}>
      <Table head={<tr><th className={th}>Metric</th><th className={thR}>All</th><th className={thR}>Paediatric</th><th className={thR}>Adult</th></tr>}>
        {rows.map(([label, f]) => (
          <tr key={label}>
            <td className={td}>{label}</td>
            <td className={cn(tdR, 'font-medium')}>{f(all)}</td>
            <td className={tdR}>{f(p)}</td>
            <td className={tdR}>{f(a)}</td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

// ---------- Diagnosis ----------
const DxHead = ({ first }: { first: string }) => (
  <tr>
    <th className={th}>{first}</th><th className={thR}>Visits</th><th className={thR}>Scored</th><th className={thR}>Picked AI Dx</th>
    <th className={thR}>Top 1</th><th className={thR}>Top 3</th><th className={thR}>Top 5</th><th className={thR}>Added non-AI Dx</th>
    <th className={thR} title="Separate metric, not part of the strict picks">Equivalent, not picked</th>
  </tr>
);
const DxCells = ({ r }: { r: DxAgg }) => (
  <>
    <td className={tdR}>{fmt(r.visits)}</td>
    <td className={tdR}>{fmt(r.scored)}</td>
    <td className={tdR}>{pctOf(r.picked, r.scored)}</td>
    <td className={tdR}>{pctOf(r.top1, r.scored)}</td>
    <td className={tdR}>{pctOf(r.top3, r.scored)}</td>
    <td className={tdR}>{pctOf(r.top5, r.scored)}</td>
    <td className={tdR}>{r.addedNonAi ? `${fmt(r.addedNonAi)} (${pctOf(r.addedNonAi, r.scored)})` : '—'}</td>
    <td className={tdR}>{r.equivalent ? `${fmt(r.equivalent)} (${pctOf(r.equivalent, r.scored)})` : '—'}</td>
  </>
);

const byName = (r: { name: string }) => r.name;

function DiagnosisTab({ data, grain }: { data: DashboardData; grain: Grain }) {
  const dxSearch = useRowFilter(data.ai.byDx, byName);
  const [doctor, setDoctor] = useState('');
  const days = useMemo(() => [...bucket(data.ai.byDay, grain)].reverse(), [data, grain]);
  const doctors = [...new Set(data.ai.byDoctorDay.map((r) => r.doctor))].sort();
  const dd = data.ai.byDoctorDay.filter((r) => !doctor || r.doctor === doctor);
  return (
    <>
      <EquivalentPanel data={data} />
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title={`Top 1 / 3 / 5 by ${grain}`} description={`Visits = ${aiBase(data)}; Scored = those with an AI list; % are of Scored`}>
          <Table empty={!days.length} head={<DxHead first={grain === 'day' ? 'Date' : grain === 'week' ? 'Week of' : 'Month'} />}>
            {days.map((r) => <tr key={r.name}><td className={cn(td, 'whitespace-nowrap')}>{r.name}</td><DxCells r={r} /></tr>)}
          </Table>
        </Section>
        <Section title="Top 1 / 3 / 5 by doctor and day" description={`Visits = ${aiBase(data)}; % are of visits with an AI list`}
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
                <DxCells r={r} />
              </tr>
            ))}
          </Table>
        </Section>
      </div>
      <Section title="Report by diagnosis" description={`Grouped by the doctor's final diagnosis (${aiBase(data)}): how often the AI list contained it, and how often the doctor added a diagnosis of their own; % are of visits with an AI list`}
        action={<TableSearch q={dxSearch.q} setQ={dxSearch.setQ} shown={dxSearch.filtered.length} total={data.ai.byDx.length} placeholder="Find a diagnosis…" />}>
        <Table empty={!dxSearch.filtered.length} head={<DxHead first="Doctor's final diagnosis" />}>
          {dxSearch.filtered.map((r) => <tr key={r.name}><td className={cn(td, 'capitalize')}>{r.name}</td><DxCells r={r} /></tr>)}
        </Table>
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
  if (!eqv) return null;
  return (
    <Section title="Equivalent suggested, not picked"
      description={`Separate from the strict top 1/3/5: the AI listed a diagnosis that matches the doctor's own by one of the rules below, but the doctor did not pick it. Base: ${fmt(h.dxScored)} visits with an AI list.`}
      action={<TableSearch q={pairs.q} setQ={pairs.setQ} shown={pairs.filtered.length} total={eqv.pairs.length} placeholder="Find a pair…" />}>
      <div className="grid grid-cols-2 gap-3 px-4 pt-4 md:grid-cols-4">
        <Stat label="Strict: final Dx in AI top 1" n={h.top1} of={h.dxScored} ofLabel="visits with an AI list" />
        <Stat label="Strict: final Dx in AI top 5" n={h.top5} of={h.dxScored} ofLabel="visits with an AI list" />
        <Stat label="Equivalent suggested, not picked" n={h.dxEquivalentNotPicked} of={h.dxScored} ofLabel="visits with an AI list" accent />
        <Stat label="Matches overruled by annotators" value={fmt(eqv.byRule.reduce((s, r) => s + r.overruled, 0))}
          note={eqv.byRule.map((r) => `${RULE_LABEL[r.rule]}: ${r.overruled} of ${r.reviewed} reviewed`).join(' · ') || 'None reviewed yet'} />
      </div>
      <Table empty={!pairs.filtered.length} head={(
        <tr><th className={th}>AI suggestion</th><th className={th}>Doctor&apos;s diagnosis</th><th className={th}>Matching rule</th><th className={thR}>Avg AI rank</th><th className={thR}>Visits</th><th className={thR}>Reviewed</th><th className={thR}>Overruled</th></tr>
      )}>
        {pairs.filtered.map((p) => (
          <tr key={`${p.aiName}|${p.doctorName}|${p.rule}`}>
            <td className={td}>{displayName(p.aiName)}</td><td className={td}>{displayName(p.doctorName)}</td><td className={td}>{RULE_LABEL[p.rule] ?? p.rule}</td>
            <td className={tdR}>#{p.avgRank}</td><td className={tdR}>{fmt(p.count)}</td><td className={tdR}>{fmt(p.reviewed)}</td>
            <td className={cn(tdR, p.overruled > 0 && 'font-semibold text-red-700')}>{fmt(p.overruled)}</td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

// ---------- Treatment ----------
function TreatmentTab({ data }: { data: DashboardData }) {
  const [sort, setSort] = useState<'suggested' | 'changed' | 'notPicked'>('suggested');
  const ct = data.ai.changeTypes;
  const totalChanges = Object.values(ct).reduce((a, b) => a + b, 0);
  const sorted = useMemo(() => [...data.ai.medicines].sort((a, b) => b[sort] - a[sort]), [data, sort]);
  const medSearch = useRowFilter(sorted, byName);
  const meds = medSearch.filtered;
  const addedSearch = useRowFilter(data.ai.addedMedicines, byName);
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Section title="Type of change" description={`AI medicines the doctor kept but changed (${aiBase(data)}), compared field by field with the prescription. One medicine can have several changes.`}>
          {!totalChanges ? <Empty>No changed medicines in this period.</Empty> : (
            <div className="h-64 px-2 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={(Object.keys(CHANGE_LABEL) as ChangeType[]).map((k) => ({ name: CHANGE_LABEL[k], n: ct[k] }))} margin={{ top: 0, right: 16, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={C.faint} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="n" name="Medicines" fill={C.blue} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
        <Section title="Medicines doctors added, by diagnosis" description={`Doctor's diagnosis → medicine the doctor added (not suggested by the AI) · ${aiBase(data)}`}>
          <RankedList items={data.addedForDiagnosis} />
        </Section>
      </div>

      <Section title="Report by AI medicine" description={`Each AI-suggested medicine, ${aiBase(data)}; % are of the times it was suggested`}
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
        <Table empty={!meds.length} head={(
          <tr>
            <th className={th}>Medicine</th><th className={thR}>Suggested</th><th className={thR}>Unchanged</th><th className={thR}>Changed</th>
            <th className={th}>What changed</th><th className={thR}>Not picked</th><th className={thR}>Paediatric</th>
          </tr>
        )}>
          {meds.map((m) => (
            <tr key={m.name}>
              <td className={td}>{displayName(m.name)}</td>
              <td className={tdR}>{fmt(m.suggested)}</td>
              <td className={tdR}>{pctOf(m.unchanged, m.suggested)}</td>
              <td className={tdR}>{pctOf(m.changed, m.suggested)}</td>
              <td className={cn(td, 'text-xs text-slate-500')}>
                {(Object.keys(CHANGE_LABEL) as ChangeType[]).filter((k) => m.changes[k]).map((k) => `${CHANGE_LABEL[k]} ${m.changes[k]}`).join(' · ') || '—'}
              </td>
              <td className={tdR}>{pctOf(m.notPicked, m.suggested)}</td>
              <td className={tdR}>{m.paediatric ? fmt(m.paediatric) : '—'}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Medicines the doctor added" description={`Not suggested by the AI (${aiBase(data)}). Most common dose, frequency and duration as prescribed (count in brackets).`}
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
              <td className={tdR}>{fmt(m.count)}</td>
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

// ---------- Doctors ----------
function DoctorsTab({ data }: { data: DashboardData }) {
  const rows = data.ai.byDoctor;
  return (
    <>
      <Section title="AI use by doctor" description={`Consulting doctor in OpenMRS, by pseudo id. Visits = ${aiBase(data)}; Dx % are of visits with an AI list; TTx % are of TTx cases.`}>
        <Table empty={!rows.length} head={(
          <tr>
            <th className={th}>Doctor</th><th className={thR}>Visits</th><th className={thR}>Picked AI Dx</th><th className={thR}>Top 1</th>
            <th className={thR}>Top 3</th><th className={thR}>Top 5</th><th className={thR}>Added non-AI Dx</th>
            <th className={thR} title="Separate metric, not part of the strict picks">Equivalent, not picked</th>
            <th className={thR}>TTx cases</th><th className={thR}>Picked unchanged</th><th className={thR}>Picked with changes</th>
          </tr>
        )}>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className={cn(td, 'whitespace-nowrap font-medium')}>{doctorLabel(r.name)}</td>
              <td className={tdR}>{fmt(r.visits)}</td>
              <td className={tdR}>{pctOf(r.picked, r.scored)}</td>
              <td className={tdR}>{pctOf(r.top1, r.scored)}</td>
              <td className={tdR}>{pctOf(r.top3, r.scored)}</td>
              <td className={tdR}>{pctOf(r.top5, r.scored)}</td>
              <td className={tdR}>{pctOf(r.addedNonAi, r.scored)}</td>
              <td className={tdR}>{pctOf(r.equivalent, r.scored)}</td>
              <td className={tdR}>{fmt(r.ttxGenerated)}</td>
              <td className={tdR}>{pctOf(r.casesUnchanged, r.ttxGenerated)}</td>
              <td className={tdR}>{pctOf(r.casesChanged, r.ttxGenerated)}</td>
            </tr>
          ))}
        </Table>
      </Section>
      <ConsultingDoctors rows={data.doctors ?? []} />
    </>
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
      <Section title="Paediatric vs adult" description="Every visit in the period, follow-ups included">
        <Table head={<TatHead first="Patients" />}>
          {[a, t.paediatric, t.adult].map((r) => (
            <tr key={r.name}><td className={cn(td, 'font-medium capitalize')}>{r.name === 'all' ? 'All' : r.name}</td><TatCells r={r} /></tr>
          ))}
        </Table>
      </Section>
      {t.byKind && (
        <Section title="New vs follow-up visits" description="Follow-up = the doctor's only diagnosis is “Follow-up visit” (same rule as the AI metrics) · every visit in the period">
          <Table head={<TatHead first="Visit type" />}>
            {t.byKind.map((r) => <tr key={r.name}><td className={cn(td, 'font-medium')}>{KIND_LABEL[r.name] ?? r.name}</td><TatCells r={r} /></tr>)}
          </Table>
        </Section>
      )}
      {t.byDoctorKind && (
        <Section title="By doctor: new vs follow-up" description="Consulting doctor in OpenMRS, by pseudo id · every visit in the period">
          <Table empty={!t.byDoctorKind.length} head={<TatHead first="Doctor · visit type" />}>
            {t.byDoctorKind.map((r) => (
              <tr key={r.name}><td className={cn(td, 'whitespace-nowrap font-medium')}>{doctorLabel(r.doctor)} <span className="font-normal text-slate-500">· {KIND_LABEL[r.kind]}</span></td><TatCells r={r} /></tr>
            ))}
          </Table>
        </Section>
      )}
      <Section title="By doctor" description="Consulting doctor in OpenMRS, by pseudo id · every visit in the period, follow-ups included">
        <Table empty={!t.byDoctor.length} head={<TatHead first="Doctor" />}>
          {t.byDoctor.map((r) => <tr key={r.name}><td className={cn(td, 'whitespace-nowrap font-medium')}>{doctorLabel(r.name)}</td><TatCells r={r} /></tr>)}
        </Table>
      </Section>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="By month" description="Every visit, follow-ups included">
          <Table empty={!months.length} head={<TatHead first="Month" />}>
            {months.map((r) => <tr key={r.name}><td className={cn(td, 'whitespace-nowrap font-medium')}>{r.name}</td><TatCells r={r} /></tr>)}
          </Table>
        </Section>
        <Section title="By doctor and month" description="Every visit, follow-ups included">
          <Table empty={!t.byDoctorMonth.length} head={<TatHead first="Month · doctor" />}>
            {t.byDoctorMonth.map((r) => <tr key={r.name}><td className={cn(td, 'whitespace-nowrap font-medium')}>{r.month} · {doctorLabel(r.doctor)}</td><TatCells r={r} /></tr>)}
          </Table>
        </Section>
      </div>
      <Section title="By day" description="Every visit, follow-ups included">
        <Table empty={!days.length} head={<TatHead first="Date" />}>
          {days.map((r) => <tr key={r.name}><td className={cn(td, 'whitespace-nowrap font-medium')}>{r.name}</td><TatCells r={r} /></tr>)}
        </Table>
      </Section>
      <footer className="flex items-start gap-2 border-t pt-4 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Every visit counts here, follow-ups included. Times come from OpenMRS: visit start, when the doctor opened the visit note, and when the prescription was shared.
          Medians and the 90th percentile are shown because a few visits stay open for days. TAT with vs without AI cannot be measured, as every visit now has AI.
        </p>
      </footer>
    </>
  );
}

// ---------- Tests, advice & referrals ----------
function OrdersTab({ data }: { data: DashboardData }) {
  const h = data.ai.headline.all;
  return (
    <>
      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-950">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>These are entered by the doctor. The AI does not suggest tests, advice, referrals or follow-up yet; once it does, the same picked / changed / not used comparison will appear here.</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Investigations ordered" n={h.investigations} of={h.visits} ofLabel={aiBase(data)} />
        <Stat label="Advice given" n={h.advice} of={h.visits} ofLabel={aiBase(data)} />
        <Stat label="Referred" n={h.referral} of={h.visits} ofLabel={aiBase(data)} />
        <Stat label="Follow-up scheduled" n={h.followUp} of={h.visits} ofLabel={aiBase(data)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Most ordered investigations" description={`Times ordered, ${aiBase(data)}`}><RankedList items={data.ai.orders.investigations} render={(n) => <span className="capitalize">{displayName(n)}</span>} /></Section>
        <Section title="Referred to" description={`Destination, with the facility type it was referred to · ${aiBase(data)}`}>
          <RankedList items={data.ai.orders.referrals} render={(name) => {
            const [who, where] = name.split(' · ');
            return <>{displayName(who)}{where && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{displayName(where)}</span>}</>;
          }} />
        </Section>
      </div>
      <Section title="Most common advice" description={`As written in the prescription; the local-language version is shown underneath · ${aiBase(data)}`}>
        <RankedList items={data.ai.orders.advice} wrap render={(name) => {
          // "drink lots of water - भरपूर पाणी प्या": English first, translation below.
          const m = name.match(/^(.*?)\s+-\s+(.*[^\x00-\x7F].*)$/);
          return m ? <span className="block">{m[1]}<span className="block text-xs text-slate-500">{m[2]}</span></span> : name;
        }} />
      </Section>
    </>
  );
}

// ---------- Annotation ----------
function AnnotationTab({ data }: { data: DashboardData }) {
  const s = data.summary;
  const mismatched = s.mismatch.ddx + s.mismatch.ttx + s.mismatch.both;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Mismatches in this period" n={mismatched} of={s.visits} ofLabel="visits in the period (follow-ups included)" accent />
        <Stat label="Annotated" n={s.review.done} of={mismatched} ofLabel="mismatches" />
        <Stat label="In review" n={s.review.in_progress} of={mismatched} ofLabel="mismatches" />
        <Stat label="To review" n={s.review.pending} of={mismatched} ofLabel="mismatches" />
      </div>
      <DoctorProgress p={data.progress} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Mismatch type" description="Every visit in the period, follow-ups included">
          <RankedList items={[
            { name: 'Diagnosis only', count: s.mismatch.ddx },
            { name: 'Treatment only', count: s.mismatch.ttx },
            { name: 'Diagnosis and treatment', count: s.mismatch.both },
            { name: 'No mismatch', count: s.mismatch.none },
          ]} />
        </Section>
        <Section title="Doctor rejected the AI (stated reason)" description="Every visit in the period, follow-ups included">
          <RankedList items={data.rejections ?? []} empty="No reasons recorded in this period." />
        </Section>
      </div>
      <Section title="Why the equivalent AI suggestion was not picked" description="Annotators' answers on visits flagged “Equivalent suggested, not picked”">
        <RankedList items={(data.ai.equivalent?.reasons ?? []).filter((r) => r.count).map((r) => ({ name: EQUIV_REASON_LABEL[r.name] ?? r.name, count: r.count }))} empty="No answers yet in this period." />
      </Section>
      {(data.models ?? []).some((m) => m.model !== 'Not logged') && (
        <Section title="By AI model / engine" description="From the AI call log; visits without a log entry are grouped as “Not logged” · every visit in the period, follow-ups included">
          <Table head={(
            <tr><th className={th}>Model · engine</th><th className={thR}>Visits</th><th className={thR}>Top 1</th><th className={thR}>Top 5</th><th className={thR}>AI meds used</th><th className={thR}>Avg latency</th></tr>
          )}>
            {data.models.map((m) => (
              <tr key={m.model}>
                <td className={cn(td, 'font-medium')}>{m.model}</td>
                <td className={tdR}>{fmt(m.visits)}</td>
                <td className={tdR}>{pctOf(m.top1, m.ddxVisits)}</td>
                <td className={tdR}>{pctOf(m.top5, m.ddxVisits)}</td>
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
