'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, CircleHelp, Eye, EyeOff, Lightbulb, Loader2, MessageCircle,
  RotateCcw, Send, ShieldAlert, Sparkles, Users, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trainingAPI, type CaseStats, type DialogueTurn, type TrainingAttempt, type TrainingCase } from '@/lib/api/training';
import { CaseFile, Meter, ScoreRing, scoreTone } from '@/components/training/ui';

const STATUS: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  matches_reference: { label: 'Matches treating doctor', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  acceptable_alternative: { label: 'Defensible', cls: 'bg-sky-50 text-sky-700 border-sky-200', icon: CheckCircle2 },
  not_supported: { label: 'Not supported by note', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  wrong: { label: 'Incorrect', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

const EVIDENCE: Record<string, string> = {
  supports: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  weak: 'text-amber-700 bg-amber-50 border-amber-200',
  irrelevant: 'text-slate-600 bg-slate-50 border-slate-200',
  contradicts: 'text-red-700 bg-red-50 border-red-200',
};

const SEVERITY: Record<string, string> = {
  safety: 'border-red-200 bg-red-50 text-red-900',
  important: 'border-amber-200 bg-amber-50 text-amber-900',
  minor: 'border-slate-200 bg-slate-50 text-slate-800',
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]/g, '');

function Card({ title, icon: Icon, children, className, testId, action }: { title: string; icon: typeof Sparkles; children: React.ReactNode; className?: string; testId?: string; action?: React.ReactNode }) {
  return (
    <section className={cn('rounded-xl border bg-card p-5 shadow-sm', className)} data-testid={testId}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-teal-600" />{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function AttemptReview() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ attempt: TrainingAttempt; case: TrainingCase; stats: CaseStats } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [dialogue, setDialogue] = useState<DialogueTurn[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trainingAPI.getAttempt(id).then((d) => { setData(d); setDialogue(d.attempt.dialogue ?? []); })
      .catch((e) => setError(e?.response?.data?.message ?? 'Could not load this review'));
  }, [id]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [dialogue, sending]);

  const clueSet = useMemo(() => {
    if (!data?.attempt.judge) return new Set<string>();
    const clues = data.attempt.judge.diagnosis.missed.flatMap((m) => m.clues).map(norm).filter(Boolean);
    const items = data.case.stages.flatMap((s) => s.sections.flatMap((sec) => sec.items));
    return new Set(items.filter((it) => clues.some((cl) => norm(it).includes(cl) || cl.includes(norm(it)))));
  }, [data]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  const { attempt: a, case: c, stats } = data;
  const j = a.judge;

  if (a.status !== 'judged' || !j) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h1 className="font-semibold">The tutor could not review this attempt</h1>
        <p className="mt-1 text-sm text-muted-foreground">{a.judgeError ?? 'Please try again.'}</p>
        <Link href={`/training/${c.slug}`} className="mt-4 inline-block text-sm text-teal-700 underline">Retry the case</Link>
      </div>
    );
  }

  const tone = scoreTone(j.total);
  const better = stats.scores.filter((s) => s < j.total).length;
  const percentile = stats.scores.length ? Math.round((100 * better) / stats.scores.length) : null;
  const myDx = new Set(j.diagnosis.assessments.map((x) => norm(x.canonical || x.trainee)));
  const peerDx = stats.diagnoses.slice(0, 6).map((d) => ({ ...d, mine: myDx.has(norm(d.name)) }));
  const buckets = [40, 50, 60, 70, 80, 90].map((lo) => ({
    band: lo === 40 ? '<50' : `${lo}s`,
    count: stats.scores.filter((s) => (lo === 40 ? s < 50 : s >= lo && s < lo + 10)).length,
    mine: lo === 40 ? j.total < 50 : j.total >= lo && j.total < lo + 10,
  }));
  const ref = c.reference;
  const tutorQuestion = j.diagnosis.missed[0]?.question || j.followUpQuestion;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    const text = message.trim();
    setDialogue((d) => [...d, { role: 'trainee', text, at: new Date().toISOString() }]);
    setMessage('');
    setSending(true);
    try {
      const res = await trainingAPI.reply(a._id, text);
      setDialogue(res.dialogue);
    } catch {
      setDialogue((d) => [...d, { role: 'tutor', text: 'Sorry, I could not respond just now. Please try again.', at: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/training" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Case library</Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Case review · {c.title}</h1>
          <p className="text-xs text-muted-foreground">
            {a.userName || 'You'} · {new Date(a.createdAt).toLocaleString()} {a.timeSpentSec ? `· ${Math.round(a.timeSpentSec / 60)} min on case` : ''} · reviewed by {a.judgeModel}
          </p>
        </div>
        <Link href={`/training/${c.slug}`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted"><RotateCcw className="h-4 w-4" /> Try this case again</Link>
      </div>

      {/* Score hero */}
      <section className="grid gap-6 rounded-2xl border bg-card p-6 shadow-sm md:grid-cols-[auto_1fr_minmax(0,280px)]" data-testid="score-hero">
        <div className="flex flex-col items-center">
          <ScoreRing score={j.total} />
          <span className={cn('mt-2 text-sm font-semibold', tone.text)}>{tone.label}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-teal-700"><Sparkles className="h-4 w-4" /> AI tutor summary</div>
          <p className="mt-2 text-[15px] leading-relaxed">{j.summary}</p>
          {percentile != null && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-800">
              <Users className="h-3.5 w-3.5" /> You scored higher than {percentile}% of {stats.attempts} peers on this case (peer average {stats.averageScore})
            </p>
          )}
        </div>
        <div className="space-y-3">
          <Meter label="Diagnostic accuracy" value={j.scores.diagnosis} max={j.rubric.diagnosis} />
          <Meter label="Clinical reasoning" value={j.scores.reasoning} max={j.rubric.reasoning} />
          <Meter label="Treatment plan" value={j.scores.treatment} max={j.rubric.treatment} />
          <Meter label="Patient safety" value={j.scores.safety} max={j.rubric.safety} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Diagnosis */}
        <Card title="Diagnosis" icon={CheckCircle2} testId="dx-review">
          <div className="space-y-2.5">
            {j.diagnosis.assessments.map((x, i) => {
              const s = STATUS[x.status] ?? STATUS.not_supported;
              return (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{x.trainee}</span>
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', s.cls)}><s.icon className="h-3 w-3" />{s.label}</span>
                  </div>
                  {x.comment && <p className="mt-1 text-sm text-muted-foreground">{x.comment}</p>}
                </div>
              );
            })}
          </div>
          {ref && (
            <p className="mt-3 text-xs text-muted-foreground">Treating doctor&apos;s diagnosis: <span className="font-medium text-foreground">{ref.diagnoses.join(' + ')}</span></p>
          )}
        </Card>

        {/* Missed */}
        <Card
          title={j.diagnosis.missed.length ? `You may have missed ${j.diagnosis.missed.length === 1 ? 'something' : `${j.diagnosis.missed.length} things`}` : 'Nothing important missed'}
          icon={CircleHelp}
          testId="missed"
          className={j.diagnosis.missed.length ? 'border-amber-200' : ''}
          action={clueSet.size > 0 && (
            <button type="button" onClick={() => setShowNote(!showNote)} data-testid="show-clues" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted">
              {showNote ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {showNote ? 'Hide' : 'Show'} clues in note
            </button>
          )}
        >
          <div className="space-y-3">
            {j.diagnosis.missed.map((m, i) => (
              <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold">{m.diagnosis}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', m.importance === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800')}>{m.importance}</span>
                </div>
                {m.clues.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.clues.map((cl) => <span key={cl} className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-900 ring-1 ring-yellow-300">“{cl}”</span>)}
                  </div>
                )}
                {m.question && <p className="mt-2 text-sm italic text-amber-900">{m.question}</p>}
              </div>
            ))}
            {j.diagnosis.differentialsToConsider.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Also worth considering</div>
                <ul className="space-y-1.5 text-sm">
                  {j.diagnosis.differentialsToConsider.map((d, i) => <li key={i}><span className="font-medium">{d.diagnosis}</span>: <span className="text-muted-foreground">{d.why}</span></li>)}
                </ul>
              </div>
            )}
          </div>
          {showNote && <div className="mt-4 max-h-[420px] overflow-y-auto rounded-lg bg-muted/40 p-2"><CaseFile stages={c.stages} revealed={c.stages.length} highlight={clueSet} /></div>}
        </Card>
      </div>

      {/* Tutor chat */}
      <Card title="Talk it through with your tutor" icon={MessageCircle} testId="tutor" className="border-teal-200">
        <div className="space-y-3">
          <div className="flex gap-2.5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-white"><Sparkles className="h-4 w-4" /></span>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-teal-50 px-4 py-2.5 text-sm text-teal-950">{tutorQuestion}</div>
          </div>
          {dialogue.map((t, i) => (
            <div key={i} className={cn('flex gap-2.5', t.role === 'trainee' && 'flex-row-reverse')}>
              {t.role === 'tutor' && <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-white"><Sparkles className="h-4 w-4" /></span>}
              <div className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm', t.role === 'tutor' ? 'rounded-tl-sm bg-teal-50 text-teal-950' : 'rounded-tr-sm bg-foreground text-background')} data-testid={`turn-${t.role}`}>{t.text}</div>
            </div>
          ))}
          {sending && <div className="flex items-center gap-2 pl-11 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Tutor is thinking…</div>}
          <div ref={chatEnd} />
        </div>
        <form onSubmit={send} className="mt-4 flex gap-2">
          <input value={message} onChange={(e) => setMessage(e.target.value)} data-testid="tutor-input" placeholder="Answer the tutor, or ask why…" className="h-10 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/40" />
          <button type="submit" disabled={!message.trim() || sending} data-testid="tutor-send" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-teal-600 px-4 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"><Send className="h-4 w-4" /> Send</button>
        </form>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Reasoning */}
        <Card title="Your reasoning" icon={Lightbulb} testId="reasoning">
          {a.stageImpressions.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">How your thinking evolved</div>
              <ol className="flex flex-wrap items-stretch gap-2">
                {a.stageImpressions.map((imp) => (
                  <li key={imp.stage} className="min-w-[120px] flex-1 rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">{c.stages.find((s) => s.key === imp.stage)?.title}</div>
                    <div className="text-xs font-medium">{imp.diagnoses.join(', ')}</div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-teal-500" style={{ width: `${imp.confidence}%` }} /></div>
                  </li>
                ))}
              </ol>
              {j.reasoning.stageProgression && <p className="mt-2 text-sm text-muted-foreground">{j.reasoning.stageProgression}</p>}
            </div>
          )}
          {j.reasoning.evidence.length > 0 && (
            <div className="mb-4 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Evidence check</div>
              {j.reasoning.evidence.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className={cn('mt-0.5 flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase', EVIDENCE[e.verdict] ?? EVIDENCE.irrelevant)}>{e.verdict}</span>
                  <span><span className="font-medium">{e.finding}</span> <span className="text-muted-foreground">→ {e.linkedTo}. {e.comment}</span></span>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Strengths</div>
              <ul className="space-y-1 text-sm">{j.reasoning.strengths.map((s, i) => <li key={i} className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />{s}</li>)}</ul>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Gaps</div>
              <ul className="space-y-1 text-sm">{j.reasoning.gaps.map((s, i) => <li key={i} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />{s}</li>)}</ul>
            </div>
          </div>
        </Card>

        {/* Treatment */}
        <Card title="Treatment review" icon={ShieldAlert} testId="tx-review">
          {j.treatment.concerns.length > 0 && (
            <div className="space-y-2">
              {j.treatment.concerns.map((cn_, i) => (
                <div key={i} className={cn('rounded-lg border px-3 py-2 text-sm', SEVERITY[cn_.severity] ?? SEVERITY.minor)}>
                  <div className="flex items-center gap-1.5 font-medium">
                    {cn_.severity === 'safety' ? <ShieldAlert className="h-4 w-4 text-red-600" /> : <AlertTriangle className="h-4 w-4" />}
                    {cn_.item}
                    <span className="ml-auto text-[10px] font-semibold uppercase opacity-70">{cn_.severity}</span>
                  </div>
                  <p className="mt-0.5 opacity-90">{cn_.comment}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your plan</div>
              <ul className="space-y-1 text-sm">
                {a.treatment.medicines.map((m, i) => <li key={i}><span className="font-medium">{m.drug}</span> <span className="text-muted-foreground">{[m.dose, m.frequency, m.duration].filter(Boolean).join(' · ')}</span></li>)}
                {a.treatment.advice.map((x) => <li key={x} className="text-muted-foreground">Advice: {x}</li>)}
                {a.treatment.investigations.map((x) => <li key={x} className="text-muted-foreground">Test: {x}</li>)}
                {a.treatment.referral && <li className="text-muted-foreground">Referral: {a.treatment.referral}</li>}
                {a.treatment.safetyNet && <li className="text-muted-foreground">Safety-net: {a.treatment.safetyNet}</li>}
              </ul>
            </div>
            {ref && (
              <div className="rounded-lg border bg-muted/30 p-3" data-testid="reference-plan">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Treating doctor&apos;s plan</div>
                <ul className="space-y-1 text-sm">
                  {ref.medicines.map((m, i) => <li key={i}><span className="font-medium">{m.drug}</span> <span className="text-muted-foreground">{[m.dose, m.frequency, m.duration].filter(Boolean).join(' · ')}</span></li>)}
                  {ref.advice.map((x) => <li key={x} className="text-muted-foreground">Advice: {x}</li>)}
                  {ref.tests.map((x) => <li key={x} className="text-muted-foreground">Test: {x}</li>)}
                  {ref.referral && <li className="text-muted-foreground">Referral: {ref.referral}</li>}
                </ul>
              </div>
            )}
          </div>
          {j.treatment.comparison && <p className="mt-3 text-sm text-muted-foreground">{j.treatment.comparison}</p>}
          {j.treatment.suggestedPlan.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700">Suggested plan</div>
              <ul className="list-disc space-y-1 pl-5 text-sm">{j.treatment.suggestedPlan.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {j.treatment.missingElements.length > 0 && (
            <p className="mt-3 text-sm"><span className="font-medium">Missing: </span><span className="text-muted-foreground">{j.treatment.missingElements.join('; ')}</span></p>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        {/* Peers */}
        <Card title="How your peers approached this case" icon={Users} testId="peers">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Diagnoses given ({stats.attempts} peers)</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peerDx} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => [`${v} peers`, '']} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive>
                      {peerDx.map((d) => <Cell key={d.name} fill={d.mine ? '#0d9488' : '#cbd5e1'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="h-2 w-2 rounded-sm bg-teal-600" /> also your diagnosis</div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Score distribution · your score {j.total}</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={buckets} margin={{ left: -24, right: 8 }}>
                    <XAxis dataKey="band" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => [`${v} peers`, '']} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {buckets.map((b) => <Cell key={b.band} fill={b.mine ? '#0d9488' : '#cbd5e1'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {stats.missed.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Most commonly missed on this case: <b>{stats.missed[0].name}</b>, by {stats.missed[0].count} of {stats.attempts} peers.
            </p>
          )}
        </Card>

        {/* Teaching points + red flags */}
        <div className="space-y-5">
          {j.redFlags.length > 0 && (
            <Card title="Red flags to safety-net" icon={ShieldAlert} className="border-red-200">
              <ul className="space-y-1.5 text-sm">{j.redFlags.map((r, i) => <li key={i} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600" />{r}</li>)}</ul>
            </Card>
          )}
          <Card title="Teaching points" icon={BookOpen} testId="teaching">
            <ol className="space-y-2">
              {j.teachingPoints.map((t, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-800">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
