'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/dashboard/kpi';
import { fmtDate, HighlightChip, Shell, StatusBadge, TypeBadge } from '@/components/mismatch/shared';
import { VisitImages } from '@/components/mismatch/visit-images';
import { missingForDone, type MissingField } from '@/lib/review-rules';
import { apiMessage } from '@/lib/api/workspaces';
import {
  DDX_REASONS, DDX_VERDICTS, doctorLabel, EQUIV_REASON_LABEL, EQUIV_REASONS, mismatchAPI, parseView, RULE_LABEL, SOURCE_LABEL, TTX_REASONS, TTX_VERDICTS,
  type AiMedication, type ReviewInput, type VisitDetail,
} from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const DX_TAG: Record<string, [string, string]> = {
  Y: ['Selected', 'bg-emerald-100 text-emerald-800'],
  T: ['Picked (typed)', 'bg-emerald-100 text-emerald-800'],
  I: ['Not selected', 'bg-gray-100 text-gray-600'],
  N: ["Doctor's own", 'bg-sky-100 text-sky-800'],
};
const MED_TAG: Record<string, [string, string]> = {
  Y: ['Accepted exactly', 'bg-emerald-100 text-emerald-800'],
  M: ['Dose changed', 'bg-amber-100 text-amber-900'],
  I: ['Not used', 'bg-gray-100 text-gray-600'],
  N: ['Doctor added', 'bg-sky-100 text-sky-800'],
};

const Tag = ({ t, map }: { t?: string | null; map: Record<string, [string, string]> }) => {
  const [label, cls] = map[t ?? ''] ?? ['—', 'bg-gray-50 text-gray-500'];
  return <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', cls)}>{label}</span>;
};

