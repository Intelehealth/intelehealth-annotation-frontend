'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Brain, Check, ChevronRight, ClipboardList, Lock, Loader2, Pill, Plus, Send, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  trainingAPI,
  type Catalog,
  type StageImpression,
  type TraineeDiagnosis,
  type TraineeMedicine,
  type TraineeTreatment,
  type TrainingCase,
} from '@/lib/api/training';
import { Autocomplete, CaseFile, Chip, DX_COLORS } from '@/components/training/ui';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'At bedtime', 'As needed (SOS)', 'Once'];

const JUDGE_STEPS = [
  'Reading the clinical note',
  'Checking your diagnoses against the findings',
  'Looking for anything you may have missed',
  'Reviewing doses and treatment safety',
  'Writing your personalised feedback',
];

const emptyMed = (): TraineeMedicine => ({ drug: '', dose: '', frequency: 'Once daily', duration: '' });

export default function CasePlayer() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [c, setCase] = useState<TrainingCase | null>(null);
  const [catalog, setCatalog] = useState<Catalog>({ diagnoses: [], medicines: [], advice: [], tests: [] });
  const [error, setError] = useState<string | null>(null);

  // stage-by-stage reveal
  const [revealed, setRevealed] = useState(1);
  const [assessing, setAssessing] = useState(false);
  const [working, setWorking] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(50);
  const [impressions, setImpressions] = useState<StageImpression[]>([]);

  // final assessment
  const [diagnoses, setDiagnoses] = useState<TraineeDiagnosis[]>([]);
  const [activeDx, setActiveDx] = useState(0);
  const [treatment, setTreatment] = useState<TraineeTreatment>({ medicines: [emptyMed()], investigations: [], advice: [], referral: '', safetyNet: '' });

  const [submitting, setSubmitting] = useState(false);
  const [judgeStep, setJudgeStep] = useState(0);
  const started = useRef(Date.now());
  const caseTop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trainingAPI.getCase(slug).then(setCase).catch((e) => setError(e?.response?.data?.message ?? 'Case not found'));
    trainingAPI.catalog().then(setCatalog).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!submitting) return;
    const t = setInterval(() => setJudgeStep((s) => Math.min(s + 1, JUDGE_STEPS.length - 1)), 2800);
    return () => clearInterval(t);
  }, [submitting]);

  const pinned = useMemo(() => {
    const m = new Map<string, number[]>();
    diagnoses.forEach((d, i) => d.evidence.forEach((e) => m.set(e, [...(m.get(e) ?? []), i])));
    return m;
  }, [diagnoses]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!c) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  const stage = c.stages[revealed - 1];
  const lastStage = revealed === c.stages.length;

  const commitImpression = () => {
    const imp = { stage: stage.key, diagnoses: working, confidence };
    const next = [...impressions.filter((i) => i.stage !== stage.key), imp];
    setImpressions(next);
    if (lastStage) {
      setDiagnoses(working.map((name, i) => ({ name, role: i === 0 ? 'primary' : 'secondary', confidence, reasoning: '', evidence: [] })));
      setActiveDx(0);
      setAssessing(true);
    } else {
      setRevealed(revealed + 1);
      setTimeout(() => document.querySelector(`[data-testid="stage-${c.stages[revealed].key}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  };

  const updateDx = (i: number, patch: Partial<TraineeDiagnosis>) =>
    setDiagnoses((ds) => ds.map((d, k) => (k === i ? { ...d, ...patch } : d)));

  const togglePin = (item: string) => {
    if (!assessing || !diagnoses[activeDx]) return;
    const ev = diagnoses[activeDx].evidence;
    updateDx(activeDx, { evidence: ev.includes(item) ? ev.filter((e) => e !== item) : [...ev, item] });
  };

  const updateMed = (i: number, patch: Partial<TraineeMedicine>) =>
    setTreatment((t) => ({ ...t, medicines: t.medicines.map((m, k) => (k === i ? { ...m, ...patch } : m)) }));

  const submit = async () => {
    setSubmitting(true);
    setJudgeStep(0);
    try {
      const res = await trainingAPI.submit(c.slug, {
        stageImpressions: impressions,
        diagnoses,
        treatment: { ...treatment, medicines: treatment.medicines.filter((m) => m.drug.trim()) },
        timeSpentSec: Math.round((Date.now() - started.current) / 1000),
      });
      router.push(`/training/attempts/${res.id}`);
    } catch (e: any) {
      setSubmitting(false);
      setError(e?.response?.data?.message ?? e?.message ?? 'Submission failed');
    }
  };

  const steps = [...c.stages.map((s) => s.title), 'Your assessment'];
  const currentStep = assessing ? c.stages.length : revealed - 1;

  return (
    <div className="space-y-5" ref={caseTop}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/training" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Case library</Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{c.title}</h1>
          <p className="text-xs text-muted-foreground">{c.specialty} · {c.difficulty} · {c.source}</p>
        </div>
      </div>

      {/* stage stepper */}
      <ol className="flex flex-wrap items-center gap-1.5" data-testid="stepper">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              i < currentStep && 'border-teal-200 bg-teal-50 text-teal-800',
              i === currentStep && 'border-teal-600 bg-teal-600 text-white shadow-sm',
              i > currentStep && 'text-muted-foreground',
            )}>
              {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i > currentStep ? <Lock className="h-3 w-3" /> : null}
              {s}
            </span>
            {i < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* LEFT: the case file */}
        <div className="space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
          {assessing && (
            <div className={cn('rounded-lg border px-3 py-2 text-xs', DX_COLORS[activeDx % DX_COLORS.length].soft, 'ring-1')}>
              Pinning evidence for <b>{diagnoses[activeDx]?.name}</b>. Click findings in the note to link them.
            </div>
          )}
          <CaseFile stages={c.stages} revealed={assessing ? c.stages.length : revealed} pinned={pinned} onPick={assessing ? togglePin : undefined} />
          {!assessing && !lastStage && (
            <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              <Lock className="mx-auto mb-1 h-4 w-4" />
              {c.stages.slice(revealed).map((s) => s.title).join(' · ')} locked. Commit your working impression to reveal the next stage.
            </div>
          )}
        </div>

        {/* RIGHT: the trainee's work */}
        {!assessing ? (
          <div className="space-y-4">
            <section className="rounded-xl border bg-card p-5 shadow-sm" data-testid="impression-panel">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-teal-700"><Brain className="h-4 w-4" /> Working impression</div>
              <h2 className="mt-1 text-lg font-semibold">After the {stage.title.toLowerCase()}, what are you thinking?</h2>
              <p className="mt-1 text-sm text-muted-foreground">List your differentials, most likely first. You will revise them as more of the case is revealed.</p>
              <Autocomplete testId="impression-input" className="mt-4" options={catalog.diagnoses} placeholder="Type a diagnosis, e.g. Upper Respiratory Tract Infection" onPick={(v) => setWorking((w) => (w.includes(v) ? w : [...w, v]))} />
              <div className="mt-3 flex min-h-8 flex-wrap gap-2">
                {working.length === 0 && <span className="text-xs text-muted-foreground">No differentials yet</span>}
                {working.map((w, i) => (
                  <Chip key={w} onRemove={() => setWorking(working.filter((x) => x !== w))} className={i === 0 ? 'border-teal-300 bg-teal-50 font-medium text-teal-900' : ''}>
                    {i === 0 && <span className="text-[10px] uppercase text-teal-600">lead</span>} {w}
                  </Chip>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs"><span className="font-medium">How confident are you in the lead diagnosis?</span><span className="tabular-nums text-muted-foreground">{confidence}%</span></div>
                <input type="range" min={0} max={100} step={5} value={confidence} onChange={(e) => setConfidence(+e.target.value)} className="mt-2 w-full accent-teal-600" data-testid="confidence" />
              </div>
              <button
                type="button"
                disabled={!working.length}
                onClick={commitImpression}
                data-testid="commit-impression"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
              >
                {lastStage ? 'Commit and write my assessment' : `Commit and reveal ${c.stages[revealed].title.toLowerCase()}`} <ChevronRight className="h-4 w-4" />
              </button>
            </section>

            {impressions.length > 0 && (
              <section className="rounded-xl border bg-card p-5">
                <h3 className="text-sm font-semibold">Your reasoning trail</h3>
                <ol className="mt-3 space-y-3 border-l pl-4">
                  {impressions.map((imp) => (
                    <li key={imp.stage} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-teal-500" />
                      <div className="text-xs text-muted-foreground">{c.stages.find((s) => s.key === imp.stage)?.title} · {imp.confidence}% confident</div>
                      <div className="text-sm">{imp.diagnoses.join(', ')}</div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Diagnoses */}
            <section className="rounded-xl border bg-card p-5 shadow-sm" data-testid="dx-panel">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-teal-700"><ClipboardList className="h-4 w-4" /> Diagnosis</div>
              <p className="mt-1 text-sm text-muted-foreground">Add every diagnosis this patient needs addressed. Select one, explain why, and click the findings in the note that support it.</p>
              <div className="mt-4 space-y-3">
                {diagnoses.map((d, i) => {
                  const col = DX_COLORS[i % DX_COLORS.length];
                  return (
                    <div
                      key={i}
                      onClick={() => setActiveDx(i)}
                      data-testid={`dx-card-${i}`}
                      className={cn('cursor-pointer rounded-lg border p-3 transition-shadow', i === activeDx ? `ring-2 ${col.border} ring-offset-1 ${col.border.replace('border', 'ring')}` : 'hover:shadow-sm')}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', col.dot)} />
                        <span className="flex-1 truncate font-medium">{d.name}</span>
                        <div className="flex overflow-hidden rounded-md border text-[11px]">
                          {(['primary', 'secondary'] as const).map((r) => (
                            <button key={r} type="button" onClick={(e) => { e.stopPropagation(); updateDx(i, { role: r }); }} className={cn('px-2 py-0.5 capitalize', d.role === r ? 'bg-foreground text-background' : 'hover:bg-muted')}>{r}</button>
                          ))}
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setDiagnoses(diagnoses.filter((_, k) => k !== i)); setActiveDx(0); }} className="text-muted-foreground hover:text-destructive" aria-label="Remove diagnosis"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        Confidence
                        <input type="range" min={0} max={100} step={5} value={d.confidence} onChange={(e) => updateDx(i, { confidence: +e.target.value })} onClick={(e) => e.stopPropagation()} className="flex-1 accent-teal-600" />
                        <span className="w-9 text-right tabular-nums">{d.confidence}%</span>
                      </div>
                      <textarea
                        value={d.reasoning}
                        onChange={(e) => updateDx(i, { reasoning: e.target.value })}
                        onFocus={() => setActiveDx(i)}
                        data-testid={`dx-reasoning-${i}`}
                        placeholder="Why this diagnosis? What makes it more likely than the alternatives?"
                        rows={2}
                        className="mt-2 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.evidence.length === 0 ? (
                          <span className="text-xs text-muted-foreground">{i === activeDx ? 'Click findings in the note to pin evidence →' : 'No evidence pinned'}</span>
                        ) : d.evidence.map((ev) => (
                          <Chip key={ev} className={cn('ring-1', col.soft)} onRemove={() => updateDx(i, { evidence: d.evidence.filter((x) => x !== ev) })}>{ev.length > 48 ? `${ev.slice(0, 46)}…` : ev}</Chip>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Autocomplete
                testId="dx-add"
                className="mt-3"
                options={catalog.diagnoses}
                placeholder="+ Add another diagnosis"
                onPick={(v) => { setDiagnoses((ds) => [...ds, { name: v, role: 'secondary', confidence: 50, reasoning: '', evidence: [] }]); setActiveDx(diagnoses.length); }}
              />
            </section>

            {/* Treatment */}
            <section className="rounded-xl border bg-card p-5 shadow-sm" data-testid="tx-panel">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-teal-700"><Pill className="h-4 w-4" /> Treatment plan</div>
              <div className="mt-3 space-y-2">
                <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto] gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
                  <span>Medicine</span><span>Dose</span><span>Frequency</span><span>Duration</span><span />
                </div>
                {treatment.medicines.map((m, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto]" data-testid={`med-row-${i}`}>
                    {m.drug ? (
                      <div className="col-span-2 flex h-9 items-center gap-2 truncate rounded-md border bg-muted/40 px-3 text-sm md:col-span-1">
                        <span className="truncate">{m.drug}</span>
                        <button type="button" onClick={() => updateMed(i, { drug: '' })} className="ml-auto text-muted-foreground hover:text-foreground">×</button>
                      </div>
                    ) : (
                      <Autocomplete testId={`med-drug-${i}`} className="col-span-2 md:col-span-1" options={catalog.medicines} placeholder="Search formulary" onPick={(v) => updateMed(i, { drug: v })} />
                    )}
                    <input value={m.dose} onChange={(e) => updateMed(i, { dose: e.target.value })} placeholder="e.g. 2.5 ml" data-testid={`med-dose-${i}`} className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/40" />
                    <select value={m.frequency} onChange={(e) => updateMed(i, { frequency: e.target.value })} data-testid={`med-freq-${i}`} className="h-9 rounded-md border bg-background px-2 text-sm">
                      {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                    </select>
                    <input value={m.duration} onChange={(e) => updateMed(i, { duration: e.target.value })} placeholder="e.g. 5 days" data-testid={`med-dur-${i}`} className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/40" />
                    <button type="button" onClick={() => setTreatment((t) => ({ ...t, medicines: t.medicines.filter((_, k) => k !== i) }))} className="flex h-9 items-center justify-center px-1 text-muted-foreground hover:text-destructive" aria-label="Remove medicine"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setTreatment((t) => ({ ...t, medicines: [...t.medicines, emptyMed()] }))} data-testid="med-add" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"><Plus className="h-4 w-4" /> Add medicine</button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium">Investigations</label>
                  <Autocomplete testId="tests-input" className="mt-1" options={catalog.tests} placeholder="e.g. CBC" onPick={(v) => setTreatment((t) => ({ ...t, investigations: [...new Set([...t.investigations, v])] }))} />
                  <div className="mt-2 flex flex-wrap gap-1.5">{treatment.investigations.map((x) => <Chip key={x} onRemove={() => setTreatment((t) => ({ ...t, investigations: t.investigations.filter((y) => y !== x) }))}>{x}</Chip>)}</div>
                </div>
                <div>
                  <label className="text-xs font-medium">Advice to patient</label>
                  <Autocomplete testId="advice-input" className="mt-1" options={catalog.advice} placeholder="e.g. Steam inhalation" onPick={(v) => setTreatment((t) => ({ ...t, advice: [...new Set([...t.advice, v])] }))} />
                  <div className="mt-2 flex flex-wrap gap-1.5">{treatment.advice.map((x) => <Chip key={x} onRemove={() => setTreatment((t) => ({ ...t, advice: t.advice.filter((y) => y !== x) }))}>{x}</Chip>)}</div>
                </div>
                <div>
                  <label className="text-xs font-medium">Referral</label>
                  <input value={treatment.referral} onChange={(e) => setTreatment((t) => ({ ...t, referral: e.target.value }))} data-testid="referral" placeholder="None, or where and why" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40" />
                </div>
                <div>
                  <label className="inline-flex items-center gap-1 text-xs font-medium"><ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Safety-netting</label>
                  <input value={treatment.safetyNet} onChange={(e) => setTreatment((t) => ({ ...t, safetyNet: e.target.value }))} data-testid="safety-net" placeholder="When should they come back urgently?" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40" />
                </div>
              </div>
            </section>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="button"
              disabled={!diagnoses.length || submitting}
              onClick={submit}
              data-testid="submit-attempt"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-40"
            >
              <Send className="h-4 w-4" /> Submit for AI tutor review
            </button>
          </div>
        )}
      </div>

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" data-testid="judging">
          <div className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white"><Sparkles className="h-5 w-5" /></span>
              <div>
                <div className="font-semibold">Your AI clinical tutor is reviewing</div>
                <div className="text-xs text-muted-foreground">Diagnosis · reasoning · treatment · safety</div>
              </div>
            </div>
            <ol className="mt-5 space-y-2.5">
              {JUDGE_STEPS.map((s, i) => (
                <li key={s} className={cn('flex items-center gap-2.5 text-sm transition-opacity', i > judgeStep && 'opacity-35')}>
                  {i < judgeStep ? <Check className="h-4 w-4 text-emerald-600" /> : i === judgeStep ? <Loader2 className="h-4 w-4 animate-spin text-teal-600" /> : <span className="h-4 w-4 rounded-full border" />}
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
