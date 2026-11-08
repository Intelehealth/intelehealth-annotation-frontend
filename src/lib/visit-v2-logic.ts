/**
 * Visit page v2 (V12 summary, V13 match table, V14 treatment diff, contextual verdicts): pure helpers so the
 * wording is built from data and unit-tested. Verdict options map 1:1 onto the STORED values
 * (doctor_correct / ai_correct / both_acceptable / neither / insufficient); only the labels change.
 */
import type { PlanItem } from '@/lib/api/mismatch';

export type VerdictOption = { value: string; label: string };

/** Likelihood label -> bar fill (%), Low ... High in five steps. */
export function likelihoodWidth(label?: string | null): number {
  const s = String(label ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^high$/.test(s)) return 100;
  if (/moderate[- ]?(to )?high|high[- ]?(to )?moderate/.test(s)) return 80;
  if (/^moderate$/.test(s)) return 60;
  if (/low[- ]?(to )?moderate|moderate[- ]?(to )?low/.test(s)) return 40;
  if (/low/.test(s)) return 20;
  return 0;
}

/** AI vs doctor value parts ("1 capsule · Once daily · 5 weeks"): shared, AI-only (struck), doctor-only (highlighted). */
export function diffParts(ai: string | null, doctor: string | null): { same: string[]; aiOnly: string[]; doctorOnly: string[] } {
  const split = (s: string | null) => String(s ?? '').split('·').map((x) => x.trim()).filter(Boolean);
  const norm = (x: string) => x.toLowerCase().replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').replace(/s$/, '').trim();
  const a = split(ai);
  const d = split(doctor);
  const dn = new Set(d.map(norm));
  const an = new Set(a.map(norm));
  return { same: a.filter((x) => dn.has(norm(x))), aiOnly: a.filter((x) => !dn.has(norm(x))), doctorOnly: d.filter((x) => !an.has(norm(x))) };
}

export type PlanGroup = 'changed' | 'not_used' | 'added' | 'exact' | 'rest';
/** V14 groups, generic over every plan type: once the AI suggests a test or a referral it joins the diff groups. */
export function planGroups(plan: PlanItem[]): Record<PlanGroup, PlanItem[]> {
  const g: Record<PlanGroup, PlanItem[]> = { changed: [], not_used: [], added: [], exact: [], rest: [] };
  for (const i of plan) g[i.outcome === 'ai_not_available' ? 'rest' : i.outcome].push(i);
  return g;
}

const list = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const lc = (s: string) => s.toLowerCase();

export interface DxFacts {
  followUpOnly: boolean; ddxAvailable: boolean; bestRank: number | null; picked?: string | null; top1?: string | null;
  ownDx: string[]; equivalent?: { aiName: string; aiRank: number; doctorName: string } | null; doctorDx: string[];
}

/** V12: one sentence for the diagnosis, from data. Returns [text, bold parts] as segments. */
export function dxSentence(f: DxFacts): (string | { b: string })[] {
  if (f.followUpOnly) return ['Follow-up visit: no diagnosis to compare.'];
  if (!f.ddxAvailable) return ['No AI diagnosis list for this visit.'];
  if (f.equivalent && !f.bestRank) return ['The doctor wrote ', { b: lc(f.equivalent.doctorName) }, ': the AI\'s ', { b: `#${f.equivalent.aiRank}` }, ' in other words.'];
  if (f.bestRank) {
    const s: (string | { b: string })[] = ["The doctor kept the AI's ", { b: `#${f.bestRank}, ${lc(f.picked ?? '')}` }];
    if (f.ownDx.length) s.push(', and added ', { b: `${f.ownDx.length} the AI didn't list` }, `: ${list(f.ownDx.map(lc))}.`);
    else s.push('.');
    return s;
  }
  return ['The doctor picked ', { b: "none of the AI's 5" }, ' and wrote ', { b: list(f.doctorDx.map(lc)) || '—' }, `. The AI's #1 was ${lc(f.top1 ?? '—')}.`];
}

