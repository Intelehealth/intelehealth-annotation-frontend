'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtDate, HighlightChip, Shell, StatusBadge, TypeBadge } from '@/components/mismatch/shared';
import { VisitImages } from '@/components/mismatch/visit-images';
import { displayName } from '@/lib/format-display';
import { missingForDone, NO_REASON_VERDICTS, requiredSections, type MissingField } from '@/lib/review-rules';
import { noteSections } from '@/lib/note-sections';
import { Card, DxList, Ladder, NoteBlock, Pill, ReasonChips, TreatmentPlan, VerdictButtons, VitalsStrip } from '@/components/mismatch/visit-layout';
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
  const [pos, setPos] = useState<{ uuid: string; index: number; total: number; nextSummary?: { encounterAt: string | null; complaint: string } | null } | null>(null);
  // The "I" key opens the image lightbox (V5).
  const [openImages, setOpenImages] = useState(0);
  // Which verdict group keys 1-4 act on: a click / focus in a group picks it; otherwise the first group still open.
  const [keyGroup, setKeyGroup] = useState<'dx' | 'ttx' | null>(null);

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
      const need = requiredSections(v.analysis);
      const group = keyGroup && need[keyGroup] ? keyGroup : need.dx && !form.ddxVerdict ? 'dx' : need.ttx && !form.ttxVerdict ? 'ttx' : need.ttx ? 'ttx' : need.dx ? 'dx' : null;
      if (/^[1-4]$/.test(e.key) && group) {
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

  const a = v.analysis;
  const top5 = a.ddxRanked ?? [];
  const inTop5 = new Set(top5.map((d) => d.diagnosis.toLowerCase()));
  const otherAi = (v.ddx?.diagnoses ?? []).filter((d) => d.aiAssisted === 'I' && !inTop5.has(String(d.diagnosis).toLowerCase()));
  const claimedByOther = v.review.claimedBy && v.review.claimedBy._id !== user?._id && v.review.status !== 'done' && v.review.claimedAt
    && Date.now() - new Date(v.review.claimedAt).getTime() < 30 * 60_000 ? v.review.claimedBy : null;
  const dxRationale = (name: string) => (v.ddx?.diagnoses ?? []).find((x) => String(x.diagnosis).toLowerCase() === name.toLowerCase())?.rationale;
  const showTtx = a.ttxAvailable;
  // Notes come in English and Marathi; English by default, the choice is remembered per user (ticket V4).
  const hasMr = Object.values(v.notesMr ?? {}).some(Boolean);
  const note = lang === 'mr' && hasMr ? { ...v.notes, ...Object.fromEntries(Object.entries(v.notesMr ?? {}).filter(([, t]) => t)) } : v.notes;
  const missing = missingForDone(a, form);
  const eq = a.equivalentNotPicked ?? null;
  const vit = v.vitals ?? {};
  const vitals: [string, unknown, string][] = [
    // Age and sex are in the page title line (always on the first screen), so the strip fits one row.
    ['BP', vit.sbp && vit.dbp ? `${vit.sbp}/${vit.dbp}` : null, 'mmHg'], ['Pulse', vit.pulse, '/min'], ['Temp', vit.temperature, Number(vit.temperature) > 45 ? '°F' : '°C'],
    ['SpO₂', vit.spo2, '%'], ['RR', vit.rr, '/min'], ['Weight', vit.weight, 'kg'], ['Height', vit.height, 'cm'], ['BMI', vit.bmi, ''],
    ['Hb', vit.hb, ''], ['Sugar (R)', vit.sugarRandom, ''],
  ];

  const DX4 = [
    { value: 'doctor_correct', label: 'Doctor is right, AI missed it' }, { value: 'ai_correct', label: 'AI is right' },
    { value: 'both_acceptable', label: 'Both acceptable / equivalent' }, { value: 'neither', label: 'Neither is right' },
  ];
  const TX4 = [
    { value: 'doctor_correct', label: "Doctor's plan is right" }, { value: 'ai_correct', label: 'AI plan was right' },
    { value: 'both_acceptable', label: 'Both acceptable' }, { value: 'neither', label: 'Neither is right' },
  ];
  const needs = requiredSections(a);
  const complaints = noteSections(v.notes.chiefComplaint).map((g) => g.title).filter((t) => t && !/^associated symptoms?$/i.test(t));
  const ranked = top5;
  const doctorRows = a.doctorDiagnoses.map((d) => ({
    ...d,
    fromAi: top5.some((x) => x.picked && x.diagnosis.toLowerCase().replace(/\(.*?\)/g, '').trim() === d.name.toLowerCase().replace(/\(.*?\)/g, '').trim()),
  }));
  const plan = v.plan ?? [];
  // Doctor's own diagnoses (not picked from the AI list): why a Dx verdict is needed on an otherwise agreed visit.
  const ownDx = a.followUpOnly ? [] : doctorRows.filter((d) => !d.fromAi && !/follow[\s-]*up/i.test(d.name)).map((d) => displayName(d.name));
  const urgentRef = plan.some((i) => i.type === 'referral' && /urgent|emergency/i.test(i.referral?.urgency ?? ''));
  const fu = plan.find((i) => i.type === 'followup')?.followUp;
  const fuSoon = !!fu && ((fu.inDays !== null && fu.inDays >= 0 && fu.inDays <= 3) || /urgent/i.test(fu.remark));
  const medCounts = showTtx ? `Medicines: ${a.ttxExact} kept · ${a.ttxModified} changed · ${a.ttxIgnored} not used · ${a.ttxAdded} added by the doctor.` : 'No AI medicines for this visit.';
  const dxSummary = a.followUpOnly ? 'Follow-up visit: diagnosis not scored'
    : !a.ddxAvailable ? 'No AI diagnosis for this visit'
    : a.ddxBestRank ? `Diagnosis agreed: the doctor picked the AI's #${a.ddxBestRank}${a.ddxPickedBy === 'name' ? ' (typed the same name)' : ''}`
    : 'The doctor picked none of the AI top 5';
  const cutOf = (k: 'chiefComplaint' | 'physicalExamination' | 'patientMedicalHistory' | 'familyHistory') => !!v.notesCut?.[k]?.[lang === 'mr' && hasMr ? 'mr' : 'en'];
  const nextLine = pos?.uuid === uuid ? pos.nextSummary ?? undefined : undefined;
  const activeGroup: 'dx' | 'ttx' | null = keyGroup && needs[keyGroup] ? keyGroup : needs.dx && !form.ddxVerdict ? 'dx' : needs.ttx && !form.ttxVerdict ? 'ttx' : needs.ttx ? 'ttx' : needs.dx ? 'dx' : null;

  return (
    <Shell wide>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
        <Link href={`/workspaces/${id}/mismatch`} className="hover:text-foreground">← {SOURCE_LABEL[v.source] ?? v.source} mismatches</Link>
        {pos?.uuid === uuid && pos.index >= 0 && <><span>·</span><span>{(pos.index + 1).toLocaleString()} of {pos.total.toLocaleString()} in this view</span></>}
        <span className="ml-auto text-faint">Visit {v.visitPseudoId ?? v.visitId ?? ''}</span>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {[v.demographics?.gender === 'F' ? 'Female' : v.demographics?.gender === 'M' ? 'Male' : v.demographics?.gender, v.demographics?.age != null ? `${v.demographics.age} years` : null].filter(Boolean).join(', ')}
            {complaints.length > 0 && <span> · {complaints.join(' · ')}</span>}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <b className="font-medium text-foreground">{SOURCE_LABEL[v.source] ?? v.source}</b> · {displayName(v.attributes?.specialty)}
            {v.providers?.doctorPseudoIds?.length ? <> · {v.providers.doctorPseudoIds.map(doctorLabel).join(', ')}</> : null}
            {' · '}{fmtDate(v.encounterAt)}
            {v.providers?.creatorPseudoId ? <> · health worker #{v.providers.creatorPseudoId}</> : null}
            {v.langfuse?.model && <> · AI: {v.langfuse.model}{v.langfuse.engine ? ` (${v.langfuse.engine})` : ''}{typeof v.langfuse.latency === 'number' ? `, ${v.langfuse.latency.toFixed(1)} s` : ''}{v.langfuse.totalTokens ? `, ${v.langfuse.totalTokens.toLocaleString()} tokens` : ''}</>}
          </p>
          <VisitTiming v={v} />
        </div>
        <div className="flex items-center gap-2">
          <TypeBadge type={v.mismatchType} />
          {ownDx.length > 0 && !a.ddxMismatch && <Pill>doctor added {ownDx.length} Dx</Pill>}
          <StatusBadge status={v.review.status} />
          {v.review.annotatedBy && <span className="text-xs text-muted-foreground">by {v.review.annotatedBy.name}</span>}
        </div>
      </header>

      {(a.ddxRejectReason || a.ttxRejectReason) && (
        <div className="rounded-lg border border-bad/40 bg-pill-neg-bg px-4 py-3 text-sm text-pill-neg-ink">
          <strong>The doctor rejected the AI and said why:</strong>{' '}
          {[a.ddxRejectReason && `diagnosis marked “${a.ddxRejectReason.replace(/_/g, ' ')}”${surface(v.ddx?.aiSurface)}`, a.ttxRejectReason && `treatment marked “${a.ttxRejectReason.replace(/_/g, ' ')}”${surface(v.ttx?.aiSurface)}`].filter(Boolean).join('; ')}.
          {detailText(v.ddx?.details) && <div className="mt-1 whitespace-pre-wrap"><strong>Doctor&apos;s note:</strong> {detailText(v.ddx?.details)}</div>}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_448px]">
        {/* Evidence */}
        <div className="min-w-0 space-y-4">
          <VitalsStrip items={vitals} />

          {a.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2">{a.highlights.map((h, i) => <HighlightChip key={i} h={h} full />)}</div>
          )}


          <Card id="plan" title={<>Treatment plan: AI vs doctor {urgentRef && <Pill tone="neg">Urgent referral</Pill>} {fuSoon && fu && <Pill tone="warn">Follow-up {fu.inDays === 0 ? 'today' : `in ${fu.inDays} day${fu.inDays === 1 ? '' : 's'}`}</Pill>}</>}
            meta={`${medCounts} The AI doesn't suggest tests, advice, referral or follow-up yet.`}>
            <TreatmentPlan plan={plan} lang={lang}
              medWhy={(n) => <Why r={(v.ttx?.medications ?? []).find((m) => String(m.medication).trim().toLowerCase() === n.toLowerCase())?.rationale} />}
              unflagged={(n) => { const u = a.ttxUnflagged?.find((x) => x.medication.toLowerCase() === n.toLowerCase()); return u ? `The app said exact; ${u.changes.join(', ')} differs from the prescription.` : null; }} />
            {v.ttx?.planRationale && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">AI reasoning for the whole treatment plan</summary>
                <p className="mt-2 whitespace-pre-wrap">{v.ttx.planRationale}</p>
              </details>
            )}
          </Card>

          {v.images.length > 0 && (
            <Card title="Images" meta={`${v.images.length} from OpenMRS · click or press I to open`}>
              <VisitImages workspaceId={id} uuid={v.uuid} count={v.images.length} openSignal={openImages} sources={v.images} />
            </Card>
          )}

          <Card title="Clinical note" action={hasMr ? (
            <div className="inline-flex gap-0.5 rounded-lg bg-active p-0.5" role="group" aria-label="Note language">
              {(['en', 'mr'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
                  className={cn('h-7 rounded-md px-2.5 text-[13px]', lang === l ? 'bg-surface font-medium text-foreground outline outline-1 outline-border' : 'text-muted-foreground')}>
                  {l === 'en' ? 'English' : 'मराठी'}
                </button>
              ))}
            </div>
          ) : undefined}>
            <NoteBlock heading="Chief complaint" text={note.chiefComplaint} cut={cutOf('chiefComplaint')} />
            <NoteBlock heading="Physical examination" text={note.physicalExamination} cut={cutOf('physicalExamination')} />
            <NoteBlock heading="Medical history" text={note.patientMedicalHistory} cut={cutOf('patientMedicalHistory')} />
            <NoteBlock heading="Family history" text={note.familyHistory} cut={cutOf('familyHistory')} />
          </Card>

          {!!v.review.history?.length && (
            <Card title="Edit history" meta="Every save is kept, newest first">
              <ol className="divide-y divide-rule text-sm">
                {v.review.history.map((h, i) => (
                  <li key={i} className="py-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{h.by?.name ?? 'Unknown'} <span className="font-normal text-muted-foreground">{h.action === 'edited' ? 'edited' : h.action === 'draft' ? 'saved a draft' : 'annotated'}</span></span>
                      <span className="text-xs text-muted-foreground">{fmtDate(h.at)}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {[VERDICT[h.ddxVerdict ?? ''] && `Diagnosis: ${VERDICT[h.ddxVerdict ?? '']}`, VERDICT[h.ttxVerdict ?? ''] && `Treatment plan: ${VERDICT[h.ttxVerdict ?? '']}`, h.correctDiagnosis && `Correct Dx: ${h.correctDiagnosis}`, h.comment && `“${h.comment}”`, h.followUp && 'Flagged for follow-up', h.equivReason && `Equivalent not picked: ${EQUIV_REASON_LABEL[h.equivReason] ?? h.equivReason}`].filter(Boolean).join(' · ') || 'No fields filled'}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        {/* Decision rail (V1): sticky on desktop; on a phone it follows the evidence and the save bar is pinned to the bottom. */}
        <aside aria-label="Verdict" className="flex flex-col rounded-lg border border-border bg-surface lg:sticky lg:top-4 lg:max-h-[calc(100vh-140px)]">
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (!missing.length) save(true); }}>
            <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 pb-3 pt-4">
              {/* V7: one ranked Dx list with the doctor's pick marked; folded when the Dx agreed, and when a treatment verdict also needs the space. */}
              <details className="group text-[13px]" open={a.ddxMismatch && !needs.ttx}>
                <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-md border border-border bg-raised px-2.5 py-2">
                  <Ladder rank={a.ddxBestRank} miss={a.ddxMismatch} />
                  <span className="min-w-0 flex-1">{dxSummary}{a.ddxBestRank ? `, ${displayName(top5.find((x) => x.rank === a.ddxBestRank)?.diagnosis)}` : ''}</span>
                  <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
                </summary>
                <div className="mt-2">
            {ranked.length || doctorRows.length ? (
              <DxList ranked={ranked} doctor={doctorRows} otherAi={otherAi.map((d) => String(d.diagnosis))} why={(n) => <Why r={dxRationale(n)} />} />
            ) : <p className="text-sm text-muted-foreground">No diagnosis recorded.</p>}
            {(v.ddx?.conclusion || (v.ddx?.furtherQuestions?.length ?? 0) > 0) && (
              <details className="mt-3 border-t border-rule pt-3 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">AI conclusion and suggested questions</summary>
                {v.ddx?.conclusion && <p className="mt-2">{v.ddx.conclusion}</p>}
                {(v.ddx?.furtherQuestions?.length ?? 0) > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5">{v.ddx!.furtherQuestions!.map((q, i) => <li key={i}>{q}</li>)}</ul>}
              </details>
            )}
                </div>
              </details>
              {claimedByOther && <p className="text-xs text-pill-warn-ink">{claimedByOther.name} opened this visit recently; you can still annotate.</p>}

              {eq && (
                <div className="rounded-md border border-border bg-raised p-3 text-[13px]">
                  <div className="text-xs text-muted-foreground">The AI listed an equivalent</div>
                  <div className="my-1 text-sm">AI #{eq.aiRank} <b className="font-semibold">{displayName(eq.aiName)}</b> ≈ doctor <b className="font-semibold">{displayName(eq.doctorName)}</b></div>
                  <div className="text-xs text-muted-foreground">Rule: {RULE_LABEL[eq.rule] ?? eq.rule}. Not counted as a pick.</div>
                  <ReasonChips label="Why didn't the doctor pick the AI's name?" options={EQUIV_REASONS.map((o) => o.label)}
                    value={EQUIV_REASONS.find((o) => o.value === form.equivReason)?.label}
                    onChange={(l) => update({ equivReason: EQUIV_REASONS.find((o) => o.label === l)?.value })} />
                  {form.equivReason === 'other' && <div className="mt-2"><TextInput label="Describe the reason" value={form.equivReasonText} onChange={(x) => update({ equivReasonText: x })} /></div>}
                </div>
              )}

              {needs.dx && (
                <div>
                  <VerdictButtons label="Your diagnosis verdict" options={DX4} value={form.ddxVerdict} active={activeGroup === 'dx'} showKeysTag={needs.ttx}
                    onActivate={() => setKeyGroup('dx')} onChange={(x) => update({ ddxVerdict: x })}
                    prompt={!a.ddxMismatch && ownDx.length ? <>The doctor also added {ownDx.join(', ')}. Did the AI miss {ownDx.length === 1 ? 'it' : 'them'}?</> : undefined} />
                  <button type="button" className="mt-1.5 text-xs text-muted-foreground underline underline-offset-2" onClick={() => update({ ddxVerdict: form.ddxVerdict === 'insufficient' ? undefined : 'insufficient' })}>
                    {form.ddxVerdict === 'insufficient' ? '✓ Note too thin to judge (click to clear)' : 'Other: note too thin to judge'}
                  </button>
                  {form.ddxVerdict && !NO_REASON_VERDICTS.has(form.ddxVerdict) && (
                    <ReasonChips label="Main reason" options={DDX_REASONS} value={form.ddxReason} onChange={(x) => update({ ddxReason: x })} />
                  )}
                </div>
              )}

              {needs.ttx && (
                <div>
                  <VerdictButtons label="Your treatment-plan verdict" options={TX4} value={form.ttxVerdict} active={activeGroup === 'ttx'} showKeysTag={needs.dx}
                    onActivate={() => setKeyGroup('ttx')} onChange={(x) => update({ ttxVerdict: x })} />
                  {form.ttxVerdict && !NO_REASON_VERDICTS.has(form.ttxVerdict) && (
                    <ReasonChips label="Main reason" options={TTX_REASONS} value={form.ttxReason} onChange={(x) => update({ ttxReason: x })} />
                  )}
                </div>
              )}

              {!needs.dx && !needs.ttx && <p className="text-sm text-muted-foreground">No mismatch to judge on this visit. You can still leave a comment or flag it.</p>}

              <details className="text-[13px]" open={!!(form.comment || form.correctDiagnosis || form.correctTreatment)}>
                <summary className="cursor-pointer underline underline-offset-2">Add a comment or the correct {needs.dx && needs.ttx ? 'diagnosis / treatment' : needs.ttx ? 'treatment' : 'diagnosis'}</summary>
                <div className="mt-2 space-y-2">
                  {needs.dx && <TextInput label="Correct diagnosis (if different)" value={form.correctDiagnosis} onChange={(x) => update({ correctDiagnosis: x })} />}
                  {needs.ttx && <TextInput label="Correct treatment (if different)" value={form.correctTreatment} onChange={(x) => update({ correctTreatment: x })} />}
                  <label className="block text-sm">
                    <span className="text-xs font-medium text-muted-foreground">Comment</span>
                    <textarea className="mt-1 w-full rounded-md border border-control bg-surface px-3 py-2 text-sm" rows={3} value={form.comment ?? ''} onChange={(e) => update({ comment: e.target.value })} />
                  </label>
                </div>
              </details>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={!!form.followUp} onChange={(e) => update({ followUp: e.target.checked })} />
                Flag for the clinical team
              </label>
              {error && <p className="text-sm text-bad">{error}</p>}
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface lg:static lg:z-auto">
              <div className="flex items-center gap-2 px-5 py-3">
                <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {saved ? <span className="inline-flex items-center text-good"><Check className="mr-1 h-4 w-4" /> Saved</span>
                    : nextLine ? <>Next in this view: <b className="font-medium text-foreground">{fmtDate(nextLine.encounterAt ?? undefined)}{nextLine.complaint ? ` · ${nextLine.complaint}` : ''}</b></>
                    : pos?.uuid === uuid && pos.index >= 0 ? 'Last visit in this view' : null}
                </div>
                <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>Save</Button>
                <Button type="submit" size="sm" disabled={saving || missing.length > 0} title={missing.length ? 'Fill the required fields first' : undefined}>Save &amp; next ↵</Button>
              </div>
              {missing.length > 0 && <p className="px-5 pb-2 text-xs text-bad">To finish, add: {missing.map((m) => MISSING_LABEL[m]).join(', ')}. &quot;Save&quot; keeps a draft.</p>}
              <p className="hidden px-5 pb-3 text-xs text-faint lg:block">1–4 verdict · Enter save &amp; next · I images · Esc back to the queue</p>
            </div>
          </form>
        </aside>
      </div>
      <div className="h-24 lg:hidden" aria-hidden />
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




function TextInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
