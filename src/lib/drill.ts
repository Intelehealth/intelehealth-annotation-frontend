/**
 * #20 / #29 Drill-down from an AI Dashboard number to the visits behind it.
 *
 * The link opens the mismatch queue with the drill in the URL; the server resolves it with the dashboard's own
 * rules (backend src/mismatch/drill.ts), so the list holds exactly the visits the number counts. Every other
 * queue filter is off while a drill is open.
 */

/** The drill's query keys (server: dm metric, dk key, row dimensions, dashboard filters; dl / du display only). */
export const DRILL_KEYS = ['dm', 'dk', 'ddoc', 'dday', 'dsp', 'dfx', 'dt1', 'dpop', 'dfrom', 'dto', 'dpopn', 'dfu', 'dmatch', 'dl', 'du'] as const;
export type DrillKey = (typeof DRILL_KEYS)[number];

/** One number: metric + key + the row's dimensions. */
export interface DrillSpec {
  m: string;
  k?: string;
  doctor?: string;
  day?: string;
  specialty?: string;
  finalDx?: string;
  aiTop1?: string;
  pop?: 'paediatric' | 'adult';
  /** A week / month row: its dates, narrowed to the dashboard's own range. */
  from?: string;
  to?: string;
}

/** The dashboard's own filters, carried into the drill. */
export interface DrillBase {
  workspaceId: string;
  from?: string;
  to?: string;
  population?: string;
  followUps?: string;
  dxMatch?: string;
}

/** What one unit of a metric is, when it is not a visit. */
export function unitOf(m: string): string | null {
  if (m.startsWith('med_') || m === 'change' || m === 'added_for') return 'medicines';
  if (m.startsWith('conf_')) return 'AI suggestions';
  if (m === 'pattern' || m === 'dx_added_name' || m.startsWith('pair_')) return 'entries';
  return null;
}

export function drillHref(base: DrillBase, spec: DrillSpec, label: string): string {
  const p = new URLSearchParams({ tab: 'all', dm: spec.m });
  const set = (k: DrillKey, v?: string) => { if (v) p.set(k, v); };
  set('dk', spec.k); set('ddoc', spec.doctor); set('dday', spec.day); set('dsp', spec.specialty);
  set('dfx', spec.finalDx); set('dt1', spec.aiTop1); set('dpop', spec.pop);
  const later = (a?: string, b?: string) => (a && b ? (a > b ? a : b) : a ?? b);
  const earlier = (a?: string, b?: string) => (a && b ? (a < b ? a : b) : a ?? b);
  set('dfrom', later(base.from, spec.from)); set('dto', earlier(base.to, spec.to)); set('dpopn', base.population);
  if (base.followUps === 'include') p.set('dfu', 'include');
  if (base.dxMatch === 'assisted') p.set('dmatch', 'assisted');
  set('dl', label.slice(0, 160));
  set('du', unitOf(spec.m) ?? undefined);
  return `/workspaces/${base.workspaceId}/mismatch?${p.toString()}`;
}

/** The drill part of a queue query, or null when the queue is not showing a drill. */
export function drillOf(q: Record<string, unknown>): Partial<Record<DrillKey, string>> | null {
  if (typeof q.dm !== 'string' || !q.dm) return null;
  const out: Partial<Record<DrillKey, string>> = {};
  for (const k of DRILL_KEYS) if (typeof q[k] === 'string' && q[k]) out[k] = q[k] as string;
  return out;
}

/** The dates of a day / week / month row of the dashboard ("2026-11-16" = day or week start, "2026-11" = month). */
export function bucketRange(name: string, grain: 'day' | 'week' | 'month'): { from: string; to: string } {
  if (grain === 'month') {
    const [y, m] = name.split('-').map(Number);
    return { from: `${name}-01`, to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
  }
  if (grain === 'week') {
    const d = new Date(`${name}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 6);
    return { from: name, to: d.toISOString().slice(0, 10) };
  }
  return { from: name, to: name };
}
