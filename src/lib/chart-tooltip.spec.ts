import { describe, expect, it } from 'vitest';
import { countTip, partsTip, placeTip, tipLabel, trendTip, visibleBounds } from './chart-tooltip';

const bounds = { left: 0, top: 0, width: 390, height: 252 };

describe('placeTip', () => {
  it('puts the tip right of the anchor, centred on it', () => {
    expect(placeTip({ x: 100, y: 120 }, { w: 150, h: 80 }, bounds)).toEqual({ left: 112, top: 80 });
  });
  it('flips to the left near the right edge', () => {
    expect(placeTip({ x: 330, y: 120 }, { w: 150, h: 80 }, bounds)).toEqual({ left: 168, top: 80 });
  });
  it('clamps inside the bounds on every side (390 px chart)', () => {
    const p = placeTip({ x: 60, y: 5 }, { w: 150, h: 80 }, bounds);
    expect(p).toEqual({ left: 72, top: 0 });
    const q = placeTip({ x: 120, y: 250 }, { w: 300, h: 80 }, bounds);
    expect(q.left).toBeGreaterThanOrEqual(0);
    expect(q.left + 300).toBeLessThanOrEqual(390);
    expect(q.top + 80).toBeLessThanOrEqual(252);
  });
  it('above: centred over the anchor, below it when there is no room', () => {
    expect(placeTip({ x: 200, y: 150 }, { w: 100, h: 60 }, bounds, 8, 'above')).toEqual({ left: 150, top: 82 });
    expect(placeTip({ x: 200, y: 30 }, { w: 100, h: 60 }, bounds, 8, 'above')).toEqual({ left: 150, top: 38 });
    expect(placeTip({ x: 380, y: 150 }, { w: 100, h: 60 }, bounds, 8, 'above').left).toBe(290);
  });
  it('pins a box wider than the bounds to the left edge', () => {
    expect(placeTip({ x: 50, y: 50 }, { w: 500, h: 400 }, { left: 10, top: 20, width: 390, height: 252 })).toEqual({ left: 10, top: 20 });
  });
});

describe('visibleBounds', () => {
  it('intersects the chart with the viewport', () => {
    expect(visibleBounds({ left: -20, top: 100, width: 500, height: 900 }, { width: 390, height: 844 })).toEqual({ left: 4, top: 100, width: 382, height: 740 });
  });
});

describe('trendTip', () => {
  const lines = [{ key: 'top5' as const, label: 'In the top 5', color: 'a' }, { key: 'top1' as const, label: "AI's #1", color: 'b', dash: true }];
  it('gives each series as % of the base with its count, n = base', () => {
    expect(trendTip('Mon 3 Nov', { top5: 34, top1: 21 }, lines, 39)).toEqual({
      title: 'Mon 3 Nov',
      rows: [{ name: 'In the top 5', color: 'a', line: true, dash: undefined, value: '87.2%', sub: '34' }, { name: "AI's #1", color: 'b', line: true, dash: true, value: '53.8%', sub: '21' }],
      n: '39',
    });
  });
  it('has no tip where nothing is drawn', () => {
    expect(trendTip('x', { top5: 1, top1: 0 }, lines, 0)).toBeNull();
    expect(trendTip('x', { top5: 1, top1: 0 }, lines, 20, true)).toBeNull();
  });
});

describe('partsTip', () => {
  it('lists non-empty parts with share and count of the total', () => {
    const t = partsTip('Paracetamol', [{ name: 'Unchanged', color: 'a', count: 3 }, { name: 'Changed', color: 'b', count: 0 }, { name: 'Not used', color: 'c', count: 1 }], { total: 4 });
    expect(t).toEqual({ title: 'Paracetamol', rows: [{ name: 'Unchanged', color: 'a', value: '75.0%', sub: '3' }, { name: 'Not used', color: 'c', value: '25.0%', sub: '1' }], n: '4' });
  });
  it('is null for an empty whole', () => {
    expect(partsTip('x', [{ name: 'a', color: 'a', count: 0 }])).toBeNull();
  });
});

describe('countTip', () => {
  it('shows counts, n only for stacks', () => {
    expect(countTip('Dose', [{ name: 'Medicines', color: 'a', count: 1200 }])).toEqual({ title: 'Dose', rows: [{ name: 'Medicines', color: 'a', value: '1,200' }] });
    expect(countTip('11-03', [{ name: 'A', color: 'a', count: 2 }, { name: 'B', color: 'b', count: 0 }, { name: 'C', color: 'c', count: 5 }], { total: true })?.n).toBe('7');
  });
  it('is null for an empty column', () => {
    expect(countTip('11-08', [{ name: 'A', color: 'a', count: 0 }], { total: true })).toBeNull();
  });
});

describe('tipLabel', () => {
  it('reads the tip as text', () => {
    expect(tipLabel({ title: 'wk of 3 Nov', rows: [{ name: 'Top 5', color: 'a', value: '80.0%', sub: '8' }], n: '10' })).toBe('wk of 3 Nov, Top 5 80.0% (8), n 10');
  });
});
