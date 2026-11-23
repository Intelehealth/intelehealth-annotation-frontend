import { describe, expect, it } from 'vitest';
import { deltaText, groupShares, STATS, statValue } from './case-patterns';

const dx = { dxScored: 10, dxOnlyAi: 5, dxAiPlusOwn: 3, dxOnlyOwn: 1, dxNone: 1, dxMulti: 4, dxMultiAi: 2, dxMultiMixed: 3, dxMultiNoAi: 0, dxTotal: 15, dxAiSelected: 10, dxOwnAdded: 5 };
const ttx = { ttxCases: 4, ttxOnlyAi: 1, ttxMixed: 1, ttxNoAiSelected: 2, ttxAiSuggested: 6, ttxAiSelected: 3, ttxOwnAdded: 3, ttxPrescribed: 6 };

describe('case patterns (#17)', () => {
  it('splits the base into groups that sum to 100%', () => {
    const g = groupShares(dx, 'dx');
    expect(g.map((x) => x.n)).toEqual([5, 3, 1, 1]);
    expect(g.reduce((a, x) => a + x.pct, 0)).toBeCloseTo(100);
    expect(groupShares(ttx, 'ttx').map((x) => x.pct)).toEqual([25, 25, 50]);
  });
  it('shares are % of the base, averages are per case', () => {
    const multi = STATS.dx.find((s) => s.key === 'dxMulti')!;
    const perCase = STATS.dx.find((s) => s.key === 'dxTotal')!;
    expect(statValue(dx, 'dx', multi)).toBe(40);
    expect(statValue(dx, 'dx', perCase)).toBe(1.5);
    expect(statValue(ttx, 'ttx', STATS.ttx[3])).toBe(1.5);
  });
  it('no base -> no value and no delta', () => {
    expect(statValue({ dxScored: 0 }, 'dx', STATS.dx[0])).toBeNull();
    expect(statValue(undefined, 'ttx', STATS.ttx[0])).toBeNull();
    expect(deltaText(40, null, STATS.dx[0])).toBeNull();
  });
  it('deltas in points for shares and in units for averages', () => {
    expect(deltaText(40, 37.5, STATS.dx[0])).toBe('+2.5 pts');
    expect(deltaText(1.5, 1.75, STATS.dx[4])).toBe('−0.25');
  });
});
