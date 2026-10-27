'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Empty, Kpi, Section } from '@/components/dashboard/kpi';
import { pct } from '@/components/dashboard/format';
import { apiMessage } from '@/lib/api/workspaces';
import { mismatchAPI, type DashboardData } from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';
import { rate } from './shared';

const RANGES = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: 'all', label: 'All time' },
];

const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() + 5.5 * 3600_000 - n * 86400_000).toISOString().slice(0, 10);

const MED_COLORS = { exact: '#10b981', modified: '#f59e0b', ignored: '#9ca3af', added: '#0ea5e9' };

export function MismatchDashboard({ workspaceId, refreshKey }: { workspaceId: string; refreshKey: number }) {
  const [range, setRange] = useState('30');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const from = range === 'all' ? undefined : daysAgo(Number(range) - 1);
    mismatchAPI.dashboard(workspaceId, from, range === 'all' ? undefined : istToday())
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e) => live && setError(apiMessage(e, 'Could not load the dashboard')));
    return () => { live = false; };
  }, [workspaceId, range, refreshKey]);

  // Long ranges are bucketed by week so the chart stays readable.
  const trend = useMemo(() => weekly(data?.trend ?? []).map((d) => ({
    date: d.date.slice(5),
    visits: d.visits,
    mismatches: d.mismatches,
    // null (a gap) rather than 0% when nothing was scored that day/week
    top1: d.ddxVisits ? Number(rate(d.top1, d.ddxVisits).toFixed(1)) : null,
    top5: d.ddxVisits ? Number(rate(d.top5, d.ddxVisits).toFixed(1)) : null,
    ttxUsed: d.ttxVisits ? Number(rate(d.ttxUsed, d.ttxVisits).toFixed(1)) : null,
  })), [data]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <div className="h-96 animate-pulse rounded-lg bg-muted" />;

  const s = data.summary;
  const medTotal = s.meds.exact + s.meds.modified + s.meds.ignored;
  const mismatched = s.mismatch.ddx + s.mismatch.ttx + s.mismatch.both;
  const reviewed = s.review.done;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={cn('rounded-full border px-3 py-1 text-xs font-medium', range === r.key ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-accent')}>
            {r.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {s.visits.toLocaleString()} visits · {s.ddxVisits.toLocaleString()} with AI diagnosis · {s.ttxVisits.toLocaleString()} with AI treatment
        </span>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnosis (DDx): did the doctor pick from the AI list?</h3>
        <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
          Over <strong className="text-foreground">all {s.ddxVisits.toLocaleString()} visits with an AI diagnosis</strong> in this range, not just mismatches.
          Counts a pick when the doctor clicked the AI suggestion or typed the same name ({s.pickedByName.toLocaleString()} typed).
          Not scored: {s.followUpExcluded.toLocaleString()} follow-up visits and {s.noAiDdx.toLocaleString()} visits with no AI diagnosis.
          Strict: a clinically equivalent but differently worded diagnosis counts as a miss.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Top-1 selected" value={pct(rate(s.top1, s.ddxVisits), 1)} hint={`${s.top1.toLocaleString()} visits`} tone="good" />
          <Kpi label="Top-3 selected" value={pct(rate(s.top3, s.ddxVisits), 1)} hint={`${s.top3.toLocaleString()} visits`} />
          <Kpi label="Top-5 selected" value={pct(rate(s.top5, s.ddxVisits), 1)} hint={`${s.top5.toLocaleString()} visits`} />
          <Kpi label="None of top 5 (mismatch)" value={pct(rate(s.ddxMismatch, s.ddxVisits), 1)} hint={`${s.ddxMismatch.toLocaleString()} visits`} tone="warn" />
          <Kpi label="Doctor added own diagnosis" value={pct(rate(s.doctorAddedDx, s.ddxVisits), 1)} hint={`${s.doctorAddedDx.toLocaleString()} visits`} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Treatment (TTX): how much of the AI plan was used?</h3>
        <p className="mb-2 mt-0.5 text-xs text-muted-foreground">Over all {s.ttxVisits.toLocaleString()} visits with an AI treatment plan in this range.</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Visits using AI medicines" value={pct(rate(s.ttxUsed, s.ttxVisits), 1)} hint={`${s.ttxUsed.toLocaleString()} of ${s.ttxVisits.toLocaleString()}`} tone="good" />
          <Kpi label="AI plan accepted as-is" value={pct(rate(s.ttxFullyAccepted, s.ttxVisits), 1)} hint="every medicine exact, nothing added" />
          <Kpi label="Medicine acceptance" value={pct(rate(s.meds.exact + s.meds.modified, medTotal), 1)} hint="AI medicines kept (exact + modified)" />
          <Kpi label="Kept exactly" value={pct(rate(s.meds.exact, medTotal), 1)} hint={`${pct(rate(s.meds.modified, medTotal), 1)} kept but dose changed`} />
          <Kpi label="Treatment mismatch" value={pct(rate(s.ttxMismatch, s.ttxVisits), 1)} hint={`${s.ttxMismatch.toLocaleString()} visits`} tone="warn" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section title="Trend" description={`Top-1 / top-5 hit rate and visits using AI medicines, per ${(data.trend.length > 60) ? "week" : "day"}`}>
          {trend.length < 2 ? <Empty>Not enough days in this range yet.</Empty> : (
            <div className="h-72 px-2 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={16} />
                  <YAxis yAxisId="pct" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis yAxisId="n" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="n" dataKey="mismatches" name="Mismatched visits" fill="#fecaca" />
                  <Line yAxisId="pct" type="monotone" dataKey="top1" name="Top-1 %" stroke="#4f46e5" strokeWidth={2} dot={false} />
                  <Line yAxisId="pct" type="monotone" dataKey="top5" name="Top-5 %" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line yAxisId="pct" type="monotone" dataKey="ttxUsed" name="AI meds used %" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="What doctors did with AI medicines" description={`${(medTotal + s.meds.added).toLocaleString()} medicine decisions`}>
          <div className="space-y-4 px-4 py-4">
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {(['exact', 'modified', 'ignored', 'added'] as const).map((k) => {
                const tot = medTotal + s.meds.added;
                return <div key={k} style={{ width: `${rate(s.meds[k], tot)}%`, background: MED_COLORS[k] }} title={k} />;
              })}
            </div>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {([['exact', 'Accepted exactly'], ['modified', 'Accepted, dose changed'], ['ignored', 'AI medicine not used'], ['added', 'Doctor added own']] as const).map(([k, label]) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MED_COLORS[k] }} />
                  <span className="text-muted-foreground">{label}</span>
                  <span className="ml-auto font-medium tabular-nums">{s.meds[k].toLocaleString()}</span>
                </li>
              ))}
            </ul>
            <div className="border-t pt-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Rank of the AI diagnosis the doctor picked</div>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[1, 2, 3, 4, 5].map((r) => ({ rank: `#${r}`, n: s.rankHist[r] })).concat([{ rank: 'none', n: s.rankHist[0] }])} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                    <XAxis dataKey="rank" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="n" name="Visits" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Section title="Mismatch breakdown">
          <ul className="space-y-2 px-4 py-4 text-sm">
            <Row label="Diagnosis only" value={s.mismatch.ddx} total={s.visits} />
            <Row label="Treatment only" value={s.mismatch.ttx} total={s.visits} />
            <Row label="Both" value={s.mismatch.both} total={s.visits} />
            <Row label="No mismatch" value={s.mismatch.none} total={s.visits} />
          </ul>
        </Section>
        <Section title="Annotation progress" description={`${reviewed.toLocaleString()} of ${mismatched.toLocaleString()} mismatches annotated`}>
          <ul className="space-y-2 px-4 py-4 text-sm">
            <Row label="To review" value={s.review.pending} total={mismatched} />
            <Row label="In review" value={s.review.in_progress} total={mismatched} />
            <Row label="Annotated" value={s.review.done} total={mismatched} />
          </ul>
        </Section>
        <Section title="Annotations by doctor">
          {data.annotators.length === 0 ? <Empty>No annotations in this range yet.</Empty> : (
            <ul className="space-y-2 px-4 py-4 text-sm">
              {data.annotators.map((a) => (
                <li key={a.name} className="flex justify-between"><span>{a.name}</span><span className="font-medium tabular-nums">{a.done}</span></li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <TopList title="Doctor's diagnosis when AI missed" items={data.top.missedDx} />
        <TopList title="AI top-1 when doctor picked none" items={data.top.aiTop1WhenMissed} />
        <TopList title="AI medicines with dose changed" items={data.top.modifiedMeds} />
        <TopList title="AI medicines not used" items={data.top.ignoredMeds} />
        <TopList title="Medicines doctors added" items={data.top.addedMeds} />
        <TopList title="Doctor rejected the AI (stated reason)" items={data.rejections ?? []} />
      </div>

      {(data.models ?? []).some((m) => m.model !== 'Not logged') && (
        <Section title="By AI model / engine" description="From the AI call log; visits without a log entry are grouped as “Not logged”">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Model · engine</th>
                  <th className="px-4 py-2 text-right font-medium">Visits</th>
                  <th className="px-4 py-2 text-right font-medium">Top-1</th>
                  <th className="px-4 py-2 text-right font-medium">Top-5</th>
                  <th className="px-4 py-2 text-right font-medium">AI meds used</th>
                  <th className="px-4 py-2 text-right font-medium">Avg latency</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.models.map((m) => (
                  <tr key={m.model}>
                    <td className="px-4 py-2 font-medium">{m.model}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.visits.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.ddxVisits ? pct(rate(m.top1, m.ddxVisits), 1) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.ddxVisits ? pct(rate(m.top5, m.ddxVisits), 1) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.ttxVisits ? pct(rate(m.ttxUsed, m.ttxVisits), 1) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.avgLatency != null ? `${m.avgLatency.toFixed(1)} s` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

type Day = DashboardData['trend'][number];
function weekly(days: Day[]): Day[] {
  if (days.length <= 60) return days;
  const out = new Map<string, Day>();
  for (const d of days) {
    const t = new Date(`${d.date}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); // Monday of that week
    const key = t.toISOString().slice(0, 10);
    const w = out.get(key) ?? { date: key, visits: 0, ddxVisits: 0, top1: 0, top5: 0, ttxVisits: 0, ttxUsed: 0, mismatches: 0 };
    for (const k of ['visits', 'ddxVisits', 'top1', 'top5', 'ttxVisits', 'ttxUsed', 'mismatches'] as const) w[k] += d[k];
    out.set(key, w);
  }
  return [...out.values()];
}

function Row({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <li>
      <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium tabular-nums">{value.toLocaleString()} <span className="text-xs text-muted-foreground">({pct(rate(value, total))})</span></span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground/60" style={{ width: `${rate(value, total)}%` }} /></div>
    </li>
  );
}

function TopList({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Section title={title}>
      {items.length === 0 ? <Empty>None in this range.</Empty> : (
        <ul className="space-y-1.5 px-4 py-3 text-sm">
          {items.map((i) => (
            <li key={i.name} className="relative">
              <div className="absolute inset-y-0 left-0 rounded bg-indigo-50" style={{ width: `${(100 * i.count) / max}%` }} />
              <div className="relative flex justify-between gap-2 px-2 py-0.5">
                <span className="truncate capitalize">{i.name}</span>
                <span className="tabular-nums text-muted-foreground">{i.count}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
