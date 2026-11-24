import { describe, expect, it } from 'vitest';
import { emptyRingTip, paedRings, sliceDash, sliceMidAngle, sliceTip } from './paed-rings';

const p = { visits: 62, dxScored: 62, top5: 57, ttxGenerated: 40, casesUnchanged: 21 };
const g = { visits: 125, dxScored: 120, top5: 103, ttxGenerated: 90, casesUnchanged: 47 };

describe('paedRings', () => {
  it('takes every count from the headline, outer to inner', () => {
    const r = paedRings(p, g);
    expect(r.map((x) => [x.label, x.total, x.slices.map((s) => [s.group, s.count, s.base])])).toEqual([
      ['Cases', 187, [['Paediatric', 62, undefined], ['General', 125, undefined]]],
      ['AI top 5', 160, [['Paediatric', 57, 62], ['General', 103, 120]]],
      ['AI medicine kept', 68, [['Paediatric', 21, 40], ['General', 47, 90]]],
    ]);
  });
});

describe('sliceTip', () => {
  const [cases, top5] = paedRings(p, g);
  it('gives the rate over its own base and the share of the ring', () => {
    expect(sliceTip(top5, top5.slices[0])).toEqual({
      title: 'Paediatric · AI top 5',
      rows: [
        { name: 'In the top 5', color: 'var(--data)', value: '91.9%', sub: '57 of 62' },
        { name: 'Share of ring', color: '', value: '35.6%' },
      ],
    });
  });
  it('cases: count and share only', () => {
    expect(sliceTip(cases, cases.slices[1]).rows).toEqual([
      { name: 'Visits', color: '#8a9099', value: '125' },
      { name: 'Share of ring', color: '', value: '66.8%' },
    ]);
  });
  it('a zero base shows a dash, never NaN', () => {
    const [, t] = paedRings({ ...p, dxScored: 0, top5: 0 }, g);
    expect(sliceTip(t, t.slices[0]).rows[0].value).toBe('—');
  });
});

describe('empty rings', () => {
  const r = paedRings({ visits: 0, dxScored: 0, top5: 0, ttxGenerated: 0, casesUnchanged: 0 }, { visits: 3, dxScored: 3, top5: 0, ttxGenerated: 0, casesUnchanged: 0 });
  it('a ring with total 0 draws no slice and its tip gives 0', () => {
    expect(r[1].total).toBe(0);
    expect(sliceDash(r[1], 0, 100)).toBeNull();
    expect(sliceDash(r[1], 1, 100)).toBeNull();
    expect(emptyRingTip(r[1])).toEqual({ title: 'AI top 5', rows: [{ name: 'Paediatric', color: 'var(--data)', value: '0' }, { name: 'General', color: '#8a9099', value: '0' }] });
  });
  it('one group only: a full ring, no separator, the other slice not drawn', () => {
    expect(sliceDash(r[0], 0, 100)).toBeNull();
    expect(sliceDash(r[0], 1, 100)).toEqual([100, 0, -0]);
  });
});

describe('sliceDash / sliceMidAngle', () => {
  const [cases] = paedRings(p, g);
  it('splits the circumference by count from 12 o\'clock, with a separator', () => {
    const [a, b] = [sliceDash(cases, 0, 187)!, sliceDash(cases, 1, 187)!];
    expect(a).toEqual([60.5, 126.5, -0]);
    expect(b).toEqual([123.5, 63.5, -62]);
  });
  it('mid-angles sit in each slice', () => {
    expect(sliceMidAngle(cases, 0)).toBeCloseTo((Math.PI * 62) / 187);
    expect(sliceMidAngle(cases, 1)).toBeCloseTo((2 * Math.PI * (62 + 62.5)) / 187);
  });
});
