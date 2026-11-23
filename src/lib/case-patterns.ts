/**
 * #17 Case patterns: pure definitions behind the collapsed "Case patterns" section of the AI Dashboard
 * Diagnosis and Treatment tabs. Counts come from the backend (src/mismatch/case-patterns.ts).
 */
import type { CasePatterns, PatternKey } from '@/lib/api/mismatch';

export type PatternKind = 'dx' | 'ttx';

/** One group of a 100% split: every case is in exactly one group of its kind. */
export interface PatternGroup { key: PatternKey; label: string; tone: 'ai' | 'mixed' | 'own' | 'none' }
export const GROUPS: Record<PatternKind, PatternGroup[]> = {
  dx: [
    { key: 'dxOnlyAi', label: 'Only AI diagnoses', tone: 'ai' },
    { key: 'dxAiPlusOwn', label: 'AI + own diagnoses', tone: 'mixed' },
    { key: 'dxOnlyOwn', label: 'Only own diagnoses', tone: 'own' },
    { key: 'dxNone', label: 'No diagnosis recorded', tone: 'none' },
  ],
  ttx: [
    { key: 'ttxOnlyAi', label: 'Only AI medicines', tone: 'ai' },
    { key: 'ttxMixed', label: 'AI + own medicines', tone: 'mixed' },
    { key: 'ttxNoAiSelected', label: 'No AI medicine selected', tone: 'none' },
  ],
};
export const BASE: Record<PatternKind, PatternKey> = { dx: 'dxScored', ttx: 'ttxCases' };
export const BASE_LABEL: Record<PatternKind, string> = { dx: 'visits with an AI Dx list', ttx: 'TTx cases' };

/** A row of the metrics table: a share of the base (n, %) or an average per case. */
export interface PatternStat { label: string; key: PatternKey; kind: 'share' | 'avg'; sub?: boolean }
export const STATS: Record<PatternKind, PatternStat[]> = {
  dx: [
    { label: 'Visits with multiple diagnoses', key: 'dxMulti', kind: 'share' },
    { label: 'with ≥ 2 AI diagnoses', key: 'dxMultiAi', kind: 'share', sub: true },
    { label: 'with AI + own diagnoses', key: 'dxMultiMixed', kind: 'share', sub: true },
    { label: 'with ≥ 2 and no AI diagnosis', key: 'dxMultiNoAi', kind: 'share', sub: true },
    { label: 'Diagnoses per case', key: 'dxTotal', kind: 'avg' },
    { label: 'AI diagnoses selected per case', key: 'dxAiSelected', kind: 'avg' },
    { label: 'Own diagnoses added per case', key: 'dxOwnAdded', kind: 'avg' },
  ],
  ttx: [
    { label: 'AI medicines suggested per case', key: 'ttxAiSuggested', kind: 'avg' },
    { label: 'AI medicines selected per case', key: 'ttxAiSelected', kind: 'avg' },
    { label: 'Medicines the doctor added per case', key: 'ttxOwnAdded', kind: 'avg' },
    { label: 'Medicines prescribed per case', key: 'ttxPrescribed', kind: 'avg' },
  ],
};

/** Value of one stat: % of the base for a share, the mean per case for an average; null without a base. */
export function statValue(p: Partial<CasePatterns> | undefined, kind: PatternKind, s: PatternStat): number | null {
  const base = p?.[BASE[kind]] ?? 0;
  if (!base) return null;
  const n = p?.[s.key] ?? 0;
  return s.kind === 'share' ? (100 * n) / base : n / base;
}

/** Shares of the base per group (they sum to 100 when the base is non-zero). */
export function groupShares(p: Partial<CasePatterns> | undefined, kind: PatternKind): { group: PatternGroup; n: number; pct: number }[] {
  const base = p?.[BASE[kind]] ?? 0;
  return GROUPS[kind].map((group) => {
    const n = p?.[group.key] ?? 0;
    return { group, n, pct: base ? (100 * n) / base : 0 };
  });
}

/** "+1.2 pts" / "+0.3" against the previous period, or null when either side has no base. */
export function deltaText(cur: number | null, prev: number | null, s: PatternStat): string | null {
  if (cur === null || prev === null) return null;
  const d = cur - prev;
  const v = s.kind === 'share' ? Math.abs(d).toFixed(1) : Math.abs(d).toFixed(2);
  return `${d >= 0 ? '+' : '−'}${v}${s.kind === 'share' ? ' pts' : ''}`;
}
