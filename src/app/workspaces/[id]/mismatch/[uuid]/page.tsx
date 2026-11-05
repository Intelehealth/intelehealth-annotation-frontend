'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { fmtDate, Shell, StatusBadge, TypeBadge } from '@/components/mismatch/shared';
import { VisitImages } from '@/components/mismatch/visit-images';
import { displayName } from '@/lib/format-display';
import { missingForDone, NO_REASON_VERDICTS, offeredSections } from '@/lib/review-rules';
import { dxQuestion, dxSentence, INSUFFICIENT, txQuestion, txSentence } from '@/lib/visit-v2-logic';
import { Bold, Chips, KeysHelp, MatchTable, SecH, Summary, TreatmentDiff, VerdictGroup, VitalsCard } from '@/components/mismatch/visit-v2';
import { noteSections } from '@/lib/note-sections';
import { Card, NoteBlock, Pill } from '@/components/mismatch/visit-layout';
import Link from 'next/link';
import { friendlyError } from '@/components/mismatch/shared';
import {
  DDX_REASONS, DDX_VERDICTS, doctorLabel, EQUIV_REASON_LABEL, EQUIV_REASONS, mismatchAPI, parseView, RULE_LABEL, SOURCE_LABEL, TTX_REASONS, TTX_VERDICTS,
  type ReviewInput, type VisitDetail,
} from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';