/** V12: one sentence for the treatment plan, from the plan items. */
export function txSentence(plan: PlanItem[]): (string | { b: string })[] {
  const meds = plan.filter((i) => i.type === 'medicine');
  const g = planGroups(meds);
  const aiMeds = meds.filter((i) => i.ai !== null).length;
  const s: (string | { b: string })[] = [];
  if (aiMeds) {
    s.push(`Of ${aiMeds} AI medicine${aiMeds === 1 ? '' : 's'}, `);
    const parts: (string | { b: string })[][] = [];
    if (g.exact.length) parts.push([{ b: `${g.exact.length} kept` }]);
    if (g.changed.length) parts.push([{ b: `${g.changed.length} changed` }, ` (${g.changed.map((i) => lc(i.name.split(' ')[0])).join(', ')})`]);
    if (g.not_used.length) parts.push([{ b: `${g.not_used.length} not used` }, ` (${g.not_used.map((i) => i.name.split(' ')[0]).join(', ')})`]);
    parts.forEach((p, i) => { if (i) s.push(i === parts.length - 1 ? ' and ' : ', '); s.push(...p); });
    if (g.added.length) s.push('; the doctor ', { b: `added ${g.added.length}` });
    s.push('.');
  } else s.push(meds.length ? `No AI medicines; the doctor prescribed ${meds.length}.` : 'No medicines.');
  return s;
}

/** V13 contextual question + options for the diagnosis verdict (values are the stored ones). */
export function dxQuestion(f: DxFacts): { question: string; options: VerdictOption[] } {
  if (f.equivalent && !f.bestRank) {
    return { question: "Then: is the doctor's diagnosis right?", options: [
      { value: 'doctor_correct', label: 'Doctor is right, AI missed it' }, { value: 'ai_correct', label: "The AI's name was right" },
      { value: 'both_acceptable', label: 'Both acceptable, same condition' }, { value: 'neither', label: 'Neither is right' }] };
  }
  if (!f.bestRank) {
    return { question: "The doctor picked none of the AI's 5. Who was right?", options: [
      { value: 'doctor_correct', label: 'Doctor is right, AI missed it' }, { value: 'ai_correct', label: 'AI is right, doctor should have picked it' },
      { value: 'both_acceptable', label: 'Both acceptable' }, { value: 'neither', label: 'Neither is right' }] };
  }
  return { question: `The doctor added ${list(f.ownDx.map(lc))}. Did the AI miss ${f.ownDx.length === 1 ? 'it' : 'them'}?`, options: [
    { value: 'doctor_correct', label: `Yes, the AI missed ${f.ownDx.length === 1 ? 'it' : 'them'}` }, { value: 'ai_correct', label: 'No, the AI list was enough' },
    { value: 'both_acceptable', label: 'Both acceptable' }, { value: 'neither', label: 'Neither is right' }] };
}
export const INSUFFICIENT: VerdictOption = { value: 'insufficient', label: 'Note too thin to judge' };

/** V14 contextual question for the treatment-plan verdict. */
export function txQuestion(plan: PlanItem[]): { question: string; options: VerdictOption[] } {
  const g = planGroups(plan);
  const bits: string[] = [];
  if (g.not_used.length) bits.push(`dropped ${list(g.not_used.map((i) => i.name.split(' ')[0]))}`);
  if (g.changed.length) bits.push(`changed ${list(g.changed.map((i) => lc(i.name.split(' ')[0])))}${g.changed[0]?.changes?.length ? ` (${g.changed[0].changes.join(', ')})` : ''}`);
  if (g.added.length) bits.push(`added ${list(g.added.map((i) => i.name.split(' ')[0]))}`);
  return {
    question: bits.length ? `The doctor ${list(bits)}. Whose plan is right?` : 'Whose plan is right?',
    options: [{ value: 'doctor_correct', label: "The doctor's" }, { value: 'ai_correct', label: "The AI's" }, { value: 'both_acceptable', label: 'Both acceptable' }, { value: 'neither', label: 'Neither' }],
  };
}
