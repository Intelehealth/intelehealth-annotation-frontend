'use client';

/**
 * Wave 2 Overview (drop-2 overview.html as the layout reference; PM no-regression list governs content):
 *   D1  KPI strips with deltas vs the previous equal period (good / bad colour, the window named)
 *       + the must-keeps: Dx list generated %, TTx list generated %, AI medicines per case, Top-3.
 *   D3  "Equivalent listed, not picked" row under the KPIs, linking to the pairs (Diagnosis tab).
 *   D5  "Is it improving?": weekly when the median is under 20 visits a day, straight lines, n per point,
 *       Top-1 / Top-3 / Top-5, outage weeks drawn as gaps; plus the TTx trend (kept / changed).
 *   D2  "Where it fails" (doctor's diagnoses most often not at the AI's #1, rank bars) and
 *       "Right list, wrong #1" on the first screen; Paediatric vs general WITH treatment rows; by doctor.
 */
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { displayName } from '@/lib/format-display';
import { doctorLabel, type AiHeadline, type DashboardData, type DxAgg } from '@/lib/api/mismatch';

type TabKey = 'diagnosis' | 'doctors' | 'treatment';
const fmt = (n: number) => n.toLocaleString();
const pct = (n: number, d: number) => (d ? (100 * n) / d : null);
const pctText = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);