export default function MismatchVisitPage() {
  const { id, uuid } = useParams<{ id: string; uuid: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [v, setV] = useState<VisitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ReviewInput>({});
  const [saving, setSaving] = useState(false);
  const claimed = useRef(false);
  // L1: notes are English only. Drop the old per-user note-language choice (V4) if this browser still has it.
  useEffect(() => {
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('mismatch-note-lang-')) localStorage.removeItem(k); } catch { /* storage unavailable */ }
  }, []);
  // First interaction with the form claims the visit (30-min expiry on the server); a save claims it too.
  const update = (patch: Partial<ReviewInput>) => {
    if (v?.access?.canAnnotate === false) return; // ACL1: reviewers are view-only, never claim
    if (!claimed.current) {
      claimed.current = true;
      mismatchAPI.claim(id, uuid).catch(() => { claimed.current = false; });
    }
    setForm((f) => ({ ...f, ...patch }));
  };
  const [saved, setSaved] = useState(false);
  // The queue view this visit was opened from (?view=); "Save & next" stays inside it (ticket V3).
  const viewQs = useSearchParams().get('view') ?? 'tab=todo';
  const [pos, setPos] = useState<{ uuid: string; index: number; total: number; nextSummary?: { encounterAt: string | null; complaint: string } | null } | null>(null);
  // The "I" key opens the image lightbox (V5).
  const [openImages, setOpenImages] = useState(0);
  // Which verdict group keys 1-4 act on: a click / focus in a group picks it; otherwise the first group still open.
  const [keyGroup, setKeyGroup] = useState<'dx' | 'ttx' | null>(null);
  // V9 phone tabs: "Patient" (context) and "AI vs doctor" (comparison + annotation).
  const [paneTab, setPaneTab] = useState<'patient' | 'ai'>('patient');

  useEffect(() => {
    let live = true;
    mismatchAPI.position(id, uuid, parseView(viewQs))
      .then((p) => live && setPos({ uuid, index: p.index, total: p.total, nextSummary: p.nextSummary ?? null }))
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
      .catch((e) => live && setError(friendlyError(e, 'Could not load this visit')));
    return () => { live = false; };
  }, [id, uuid]);

  const save = async (next: boolean) => {
    if (v?.access?.canAnnotate === false) return;
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
    } catch (e) { setError(friendlyError(e, 'Could not save')); }
    finally { setSaving(false); }
  };

  // V6 keyboard: 1-4 pick the verdict of the first group still open, Enter = Save & next, I = images, Esc = back to the queue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!v || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, a, [contenteditable="true"]')) return;
      if (document.querySelector('[role="dialog"]')) return;
      const need = offeredSections(v.analysis);
      const group = keyGroup && need[keyGroup] ? keyGroup : need.dx && !form.ddxVerdict ? 'dx' : need.ttx && !form.ttxVerdict ? 'ttx' : need.ttx ? 'ttx' : need.dx ? 'dx' : null;
      if (e.key === '5' && need.dx) {
        update({ ddxVerdict: 'insufficient' });
        e.preventDefault();
      } else if (/^[1-4]$/.test(e.key) && group) {
        const val = ['doctor_correct', 'ai_correct', 'both_acceptable', 'neither'][Number(e.key) - 1];
        update(group === 'dx' ? { ddxVerdict: val } : { ttxVerdict: val });
        e.preventDefault();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!saving && !missingForDone(v.analysis, form).length) save(true);
      } else if (e.key === 'Escape') {
        router.push(`/workspaces/${id}/mismatch`);
      } else if (e.key === 'i' || e.key === 'I') {
        setOpenImages((n) => n + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (error && !v) return <Shell wide><p className="text-sm text-destructive">{error}</p></Shell>;
  if (!v) return <Shell wide><div className="h-96 animate-pulse rounded-lg bg-muted" /></Shell>;

  const readOnly = v.access?.canAnnotate === false;
  const a = v.analysis;
  const top5 = a.ddxRanked ?? [];
  const inTop5 = new Set(top5.map((d) => d.diagnosis.toLowerCase()));
  const otherAi = (v.ddx?.diagnoses ?? []).filter((d) => d.aiAssisted === 'I' && !inTop5.has(String(d.diagnosis).toLowerCase()));
  const claimedByOther = v.review.claimedBy && v.review.claimedBy._id !== user?._id && v.review.status !== 'done' && v.review.claimedAt
    && Date.now() - new Date(v.review.claimedAt).getTime() < 30 * 60_000 ? v.review.claimedBy : null;
  const dxRationale = (name: string) => (v.ddx?.diagnoses ?? []).find((x) => String(x.diagnosis).toLowerCase() === name.toLowerCase())?.rationale;
  // L1: the note is shown in English only (Marathi free-text values typed inside it stay as written).
  const note = v.notes;
  const missing = missingForDone(a, form);
  const eq = a.equivalentNotPicked ?? null;

  const offered = offeredSections(a);
  const complaints = noteSections(v.notes.chiefComplaint).map((g) => g.title).filter((t) => t && !/^associated symptoms?$/i.test(t));
  const ranked = top5;
  const isFu = (n: string) => /follow[\s-]*up/i.test(n);
  const doctorRows = a.doctorDiagnoses.filter((d) => !isFu(d.name)).map((d) => ({
    ...d,
    fromAi: top5.some((x) => x.picked && x.diagnosis.toLowerCase().replace(/\(.*?\)/g, '').trim() === d.name.toLowerCase().replace(/\(.*?\)/g, '').trim()),
  }));
  const sub = (d: { role?: string; status?: string }, how: string) => [d.role, d.status?.toLowerCase(), how].filter(Boolean).join(' · ');
  const plan = v.plan ?? [];
  const eqKey = eq ? eq.doctorName.toLowerCase().trim() : null;
  const ownDx = a.followUpOnly ? [] : doctorRows.filter((d) => !d.fromAi).map((d) => displayName(d.name));
  const doctorOnly = doctorRows.filter((d) => !d.fromAi && d.name.toLowerCase().trim() !== eqKey).map((d) => ({ name: displayName(d.name), sub: sub(d, 'typed by the doctor'), code: d.code && d.code !== 'NA' ? d.code : undefined }));
  const matchOf = (r: { diagnosis: string; picked: unknown }) => {
    if (!r.picked) return null;
    const row = doctorRows.find((d) => d.fromAi && d.name.toLowerCase().replace(/\(.*?\)/g, '').trim() === r.diagnosis.toLowerCase().replace(/\(.*?\)/g, '').trim());
    return { name: displayName(row?.name ?? r.diagnosis), sub: row ? sub(row, 'picked from the AI list') : 'picked from the AI list', code: row?.code && row.code !== 'NA' ? row.code : undefined };
  };
  const facts = {
    followUpOnly: a.followUpOnly, ddxAvailable: a.ddxAvailable, bestRank: a.ddxBestRank,
    picked: top5.find((x) => x.rank === a.ddxBestRank)?.diagnosis ?? null, top1: top5.find((x) => x.rank === 1)?.diagnosis ?? null,
    ownDx, equivalent: eq ? { aiName: eq.aiName, aiRank: eq.aiRank, doctorName: eq.doctorName } : null, doctorDx: doctorRows.map((d) => displayName(d.name)),
  };
  const dxQ = dxQuestion(facts);
  const txQ = txQuestion(plan);
  const urgentRef = plan.some((i) => i.type === 'referral' && /urgent|emergency/i.test(i.referral?.urgency ?? ''));
  const fu = plan.find((i) => i.type === 'followup')?.followUp;
  const fuSoon = !!fu && ((fu.inDays !== null && fu.inDays >= 0 && fu.inDays <= 3) || /urgent/i.test(fu.remark));
  const restBits = [
    plan.filter((i) => i.type === 'test' && i.outcome === 'ai_not_available').map((i) => displayName(i.name)).join(', ') && `${plan.filter((i) => i.type === 'test' && i.outcome === 'ai_not_available').map((i) => displayName(i.name)).join(', ')} ordered`,
    (() => { const n = plan.filter((i) => i.type === 'advice').length; return n ? `${n} advice line${n === 1 ? '' : 's'}` : ''; })(),
    (() => { const r = plan.find((i) => i.type === 'referral')?.referral; return r ? `referral to ${displayName(r.specialist).toLowerCase()}` : ''; })(),
  ].filter(Boolean);
  const cutOf = (k: 'chiefComplaint' | 'physicalExamination' | 'patientMedicalHistory' | 'familyHistory') => !!v.notesCut?.[k];
  const nextLine = pos?.uuid === uuid ? pos.nextSummary ?? undefined : undefined;
  const activeGroup: 'dx' | 'ttx' | null = keyGroup && offered[keyGroup] ? keyGroup : offered.dx && !form.ddxVerdict ? 'dx' : offered.ttx && !form.ttxVerdict ? 'ttx' : offered.ttx ? 'ttx' : offered.dx ? 'dx' : null;
  const blockHint = missing.includes('ddxVerdict') && missing.includes('ttxVerdict') ? 'Answer both questions'
    : missing.some((m) => m.endsWith('Verdict')) ? 'Answer the question' : missing.length ? 'Pick a reason' : '';
  const reasonOpts = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

  return (
    <Shell wide>
      <div className="flex gap-1 rounded-lg bg-active p-0.5 lg:hidden" role="tablist" aria-label="Visit sections">
        {([['patient', 'Patient'], ['ai', 'AI vs doctor']] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={paneTab === k} onClick={() => setPaneTab(k)}
            className={cn('h-9 flex-1 rounded-md text-sm', paneTab === k ? 'bg-white font-semibold text-[#111418] outline outline-1 outline-[#d9dee5]' : 'text-[#59616c]')}>{l}</button>
        ))}
      </div>

      <div className="grid gap-6 lg:h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]">
        {/* LEFT: the patient, nothing from the AI */}
        <section aria-label="Patient" data-pane="patient" className={cn('min-h-0 space-y-4 lg:overflow-y-auto lg:pr-1', paneTab !== 'patient' && 'hidden lg:block')}>
          <header>
            <h1 className="text-xl font-[650] tracking-tight text-[#111418]">
              {[v.demographics?.gender === 'F' ? 'Female' : v.demographics?.gender === 'M' ? 'Male' : v.demographics?.gender, v.demographics?.age != null ? `${v.demographics.age}` : null].filter(Boolean).join(', ')}
              {complaints.length > 0 && <span> · {complaints.join(' · ')}</span>}
            </h1>
            <p className="mt-1 text-[13px] text-[#59616c]">
              <b className="font-semibold text-[#111418]">{SOURCE_LABEL[v.source] ?? v.source}</b> · {displayName(v.attributes?.specialty)}
              {v.providers?.doctorPseudoIds?.length ? <> · {v.providers.doctorPseudoIds.map(doctorLabel).join(', ')}</> : null}
              {' · '}{fmtDate(v.encounterAt)}
              {v.providers?.creatorPseudoId ? <> · health worker #{v.providers.creatorPseudoId}</> : null}
            </p>
            <VisitTiming v={v} />
          </header>

          <VitalsCard vit={v.vitals ?? {}} age={v.demographics?.age ?? null} />

          {v.images.length > 0 && (
            <Card title="Images" meta={`${v.images.length} from OpenMRS`}>
              <VisitImages workspaceId={id} uuid={v.uuid} count={v.images.length} openSignal={openImages} sources={v.images} />
            </Card>
          )}

          <Card title="Clinical note">
            <NoteBlock heading="Chief complaint" text={note.chiefComplaint} cut={cutOf('chiefComplaint')} />
            <NoteBlock heading="Physical examination" text={note.physicalExamination} cut={cutOf('physicalExamination')} />
            <NoteBlock heading="Medical history" text={note.patientMedicalHistory} cut={cutOf('patientMedicalHistory')} />
            <NoteBlock heading="Family history" text={note.familyHistory} cut={cutOf('familyHistory')} />
          </Card>
        </section>

        {/* RIGHT: AI vs doctor, and the decision */}
        <section aria-label="AI vs doctor" data-pane="ai" className={cn('flex min-h-0 flex-col rounded-lg border border-[#d9dee5] bg-white', paneTab !== 'ai' && 'hidden lg:flex')}>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (!missing.length) save(true); }}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#d9dee5] px-6 py-2.5 text-xs text-[#59616c]">
              <Link href={`/workspaces/${id}/mismatch`} className="text-[13px] hover:text-[#111418]">← {SOURCE_LABEL[v.source] ?? v.source} mismatches</Link>
              <TypeBadge type={v.mismatchType} />
              {ownDx.length > 0 && !a.ddxMismatch && <Pill>doctor added {ownDx.length} Dx</Pill>}
              {a.followUpOnly && <Pill>Follow-up visit</Pill>}
              <StatusBadge status={v.review.status} />
              {v.review.annotatedBy && <span>by {v.review.annotatedBy.name}</span>}
              <span className="ml-auto">
                {v.langfuse?.model && <>AI: {v.langfuse.model}{v.langfuse.engine ? ` (${v.langfuse.engine})` : ''}{typeof v.langfuse.latency === 'number' ? `, ${v.langfuse.latency.toFixed(1)} s` : ''}{v.langfuse.totalTokens ? `, ${v.langfuse.totalTokens.toLocaleString()} tokens` : ''} · </>}
                Visit {v.visitPseudoId ?? v.visitId ?? ''}
              </span>
            </div>

            <div data-pane-scroll="ai" className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {(a.ddxRejectReason || a.ttxRejectReason) && (
                <p className="mb-4 rounded-lg border border-[#f0b3ae] bg-[#ffedea] px-4 py-2.5 text-sm text-[#831c1e]">
                  <b className="font-semibold">Rejected by the doctor:</b>{' '}
                  {[a.ddxRejectReason && `diagnosis “${a.ddxRejectReason.replace(/_/g, ' ')}”${surface(v.ddx?.aiSurface)}`, a.ttxRejectReason && `treatment “${a.ttxRejectReason.replace(/_/g, ' ')}”${surface(v.ttx?.aiSurface)}`].filter(Boolean).join('; ')}
                  {detailText(v.ddx?.details) && <> · {detailText(v.ddx?.details)}</>}
                </p>
              )}
              {claimedByOther && <p className="mb-3 text-xs text-[#8a4b00]">Opened by {claimedByOther.name}</p>}

              {/* V12 summary */}
              <Summary lines={[
                ['Diagnosis', <Bold key="d" parts={dxSentence(facts)} />],
                ['Treatment', <span key="t"><Bold parts={txSentence(plan)} />{restBits.length > 0 && <> {restBits.join(' · ')}</>}
                  {urgentRef && <> <Pill tone="neg">Urgent referral</Pill></>}
                  {fuSoon && fu && <> <Pill tone="warn">Follow-up {fu.inDays === 0 ? 'today' : `in ${fu.inDays} day${fu.inDays === 1 ? '' : 's'}`}</Pill></>}</span>],
              ]} />

              {/* V13 diagnosis match table + its verdict */}
              <section aria-label="Diagnosis" className="mb-8">
                <SecH title="Diagnosis" sub="AI top 5 ↔ the doctor's diagnoses" />
                {ranked.length || doctorOnly.length ? (
                  <MatchTable ranked={ranked} matchOf={matchOf} doctorOnly={doctorOnly} why={(n) => <Why r={dxRationale(n)} />}
                    equivalent={eq ? { aiRank: eq.aiRank, rule: RULE_LABEL[eq.rule] ?? eq.rule, doctor: { name: displayName(eq.doctorName), sub: 'typed by the doctor' } } : null} />
                ) : <p className="text-sm text-[#59616c]">No diagnosis recorded</p>}
                {otherAi.length > 0 && <p className="mt-2 text-xs text-[#59616c]">Also listed by the AI: {otherAi.map((d) => displayName(d.diagnosis)).join(', ')}</p>}
                {(v.ddx?.conclusion || (v.ddx?.furtherQuestions?.length ?? 0) > 0) && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-[13px] text-[#3d4450]">AI conclusion and the questions it suggested asking</summary>
                    {v.ddx?.conclusion && <p className="mt-2 text-[#111418]">{v.ddx.conclusion}</p>}
                    {(v.ddx?.furtherQuestions?.length ?? 0) > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[#111418]">{v.ddx!.furtherQuestions!.map((q, i) => <li key={i}>{q}</li>)}</ul>}
                  </details>
                )}
                {eq && !readOnly && (
                  <div className="mt-4 rounded-lg bg-[#f6f8fb] px-3 py-3">
                    <p className="text-base font-[650] text-[#111418]">The AI&apos;s #{eq.aiRank} says the same thing in other words. Why didn&apos;t the doctor pick it?</p>
                    <Chips options={EQUIV_REASONS} value={form.equivReason} onChange={(x) => update({ equivReason: x })} />
                    {form.equivReason === 'other' && <div className="mt-2"><TextInput label="Other reason" value={form.equivReasonText} onChange={(x) => update({ equivReasonText: x })} /></div>}
                  </div>
                )}
                {offered.dx && !readOnly && (
                  <div className="mt-4">
                    <VerdictGroup question={dxQ.question} options={dxQ.options} extra={INSUFFICIENT} value={form.ddxVerdict} onChange={(x) => update({ ddxVerdict: x })}
                      active={activeGroup === 'dx'} showKeys={offered.ttx} onActivate={() => setKeyGroup('dx')} />
                    {form.ddxVerdict && !NO_REASON_VERDICTS.has(form.ddxVerdict) && <Chips label="Main reason" options={reasonOpts(DDX_REASONS)} value={form.ddxReason} onChange={(x) => update({ ddxReason: x })} />}
                  </div>
                )}
              </section>

              {/* V14 treatment diff + its verdict */}
              <section id="plan" aria-label="Treatment plan" className="mb-8">
                <SecH title="Treatment plan" sub="AI suggestion → what the doctor prescribed" />
                <TreatmentDiff plan={plan} why={(n) => <Why r={(v.ttx?.medications ?? []).find((m) => String(m.medication).trim().toLowerCase() === n.toLowerCase())?.rationale} />} />
                {v.ttx?.planRationale && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-[13px] text-[#3d4450]">AI reasoning for the whole treatment plan</summary>
                    <p className="mt-2 whitespace-pre-wrap text-[#111418]">{v.ttx.planRationale}</p>
                  </details>
                )}
                {offered.ttx && !readOnly && (
                  <div className="mt-4">
                    <VerdictGroup question={txQ.question} options={txQ.options} value={form.ttxVerdict} onChange={(x) => update({ ttxVerdict: x })}
                      active={activeGroup === 'ttx'} showKeys={offered.dx} onActivate={() => setKeyGroup('ttx')} optional={offered.ttxOptional} />
                    {form.ttxVerdict && !NO_REASON_VERDICTS.has(form.ttxVerdict) && <Chips label="Main reason" options={reasonOpts(TTX_REASONS)} value={form.ttxReason} onChange={(x) => update({ ttxReason: x })} />}
                  </div>
                )}
              </section>

              {/* Annotation */}
              <section aria-label="Annotation" className="space-y-3">
                <SecH title="Annotation" sub={readOnly ? 'View only' : 'Optional'} />
                {readOnly && <ReadOnlyReview v={v} />}
                {!readOnly && <>
                {offered.dx && <TextInput label="Correct diagnosis, if different" value={form.correctDiagnosis} onChange={(x) => update({ correctDiagnosis: x })} />}
                {offered.ttx && <TextInput label="Correct treatment, if different" value={form.correctTreatment} onChange={(x) => update({ correctTreatment: x })} />}
                <label className="block text-sm">
                  <span className="text-xs font-semibold text-[#59616c]">Comment</span>
                  <textarea className="mt-1 w-full rounded-lg border border-[#c3cad4] bg-white px-3 py-2 text-sm" rows={2} value={form.comment ?? ''} onChange={(e) => update({ comment: e.target.value })} />
                </label>
                <label className="flex items-center gap-2 text-sm text-[#111418]">
                  <input type="checkbox" checked={!!form.followUp} onChange={(e) => update({ followUp: e.target.checked })} />
                  Flag for the clinical team
                </label>
                </>}
                {error && <p className="text-sm font-semibold text-[#b42318]">{error}</p>}
                {!!v.review.history?.length && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-[13px] text-[#3d4450]">Edit history ({v.review.history.length})</summary>
                    <ol className="mt-2 divide-y divide-[#eef0f3]">
                      {v.review.history.map((h, i) => (
                        <li key={i} className="py-2">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-semibold">{h.by?.name ?? 'Unknown'} <span className="font-normal text-[#59616c]">{h.action === 'edited' ? 'edited' : h.action === 'draft' ? 'saved a draft' : 'annotated'}</span></span>
                            <span className="text-xs text-[#59616c]">{fmtDate(h.at)}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-[#59616c]">
                            {[VERDICT[h.ddxVerdict ?? ''] && `Diagnosis: ${VERDICT[h.ddxVerdict ?? '']}`, VERDICT[h.ttxVerdict ?? ''] && `Treatment plan: ${VERDICT[h.ttxVerdict ?? '']}`, h.correctDiagnosis && `Correct Dx: ${h.correctDiagnosis}`, h.comment && `“${h.comment}”`, h.followUp && 'Flagged', h.equivReason && `Equivalent: ${EQUIV_REASON_LABEL[h.equivReason] ?? h.equivReason}`].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </section>
            </div>

            {/* Footer: pinned in the right pane (desktop) / at the bottom of the screen (phone). */}
            <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-[#d9dee5] bg-white px-4 py-3 lg:static lg:z-auto lg:px-6">
              <div className="min-w-0 flex-1 truncate text-xs text-[#59616c]">
                {saved ? <span className="inline-flex items-center font-semibold text-[#247b50]"><Check className="mr-1 h-4 w-4" /> Saved</span> : (
                  <>
                    {pos?.uuid === uuid && pos.index >= 0 && <>{(pos.index + 1).toLocaleString()} of {pos.total.toLocaleString()} in this view</>}
                    {nextLine ? <> · next: {fmtDate(nextLine.encounterAt ?? undefined)}{nextLine.complaint ? ` · ${nextLine.complaint.toLowerCase()}` : ''}</> : null}
                  </>
                )}
              </div>
              <span className="hidden lg:inline"><KeysHelp /></span>
              {!readOnly && <>
              {blockHint && <span className="text-xs font-semibold text-[#b42318]">{blockHint}</span>}
              <button type="button" disabled={saving} onClick={() => save(false)} title="Keeps a draft"
                className="h-10 rounded-lg border-[1.5px] border-[#c3cad4] bg-white px-4 text-sm font-medium text-[#111418] hover:bg-[#eef2f8] disabled:opacity-45">Save draft</button>
              <button type="submit" disabled={saving || missing.length > 0}
                className="h-10 rounded-lg bg-[#111418] px-4 text-sm font-[650] text-white hover:bg-[#2a2f36] disabled:opacity-45">Save &amp; next ↵</button>
              </>}
            </div>
          </form>
        </section>
      </div>
      <div className="h-24 lg:hidden" aria-hidden />
    </Shell>
  );
}


const VERDICT: Record<string, string> = Object.fromEntries([...DDX_VERDICTS, ...TTX_VERDICTS].map((x) => [x.value, x.label]));

// ACL1: what a reviewer (view-only) sees in place of the annotation form.
function ReadOnlyReview({ v }: { v: VisitDetail }) {
  const r = v.review;
  const rows: [string, string | undefined][] = [
    ['Diagnosis', VERDICT[r.ddxVerdict ?? '']], ['Main reason', r.ddxReason],
    ['Equivalent, not picked', r.equivReason ? (r.equivReason === 'other' ? r.equivReasonText || 'Other' : EQUIV_REASON_LABEL[r.equivReason] ?? r.equivReason) : undefined],
    ['Treatment plan', VERDICT[r.ttxVerdict ?? '']], ['Main reason', r.ttxReason],
    ['Correct diagnosis', r.correctDiagnosis], ['Correct treatment', r.correctTreatment], ['Comment', r.comment],
    ['Flagged for the clinical team', r.followUp ? 'Yes' : undefined],
  ];
  const shown = rows.filter(([, val]) => val);
  if (!shown.length) return <p className="text-sm text-[#59616c]">Not annotated yet</p>;
  return (
    <dl className="grid grid-cols-[minmax(96px,38%)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm md:grid-cols-[170px_minmax(0,1fr)]">
      {shown.map(([label, val], i) => <div key={i} className="contents"><dt className="text-[#59616c]">{label}</dt><dd className="text-[#111418]">{val}</dd></div>)}
    </dl>
  );
}

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




function TextInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
