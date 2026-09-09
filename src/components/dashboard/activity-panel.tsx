'use client';

import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { AdminOverview } from '@/lib/api/dashboard-data';
import { Empty, Section } from './kpi';
import { perDay, personName, timeAgo } from './format';

type Event = { at: string; text: string; kind: 'dataset' | 'submitted' | 'notification' | 'consensus' };

// Activity is built from the timestamps the API already returns — datasets
// created, clones submitted, consensus computed, notifications — so it is a
// true record, not an estimate. The chart counts those events per day.
export function ActivityPanel({ data }: { data: AdminOverview }) {
  const events = useMemo<Event[]>(() => {
    const out: Event[] = [];
    for (const d of data.datasets) if (!d.isClone) out.push({ at: d.createdAt, text: `Dataset created: ${d.name}`, kind: 'dataset' });
    for (const a of data.reviewQueue) out.push({ at: a.submittedAt ?? a.updatedAt, text: `${personName(a.assignedTo)} submitted ${typeof a.cloneDatasetId === 'object' ? a.cloneDatasetId?.name : 'a clone'}`, kind: 'submitted' });
    for (const r of data.rows) if (r.health?.cache?.lastCompute) out.push({ at: r.health.cache.lastCompute, text: `Consensus computed for ${r.dataset.name}`, kind: 'consensus' });
    for (const n of data.notifications) out.push({ at: n.createdAt, text: n.title, kind: 'notification' });
    return out.filter((e) => e.at).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [data]);

  const series = useMemo(() => perDay(events.map((e) => e.at), 14), [events]);
  const total = series.reduce((s, d) => s + d.count, 0);

  return (
    <Section title="Activity" description={`${total} events in the last 14 days.`}>
      <div className="px-4 pt-4">
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap={3}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={series.length - 2} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v) => [String(v), 'events']} />
              <Bar dataKey="count" fill="hsl(var(--foreground))" fillOpacity={0.75} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {events.length === 0 ? <Empty>No activity yet.</Empty> : (
        <ul className="mt-2 divide-y border-t">
          {events.slice(0, 8).map((e, i) => (
            <li key={i} className="flex items-baseline gap-3 px-4 py-2 text-sm">
              <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">{timeAgo(e.at)}</span>
              <span className="truncate">{e.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
