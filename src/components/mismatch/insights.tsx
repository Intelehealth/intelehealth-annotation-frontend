'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Empty, Section } from '@/components/dashboard/kpi';
import { pct, timeAgo } from '@/components/dashboard/format';
import { DDX_VERDICTS, doctorLabel, TTX_VERDICTS, type DashboardData, type DoctorStat, type GroupStat } from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';
import { rate } from './shared';

const PERSON_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#ef4444'];
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
      title="By consulting doctor"
      description="Doctor who saw the patient in OpenMRS, shown by pseudo id. Annotator verdicts count only reviewed visits."
    >
      {rows.length === 0 ? <Empty>No visits in this range.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className={th}>Doctor</th>
                <th className={thR}>Visits</th>
                <th className={thR}>Top-1</th>
                <th className={thR}>Top-5</th>
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
                  <td className={tdR}>{pct(rate(r.top1, r.ddxVisits))}</td>
                  <td className={tdR}>{pct(rate(r.top5, r.ddxVisits))}</td>
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

function GroupTable({ rows, first }: { rows: GroupStat[]; first: string }) {
  if (!rows.length) return <Empty>Nothing in this range.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr><th className={th}>{first}</th><th className={thR}>Visits</th><th className={thR}>Doctor picked #1</th><th className={thR}>In top 5</th><th className={thR}>MRR</th></tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
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
  );
}

function PairList({ items, empty, left = 'AI' }: { items: { name: string; count: number }[]; empty: string; left?: string }) {
  if (!items.length) return <Empty>{empty}</Empty>;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ol className="space-y-1.5 px-4 py-3 text-sm">
      {items.map((i, n) => {
        const [ai, dr] = i.name.split(' → ');
        return (
          <li key={i.name} className="relative">
            <div className="absolute inset-y-0 left-0 rounded bg-rose-50" style={{ width: `${(100 * i.count) / max}%` }} />
            <div className="relative flex items-center gap-2 px-2 py-0.5">
              <span className="w-5 text-xs text-muted-foreground">{n + 1}</span>
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
  );
}

/** Deterministic diagnosis patterns: ranked AI→doctor pairs, agreement per AI #1, specialty split, confidence label check. */
export function DiagnosisPatterns({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnosis patterns</h3>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Most common misses" description="AI's #1 → the doctor's diagnosis, when the doctor's diagnosis was not in the AI top 5">
          <PairList items={data.mismatchPairs.missed} empty="No misses in this range." />
        </Section>
        <Section title="Most common “right list, wrong order”" description="AI's #1 → the doctor's diagnosis, when the doctor picked the AI's #2–#5">
          <PairList items={data.mismatchPairs.rankedLower} empty="None in this range." />
        </Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="When the AI says X first, how often does the doctor agree?" description="Per AI #1 diagnosis, most frequent first">
          <GroupTable rows={data.aiTop1Agreement} first="AI's #1 diagnosis" />
        </Section>
        <div className="space-y-6">
          <Section title="By specialty" description="Adults (General Physician) vs children (Pediatrician) and others">
            {data.specialties.length === 0 ? <Empty>Nothing in this range.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
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
          <Section title="Does the AI's confidence label mean anything?" description="Doctor agreement by the likelihood the AI gave its #1 diagnosis">
            <GroupTable rows={data.confidence} first="AI label on #1" />
          </Section>
        </div>
      </div>
    </div>
  );
}

type MedSort = 'suggested' | 'rejected' | 'accepted';

/** Per-medicine acceptance and what doctors add for each diagnosis. */
export function TreatmentPatterns({ data }: { data: DashboardData }) {
  const [sort, setSort] = useState<MedSort>('suggested');
  const rows = useMemo(() => {
    const r = [...data.medicines];
    if (sort === 'rejected') r.sort((a, b) => b.ignored - a.ignored);
    else if (sort === 'accepted') r.sort((a, b) => b.acceptance - a.acceptance || b.suggested - a.suggested);
    return r.slice(0, 20);
  }, [data.medicines, sort]);
  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Treatment patterns</h3>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section
          title="AI medicines: how often each was used"
          description="Matched by exact product name, so the same drug in another product counts as not used"
          action={
            <select className="h-8 rounded-md border bg-background px-2 text-xs" value={sort} onChange={(e) => setSort(e.target.value as MedSort)} aria-label="Sort medicines">
              <option value="suggested">Most suggested</option>
              <option value="rejected">Most often not used</option>
              <option value="accepted">Highest acceptance</option>
            </select>
          }
        >
          {rows.length === 0 ? <Empty>No AI treatment in this range.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr><th className={th}>Medicine</th><th className={thR}>Suggested</th><th className={thR}>Exact</th><th className={thR}>Dose changed</th><th className={thR}>Not used</th><th className={thR}>Acceptance</th></tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((m) => (
                    <tr key={m.name}>
                      <td className={cn(td, 'max-w-[260px] truncate')} title={m.name}>{m.name}</td>
                      <td className={tdR}>{m.suggested.toLocaleString()}</td>
                      <td className={tdR}>{m.exact.toLocaleString()}</td>
                      <td className={tdR}>{m.modified.toLocaleString()}</td>
                      <td className={tdR}>{m.ignored.toLocaleString()}</td>
                      <td className={cn(tdR, 'font-medium', m.acceptance < 0.3 ? 'text-rose-700' : m.acceptance > 0.7 ? 'text-emerald-700' : '')}>{pct(100 * m.acceptance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
        <Section title="What doctors add, by diagnosis" description="Doctor's diagnosis → a medicine the doctor added that the AI did not suggest">
          <PairList items={data.addedForDiagnosis} empty="No added medicines in this range." left="Dx" />
        </Section>
      </div>
    </div>
  );
}
