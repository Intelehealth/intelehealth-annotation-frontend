'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Empty, Section } from '@/components/dashboard/kpi';
import { pct, timeAgo } from '@/components/dashboard/format';
import { DDX_VERDICTS, doctorLabel, TTX_VERDICTS, type DashboardData, type DoctorStat, type GroupStat } from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';
import { rate, TableSearch, useRowFilter } from './shared';

const PERSON_COLORS = ['#1e3a8a', '#2563eb', '#60a5fa', '#0f766e', '#64748b', '#93c5fd', '#334155'];
const VERDICT_SHORT: Record<string, string> = {
  ai_correct: 'AI right', doctor_correct: 'Doctor right', both_acceptable: 'Both OK', neither: 'Neither', insufficient: 'Too thin',
};

const th = 'px-4 py-2 font-medium';
const thR = 'px-4 py-2 text-right font-medium';
const td = 'px-4 py-2';
const tdR = 'px-4 py-2 text-right tabular-nums';

/**
 * Per consulting doctor (the OpenMRS doctor on the visit, by pseudo id): how
 * often they agreed with the AI, and what annotators concluded on their mismatches.
 */
export function ConsultingDoctors({ rows }: { rows: DoctorStat[] }) {
  return (
    <Section
      title="Mismatches and annotator verdicts by doctor"
      description="Doctor who saw the patient in OpenMRS, shown by pseudo id. Visits and mismatches = every visit in the period, follow-ups included; verdicts count only reviewed visits. AI agreement rates (follow-ups excluded) are in the table above."
    >
      {rows.length === 0 ? <Empty>No visits in this range.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className={th}>Doctor</th>
                <th className={thR}>Visits</th>
                <th className={thR}>DDx mismatch</th>
                <th className={thR}>AI medicines used</th>
                <th className={thR}>Mismatches reviewed</th>
                <th className={th}>Diagnosis verdicts</th>
                <th className={th}>Treatment verdicts</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.doctor}>
                  <td className={cn(td, 'whitespace-nowrap font-medium')}>{doctorLabel(r.doctor)}</td>
                  <td className={tdR}>{r.visits.toLocaleString()}</td>
                  <td className={tdR}>{r.ddxMismatch.toLocaleString()}</td>
                  <td className={tdR}>{r.ttxVisits ? pct(rate(r.ttxUsed, r.ttxVisits)) : '—'}</td>
                  <td className={tdR}>{r.annotated.toLocaleString()} / {r.mismatches.toLocaleString()}</td>
                  <td className={cn(td, 'text-xs text-muted-foreground')}>
                    {r.ddxDoctorRight + r.ddxAiRight ? `Doctor right ${r.ddxDoctorRight} · AI right ${r.ddxAiRight}` : '—'}
                  </td>
                  <td className={cn(td, 'text-xs text-muted-foreground')}>
                    {r.ttxDoctorRight + r.ttxAiRight ? `Doctor right ${r.ttxDoctorRight} · AI right ${r.ttxAiRight}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

/** Who annotated how much in the selected range (by annotation date). */
export function DoctorProgress({ p }: { p: DashboardData['progress'] }) {
  const people = p.reviewers.map((r) => r.name);
  const verdictKeys = [...new Set([...DDX_VERDICTS, ...TTX_VERDICTS].map((v) => v.value))];
  return (
    <Section
      title="Annotator progress"
      description={`${p.total.toLocaleString()} annotations made in this range, counted by the day they were made · ${p.openInRange.toLocaleString()} mismatches from this range still open`}
    >
      {p.reviewers.length === 0 ? <Empty>No annotations made in this range yet.</Empty> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className={th}>Annotator</th>
                  <th className={thR}>Annotated</th>
                  <th className={thR}>Diagnosis</th>
                  <th className={thR}>Treatment</th>
                  <th className={th}>Verdicts</th>
                  <th className={thR}>Flagged</th>
                  <th className={th}>Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {p.reviewers.map((r, i) => (
                  <tr key={r.name}>
                    <td className={cn(td, 'font-medium')}>
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: PERSON_COLORS[i % PERSON_COLORS.length] }} />
                      {r.name}
                    </td>
                    <td className={tdR}>{r.annotated.toLocaleString()}</td>
                    <td className={tdR}>{r.ddx.toLocaleString()}</td>
                    <td className={tdR}>{r.ttx.toLocaleString()}</td>
                    <td className={cn(td, 'text-xs text-muted-foreground')}>
                      {verdictKeys.filter((k) => r.verdicts[k]).map((k) => `${VERDICT_SHORT[k] ?? k} ${r.verdicts[k]}`).join(' · ') || '—'}
                    </td>
                    <td className={tdR}>{r.followUp || '—'}</td>
                    <td className={cn(td, 'whitespace-nowrap text-xs text-muted-foreground')}>{r.lastActive ? timeAgo(r.lastActive) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="h-56 px-2 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.daily.map((d) => ({ ...d, date: String(d.date).slice(5) }))} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {people.map((n, i) => <Bar key={n} dataKey={n} stackId="a" fill={PERSON_COLORS[i % PERSON_COLORS.length]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Section>
  );
}

const byName = (r: { name: string }) => r.name;

/** Agreement per group; searchable and scrollable so it stays usable over a quarter or a year. */
function GroupTable({ rows, first }: { rows: GroupStat[]; first: string }) {
  const { q, setQ, filtered } = useRowFilter(rows, byName);
  if (!rows.length) return <Empty>Nothing in this range.</Empty>;
  return (
    <>
      {rows.length > 10 && (
        <div className="flex justify-end border-b px-4 py-2"><TableSearch q={q} setQ={setQ} shown={filtered.length} total={rows.length} placeholder="Find a diagnosis…" /></div>
      )}
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs text-muted-foreground">
            <tr><th className={th}>{first}</th><th className={thR}>Visits</th><th className={thR}>Doctor picked #1</th><th className={thR}>In top 5</th><th className={thR}>MRR</th></tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r) => (
              <tr key={r.name}>
                <td className={cn(td, 'capitalize')}>{r.name}</td>
                <td className={tdR}>{r.visits.toLocaleString()}</td>
                <td className={cn(tdR, rate(r.top1, r.visits) < 40 && 'text-rose-700')}>{pct(rate(r.top1, r.visits))}</td>
                <td className={tdR}>{pct(rate(r.top5, r.visits))}</td>
                <td className={tdR}>{r.mrr.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PairList({ items, empty, left = 'AI' }: { items: { name: string; count: number }[]; empty: string; left?: string }) {
  const { q, setQ, filtered } = useRowFilter(items, byName);
  if (!items.length) return <Empty>{empty}</Empty>;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <>
      {items.length > 10 && (
        <div className="flex justify-end border-b px-4 py-2"><TableSearch q={q} setQ={setQ} shown={filtered.length} total={items.length} /></div>
      )}
      <ol className="max-h-[420px] space-y-1.5 overflow-auto px-4 py-3 text-sm">
        {filtered.map((i) => {
          const [ai, dr] = i.name.split(' → ');
          return (
            <li key={i.name} className="relative">
              <div className="absolute inset-y-0 left-0 rounded bg-blue-50" style={{ width: `${(100 * i.count) / max}%` }} />
              <div className="relative flex items-center gap-2 px-2 py-0.5">
                <span className="w-7 text-xs text-muted-foreground">{items.indexOf(i) + 1}</span>
                <span className="min-w-0 flex-1 truncate" title={i.name}>
                  <span className="capitalize text-muted-foreground">{left}: {ai}</span>
                  <span className="mx-1.5 text-muted-foreground">→</span>
                  <span className="font-medium capitalize">{dr}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">{i.count}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** Calibration: does a higher AI confidence label mean the doctor picks that suggestion more often? */
function ConfidenceTable({ rows }: { rows: DashboardData['confidence'] }) {
  if (!rows.length) return <Empty>Nothing in this range.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
          <tr>
            <th className={th}>AI confidence label</th><th className={thR}>Suggestions</th><th className={thR}>Doctor picked it</th>
            <th className={thR}>Avg rank</th><th className={thR}>As AI #1</th><th className={thR}>#1 picked</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className={cn(td, 'font-medium')}>{r.name}</td>
              <td className={tdR}>{r.suggestions.toLocaleString()}</td>
              <td className={cn(tdR, 'font-medium')}>{pct(rate(r.picked, r.suggestions), 1)}</td>
              <td className={tdR}>{r.avgRank != null ? r.avgRank.toFixed(1) : '—'}</td>
              <td className={tdR}>{r.asTop1 ? r.asTop1.toLocaleString() : '—'}</td>
              <td className={tdR}>{r.asTop1 ? pct(rate(r.top1Picked, r.asTop1)) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Deterministic diagnosis patterns: ranked AI→doctor pairs, agreement per AI #1, specialty split, confidence calibration. */
export function DiagnosisPatterns({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnosis patterns</h3>
      <Section
        title="Is the AI's confidence label calibrated?"
        description="Every AI suggestion (ranks 1-5) on every visit in the period with an AI list (follow-ups included), grouped by the likelihood label the AI gave it. If the labels mean something, “Doctor picked it” should fall from High to Low. Label spellings are merged (e.g. “Moderate to High” → Moderate-High)."
      >
        <ConfidenceTable rows={data.confidence} />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Most common misses" description="AI's #1 → the doctor's diagnosis, when the doctor's diagnosis was not in the AI top 5 · every visit in the period with an AI list, follow-ups included">
          <PairList items={data.mismatchPairs.missed} empty="No misses in this range." />
        </Section>
        <Section title="Most common “right list, wrong order”" description="AI's #1 → the doctor's diagnosis, when the doctor picked the AI's #2–#5 · every visit in the period with an AI list, follow-ups included">
          <PairList items={data.mismatchPairs.rankedLower} empty="None in this range." />
        </Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section title="When the AI says X first, how often does the doctor agree?" description="Per AI #1 diagnosis, most frequent first · every visit in the period with an AI list, follow-ups included">
          <GroupTable rows={data.aiTop1Agreement} first="AI's #1 diagnosis" />
        </Section>
        <Section title="By specialty" description="Adults (General Physician) vs children (Pediatrician) and others · every visit in the period with an AI list, follow-ups included">
          {data.specialties.length === 0 ? <Empty>Nothing in this range.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
                  <tr><th className={th}>Specialty</th><th className={thR}>Visits</th><th className={thR}>#1</th><th className={thR}>Top 5</th><th className={thR}>MRR</th><th className={thR}>AI meds used</th></tr>
                </thead>
                <tbody className="divide-y">
                  {data.specialties.map((r) => (
                    <tr key={r.name}>
                      <td className={td}>{r.name}</td>
                      <td className={tdR}>{r.visits.toLocaleString()}</td>
                      <td className={tdR}>{pct(rate(r.top1, r.visits))}</td>
                      <td className={tdR}>{pct(rate(r.top5, r.visits))}</td>
                      <td className={tdR}>{r.mrr.toFixed(2)}</td>
                      <td className={tdR}>{r.ttxVisits ? pct(rate(r.ttxUsed, r.ttxVisits)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
