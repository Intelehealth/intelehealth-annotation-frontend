'use client';

import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Empty, Section } from '@/components/dashboard/kpi';
import { pct, timeAgo } from '@/components/dashboard/format';
import { DDX_VERDICTS, doctorLabel, TTX_VERDICTS, type DashboardData, type DoctorStat, type GroupStat } from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';
import { displayName } from '@/lib/format-display';
import { Drill } from './drill-link';
import type { DrillSpec } from '@/lib/drill';

// Same base as the AI metrics: follows the dashboard follow-up switch.
const fuLabel = (d: DashboardData) => (d.ai.headline.includeFollowUps ? 'follow-ups included' : 'follow-ups excluded');
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
      description="Pseudo id · all visits · follow-ups included"
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
/** One annotator's number: their own annotations saved in the dashboard's period (drill person_*). */
const P = ({ id, m, what, children }: { id?: string; m: string; what: string; children: React.ReactNode }) =>
  id ? <Drill spec={{ m, k: id }} label={what}>{children}</Drill> : <>{children}</>;

export function DoctorProgress({ p, personHref }: {
  p: DashboardData['progress'];
  /** #23: members open the visits a person saved a review on (drafts included). */
  personHref?: (reviewerId: string) => string;
}) {
  const people = p.reviewers.map((r) => r.name);
  const verdictKeys = [...new Set([...DDX_VERDICTS, ...TTX_VERDICTS].map((v) => v.value))];
  return (
    <Section
      title="Annotator progress"
      description={`${p.total.toLocaleString()} annotations · ${p.openInRange.toLocaleString()} open`}
    >
      {p.reviewers.length === 0 ? <Empty>No annotations made in this range yet.</Empty> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className={th}>Annotator</th>
                  <th className={thR}>Annotated</th>
                  <th className={thR} title="Saved, not yet Save &amp; next">Drafts</th>
                  <th className={thR}>Diagnosis</th>
                  <th className={thR}>Treatment</th>
                  <th className={th}>Verdicts</th>
                  <th className={thR}>Flagged by clinical team</th>
                  <th className={thR}>Discussed</th>
                  <th className={th}>Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {p.reviewers.map((r, i) => (
                  <tr key={r.name}>
                    <td className={cn(td, 'font-medium')}>
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: PERSON_COLORS[i % PERSON_COLORS.length] }} />
                      {personHref && r.id ? <Link href={personHref(r.id)} className="text-blue-700 hover:underline">{r.name}</Link> : r.name}
                    </td>
                    <td className={tdR}><P id={r.id} m="person_annotated" what={`${r.name} · annotated`}>{r.annotated.toLocaleString()}</P></td>
                    <td className={tdR}>{r.drafts ? <P id={r.id} m="person_drafts" what={`${r.name} · drafts`}>{r.drafts.toLocaleString()}</P> : '—'}</td>
                    <td className={tdR}><P id={r.id} m="person_ddx" what={`${r.name} · diagnosis mismatches annotated`}>{r.ddx.toLocaleString()}</P></td>
                    <td className={tdR}><P id={r.id} m="person_ttx" what={`${r.name} · treatment mismatches annotated`}>{r.ttx.toLocaleString()}</P></td>
                    <td className={cn(td, 'text-xs text-muted-foreground')}>
                      {verdictKeys.filter((k) => r.verdicts[k]).map((k) => `${VERDICT_SHORT[k] ?? k} ${r.verdicts[k]}`).join(' · ') || '—'}
                    </td>
                    <td className={tdR}>{r.followUp ? <P id={r.id} m="person_flagged" what={`${r.name} · flagged by clinical team`}>{r.followUp}</P> : '—'}</td>
                    <td className={tdR}>{r.discussed ? <P id={r.id} m="person_discussed" what={`${r.name} · discussed`}>{r.discussed}</P> : '—'}</td>
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
function GroupTable({ rows, first, dim }: { rows: GroupStat[]; first: string; dim: (name: string) => Omit<DrillSpec, 'm'> }) {
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
            <tr><th className={th}>{first}</th><th className={thR}>Visits</th><th className={thR}>In top 5</th><th className={thR}>Doctor picked #1</th><th className={thR}>MRR</th></tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r) => (
              <tr key={r.name}>
                <td className={cn(td, 'capitalize')}>{r.name}</td>
                <td className={tdR}><Drill spec={{ m: 'dx_scored', ...dim(r.name) }} label={`${first} ${displayName(r.name)} · visits`}>{r.visits.toLocaleString()}</Drill></td>
                <td className={tdR}><Drill spec={{ m: 'top5', ...dim(r.name) }} label={`${first} ${displayName(r.name)} · in top 5`}>{pct(rate(r.top5, r.visits))}</Drill></td>
                <td className={cn(tdR, rate(r.top1, r.visits) < 40 && 'text-rose-700')}><Drill spec={{ m: 'top1', ...dim(r.name) }} label={`${first} ${displayName(r.name)} · doctor picked #1`}>{pct(rate(r.top1, r.visits))}</Drill></td>
                <td className={tdR}>{r.mrr.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PairList({ items, empty, left = 'AI', m }: { items: { name: string; count: number }[]; empty: string; left?: string; m: string }) {
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
                  <span className="capitalize text-muted-foreground">{left}: {displayName(ai)}</span>
                  <span className="mx-1.5 text-muted-foreground">→</span>
                  <span className="font-medium capitalize">{displayName(dr)}</span>
                </span>
                <Drill spec={{ m, k: i.name }} label={`${left} ${displayName(ai)} → doctor ${displayName(dr)}`} className="tabular-nums text-muted-foreground">{i.count}</Drill>
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
              <td className={tdR}><Drill spec={{ m: 'conf_suggestions', k: r.name }} label={`Confidence ${r.name} · suggestions`}>{r.suggestions.toLocaleString()}</Drill></td>
              <td className={cn(tdR, 'font-medium')}><Drill spec={{ m: 'conf_picked', k: r.name }} label={`Confidence ${r.name} · doctor picked it`}>{pct(rate(r.picked, r.suggestions), 1)}</Drill></td>
              <td className={tdR}>{r.avgRank != null ? r.avgRank.toFixed(1) : '—'}</td>
              <td className={tdR}>{r.asTop1 ? <Drill spec={{ m: 'conf_top1', k: r.name }} label={`Confidence ${r.name} · as AI #1`}>{r.asTop1.toLocaleString()}</Drill> : '—'}</td>
              <td className={tdR}>{r.asTop1 ? <Drill spec={{ m: 'conf_top1_picked', k: r.name }} label={`Confidence ${r.name} · #1 picked`}>{pct(rate(r.top1Picked, r.asTop1))}</Drill> : '—'}</td>
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
        description={`All AI suggestions #1–#5 · ${fuLabel(data)}`}
      >
        <ConfidenceTable rows={data.confidence} />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Most common misses" description={`AI #1 → doctor · not in top 5 · ${fuLabel(data)}`}>
          <PairList items={data.mismatchPairs.missed} empty="No misses in this range." m="pair_missed" />
        </Section>
        <Section title="Most common “right list, wrong order”" description={`AI #1 → doctor · picked #2–#5 · ${fuLabel(data)}`}>
          <PairList items={data.mismatchPairs.rankedLower} empty="None in this range." m="pair_lower" />
        </Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section title="When the AI says X first, how often does the doctor agree?" description={`Per AI #1 Dx · ${fuLabel(data)}`}>
          <GroupTable rows={data.aiTop1Agreement} first="AI's #1 diagnosis" dim={(name) => ({ aiTop1: name })} />
        </Section>
        <Section title="By specialty" description={fuLabel(data)}>
          {data.specialties.length === 0 ? <Empty>Nothing in this range.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
                  <tr><th className={th}>Specialty</th><th className={thR}>Visits</th><th className={thR}>Top 5</th><th className={thR}>#1</th><th className={thR}>MRR</th><th className={thR}>AI meds used</th></tr>
                </thead>
                <tbody className="divide-y">
                  {data.specialties.map((r) => (
                    <tr key={r.name}>
                      <td className={td}>{displayName(r.name)}</td>
                      <td className={tdR}><Drill spec={{ m: 'dx_scored', specialty: r.name }} label={`${displayName(r.name)} · visits`}>{r.visits.toLocaleString()}</Drill></td>
                      <td className={tdR}><Drill spec={{ m: 'top5', specialty: r.name }} label={`${displayName(r.name)} · in top 5`}>{pct(rate(r.top5, r.visits))}</Drill></td>
                      <td className={tdR}><Drill spec={{ m: 'top1', specialty: r.name }} label={`${displayName(r.name)} · #1`}>{pct(rate(r.top1, r.visits))}</Drill></td>
                      <td className={tdR}>{r.mrr.toFixed(2)}</td>
                      <td className={tdR}>{r.ttxVisits ? <Drill spec={{ m: 'ttx_used', specialty: r.name }} label={`${displayName(r.name)} · AI medicines used`}>{pct(rate(r.ttxUsed, r.ttxVisits))}</Drill> : '—'}</td>
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
