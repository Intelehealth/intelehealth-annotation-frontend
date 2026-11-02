import { describe, expect, it } from 'vitest';
import type { PlanItem } from '@/lib/api/mismatch';
import { diffParts, dxQuestion, dxSentence, INSUFFICIENT, likelihoodWidth, planGroups, txQuestion, txSentence } from './visit-v2-logic';

const STORED_DX = ['doctor_correct', 'ai_correct', 'both_acceptable', 'neither'];
const text = (s: (string | { b: string })[]) => s.map((x) => (typeof x === 'string' ? x : x.b)).join('');
const base = { followUpOnly: false, ddxAvailable: true, bestRank: null, ownDx: [], doctorDx: [], equivalent: null };

describe('visit v2 wording', () => {
  it('every question maps 1:1 onto the stored verdict values', () => {
    for (const f of [{ ...base, bestRank: 5, picked: 'Underweight', ownDx: ['Acidity'] }, { ...base, doctorDx: ['Musculoskeletal pain'] },
      { ...base, equivalent: { aiName: 'URTI', aiRank: 1, doctorName: 'Acute URTI' } }]) {
      expect(dxQuestion(f).options.map((o) => o.value)).toEqual(STORED_DX);
    }
    expect(txQuestion([]).options.map((o) => o.value)).toEqual(STORED_DX);
    expect(INSUFFICIENT.value).toBe('insufficient');
  });
  it('builds the diagnosis sentence from data', () => {
    expect(text(dxSentence({ ...base, bestRank: 5, picked: 'Underweight', ownDx: ['Acidity', 'Fatigue'] }))).toBe("The doctor kept the AI's #5, underweight, and added 2 the AI didn't list: acidity and fatigue.");
    expect(text(dxSentence({ ...base, doctorDx: ['Musculoskeletal pain'], top1: 'Arthritis' }))).toBe("The doctor picked none of the AI's 5 and wrote musculoskeletal pain. The AI's #1 was arthritis.");
    expect(text(dxSentence({ ...base, followUpOnly: true }))).toBe('Follow-up visit: no diagnosis to compare.');
  });
  it('groups the plan generically and splits the change', () => {
    const plan = [
      { type: 'medicine', name: 'Omeprazole 20 mg', ai: '1 capsule · Once daily · 5 weeks', doctor: '1 capsule · Once daily · 5 Days · In the morning', outcome: 'changed', changes: ['duration'] },
      { type: 'medicine', name: 'IFA tablet', ai: '1 tablet', doctor: null, outcome: 'not_used' },
      { type: 'test', name: 'CBC', ai: null, doctor: 'CBC', outcome: 'ai_not_available' },
      { type: 'test', name: 'Urine', ai: 'Urine', doctor: 'Urine', outcome: 'exact' },
    ] as PlanItem[];
    const g = planGroups(plan);
    expect([g.changed.length, g.not_used.length, g.exact.length, g.rest.length]).toEqual([1, 1, 1, 1]);
    expect(diffParts(plan[0].ai, plan[0].doctor)).toEqual({ same: ['1 capsule', 'Once daily'], aiOnly: ['5 weeks'], doctorOnly: ['5 Days', 'In the morning'] });
    expect(text(txSentence(plan))).toBe('Of 2 AI medicines, 1 changed (omeprazole) and 1 not used (IFA).');
    expect(txQuestion(plan).question).toBe('The doctor dropped IFA and changed omeprazole (duration). Whose plan is right?');
  });
  it('maps likelihood labels to five bar steps', () => {
    expect(['High', 'Moderate-High', 'Moderate', 'Low-Moderate', 'Low', ''].map(likelihoodWidth)).toEqual([100, 80, 60, 40, 20, 0]);
  });
});
