/**
 * Chart hover tooltips: pure placement and content helpers (unit-tested in chart-tooltip.spec.ts).
 * The site shows labels and values only (C1): a tip is a title, one row per series and an optional n.
 */

/** `line`: the series is a line (swatch drawn as a stroke, dashed when `dash`); otherwise a filled box. */
export type TipRow = { name: string; color: string; value: string; sub?: string; line?: boolean; dash?: boolean };
export type Tip = { title: string; rows: TipRow[]; n?: string };

export type Rect = { left: number; top: number; width: number; height: number };

/**
 * Where to put a box of size w x h next to an anchor point, all in the same (client) coordinates.
 * 'side' (chart points): right of the anchor, centred on it, flipped left when it would cross the
 * right edge. 'above' (inline bars): centred above the anchor, below it when there is no room above.
 * Then clamped into `bounds` so the tip never leaves the chart (a box wider than the bounds is pinned
 * to the left edge).
 */
export function placeTip(anchor: { x: number; y: number }, box: { w: number; h: number }, bounds: Rect, gap = 12, side: 'side' | 'above' = 'side'): { left: number; top: number } {
  const minX = bounds.left;
  const maxX = bounds.left + bounds.width - box.w;
  const minY = bounds.top;
  const maxY = bounds.top + bounds.height - box.h;
  let left: number;
  let top: number;
  if (side === 'above') {
    left = anchor.x - box.w / 2;
    top = anchor.y - gap - box.h;
    if (top < minY) top = anchor.y + gap;
  } else {
    left = anchor.x + gap;
    if (left > maxX) left = anchor.x - gap - box.w;
    top = anchor.y - box.h / 2;
  }
  left = Math.max(minX, Math.min(left, maxX));
  top = Math.max(minY, Math.min(top, maxY));
  if (maxY < minY) top = minY;
  return { left: Math.round(left), top: Math.round(top) };
}

/** The visible part of the chart: its rect intersected with the viewport. */
export function visibleBounds(chart: Rect, viewport: { width: number; height: number }, margin = 4): Rect {
  const left = Math.max(chart.left, margin);
  const top = Math.max(chart.top, margin);
  const right = Math.min(chart.left + chart.width, viewport.width - margin);
  const bottom = Math.min(chart.top + chart.height, viewport.height - margin);
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

const pct1 = (n: number, of: number) => `${((100 * n) / of).toFixed(1)}%`;
const num = (n: number) => n.toLocaleString('en-IN');

/**
 * One period of a percentage trend: each series as % of the period's base with its count; n = base.
 * Returns null where nothing is drawn (an outage period or a zero base), so those periods get no tip.
 */
export function trendTip<P>(title: string, row: P, lines: { key: keyof P; label: string; color: string; dash?: boolean }[], base: number, gap = false): Tip | null {
  if (gap || !base) return null;
  return {
    title,
    rows: lines.map((l) => {
      const v = Number(row[l.key]) || 0;
      return { name: l.label, color: l.color, line: true, dash: l.dash, value: pct1(v, base), sub: num(v) };
    }),
    n: num(base),
  };
}

/**
 * Parts of one whole (a stacked or 100% bar): each part's count and share of the total; n = total.
 * Parts with a zero count are not drawn, so they are left out; an empty whole has no tip.
 */
export function partsTip(title: string, parts: { name: string; color: string; count: number }[], opts: { share?: boolean; total?: number } = {}): Tip | null {
  const shown = parts.filter((p) => p.count > 0);
  const total = opts.total ?? shown.reduce((s, p) => s + p.count, 0);
  if (!shown.length || !total) return null;
  const share = opts.share ?? true;
  return {
    title,
    rows: shown.map((p) => (share
      ? { name: p.name, color: p.color, value: pct1(p.count, total), sub: num(p.count) }
      : { name: p.name, color: p.color, value: num(p.count) })),
    n: num(total),
  };
}

/**
 * Counts (a bar chart in counts): one row per non-empty series. With `total` (stacked bars) n is
 * the sum of the stack; without it there is no base.
 */
export function countTip(title: string, series: { name: string; color: string; count: number }[], opts: { total?: boolean } = {}): Tip | null {
  const shown = series.filter((s) => s.count > 0);
  if (!shown.length) return null;
  const tip: Tip = { title, rows: shown.map((s) => ({ name: s.name, color: s.color, value: num(s.count) })) };
  if (opts.total) tip.n = num(shown.reduce((a, s) => a + s.count, 0));
  return tip;
}

/** Text form of a tip, for the focusable element's accessible name. */
export function tipLabel(t: Tip): string {
  return [t.title, ...t.rows.map((r) => `${r.name} ${r.value}${r.sub ? ` (${r.sub})` : ''}`), ...(t.n ? [`n ${t.n}`] : [])].join(', ');
}
