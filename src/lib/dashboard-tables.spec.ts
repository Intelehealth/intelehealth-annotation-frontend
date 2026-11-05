import { describe, expect, it } from 'vitest';
import type { DashboardData } from '@/lib/api/mismatch';
import { doctorTable, planTable } from './dashboard-tables';

const tat = (o: object) => ({ name: 'x', visits: 10, shared: 10, waitMedian: 1, waitP90: 2, consultMedian: 3, consultP90: 7, totalMedian: 5, totalP90: 9, sharedWithin1h: 9, over24h: 0, ...o });
const data = {
  ai: {
    byDoctor: [
      { name: '111', visits: 20, scored: 20, picked: 12, top1: 10, top3: 14, top5: 16, addedNonAi: 2, ttxGenerated: 10, casesUnchanged: 4, casesChanged: 3 },
      { name: '222', visits: 3, scored: 3, picked: 1, top1: 1, top3: 2, top5: 3, addedNonAi: 0, ttxGenerated: 2, casesUnchanged: 1, casesChanged: 1 },
    ],
  },
  plan: [
    { type: 'medicine', aiAvailable: true, visits: 40, generated: 20, aiItems: 50, casesUnchanged: 8, casesChanged: 6, casesNotPicked: 4, casesAdded: 10, doctorEntered: 30,
      byItem: [], byDoctor: [{ doctor: '111', generated: 10, casesUnchanged: 4, casesChanged: 3, casesNotPicked: 2, casesAdded: 5, doctorEntered: 9 }] },
    { type: 'test', aiAvailable: false, visits: 40, generated: 0, aiItems: 0, casesUnchanged: 0, casesChanged: 0, casesNotPicked: 0, casesAdded: 0, doctorEntered: 8, byItem: [], byDoctor: [] },
  ],
  doctors: [{ doctor: '111', visits: 20, mismatches: 6, annotated: 4 }],
  tat: { byDoctorKind: [{ ...tat({}), doctor: '111', kind: 'new' }, { ...tat({ visits: 3 }), doctor: '111', kind: 'follow_up' }] },
} as unknown as DashboardData;

describe('doctorTable', () => {
  it('matches the Doctors tab: one row per doctor, same columns', () => {
    const { cols, rows } = doctorTable(data);
    expect(cols).toHaveLength(16);
    expect(rows.every((r) => r.length === cols.length)).toBe(true);
    expect(rows[0]).toEqual(['Dr #111', 20, 0.5, 0.7, 0.8, 10, 0.4, 0.3, 0.2, 0.5, 6, 4, 3, 7, null, null]);
  });
  it('blanks rates under 5 visits and missing joins; never shows names', () => {
    const r = doctorTable(data).rows[1];
    expect(r[0]).toBe('Dr #222');
    expect(r.slice(2, 5)).toEqual([null, null, null]);
    expect(r.slice(6, 16)).toEqual([null, null, null, null, null, null, null, null, null, null]);
  });
});

describe('planTable', () => {
  it('one row per plan type; non-AI types read "AI not suggesting yet"', () => {
    const { cols, rows } = planTable(data);
    expect(rows.every((r) => r.length === cols.length)).toBe(true);
    expect(rows[0]).toEqual(['Medicines', 0.5, 0.4, 0.3, 0.2, 0.5, 30, 0.75]);
    expect(rows[1]).toEqual(['Tests', 'AI not suggesting yet', null, null, null, null, 8, 0.2]);
  });
  it('is empty without plan data', () => {
    expect(planTable({ ...data, plan: undefined }).rows).toEqual([]);
  });
});