/** One KPI: value, delta in points vs the previous period, coloured by which direction is good. */
function Kpi({ label, n, of, prev, better, lead, value, note }: {
  label: string; n?: number; of?: number; prev?: { n: number; of: number } | null; better?: 'up' | 'down';
  lead?: boolean; value?: string; note?: ReactNode;
}) {
  const cur = n !== undefined && of !== undefined ? pct(n, of) : null;
  const was = prev ? pct(prev.n, prev.of) : null;
  const d = cur !== null && was !== null ? cur - was : null;
  const tone = d === null || Math.abs(d) < 1 || !better ? 'flat' : (d > 0) === (better === 'up') ? 'good' : 'bad';
  return (
    <div className="-ml-px -mt-px min-w-0 border-l border-t border-border px-5 py-4">
      <div className="min-h-[2.6em] text-sm text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 font-medium tabular-nums tracking-tight', lead ? 'text-[32px] leading-tight' : 'text-2xl')}>
        {value ?? (cur === null ? '—' : <>{cur.toFixed(1)}<small className="ml-1 text-sm font-normal text-muted-foreground">%</small></>)}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {d !== null && <span className={cn('mr-1 font-medium', tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-muted-foreground')}>{d >= 0 ? '+' : '−'}{Math.abs(d).toFixed(1)} pts</span>}
        {d !== null && was !== null && <>vs {was.toFixed(1)}% · </>}
        {note ?? (n !== undefined && of !== undefined ? `${fmt(n)} of ${fmt(of)}` : null)}
      </div>
    </div>
  );
}

type Period = { label: string; visits: number; scored: number; top1: number; top3: number; top5: number; ttx: number; kept: number; changed: number; gap: boolean };

const monday = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
const short = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Daily rows, or weekly sums when the median day has fewer than 20 visits (D5). Outage = AI list on under half the visits. */
function periods(byDay: DashboardData['ai']['byDay']): { rows: Period[]; weekly: boolean } {
  const days = byDay.filter((d) => d.visits > 0);
  const sorted = [...days].map((d) => d.visits).sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const weekly = median < 20;
  const map = new Map<string, Period>();
  for (const d of days) {
    const k = weekly ? monday(d.name) : d.name;
    const g = map.get(k) ?? { label: k, visits: 0, scored: 0, top1: 0, top3: 0, top5: 0, ttx: 0, kept: 0, changed: 0, gap: false };
    g.visits += d.visits; g.scored += d.scored; g.top1 += d.top1; g.top3 += d.top3; g.top5 += d.top5;
    g.ttx += d.ttxGenerated; g.kept += d.casesUnchanged; g.changed += d.casesChanged;
    map.set(k, g);
  }
  const rows = [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  for (const r of rows) r.gap = r.visits >= 10 && r.scored / r.visits < 0.5;
  return { rows, weekly };
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(760);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Straight-line trend in SVG at the container width; n under each point; gaps where the AI list collapsed. */
function Trend({ rows, lines, base, gapNote }: {
  rows: Period[]; lines: { key: keyof Period; label: string; color: string; dash?: boolean }[]; base: (p: Period) => number; gapNote: (p: Period) => string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  if (rows.length < 2) return <p className="py-8 text-center text-sm text-muted-foreground">Too few points</p>;
  const H = 240, L = 40, R = 16, T = 12, B = 46;
  const step = (W - L - R) / rows.length;
  const x = (i: number) => L + (i + 0.5) * step;
  const y = (p: number) => T + (1 - p / 100) * (H - T - B);
  const thin = W < 520;
  const path = (key: keyof Period) => {
    let d = ''; let pen = false;
    rows.forEach((r, i) => {
      const b = base(r);
      if (r.gap || !b) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y((100 * (r[key] as number)) / b).toFixed(1)}`; pen = true;
    });
    return d;
  };
  return (
    <div ref={ref}>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {lines.map((l) => <span key={l.label} className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-3.5" style={{ background: l.color, opacity: l.dash ? 0.7 : 1 }} />{l.label}</span>)}
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Trend of ${lines.map((l) => l.label).join(', ')}`} className="block">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--grid)" strokeDasharray={g ? '3 3' : undefined} />
            <text x={L - 8} y={y(g) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">{g}%</text>
          </g>
        ))}
        {lines.map((l) => <path key={l.label} d={path(l.key)} fill="none" stroke={l.color} strokeWidth={2} strokeDasharray={l.dash ? '4 3' : undefined} opacity={l.dash ? 0.75 : 1} />)}
        {rows.map((r, i) => (
          <g key={r.label}>
            {r.gap ? (
              <>
                <text x={x(i)} y={y(55)} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">no AI list</text>
                <text x={x(i)} y={y(55) + 14} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">{gapNote(r)}</text>
              </>
            ) : base(r) ? lines.map((l) => {
              const v = (100 * (r[l.key] as number)) / base(r);
              return <circle key={l.label} cx={x(i)} cy={y(v)} r={2.5} fill={l.color}><title>{`${short(r.label)}: ${l.label} ${v.toFixed(1)}% (${r[l.key]} of ${base(r)})`}</title></circle>;
            }) : null}
            {(!thin || i % 2 === 1) && (
              <>
                <text x={x(i)} y={H - B + 18} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">{short(r.label)}</text>
                <text x={x(i)} y={H - B + 32} textAnchor="middle" fontSize={11} fill="var(--faint)">n {base(r)}</text>
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

const Card = ({ title, meta, children, className, id }: { title: ReactNode; meta?: ReactNode; children: ReactNode; className?: string; id?: string }) => (
  <section id={id} className={cn('rounded-lg border border-border bg-surface', className)}>
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 pt-4"><h2 className="text-base font-semibold">{title}</h2>{meta && <span className="text-xs text-muted-foreground">{meta}</span>}</div>
    <div className="px-5 pb-5 pt-3">{children}</div>
  </section>
);

function RankBar({ g }: { g: DxAgg }) {
  const segs: [number, string, string][] = [
    [g.top1, 'bg-data', "AI's #1"], [g.top3 - g.top1, 'bg-[#8a9099]', '#2–3'], [g.top5 - g.top3, 'bg-[#c3c8cf]', '#4–5'], [g.scored - g.top5, 'bg-bad', 'Not in top 5'],
  ];
  return (
    <div className="flex h-2.5 w-full max-w-[200px] overflow-hidden rounded-sm bg-rule">
      {segs.map(([v, c, l]) => (v > 0 ? <span key={l} className={c} style={{ width: `${(100 * v) / g.scored}%` }} title={`${l}: ${v}`} /> : null))}
    </div>
  );
}

const pv = (h: AiHeadline) => [
  ['Visits', fmt(h.visits)],
  ["AI's #1", pctText(pct(h.top1, h.dxScored))],
  ['In the top 3', pctText(pct(h.top3, h.dxScored))],
  ['In the top 5', pctText(pct(h.top5, h.dxScored))],
  ['TTx generated', pctText(pct(h.ttxGenerated, h.visits))],
  ['Kept unchanged', pctText(pct(h.casesUnchanged, h.ttxGenerated))],
  ['Changed', pctText(pct(h.casesChanged, h.ttxGenerated))],
  ['Not used', pctText(pct(h.casesNotPicked, h.ttxGenerated))],
  ['Doctor added a medicine', pctText(pct(h.casesAdded, h.ttxGenerated))],
] as const;

export function OverviewTab({ data, prev, prevLabel, base, onTab }: {
  data: DashboardData; prev: DashboardData | null; prevLabel: string | null; base: string; onTab: (t: TabKey) => void;
}) {
  const h = data.ai.headline.all;
  const p = prev?.ai.headline.all ?? null;
  const P = (n: (x: AiHeadline) => number, of: (x: AiHeadline) => number) => (p ? { n: n(p), of: of(p) } : null);
  const { rows, weekly } = useMemo(() => periods(data.ai.byDay), [data]);
  const fails = useMemo(() => [...data.ai.byDx].filter((g) => g.scored > 0 && g.scored - g.top1 > 0)
    .sort((a, b) => (b.scored - b.top1) - (a.scored - a.top1) || a.name.localeCompare(b.name)), [data]);
  const pairs = data.ai.equivalent?.pairs ?? [];
  const equivFor = (dx: string) => pairs.find((x) => x.doctorName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === dx.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
  const wrong1 = data.mismatchPairs.rankedLower.slice(0, 5);
  const top1Counts = new Map<string, number>();
  for (const x of data.mismatchPairs.rankedLower) { const a = x.name.split(' → ')[0]; top1Counts.set(a, (top1Counts.get(a) ?? 0) + x.count); }
  const worst = [...top1Counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const docs = [...data.ai.byDoctor].filter((d) => d.scored > 0).sort((a, b) => b.scored - a.scored).slice(0, 5);
  const { paediatric: ph, adult: ah } = data.ai.headline;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_384px]">
      <div className="min-w-0 space-y-4">
        <section className="overflow-hidden rounded-lg border border-border bg-surface" aria-label="Diagnosis KPIs">
          <div className="px-5 pt-3 text-xs text-muted-foreground">Diagnosis · base: {fmt(h.dxScored)} {base} with an AI list{prevLabel ? ` · deltas vs ${prevLabel}` : ''}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
            <Kpi lead label="Doctor's Dx was the AI's #1" n={h.top1} of={h.dxScored} prev={P((x) => x.top1, (x) => x.dxScored)} better="up" />
            <Kpi label="In the AI top 3" n={h.top3} of={h.dxScored} prev={P((x) => x.top3, (x) => x.dxScored)} better="up" />
            <Kpi label="In the AI top 5" n={h.top5} of={h.dxScored} prev={P((x) => x.top5, (x) => x.dxScored)} better="up" />
            <Kpi label="Doctor added own Dx" n={h.dxAddedNonAi} of={h.dxScored} prev={P((x) => x.dxAddedNonAi, (x) => x.dxScored)} better="down" />
            <Kpi label="AI generated a Dx list" n={h.dxGenerated} of={h.visits} prev={P((x) => x.dxGenerated, (x) => x.visits)} better="up" />
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-border px-5 py-3 text-[13px] text-muted-foreground">
            <span>Equivalent listed, not picked</span>
            <b className="text-[15px] font-semibold tabular-nums text-foreground">{fmt(h.dxEquivalentNotPicked)}</b>
            <span className="min-w-0 flex-1">visits · separate from the strict figures</span>
            <button type="button" className="text-foreground underline underline-offset-2" onClick={() => onTab('diagnosis')}>See the pairs</button>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-surface" aria-label="Treatment KPIs">
          <div className="px-5 pt-3 text-xs text-muted-foreground">Treatment · base: {fmt(h.ttxGenerated)} TTx cases ({base} with AI medicines){prevLabel ? ` · deltas vs ${prevLabel}` : ''}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
            <Kpi label="AI generated a TTx list" n={h.ttxGenerated} of={h.visits} prev={P((x) => x.ttxGenerated, (x) => x.visits)} better="up" />
            <Kpi label="AI medicines per case" value={h.ttxGenerated ? (h.aiMedicines / h.ttxGenerated).toFixed(1) : '—'} note={`${fmt(h.aiMedicines)} medicines${p && p.ttxGenerated ? ` · was ${(p.aiMedicines / p.ttxGenerated).toFixed(1)}` : ''}`} />
            <Kpi label="AI medicine kept as is" n={h.casesUnchanged} of={h.ttxGenerated} prev={P((x) => x.casesUnchanged, (x) => x.ttxGenerated)} better="up" />
            <Kpi label="AI medicine changed" n={h.casesChanged} of={h.ttxGenerated} prev={P((x) => x.casesChanged, (x) => x.ttxGenerated)} better="down" />
            <Kpi label="AI medicine not used" n={h.casesNotPicked} of={h.ttxGenerated} prev={P((x) => x.casesNotPicked, (x) => x.ttxGenerated)} better="down" />
            <Kpi label="Doctor added a medicine" n={h.casesAdded} of={h.ttxGenerated} prev={P((x) => x.casesAdded, (x) => x.ttxGenerated)} better="down" />
          </div>
        </section>

        <Card title="Is it improving?" meta={`${weekly ? 'Weekly' : 'Daily'} · % of visits with an AI list`}>
          <Trend rows={rows} base={(r) => r.scored} gapNote={(r) => `${r.scored} of ${r.visits}`}
            lines={[{ key: 'top1', label: "AI's #1", color: 'var(--data)' }, { key: 'top3', label: 'In the top 3', color: '#8a9099', dash: true }, { key: 'top5', label: 'In the top 5', color: 'var(--foreground)' }]} />
        </Card>

        <Card title="Treatment over time" meta={`${weekly ? 'Weekly' : 'Daily'} · % of TTx cases`}>
          <Trend rows={rows} base={(r) => r.ttx} gapNote={(r) => `${r.ttx} TTx cases`}
            lines={[{ key: 'kept', label: 'AI medicine kept as is', color: 'var(--data)' }, { key: 'changed', label: 'AI medicine changed', color: 'var(--foreground)' }]} />
        </Card>

        <Card id="fails" title="Where it fails" meta="Doctor's diagnoses most often not at the AI's #1">
          <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {[['bg-data', "AI's #1"], ['bg-[#8a9099]', '#2–3'], ['bg-[#c3c8cf]', '#4–5'], ['bg-bad', 'Not in top 5']].map(([c, l]) => <span key={l} className="inline-flex items-center gap-1.5"><i className={cn('inline-block h-2.5 w-2.5 rounded-sm', c)} />{l}</span>)}
          </div>
          {fails.length === 0 ? <p className="text-sm text-muted-foreground">No misses in this period.</p> : (
            <table className="block w-full text-sm sm:table">
              <thead className="hidden text-left text-xs text-muted-foreground sm:table-header-group">
                <tr><th className="border-b border-border py-2 pr-3 font-medium">Doctor&apos;s diagnosis</th><th className="border-b border-border py-2 pr-3 text-right font-medium">Scored</th><th className="border-b border-border py-2 pr-3 font-medium">Where the AI ranked it</th><th className="border-b border-border py-2 text-right font-medium">Not at #1</th></tr>
              </thead>
              <tbody className="block sm:table-row-group">
                {fails.slice(0, 6).map((g) => {
                  const eq = equivFor(g.name);
                  return (
                    <tr key={g.name} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-rule py-2.5 sm:table-row sm:py-0">
                      <td className="sm:border-b sm:border-rule sm:py-2.5 sm:pr-3">{displayName(g.name)}{eq && <span className="ml-1.5 inline-flex h-5 items-center rounded bg-pill-n-bg px-1.5 text-xs text-pill-n-ink">Equivalent: AI listed {displayName(eq.aiName)}</span>}</td>
                      <td className="text-right tabular-nums text-muted-foreground sm:border-b sm:border-rule sm:py-2.5 sm:pr-3 sm:text-foreground"><span className="sm:hidden">n </span>{fmt(g.scored)}</td>
                      <td className="col-span-2 sm:border-b sm:border-rule sm:py-2.5 sm:pr-3"><RankBar g={g} /></td>
                      <td className="col-span-2 text-xs text-muted-foreground sm:border-b sm:border-rule sm:py-2.5 sm:text-right sm:text-sm sm:tabular-nums sm:text-foreground"><span className="sm:hidden">Not at #1: </span>{fmt(g.scored - g.top1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <button type="button" className="mt-3 inline-flex h-8 items-center rounded-md border border-control px-3 text-sm hover:bg-raised" onClick={() => onTab('diagnosis')}>View all {fmt(data.ai.byDx.length)} diagnoses</button>
        </Card>
      </div>

      <aside className="min-w-0 space-y-4">
        <Card title="Right list, wrong #1" meta="AI's #1 → the doctor's diagnosis, when the doctor picked #2–#5">
          {worst && <p className="mb-2 text-[13px]"><b className="font-semibold">{displayName(worst[0])} is put first too often:</b> {fmt(worst[1])} of these visits.</p>}
          {wrong1.length === 0 ? <p className="text-sm text-muted-foreground">None in this period.</p> : (
            <ul className="divide-y divide-rule text-sm">
              {wrong1.map((x) => { const [ai, dr] = x.name.split(' → '); return (
                <li key={x.name} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0">{displayName(ai)}<div className="text-xs text-muted-foreground">→ doctor: {displayName(dr)}</div></div><span className="tabular-nums">{x.count}</span></li>
              ); })}
            </ul>
          )}
          <button type="button" className="mt-3 inline-flex h-8 items-center rounded-md border border-control px-3 text-sm hover:bg-raised" onClick={() => onTab('diagnosis')}>View all</button>
        </Card>

        <Card title="Paediatric vs general" meta={`Paediatric = age ${data.ai.headline.paediatricMaxAge} or under · ${base}`}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-1.5 text-sm">
            <span /><span className="text-right text-xs text-muted-foreground">Paediatric</span><span className="text-right text-xs text-muted-foreground">General</span>
            {pv(ph).map(([l, v], i) => (
              <div key={l} className={cn('contents', i === 4 && '[&>*]:border-t [&>*]:border-rule [&>*]:pt-1.5')}>
                <span className={i >= 4 ? 'text-muted-foreground' : ''}>{l}</span><span className="text-right tabular-nums">{v}</span><span className="text-right tabular-nums">{pv(ah)[i][1]}</span>
              </div>
            ))}
          </div>
          {ph.dxScored > 0 && ah.dxScored > 0 && (() => {
            const gap = (pct(ph.top1, ph.dxScored) ?? 0) - (pct(ah.top1, ah.dxScored) ?? 0);
            return Math.abs(gap) >= 1 ? <p className="mt-2 text-[13px] text-muted-foreground">{gap > 0 ? 'General' : 'Paediatric'} visits trail by {Math.abs(gap).toFixed(0)} pts at #1.</p> : null;
          })()}
        </Card>

        <Card title="By doctor" meta="Pseudo id · share of scored visits at the AI's #1">
          <ul className="divide-y divide-rule text-sm">
            {docs.map((d) => <li key={d.name} className="flex justify-between gap-3 py-2"><span>{doctorLabel(d.name)}</span><span className="tabular-nums text-muted-foreground">{fmt(d.scored)} scored · <span className="text-foreground">{pctText(pct(d.top1, d.scored))}</span> at #1</span></li>)}
          </ul>
          <button type="button" className="mt-3 inline-flex h-8 items-center rounded-md border border-control px-3 text-sm hover:bg-raised" onClick={() => onTab('doctors')}>Doctors tab</button>
        </Card>
      </aside>
    </div>
  );
}
