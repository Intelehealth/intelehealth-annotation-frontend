'use client';

/**
 * #17 "Case patterns": what the doctor's final Dx list / prescription is made of. Collapsed by default
 * at the top of the Diagnosis and Treatment tabs, so the tabs stay short until someone needs it;
 * open / closed is remembered per viewer (this browser).
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CasePatterns } from '@/lib/api/mismatch';
import { BASE, BASE_LABEL, deltaText, GROUPS, groupShares, STATS, statValue, type PatternKind } from '@/lib/case-patterns';

const TONE: Record<string, string> = { ai: 'bg-blue-700', mixed: 'bg-sky-400', own: 'bg-amber-400', none: 'bg-slate-300' };
const th = 'px-3 py-2 font-medium';
const thR = 'px-3 py-2 text-right font-medium';
const td = 'px-3 py-2';
const tdR = 'px-3 py-2 text-right tabular-nums';
const fmt = (n: number) => n.toLocaleString();

type Row = { name: string } & Partial<CasePatterns>;

export function CasePatternsSection({ kind, patterns, prev, prevLabel, rows, grain, base }: {
  kind: PatternKind;
  patterns?: CasePatterns;
  prev?: CasePatterns | null;
  prevLabel?: string | null;
  /** byDay bucketed by the "Trend by" grain, newest first. */
  rows: Row[];
  grain: 'day' | 'week' | 'month';
  /** e.g. "visits (follow-ups excluded)" */
  base: string;
}) {
  const storeKey = `ai-dash-case-patterns-${kind}`;
  // Rendered only after the dashboard data loaded in the browser, so storage can be read on first render.
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(storeKey) === '1'; } catch { return false; /* storage unavailable: stays closed */ }
  });
  const toggle = () => {
    setOpen((o) => {
      try { localStorage.setItem(storeKey, o ? '0' : '1'); } catch { /* storage unavailable */ }
      return !o;
    });
  };

  const total = patterns?.[BASE[kind]] ?? 0;
  const shares = groupShares(patterns, kind);
  const trend = rows.filter((r) => (r[BASE[kind]] ?? 0) > 0);
  const Icon = open ? ChevronDown : ChevronRight;

  return (
    <section className="rounded-lg border bg-card" aria-label="Case patterns">
      <button type="button" onClick={toggle} aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <Icon className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-semibold">Case patterns</span>
        <span className="text-xs text-muted-foreground">{fmt(total)} {BASE_LABEL[kind]} · {base}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t px-4 py-4">
          {!total ? <p className="text-sm text-muted-foreground">No data in this period.</p> : (
            <>
              <div>
                <div className="flex h-6 w-full overflow-hidden rounded" role="img"
                  aria-label={shares.map((s) => `${s.group.label} ${s.pct.toFixed(1)}%`).join(', ')}>
                  {shares.filter((s) => s.n > 0).map((s) => (
                    <div key={s.group.key} className={TONE[s.group.tone]} style={{ width: `${s.pct}%` }}
                      title={`${s.group.label}: ${fmt(s.n)} of ${fmt(total)} (${s.pct.toFixed(1)}%)`} />
                  ))}
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                  {shares.map((s) => (
                    <li key={s.group.key} className="flex items-center gap-1.5">
                      <span className={cn('inline-block h-2.5 w-2.5 rounded-sm', TONE[s.group.tone])} />
                      {s.group.label} <b className="tabular-nums text-slate-900">{s.pct.toFixed(1)}%</b>
                      <span className="tabular-nums">({fmt(s.n)})</span>
                    </li>
                  ))}
                </ul>
              </div>

              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr><th className={cn(th, 'text-left')}>Metric</th><th className={thR}>Value</th><th className={thR}>{prevLabel ? `vs ${prevLabel.replace(/^deltas vs /, '')}` : 'vs previous'}</th></tr>
                </thead>
                <tbody className="divide-y">
                  {STATS[kind].map((s) => {
                    const v = statValue(patterns, kind, s);
                    const d = deltaText(v, statValue(prev ?? undefined, kind, s), s);
                    return (
                      <tr key={s.key}>
                        <td className={cn(td, s.sub && 'pl-8 text-slate-600')}>{s.label}</td>
                        <td className={tdR}>
                          {v === null ? '—' : s.kind === 'share' ? <>{fmt(patterns?.[s.key] ?? 0)} <span className="text-slate-500">({v.toFixed(1)}%)</span></> : v.toFixed(2)}
                        </td>
                        <td className={cn(tdR, 'text-slate-500')}>{d ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div>
                <h3 className="mb-1 text-xs font-medium text-slate-500">By {grain}</h3>
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card text-xs text-slate-500">
                      <tr>
                        <th className={cn(th, 'text-left')}>{grain === 'day' ? 'Date' : grain === 'week' ? 'Week of' : 'Month'}</th>
                        <th className={thR}>{BASE_LABEL[kind]}</th>
                        {GROUPS[kind].map((g) => <th key={g.key} className={thR}>{g.label}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {trend.map((r) => {
                        const b = r[BASE[kind]] ?? 0;
                        return (
                          <tr key={r.name}>
                            <td className={cn(td, 'whitespace-nowrap')}>{r.name}</td>
                            <td className={tdR}>{fmt(b)}</td>
                            {GROUPS[kind].map((g) => {
                              const n = r[g.key] ?? 0;
                              return <td key={g.key} className={tdR}>{fmt(n)} <span className="text-slate-500">({((100 * n) / b).toFixed(1)}%)</span></td>;
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
