'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  Database,
  Rows3,
  Columns3,
  Users,
  Activity,
  ShieldCheck,
  ChevronDown,
  Gauge,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { DatasetStats, AgentPlan } from '@/lib/api/agent';

const PIE_COLORS = ['#1e2a45', '#2563eb', '#1d4ed8', '#3b82f6', '#66708f', '#60a5fa'];

const TREND_COLORS = [
  '#1e2a45',
  '#3e4a6b',
  '#2563eb',
  '#1d4ed8',
  '#3b82f6',
  '#60a5fa',
  '#2563eb',
  '#5b6b8f',
];

function buildTrendTypes(series: { byType?: Record<string, number> }[]): string[] {
  const totals = new Map<string, number>();
  for (const s of series) {
    if (!s.byType) continue;
    for (const [type, count] of Object.entries(s.byType)) {
      totals.set(type, (totals.get(type) || 0) + count);
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([type]) => type);
}

function StatTile({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-3 shadow-sm">
      <div className={cn('p-2.5 rounded-lg', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-classic-gold leading-none">{value}</p>
        <p className="text-xs text-classic-sub mt-1">{label}</p>
      </div>
    </div>
  );
}

export function StatsReport({
  stats,
  planReport,
}: {
  stats?: DatasetStats | null;
  planReport?: Pick<AgentPlan['report'], 'kpis' | 'metrics'> | null;
}) {
  const [showDetail, setShowDetail] = useState(true);
  if (!stats) return null;

  const progChart = stats.progress.chart;
  const relChart = stats.reliability.perField.map((f) => ({
    name: f.field.length > 14 ? f.field.slice(0, 13) + '…' : f.field,
    value: f.value,
    band: f.band || 'medium',
  }));
  const bandColor: Record<string, string> = {
    low: '#b91c1c',
    medium: '#2563eb',
    high: '#1d7a4f',
  };
  const trendTypes = buildTrendTypes(stats.trend.series);
  const annotatorChart = stats.progress.annotatorProgress.map((a) => ({
    name: a.name.length > 12 ? a.name.slice(0, 11) + '…' : a.name,
    Completed: a.completed,
    Assigned: a.assigned,
  }));

  const completionPct =
    stats.volume.rows > 0
      ? Math.min(100, Math.round((stats.progress.completed / Math.max(stats.volume.rows, 1)) * 100))
      : 0;

  return (
    <div className="space-y-3">
      {/* Volume KPI tiles */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total Rows" value={stats.volume.rows} icon={Rows3} color="bg-classic-navy-soft text-classic-navy" />
        <StatTile label="Columns" value={stats.volume.columns} icon={Columns3} color="bg-classic-navy-soft text-classic-navy" />
        <StatTile label="Files" value={stats.volume.csvFiles} icon={Database} color="bg-classic-navy-soft text-classic-navy" />
        <StatTile label="Annotators" value={stats.progress.annotators} icon={Users} color="bg-classic-navy-soft text-classic-navy" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Annotation progress bar chart */}
        {progChart.length > 0 ? (
          <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-3 shadow-sm">
            <p className="text-[12px] font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-classic-navy" /> Annotation Progress
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={progChart} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {progChart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-3 flex flex-col justify-center text-center shadow-sm">
            <Activity className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-black">No annotation activity yet</p>
          </div>
        )}

        {/* Reliability bar chart */}
        {relChart.length > 0 ? (
          <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-3 shadow-sm">
            <p className="text-[12px] font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-classic-navy" />
              Reliability ({stats.reliability.metric || 'metric'})
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={relChart} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 1]} />
                <Tooltip cursor={{ fill: 'rgba(34,197,94,0.05)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {relChart.map((entry: any, i: number) => (
                    <Cell key={i} fill={bandColor[entry.band] || '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-3 flex flex-col justify-center text-center shadow-sm">
            <ShieldCheck className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-black">No reliability scores yet</p>
          </div>
        )}
      </div>

      {/* Completion donut */}
      {stats.volume.rows > 0 && (
        <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-3 flex items-center gap-4 shadow-sm">
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Completed', value: stats.progress.completed },
                  { name: 'Remaining', value: Math.max(stats.volume.rows - stats.progress.completed, 0) },
                ]}
                dataKey="value"
                innerRadius={34}
                outerRadius={48}
                paddingAngle={2}
              >
                <Cell fill="#1d7a4f" />
                <Cell fill="#e2e8f0" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div>
            <p className="text-xl font-bold text-gray-800">{completionPct}%</p>
            <p className="text-[12px] text-black">annotation completion</p>
            <p className="text-[11px] text-black mt-1">
              {stats.progress.completed} of {stats.volume.rows} rows
            </p>
          </div>
        </div>
      )}

      {/* Consensus health donut + activity trend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.health.chart.length > 0 ? (
          <div className="rounded-lg border bg-white p-3">
            <p className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-classic-navy" /> Consensus Health
            </p>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie
                    data={stats.health.chart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={34}
                    outerRadius={48}
                    paddingAngle={2}
                  >
                    {stats.health.chart.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 10 }}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-3 flex flex-col justify-center items-center text-center">
            <ShieldCheck className="h-4 w-4 mx-auto text-black mb-1" />
            <p className="text-xs text-black">No consensus activity yet</p>
          </div>
        )}

        {stats.trend.series.length > 0 ? (
          <div className="rounded-lg border bg-white p-3">
            <p className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-sky-500" /> Activity Trend (last {stats.trend.days} days)
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={stats.trend.series} margin={{ left: -24, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 8 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip cursor={{ stroke: '#1e2a45' }} />
                {trendTypes.map((t, i) => (
                  <Area
                    key={t}
                    type="monotone"
                    dataKey={t}
                    stackId="act"
                    stroke={TREND_COLORS[i % TREND_COLORS.length]}
                    fill={TREND_COLORS[i % TREND_COLORS.length]}
                    fillOpacity={0.5}
                    name={t.replace(/_/g, ' ')}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-3 flex flex-col justify-center items-center text-center">
            <Activity className="h-4 w-4 mx-auto text-black mb-1" />
            <p className="text-xs text-black">No recent activity</p>
          </div>
        )}
      </div>

      {/* Annotator progress */}
      {annotatorChart.length > 0 && (
        <div className="rounded-lg border bg-white p-3">
          <p className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-classic-navy" /> Annotator Completion
          </p>
          <ResponsiveContainer width="100%" height={annotatorChart.length > 4 ? 160 : 120}>
            <BarChart data={annotatorChart} margin={{ left: -18, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
              <Bar dataKey="Completed" fill="#1d7a4f" radius={[3, 3, 0, 0]} name="Completed" />
              <Bar dataKey="Assigned" fill="#2563eb" radius={[3, 3, 0, 0]} name="Assigned" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed report toggle */}
      <button
        onClick={() => setShowDetail((v) => !v)}
        className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-[11px] font-medium text-black hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        Detailed Report
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDetail && 'rotate-180')} />
      </button>

      {planReport && (planReport.kpis.length > 0 || Object.keys(planReport.metrics).length > 0) && (
        <div className="rounded-lg border bg-white p-3 space-y-3">
          <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-classic-navy" /> Plan Insights
          </p>

          {planReport.kpis.length > 0 && (
            <PlanKpiChart kpis={planReport.kpis} />
          )}

          {metricChartData(planReport.metrics).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-black mb-1">
                Report Metrics
              </p>
              <MetricChart data={metricChartData(planReport.metrics)} />
            </div>
          )}
        </div>
      )}

      {showDetail && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-xs">
          <Section title="Dataset Overview">
            <div className="grid grid-cols-2 gap-2">
              <Detail label="Dataset Type" value={stats.dataset.type} />
              <Detail label="Access" value={stats.dataset.accessType} />
              <Detail label="Health Status" value={stats.health.status} />
              <Detail label="Created" value={stats.dataset.createdAt ? new Date(stats.dataset.createdAt).toLocaleDateString() : '—'} />
            </div>
          </Section>

          <Section title="Data Volume">
            <div className="grid grid-cols-2 gap-2">
              <Detail label="Total Rows" value={stats.volume.rows} />
              <Detail label="Columns" value={stats.volume.columns} />
              <Detail label="Source Files" value={stats.volume.csvFiles} />
              <Detail label="Annotators" value={stats.progress.annotators} />
            </div>
          </Section>

          <Section title="Annotation Progress">
            <div className="grid grid-cols-2 gap-2">
              <Detail label="Not Started" value={stats.progress.notStarted} />
              <Detail label="Pending" value={stats.progress.pending} />
              <Detail label="Partial" value={stats.progress.partial} />
              <Detail label="Completed" value={stats.progress.completed} />
              <Detail label="Conflict" value={stats.progress.conflict} />
              <Detail label="Tie" value={stats.progress.tie} />
            </div>
          </Section>

          <Section title="Consensus / Health">
            <div className="grid grid-cols-2 gap-2">
              <Detail label="Reviews" value={stats.health.reviews} />
              <Detail label="Agreed" value={stats.health.agreed} />
              <Detail label="Conflicts" value={stats.health.conflict} />
              <Detail label="Ties" value={stats.health.tie} />
              <Detail label="Pending" value={stats.health.pending} />
              <Detail label="Sessions" value={stats.health.sessionsTotal} />
              <Detail label="Active Sessions" value={stats.health.sessionsActive} />
              <Detail label="Completed Sessions" value={stats.health.sessionsCompleted} />
              <Detail
                label={`Reliability (${stats.reliability.metric || 'overall'})`}
                value={
                  stats.reliability.overallValue !== null
                    ? String(stats.reliability.overallValue)
                    : 'Not computed'
                }
              />
            </div>
          </Section>

          {stats.volume.columnsList.length > 0 && (
            <Section title={`Dataset Columns (${stats.volume.columnsList.length})`}>
              <div className="flex flex-wrap gap-1">
                {stats.volume.columnsList.map((c) => (
                  <span key={c} className="px-1.5 py-0.5 rounded bg-white border text-[10px] text-black">
                    {c}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {stats.volume.csvSources.length > 0 && (
            <Section title={`Source Files (${stats.volume.csvSources.length})`}>
              {stats.volume.csvSources.map((s) => (
                <div key={s.fileName} className="flex justify-between py-0.5">
                  <span className="text-black truncate pr-2">{s.fileName}</span>
                  <span className="font-medium">
                    {s.rows} rows · {s.processedRows} processed
                  </span>
                </div>
              ))}
            </Section>
          )}

          {stats.reliability.perField.length > 0 && (
            <Section title="Per-Field Reliability">
              {stats.reliability.perField.map((f) => (
                <div key={f.field} className="flex justify-between py-0.5">
                  <span className="text-black truncate pr-2">{f.field}</span>
                  <span className="font-medium">{f.value}</span>
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5 uppercase text-[10px] tracking-wide">
        {title}
      </p>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col rounded-md bg-white border px-2 py-1.5">
      <span className="text-[10px] text-black">{label}</span>
      <span className="text-xs font-semibold text-foreground capitalize">{value}</span>
    </div>
  );
}

function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function PlanKpiChart({ kpis }: { kpis: AgentPlan['report']['kpis'] }) {
  const data = kpis
    .map((k) => ({
      name: k.label.length > 16 ? k.label.slice(0, 15) + '…' : k.label,
      Current: toNumber(k.current),
      Target: toNumber(k.target),
    }))
    .filter((d) => d.Current !== null || d.Target !== null)
    .map((d) => ({ name: d.name, Current: d.Current ?? 0, Target: d.Target ?? 0 }));

  if (data.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-black mb-1">
        KPIs (current vs target)
      </p>
      <ResponsiveContainer width="100%" height={data.length > 4 ? 160 : 120}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
          <YAxis tick={{ fontSize: 9 }} allowDecimals />
          <Tooltip cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
          <Bar dataKey="Current" fill="#1e2a45" radius={[3, 3, 0, 0]} name="Current" />
          <Bar dataKey="Target" fill="#1d7a4f" radius={[3, 3, 0, 0]} name="Target" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function metricChartData(metrics: Record<string, number | string>) {
  return Object.entries(metrics)
    .map(([key, value]) => {
      const n = toNumber(value as string | number);
      return {
        name: key.length > 16 ? key.slice(0, 15) + '…' : key,
        value: n ?? 0,
        raw: value,
      };
    })
    .filter((d) => d.value !== 0);
}

function MetricChart({
  data,
}: {
  data: { name: string; value: number; raw: string | number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={data.length > 4 ? 160 : 120}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 9 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 9 }}
          width={90}
        />
        <Tooltip
          cursor={{ fill: 'rgba(59,130,246,0.06)' }}
          formatter={(v: any, name: any, item: any) => [String(item?.payload?.raw ?? v), name]}
        />
        <Bar dataKey="value" fill="#2b3a5c" radius={[0, 3, 3, 0]} name="value" />
      </BarChart>
    </ResponsiveContainer>
  );
}
