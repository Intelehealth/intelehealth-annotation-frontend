/**
 * Paediatric vs general concentric rings (Overview). Pure model + tooltip text, unit-tested in
 * paed-rings.spec.ts. Every count comes straight from the dashboard's ai.headline.paediatric / .adult
 * (the same numbers as the panel's table); nothing is rebuilt from rounded percentages.
 *   outer  Cases             visits                    (no rate)
 *   middle AI top 5          top5 of dxScored          (= table "In the top 5")
 *   inner  AI medicine kept  casesUnchanged of ttxGenerated (= table "Kept unchanged")
 * Each ring is split Paediatric | General and sums to 100% of its own total.
 */
import type { Tip } from './chart-tooltip';

export type GroupCounts = { visits: number; dxScored: number; top5: number; ttxGenerated: number; casesUnchanged: number };
export type RingSlice = { group: 'Paediatric' | 'General'; color: string; count: number; base?: number };
/** `metric`: the panel table's row label for this ring's count / rate. */
export type Ring = { key: 'cases' | 'top5' | 'kept'; label: string; metric: string; total: number; slices: RingSlice[] };

export const PAED_COLOR = 'var(--data)';
export const GENERAL_COLOR = '#8a9099';

export function paedRings(p: GroupCounts, g: GroupCounts): Ring[] {
  const ring = (key: Ring['key'], label: string, metric: string, count: (x: GroupCounts) => number, base?: (x: GroupCounts) => number): Ring => {
    const slices: RingSlice[] = [
      { group: 'Paediatric', color: PAED_COLOR, count: count(p), base: base?.(p) },
      { group: 'General', color: GENERAL_COLOR, count: count(g), base: base?.(g) },
    ];
    return { key, label, metric, total: slices[0].count + slices[1].count, slices };
  };
  return [
    ring('cases', 'Cases', 'Visits', (x) => x.visits),
    ring('top5', 'AI top 5', 'In the top 5', (x) => x.top5, (x) => x.dxScored),
    ring('kept', 'AI medicine kept', 'Kept unchanged', (x) => x.casesUnchanged, (x) => x.ttxGenerated),
  ];
}

const num = (n: number) => n.toLocaleString('en-IN');
const pct1 = (n: number, of: number) => (of ? `${((100 * n) / of).toFixed(1)}%` : '—');

/**
 * One slice: its count (with the rate over its own base where the ring has one, named as in the
 * table) and its share of the ring.
 */
export function sliceTip(ring: Ring, s: RingSlice): Tip {
  return {
    title: `${s.group} · ${ring.label}`,
    rows: [
      s.base === undefined
        ? { name: ring.metric, color: s.color, value: num(s.count) }
        : { name: ring.metric, color: s.color, value: pct1(s.count, s.base), sub: `${num(s.count)} of ${num(s.base)}` },
      { name: 'Share of ring', color: '', value: pct1(s.count, ring.total) },
    ],
  };
}

/** A ring with no cases in the period: drawn empty, its tip gives 0 for both groups. */
export function emptyRingTip(ring: Ring): Tip {
  return { title: ring.label, rows: ring.slices.map((s) => ({ name: s.group, color: s.color, value: '0' })) };
}

/**
 * Stroke dash for slice i of a ring drawn as a circle stroke of circumference `circ`, starting at
 * 12 o'clock and going clockwise: [dash length, gap length, dash offset]. Slices with no count get
 * no dash (null). `sep` px is taken off each visible slice when both are drawn, as a separator.
 */
export function sliceDash(ring: Ring, i: number, circ: number, sep = 1.5): [number, number, number] | null {
  const s = ring.slices[i];
  if (!ring.total || !s.count) return null;
  const before = ring.slices.slice(0, i).reduce((a, x) => a + x.count, 0);
  const both = ring.slices.every((x) => x.count > 0);
  const len = Math.max(0, (circ * s.count) / ring.total - (both ? sep : 0));
  return [len, circ - len, -(circ * before) / ring.total];
}

/** Mid-angle of slice i in radians, 0 = 12 o'clock, clockwise (anchor point for its tip). */
export function sliceMidAngle(ring: Ring, i: number): number {
  if (!ring.total) return 0;
  const before = ring.slices.slice(0, i).reduce((a, x) => a + x.count, 0);
  return (2 * Math.PI * (before + ring.slices[i].count / 2)) / ring.total;
}