export default function MismatchVisitPage() {
  const { id, uuid } = useParams<{ id: string; uuid: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [v, setV] = useState<VisitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ReviewInput>({});
  const [saving, setSaving] = useState(false);
  const claimed = useRef(false);
  const langKey = `mismatch-note-lang-${user?._id ?? 'anon'}`;
  const [langPick, setLangPick] = useState<'en' | 'mr' | null>(null);
  const lang: 'en' | 'mr' = langPick ?? (() => { try { return localStorage.getItem(langKey) === 'mr' ? 'mr' : 'en'; } catch { return 'en'; } })();
  const setLang = (l: 'en' | 'mr') => { setLangPick(l); try { localStorage.setItem(langKey, l); } catch { /* storage unavailable */ } };
  // First interaction with the form claims the visit (30-min expiry on the server); a save claims it too.
  const update = (patch: Partial<ReviewInput>) => {
    if (!claimed.current) {
      claimed.current = true;
      mismatchAPI.claim(id, uuid).catch(() => { claimed.current = false; });
    }
    setForm((f) => ({ ...f, ...patch }));
  };
  const [saved, setSaved] = useState(false);
  // The queue view this visit was opened from (?view=); "Save & next" stays inside it (ticket V3).
  const viewQs = useSearchParams().get('view') ?? 'tab=todo';
  const [pos, setPos] = useState<{ uuid: string; index: number; total: number } | null>(null);

  useEffect(() => {
    let live = true;
    mismatchAPI.position(id, uuid, parseView(viewQs))
      .then((p) => live && setPos({ uuid, index: p.index, total: p.total }))
      .catch(() => undefined);
    return () => { live = false; };
  }, [id, uuid, viewQs]);

  useEffect(() => {
    let live = true;
    setV(null); setSaved(false);
    claimed.current = false;
    // Opening a visit does not claim it; the first edit does (ticket A1).
    mismatchAPI.visit(id, uuid)
      .then((d) => {
        if (!live) return;
        setV(d);
        const r = d.review ?? {};
        setForm({
          ddxVerdict: r.ddxVerdict, ddxReason: r.ddxReason, correctDiagnosis: r.correctDiagnosis,
          ttxVerdict: r.ttxVerdict, ttxReason: r.ttxReason, correctTreatment: r.correctTreatment,
          comment: r.comment, followUp: r.followUp, equivReason: r.equivReason, equivReasonText: r.equivReasonText,
        });
      })
      .catch((e) => live && setError(apiMessage(e, 'Could not load this visit')));
    return () => { live = false; };
  }, [id, uuid]);

  const save = async (next: boolean) => {
    setSaving(true);
    try {
      await mismatchAPI.saveReview(id, uuid, { ...form, final: next });
      setSaved(true);
      if (!next) setV(await mismatchAPI.visit(id, uuid)); // refresh status and edit history
      if (next) {
        const here = pos?.uuid === uuid && pos.index >= 0 ? pos.index : undefined;
        const p = await mismatchAPI.position(id, uuid, parseView(viewQs), here);
        router.push(p.next ? `/workspaces/${id}/mismatch/${p.next}?view=${encodeURIComponent(viewQs)}` : `/workspaces/${id}/mismatch?finished=1`);
      }
    } catch (e) { setError(apiMessage(e, 'Could not save')); }
    finally { setSaving(false); }
  };

  if (error && !v) return <Shell wide><p className="text-sm text-destructive">{error}</p></Shell>;
  if (!v) return <Shell wide><div className="h-96 animate-pulse rounded-lg bg-muted" /></Shell>;

  const a = v.analysis;
  const top5 = a.ddxRanked ?? [];
  const inTop5 = new Set(top5.map((d) => d.diagnosis.toLowerCase()));
  const otherAi = (v.ddx?.diagnoses ?? []).filter((d) => d.aiAssisted === 'I' && !inTop5.has(String(d.diagnosis).toLowerCase()));
  const doctorMed = (m: AiMedication) => a.doctorMedications.find((d) => d.name.toLowerCase() === String(m.medication).toLowerCase());
  const claimedByOther = v.review.claimedBy && v.review.claimedBy._id !== user?._id && v.review.status !== 'done' && v.review.claimedAt
    && Date.now() - new Date(v.review.claimedAt).getTime() < 30 * 60_000 ? v.review.claimedBy : null;
  const showDdx = a.ddxMismatch || a.doctorAddedDx.length > 0;
  const dxRationale = (name: string) => (v.ddx?.diagnoses ?? []).find((x) => String(x.diagnosis).toLowerCase() === name.toLowerCase())?.rationale;
  const showTtx = a.ttxAvailable;
  // Notes come in English and Marathi; English by default, the choice is remembered per user (ticket V4).
  const hasMr = Object.values(v.notesMr ?? {}).some(Boolean);
  const note = lang === 'mr' && hasMr ? { ...v.notes, ...Object.fromEntries(Object.entries(v.notesMr ?? {}).filter(([, t]) => t)) } : v.notes;
  const missing = missingForDone(a, form);
  const eq = a.equivalentNotPicked ?? null;
  const vit = v.vitals ?? {};
  const age = v.demographics?.age;
  const vitals: [string, unknown, string][] = [
    // Age and sex first, so the doctor sees them next to the readings.
    ['Age', age == null ? null : age < 1 ? '< 1' : age, age == null ? '' : 'yrs'],
    ['Sex', v.demographics?.gender === 'F' ? 'Female' : v.demographics?.gender === 'M' ? 'Male' : v.demographics?.gender, ''],
    ['BP', vit.sbp && vit.dbp ? `${vit.sbp}/${vit.dbp}` : null, 'mmHg'], ['Pulse', vit.pulse, '/min'], ['Temp', vit.temperature, Number(vit.temperature) > 45 ? '°F' : '°C'],
    ['SpO₂', vit.spo2, '%'], ['RR', vit.rr, '/min'], ['Weight', vit.weight, 'kg'], ['Height', vit.height, 'cm'], ['BMI', vit.bmi, ''],
    ['Hb', vit.hb, ''], ['Sugar (R)', vit.sugarRandom, ''],
  ];

  return (
    <Shell wide>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push(`/workspaces/${id}/mismatch`)}><ArrowLeft className="mr-1 h-4 w-4" /> Queue</Button>
        <TypeBadge type={v.mismatchType} />
        <StatusBadge status={v.review.status} />
        {v.review.annotatedBy && <span className="text-xs text-muted-foreground">by {v.review.annotatedBy.name}</span>}
        {pos?.uuid === uuid && pos.index >= 0 && <span className="text-xs font-medium text-slate-700">{(pos.index + 1).toLocaleString()} of {pos.total.toLocaleString()} in this view</span>}
        <span className="ml-auto text-xs text-muted-foreground">Visit {v.visitPseudoId ?? v.visitId ?? ''} · {v.uuid}</span>
      </div>

      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          {[v.demographics?.gender === 'F' ? 'Female' : v.demographics?.gender === 'M' ? 'Male' : v.demographics?.gender, v.demographics?.age != null ? `${v.demographics.age} years` : null].filter(Boolean).join(', ')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {SOURCE_LABEL[v.source] ?? v.source} · {v.attributes?.specialty ?? '—'} · prescription shared {fmtDate(v.encounterAt)}
          {v.providers?.doctorPseudoIds?.length ? <> · {v.providers.doctorPseudoIds.map(doctorLabel).join(', ')}</> : null}
          {v.providers?.creatorPseudoId ? <> · health worker #{v.providers.creatorPseudoId}</> : null}
          {v.langfuse?.model && <> · AI: {v.langfuse.model}{v.langfuse.engine ? ` (${v.langfuse.engine})` : ''}{typeof v.langfuse.latency === 'number' ? `, ${v.langfuse.latency.toFixed(1)} s` : ''}{v.langfuse.totalTokens ? `, ${v.langfuse.totalTokens.toLocaleString()} tokens` : ''}</>}
        </p>
        <VisitTiming v={v} />
      </header>

      {(a.ddxRejectReason || a.ttxRejectReason) && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <strong>The doctor rejected the AI and said why:</strong>{' '}
          {[a.ddxRejectReason && `diagnosis marked “${a.ddxRejectReason.replace(/_/g, ' ')}”${surface(v.ddx?.aiSurface)}`, a.ttxRejectReason && `treatment marked “${a.ttxRejectReason.replace(/_/g, ' ')}”${surface(v.ttx?.aiSurface)}`].filter(Boolean).join('; ')}.
          {detailText(v.ddx?.details) && <div className="mt-1 whitespace-pre-wrap"><strong>Doctor&apos;s note:</strong> {detailText(v.ddx?.details)}</div>}
        </div>
      )}

      {a.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">{a.highlights.map((h, i) => <HighlightChip key={i} h={h} full />)}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-6">
          <Section title="Vitals">
            <dl className="grid grid-cols-3 gap-x-4 gap-y-2 px-4 py-4 text-sm sm:grid-cols-5">
              {vitals.filter(([, val]) => val !== null && val !== undefined && val !== '').map(([k, val, unit]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium tabular-nums">{String(val)}<span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span></dd></div>
              ))}
            </dl>
          </Section>
          <Section title="Clinical note">
            <div className="space-y-4 px-4 py-4 text-sm">
              {hasMr && (
                <div className="flex items-center gap-1 text-xs" role="group" aria-label="Note language">
                  {(['en', 'mr'] as const).map((l) => (
                    <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
                      className={cn('rounded-md border px-2 py-0.5', lang === l ? 'border-slate-900 bg-slate-900 text-white' : 'text-slate-600 hover:bg-accent')}>
                      {l === 'en' ? 'English' : 'मराठी (Marathi)'}
                    </button>
                  ))}
                </div>
              )}
              <Note label="Chief complaint" text={note.chiefComplaint} />
              <Note label="Physical examination" text={note.physicalExamination} />
              <Note label="Medical history" text={note.patientMedicalHistory} />
              <Note label="Family history" text={note.familyHistory} />
            </div>
          </Section>
          {v.images.length > 0 && (
            <Section title="Images" description={`${v.images.length} from OpenMRS · click to enlarge`}>
              <VisitImages workspaceId={id} uuid={v.uuid} count={v.images.length} />
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <Section title="Diagnosis: AI vs doctor" description={a.followUpOnly ? 'Follow-up visit: not scored' : a.ddxMismatch ? 'The doctor picked none of the AI top 5' : a.ddxBestRank ? `The doctor picked the AI's #${a.ddxBestRank}${a.ddxPickedBy === 'name' ? ' (typed the same name)' : ''}` : 'No AI diagnosis for this visit'}>
            {eq && (
              <div className="mx-4 mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                AI suggested the equivalent &lsquo;{eq.aiName}&rsquo; at #{eq.aiRank}; the doctor entered &lsquo;{eq.doctorName}&rsquo;.
                <span className="ml-1 text-xs text-amber-800">Matched by: {RULE_LABEL[eq.rule] ?? eq.rule}. Not counted as a pick.</span>
              </div>
            )}
            <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">AI top 5</div>
                <ol className="space-y-1.5 text-sm">
                  {top5.map((d) => (
                    <li key={`${d.rank}-${d.diagnosis}`} className={cn('rounded-md border px-2 py-1.5', d.picked && 'border-emerald-300 bg-emerald-50')}>
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-xs text-muted-foreground">#{d.rank}</span>
                        <span className="flex-1 capitalize">{d.diagnosis}</span>
                        {d.likelihood && <span className="text-xs text-muted-foreground">{d.likelihood}</span>}
                        <Tag t={d.picked === 'clicked' ? 'Y' : d.picked === 'name' ? 'T' : 'I'} map={DX_TAG} />
                      </div>
                      <Why r={dxRationale(d.diagnosis)} />
                    </li>
                  ))}
                </ol>
                {otherAi.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Also suggested: {otherAi.map((d) => d.diagnosis).join(', ')}</p>}
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Doctor's final diagnosis</div>
                <ul className="space-y-1.5 text-sm">
                  {a.doctorDiagnoses.map((d, i) => {
                    const fromAi = top5.some((x) => x.picked && x.diagnosis.toLowerCase().replace(/\(.*?\)/g, '').trim() === d.name.toLowerCase().replace(/\(.*?\)/g, '').trim());
                    return (
                      <li key={i} className={cn('rounded-md border px-2 py-1.5', fromAi ? 'border-emerald-300 bg-emerald-50' : 'border-sky-300 bg-sky-50')}>
                        <div className="font-medium capitalize">{d.name}</div>
                        <div className="text-xs text-muted-foreground">{[d.role, d.status, d.code && d.code !== 'NA' ? `SNOMED ${d.code}` : null, fromAi ? 'from AI list' : "doctor's own"].filter(Boolean).join(' · ')}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            {(v.ddx?.conclusion || (v.ddx?.furtherQuestions?.length ?? 0) > 0) && (
              <div className="space-y-3 border-t px-4 py-3 text-sm">
                {v.ddx?.conclusion && (
                  <div><div className="text-xs font-medium text-muted-foreground">AI conclusion</div><p className="mt-0.5 text-gray-700">{v.ddx.conclusion}</p></div>
                )}
                {(v.ddx?.furtherQuestions?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Questions the AI suggested asking</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-gray-700">{v.ddx!.furtherQuestions!.map((q, i) => <li key={i}>{q}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section title="Treatment: AI vs doctor" description={showTtx ? `${a.ttxExact} exact · ${a.ttxModified} dose changed · ${a.ttxIgnored} not used · ${a.ttxAdded} added by doctor` : 'No AI treatment for this visit'}>
            {showTtx ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr><th className="px-4 py-2 font-medium">Medicine</th><th className="px-4 py-2 font-medium">AI suggested</th><th className="px-4 py-2 font-medium">Doctor prescribed</th><th className="px-4 py-2 font-medium">Outcome</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {(v.ttx?.medications ?? []).map((m, i) => {
                      const d = doctorMed(m);
                      return (
                        <tr key={i} className={cn('align-top', m.aiAssisted === 'M' && 'bg-amber-50/50', m.aiAssisted === 'N' && 'bg-sky-50/50')}>
                          <td className="px-4 py-2 font-medium">{m.medication}<Why r={m.rationale} /></td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{m.aiAssisted === 'N' ? '—' : [m.dosage, m.frequency, m.duration ? `${m.duration} ${m.durationUnits ?? ''}` : null].filter(Boolean).join(' · ') || '—'}</td>
                          <td className="px-4 py-2 text-xs">{d ? [d.dose, d.frequency, d.duration ? `${d.duration} ${d.unit}` : null, d.instructions].filter(Boolean).join(' · ') : m.aiAssisted === 'I' ? <span className="text-muted-foreground">not prescribed</span> : '—'}</td>
                          <td className="px-4 py-2"><Tag t={m.aiAssisted} map={MED_TAG} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-muted-foreground">{v.visitNote?.medications ? `Doctor prescribed: ${a.doctorMedications.map((m) => m.name).join(', ')}` : 'No medicines recorded.'}</div>
            )}
            {v.ttx?.planRationale && (
              <details className="border-t px-4 py-3 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">AI reasoning for the whole treatment plan</summary>
                <p className="mt-2 whitespace-pre-wrap text-gray-700">{v.ttx.planRationale}</p>
              </details>
            )}
            {(v.visitNote?.medicalTest || v.visitNote?.medicalAdvice || v.visitNote?.referralAdvice) && (
              <dl className="space-y-1 border-t px-4 py-3 text-xs">
                {v.visitNote?.medicalTest && <div><dt className="inline font-medium">Tests: </dt><dd className="inline text-muted-foreground">{v.visitNote.medicalTest}</dd></div>}
                {v.visitNote?.medicalAdvice && <div><dt className="inline font-medium">Advice: </dt><dd className="inline text-muted-foreground">{v.visitNote.medicalAdvice}</dd></div>}
                {v.visitNote?.referralAdvice && <div><dt className="inline font-medium">Referral: </dt><dd className="inline text-muted-foreground">{v.visitNote.referralAdvice}</dd></div>}
              </dl>
            )}
          </Section>

          <Section title="Your annotation" description={claimedByOther ? `${claimedByOther.name} opened this visit recently; you can still annotate.` : 'Record who was right and why.'}>
            <form className="space-y-5 px-4 py-4" onSubmit={(e) => { e.preventDefault(); save(true); }}>
              {showDdx && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Diagnosis</legend>
                  <Choices name="ddxVerdict" options={DDX_VERDICTS} value={form.ddxVerdict} onChange={(x) => update({ ddxVerdict: x })} />
                  <Select label="Main reason" options={DDX_REASONS} value={form.ddxReason} onChange={(x) => update({ ddxReason: x })} />
                  <TextInput label="Correct diagnosis (if different)" value={form.correctDiagnosis} onChange={(x) => update({ correctDiagnosis: x })} />
                </fieldset>
              )}
              {eq && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Why didn&apos;t the doctor pick the AI&apos;s equivalent suggestion?</legend>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Reason">
                    {EQUIV_REASONS.map((o) => (
                      <button key={o.value} type="button" role="radio" aria-checked={form.equivReason === o.value} onClick={() => update({ equivReason: form.equivReason === o.value ? undefined : o.value })}
                        className={cn('rounded-full border px-2.5 py-1 text-xs', form.equivReason === o.value ? 'border-slate-900 bg-slate-900 text-white' : 'hover:bg-accent')}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <TextInput label={form.equivReason === 'other' ? 'Describe the reason' : 'Notes (optional)'} value={form.equivReasonText} onChange={(x) => update({ equivReasonText: x })} />
                </fieldset>
              )}
              {showTtx && a.ttxMismatch && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Treatment</legend>
                  <Choices name="ttxVerdict" options={TTX_VERDICTS} value={form.ttxVerdict} onChange={(x) => update({ ttxVerdict: x })} />
                  <Select label="Main reason" options={TTX_REASONS} value={form.ttxReason} onChange={(x) => update({ ttxReason: x })} />
                  <TextInput label="Correct treatment (if different)" value={form.correctTreatment} onChange={(x) => update({ correctTreatment: x })} />
                </fieldset>
              )}
              <label className="block text-sm">
                <span className="text-xs font-medium text-muted-foreground">Comment</span>
                <textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" rows={3} value={form.comment ?? ''} onChange={(e) => update({ comment: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.followUp} onChange={(e) => update({ followUp: e.target.checked })} />
                Flag for clinical team follow-up
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex items-center justify-end gap-2">
                {saved && <span className="mr-auto inline-flex items-center text-sm text-emerald-700"><Check className="mr-1 h-4 w-4" /> Saved</span>}
                <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>Save</Button>
                <Button type="submit" size="sm" disabled={saving || missing.length > 0} title={missing.length ? 'Fill the required fields first' : undefined}>Save &amp; next</Button>
              </div>
              {missing.length > 0 && (
                <p className="text-right text-xs text-amber-700">To finish this visit, add: {missing.map((m) => MISSING_LABEL[m]).join(', ')}. &quot;Save&quot; keeps a draft.</p>
              )}
            </form>
          </Section>

          {!!v.review.history?.length && (
            <Section title="Edit history" description="Every save is kept, newest first">
              <ol className="divide-y text-sm">
                {v.review.history.map((h, i) => (
                  <li key={i} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{h.by?.name ?? 'Unknown'} <span className="font-normal text-muted-foreground">{h.action === 'edited' ? 'edited' : h.action === 'draft' ? 'saved a draft' : 'annotated'}</span></span>
                      <span className="text-xs text-muted-foreground">{fmtDate(h.at)}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {[VERDICT[h.ddxVerdict ?? ''] && `Diagnosis: ${VERDICT[h.ddxVerdict ?? '']}`, VERDICT[h.ttxVerdict ?? ''] && `Treatment: ${VERDICT[h.ttxVerdict ?? '']}`, h.correctDiagnosis && `Correct Dx: ${h.correctDiagnosis}`, h.comment && `“${h.comment}”`, h.followUp && 'Flagged for follow-up', h.equivReason && `Equivalent not picked: ${EQUIV_REASON_LABEL[h.equivReason] ?? h.equivReason}`].filter(Boolean).join(' · ') || 'No fields filled'}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>
      </div>
    </Shell>
  );
}

const MISSING_LABEL: Record<MissingField, string> = {
  ddxVerdict: 'a diagnosis verdict', ddxReason: 'a diagnosis reason', ttxVerdict: 'a treatment verdict', ttxReason: 'a treatment reason',
};

const VERDICT: Record<string, string> = Object.fromEntries([...DDX_VERDICTS, ...TTX_VERDICTS].map((x) => [x.value, x.label]));

// "ttx_medication" -> " (on: ttx medication)": which part of the AI output the doctor rejected.
const surface = (s?: string | null) => (s ? ` (on: ${s.replace(/_/g, ' ')})` : '');
// `ddx.details` is free JSON from the app: show text as is, anything else as compact JSON.
const detailText = (d: unknown) => (d == null || d === '' ? '' : typeof d === 'string' ? d : JSON.stringify(d));
const istMs = (s?: string | null) => {
  const m = String(s ?? '').match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  return m ? Date.parse(`${m[1]}T${m[2]}+05:30`) : NaN;
};
const dur = (a: number, b: number) => {
  if (isNaN(a) || isNaN(b) || b < a) return null;
  const m = Math.round((b - a) / 60000);
  return m < 1 ? '< 1 min' : m < 120 ? `${m} min` : m < 2880 ? `${(m / 60).toFixed(1)} h` : `${Math.round(m / 1440)} days`;
};

/** Visit start -> doctor opened the note -> prescription shared (IST wall-clock from OpenMRS). */
function VisitTiming({ v }: { v: VisitDetail }) {
  const start = istMs(v.demographics?.visitStartedDate);
  const note = istMs(v.doctorTimestamps?.doctorStartedVisitNoteAt);
  const shared = istMs(v.doctorTimestamps?.prescriptionSharedAt);
  if (isNaN(note) && isNaN(shared)) return null;
  const t = (x: number) => new Date(x).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
  const parts = [
    !isNaN(start) && `visit started ${t(start)}`,
    !isNaN(note) && `doctor opened the note ${t(note)}${dur(start, note) ? ` (after ${dur(start, note)})` : ''}`,
    !isNaN(shared) ? `prescription shared ${t(shared)}${dur(note, shared) ? ` (${dur(note, shared)} in the note)` : ''}` : 'prescription not shared yet',
  ].filter(Boolean);
  return <p className="text-xs text-muted-foreground">Timing: {parts.join(' → ')}</p>;
}

/** The AI's reasoning for one suggestion: a string, or a list of {heading: text} objects. */
function Why({ r }: { r?: unknown }) {
  if (!r) return null;
  const parts: [string, string][] = typeof r === 'string'
    ? [['', r]]
    : Array.isArray(r)
      ? r.flatMap((x) => (x && typeof x === 'object' ? Object.entries(x as Record<string, unknown>).map(([k, val]) => [k, String(val)] as [string, string]) : [['', String(x)] as [string, string]]))
      : typeof r === 'object' ? Object.entries(r as Record<string, unknown>).map(([k, val]) => [k, String(val)] as [string, string]) : [['', String(r)]];
  if (!parts.length) return null;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs font-normal text-indigo-700">Why the AI suggested it</summary>
      <div className="mt-1 space-y-1 text-xs font-normal text-gray-700">
        {parts.map(([k, val], i) => <p key={i}>{k && <span className="font-medium">{k}: </span>}{val}</p>)}
      </div>
    </details>
  );
}

function Note({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap leading-relaxed">
        {text.split('\n').map((line, i) => (
          <p key={i} className={cn(line.startsWith('►') && 'mt-2 font-medium text-foreground', !line.startsWith('►') && 'text-gray-700')}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function Choices({ name, options, value, onChange }: { name: string; options: { value: string; label: string }[]; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {options.map((o) => (
        <label key={o.value} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm', value === o.value ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-accent/40')}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function Select({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function TextInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
