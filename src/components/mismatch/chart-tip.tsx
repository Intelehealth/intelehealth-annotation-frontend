'use client';

/**
 * Hover / focus / tap tooltips for the dashboard charts. One card look for every chart:
 * the custom SVG trends and inline bars use FloatingTip (fixed, in a portal, clamped to the
 * visible part of the chart so it never shifts layout or leaves the chart); the recharts charts
 * pass RechartsTip as their Tooltip content (recharts keeps it inside the chart itself).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { placeTip, visibleBounds, type Tip } from '@/lib/chart-tooltip';

export function TipCard({ tip }: { tip: Tip }) {
  return (
    <div className="max-w-[260px] rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-md">
      <div className="mb-1 font-semibold">{tip.title}</div>
      <table className="border-collapse">
        <tbody>
          {tip.rows.map((r) => (
            <tr key={r.name}>
              <td className="py-0.5 pr-1.5 align-middle">
                {!r.color ? null : r.line
                  ? <i className="block h-0.5 w-3.5" style={{ background: r.dash ? `repeating-linear-gradient(90deg, ${r.color} 0 4px, transparent 4px 7px)` : r.color }} />
                  : <i className="block h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />}
              </td>
              <td className="py-0.5 pr-3 text-muted-foreground">{r.name}</td>
              <td className="whitespace-nowrap py-0.5 text-right font-medium tabular-nums">{r.value}</td>
              <td className="whitespace-nowrap py-0.5 pl-1.5 text-right tabular-nums text-muted-foreground">{r.sub ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {tip.n && <div className="mt-1 border-t border-rule pt-1 tabular-nums text-muted-foreground">n {tip.n}</div>}
    </div>
  );
}

type Anchor = { x: number; y: number; side?: 'side' | 'above' };
type Shown = { tip: Tip; x: number; y: number; side?: 'side' | 'above'; target: Element; bounds: Element };

/** Inline bars: the tip sits centred above the bar, so the hovered row stays readable. */
export const barTop = (el: Element): Anchor => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top, side: 'above' }; };
/** The section (card) around a mark: the bounds for the inline bars' tips. */
export const inSection = (el: Element) => el.closest('section');

/**
 * The last pointer type seen anywhere on the page. After a tap, browsers emulate mouse events at
 * stale or synthetic positions (mouseenter on another mark, mouseleave right after the tap), so while
 * the last pointer was a finger or pen, mouse enter / leave are ignored: a tapped tip stays until a
 * tap elsewhere, blur or scroll.
 */
let lastPointer = 'mouse';
let pointerWatch = false;
function watchPointer() {
  if (pointerWatch || typeof document === 'undefined') return;
  pointerWatch = true;
  document.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);
}
const viaMouse = () => lastPointer === 'mouse';

/**
 * State for one chart's floating tip. `bind(tip, bounds, at?)` returns the handlers for a focusable
 * mark: mouse enter / keyboard focus / tap show it, leave / blur / a tap elsewhere / scroll hide it.
 * `bounds` maps the mark to the element the tip must stay inside; `at` maps it to the anchor point
 * in client coordinates (default: its top centre).
 */
export function useFloatingTip() {
  const [shown, setShown] = useState<Shown | null>(null);
  const hide = useCallback(() => setShown(null), []);

  useEffect(watchPointer, []);
  useEffect(() => {
    if (!shown) return;
    const away = (e: PointerEvent) => { if (!(e.target instanceof Node) || !shown.target.contains(e.target)) setShown(null); };
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    document.addEventListener('pointerdown', away, true);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      document.removeEventListener('pointerdown', away, true);
    };
  }, [shown, hide]);

  const bind = useCallback((tip: Tip | null, bounds: (mark: Element) => Element | null, at?: (mark: Element) => Anchor) => {
    const show = (e: MouseEvent<Element> | FocusEvent<Element>) => {
      const b = bounds(e.currentTarget);
      if (!tip || !b) return;
      const r = e.currentTarget.getBoundingClientRect();
      const p: Anchor = at ? at(e.currentTarget) : { x: r.left + r.width / 2, y: r.top };
      setShown({ tip, x: p.x, y: p.y, side: p.side, target: e.currentTarget, bounds: b });
    };
    return {
      onMouseEnter: (e: MouseEvent<Element>) => { if (viaMouse()) show(e); },
      onFocus: show,
      onClick: show,
      onMouseLeave: () => { if (viaMouse()) hide(); },
      onBlur: hide,
    };
  }, [hide]);

  return { shown, bind, hide };
}

/** The positioned card for useFloatingTip's state. Render it once per chart. */
export function FloatingTip({ shown }: { shown: Shown | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!shown || !el) { setPos(null); return; }
    const b = shown.bounds.getBoundingClientRect();
    const bounds = visibleBounds({ left: b.left, top: b.top, width: b.width, height: b.height }, { width: window.innerWidth, height: window.innerHeight });
    setPos(placeTip({ x: shown.x, y: shown.y }, { w: el.offsetWidth, h: el.offsetHeight }, bounds, 12, shown.side));
  }, [shown]);
  if (!shown || typeof document === 'undefined') return null;
  return createPortal(
    <div ref={ref} role="tooltip" className="pointer-events-none fixed z-50"
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}>
      <TipCard tip={shown.tip} />
    </div>,
    document.body,
  );
}

type RechartsPayload = { name?: string | number; value?: unknown; color?: string; fill?: string; dataKey?: unknown; payload?: Record<string, unknown> };

/** Tooltip content for a recharts chart: `build` turns the hovered category into a Tip (null = none). */
export function RechartsTip({ active, payload, label, build }: {
  active?: boolean; payload?: RechartsPayload[]; label?: string | number;
  build: (label: string, payload: RechartsPayload[]) => Tip | null;
}) {
  if (!active || !payload?.length) return null;
  const tip = build(String(label ?? ''), payload);
  return tip ? <TipCard tip={tip} /> : null;
}
