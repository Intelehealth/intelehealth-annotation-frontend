/**
 * #20 / #21: the mismatch queue keeps its view in the page URL, so a filtered view can be shared,
 * bookmarked and linked from the AI Dashboard. Pure helpers; the queue component calls them.
 */
import type { QueueQuery, QueueTab, QueueWindow } from '@/lib/api/mismatch';
import { DRILL_KEYS } from '@/lib/drill';

/** Query keys that belong to the queue view (everything else in the URL is left alone). */
export const QUEUE_KEYS = [
  'tab', 'mismatch', 'ddx', 'ttx', 'status', 'from', 'to', 'range', 'specialty', 'gender', 'age', 'dx', 'med',
  'reviewer', 'verdict', 'followUp', 'discussed', 'images', 'population', 'flag', 'model', 'doctor', 'q', 'sort',
  // #20/#29 a drill-down from an AI Dashboard number (src/lib/drill.ts)
  ...DRILL_KEYS,
] as const;
const KEYS = new Set<string>(QUEUE_KEYS);
const TABS: QueueTab[] = ['todo', 'done', 'all'];

/** The queue view in a URL query string, or null when it holds none (then the tab's saved filters apply). */
export function queueFromUrl(search: string): (QueueQuery & { tab?: QueueTab }) | null {
  const p = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const [k, v] of p.entries()) if (KEYS.has(k) && v !== '') out[k] = v;
  // `redFlag=1` is the readable alias of followUp=1 ("Flagged by clinical team").
  if (p.get('redFlag') === '1') out.followUp = '1';
  if (out.population && out.population !== 'paediatric' && out.population !== 'general') delete out.population;
  if (out.tab && !TABS.includes(out.tab as QueueTab)) delete out.tab;
  // A drill shows exactly the visits behind a dashboard number: no other filter, every visit (tab All).
  if (out.dm) {
    const drill: Record<string, string> = { tab: 'all' };
    for (const k of DRILL_KEYS) if (out[k]) drill[k] = out[k];
    return drill as QueueQuery & { tab?: QueueTab };
  }
  return Object.keys(out).length ? (out as QueueQuery & { tab?: QueueTab }) : null;
}

/** The tab a URL asks for, if any. */
export const tabFromUrl = (search: string): QueueTab | null => {
  const t = new URLSearchParams(search).get('tab');
  return TABS.includes(t as QueueTab) ? (t as QueueTab) : null;
};

/**
 * `?…` for the current view: other params kept (e.g. ?finished=1), queue keys replaced. Defaults are left
 * out (sort "AI missed first", tab "To annotate"), so an untouched queue keeps a clean URL.
 */
export function queueUrl(search: string, q: QueueQuery, tab: QueueTab): string {
  const p = new URLSearchParams(search);
  for (const k of [...p.keys()]) if (KEYS.has(k) || k === 'redFlag') p.delete(k);
  if (tab !== 'todo') p.set('tab', tab);
  for (const k of QUEUE_KEYS) {
    if (k === 'tab') continue;
    const v = (q as Record<string, unknown>)[k];
    if (v === undefined || v === null || v === '') continue;
    if (k === 'sort' && v === 'missed') continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-09" -> "Sep 2026". */
export const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym.slice(5, 7)} ${ym.slice(0, 4)}`;
const day = (ymd: string) => `${Number(ymd.slice(8, 10))} ${MONTHS[Number(ymd.slice(5, 7)) - 1]} ${ymd.slice(0, 4)}`;

/** What dates the list covers, as the server applied them. */
export function windowLabel(w: QueueWindow, idSearch = false): string {
  if (idSearch) return 'every date (ID search)';
  if (w.recent && w.from) return `last ${w.days} days, since ${day(w.from)}`;
  if (w.from && w.to) return `${day(w.from)} – ${day(w.to)}`;
  if (w.from) return `since ${day(w.from)}`;
  if (w.to) return `up to ${day(w.to)}`;
  return 'all dates';
}
