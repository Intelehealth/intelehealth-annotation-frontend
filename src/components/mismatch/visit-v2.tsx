'use client';

/**
 * Visit page v2 components (designer drop3: visit-v2.html, states.html, v2.css, quality-spec.md).
 * V11 vitals as ranges · V12 summary · V13 diagnosis match table · V14 treatment diff · contextual verdicts.
 * Copy rule C1: labels, values and states only.
 */
import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { displayName } from '@/lib/format-display';
import { bmiBand, bpBand, pulseBand, pulseRange, type VitalBand } from '@/lib/vital-bands';
import { diffParts, likelihoodWidth, planGroups, type VerdictOption } from '@/lib/visit-v2-logic';
import type { PlanItem, RankedDx } from '@/lib/api/mismatch';

// Spec colours (quality-spec.md §1).
const T = {
  ink: 'text-[#111418]', ink2: 'text-[#3d4450]', ink3: 'text-[#59616c]', dim: 'text-[#6b7280]',
  line: 'border-[#d9dee5]', match: 'bg-[#e8effb]', attn: 'bg-[#fff4d6]', attnInk: 'text-[#8a4b00]',
};

export const Bold = ({ parts }: { parts: (string | { b: string })[] }) => (
  <>{parts.map((x, i) => (typeof x === 'string' ? <span key={i}>{x}</span> : <b key={i} className="font-semibold">{x.b}</b>))}</>
);

export function SecH({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className={cn('text-base font-[650]', T.ink)}>{title}</h2>
      {sub && <span className={cn('text-xs', T.ink3)}>{sub}</span>}
      {right}
    </div>
  );
}

const out = (b?: VitalBand) => !!b && (b.tone === 'out' || b.tone === 'critical');
const word = (b?: VitalBand) => (b?.tone === 'none' ? (b.word.startsWith('child') ? 'No paediatric reference' : 'No reference') : b?.word ?? '');

/** A segmented scale (BMI, BP); `active` = indexes of the segments that hold the reading. */
function Segments({ n, active, hi, labels, caption }: { n: number; active: number[]; hi: boolean; labels: ReactNode[]; caption?: ReactNode }) {
  return (
    <div>
      <div className="flex h-3 gap-0.5">
        {Array.from({ length: n }, (_, i) => (
          <i key={i} className={cn('h-3 flex-1 first:rounded-l-full last:rounded-r-full', active.includes(i) ? (hi ? 'bg-[#c26a00]' : 'bg-[#111418]') : 'bg-[#e6e9ee]')} />
        ))}
      </div>
      {caption ? <div className={cn('mt-1 text-[11px]', T.ink3)}>{caption}</div>
        : <div className={cn('mt-1 grid text-[11px]', T.ink3)} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>{labels.map((l, i) => <span key={i} className="truncate">{l}</span>)}</div>}
    </div>
  );
}

function Track({ value, low, high, min, max, hi }: { value: number; low: number; high: number; min: number; max: number; hi: boolean }) {
  const pos = (x: number) => `${Math.min(100, Math.max(0, ((x - min) / (max - min)) * 100))}%`;
  return (
    <div>
      <div className="relative h-3 rounded-full bg-[#e6e9ee]">
        <span className="absolute inset-y-0 rounded-full bg-[#c3cad4]" style={{ left: pos(low), width: `calc(${pos(high)} - ${pos(low)})` }} />
        <span className={cn('absolute -top-[5px] h-[22px] w-[5px] -translate-x-1/2 rounded-sm outline outline-2 outline-white', hi ? 'bg-[#c26a00]' : 'bg-[#111418]')} style={{ left: pos(value) }} />
      </div>
      <div className={cn('relative mt-1 h-3.5 text-[11px]', T.ink3)}>
        <span className="absolute -translate-x-1/2" style={{ left: pos(low) }}>{low}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pos(high) }}>{high}</span>
      </div>
    </div>
  );
}

const BP_SEG = ['Low', 'Normal', 'Elevated', 'Stage 1', 'Stage 2', 'Crisis'];
function bpSegments(b: VitalBand): number[] {
  const w = b.word.toLowerCase();
  const idx: number[] = [];
  if (w.includes('low')) idx.push(0);
  if (w === 'normal') idx.push(1);
  if (w.includes('elevated')) idx.push(2);
  if (w.includes('stage 1')) idx.push(3);
  if (w.includes('stage 2')) idx.push(4);
  if (w.includes('crisis')) idx.push(5);
  return idx;
}

/** V11: vitals as ranges. Colour + word for pulse, BP and BMI only; SpO2 / temperature / RR are plain values. */
export function VitalsCard({ vit, age }: { vit: Record<string, number | string | null | undefined>; age: number | null }) {
  const num = (x: unknown) => (x === null || x === undefined || x === '' ? NaN : Number(x));
  const sbp = num(vit.sbp), dbp = num(vit.dbp), pulse = num(vit.pulse), bmi = num(vit.bmi);
  type Row = { key: string; label: ReactNode; value: ReactNode; band?: VitalBand; bar: ReactNode };
  const rows: Row[] = [];
  if (Number.isFinite(bmi)) {
    const b = bmiBand(bmi, age);
    const seg = bmi < 18.5 ? 0 : bmi < 25 ? 1 : bmi < 30 ? 2 : 3;
    rows.push({ key: 'BMI', band: b, label: <>BMI{vit.weight && vit.height ? <small className={cn('ml-1 text-xs font-normal', T.ink3)}>· {vit.weight} kg, {vit.height} cm</small> : null}</>,
      value: <>{bmi.toFixed(1)}</>, bar: b.tone === 'none' ? null : <Segments n={4} active={[seg]} hi={out(b)} labels={['', '18.5', '25', '30']} /> });
  }
  if (Number.isFinite(sbp) && Number.isFinite(dbp)) {
    const b = bpBand(sbp, dbp, age);
    const act = bpSegments(b);
    rows.push({ key: 'BP', band: b, label: 'BP', value: <>{sbp}/{dbp}<small className={cn('ml-1 text-xs font-normal', T.ink3)}>mmHg</small></>,
      bar: b.tone === 'none' ? null : <Segments n={6} active={act} hi={out(b)} labels={[]}
        caption={<>{[0, ...act.filter((i) => i !== 0 && i !== 5), 5].map((i, k) => <span key={i}>{k ? ' · ' : ''}<span className={act.includes(i) ? 'font-semibold text-[#111418]' : ''}>{BP_SEG[i]}</span></span>)}</>} /> });
  }
  if (Number.isFinite(pulse)) {
    const b = pulseBand(pulse, age);
    const r = pulseRange(age);
    rows.push({ key: 'Pulse', band: b, label: 'Pulse', value: <>{pulse}<small className={cn('ml-1 text-xs font-normal', T.ink3)}>/min</small></>,
      bar: r ? <Track value={pulse} low={r[0]} high={r[1]} min={Math.min(40, r[0] - 20)} max={Math.max(160, r[1] + 20)} hi={out(b)} /> : null });
  }
  rows.sort((a, b) => Number(out(b.band)) - Number(out(a.band)));
  const flagged = rows.filter((r) => out(r.band));
  const plain: [string, unknown, string][] = [
    ['SpO₂', vit.spo2, '%'], ['Temp', vit.temperature, Number(vit.temperature) > 45 ? '°F' : '°C'], ['Resp. rate', vit.rr, '/min'],
    ['Hb', vit.hb, 'g/dl'], ['Sugar (R)', vit.sugarRandom, 'mg/dl'],
  ];
  const shownPlain = plain.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!rows.length && !shownPlain.length) return null;
  return (
    <section className={cn('rounded-lg border bg-white p-5', T.line)} aria-label="Vitals">
      <SecH title="Vitals" sub={age == null ? undefined : age < 20 ? `Child ranges, age ${age}` : `Adult ranges, age ${age}`} />
      {flagged.length > 0 && (
        <p className={cn('mb-3 rounded-md border border-[#e9c46a] px-3 py-2 text-sm', T.attn, T.attnInk)}>
          <b className="font-[650]">{flagged.length} outside the range:</b> {flagged.map((r) => `${r.key} ${r.key === 'BMI' ? bmi.toFixed(1) : r.key === 'BP' ? `${sbp}/${dbp}` : pulse}, ${word(r.band).toLowerCase()}`).join(' · ')}
        </p>
      )}
      <div className="divide-y divide-[#eef0f3]">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[128px_minmax(0,1fr)_104px]">
            <div><div className={cn('text-[13px]', T.ink3)}>{r.label}</div><div className={cn('text-[22px] font-[650] tabular-nums leading-tight', T.ink)}>{r.value}</div></div>
            <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">{r.bar}</div>
            <div className={cn('col-start-2 row-start-1 text-right text-sm font-semibold sm:col-start-auto sm:row-start-auto', r.band?.tone === 'critical' ? 'text-[#b42318]' : out(r.band) ? 'text-[#a35a00]' : r.band?.tone === 'none' ? T.ink3 : T.ink)}>{word(r.band)}</div>
          </div>
        ))}
      </div>
      {shownPlain.length > 0 && (
        <div className="mt-1 grid grid-cols-3 gap-4 border-t border-[#eef0f3] pt-3">
          {shownPlain.map(([k, v, u]) => (
            <div key={k}><div className={cn('text-xs', T.ink3)}>{k}</div><div className={cn('text-lg font-semibold tabular-nums', T.ink)}>{String(v)}<small className={cn('ml-0.5 text-xs font-normal', T.ink3)}>{u}</small></div></div>
          ))}
        </div>
      )}
      {rows.length > 0 && <p className={cn('mt-3 text-xs', T.ink3)}>Ranges pending clinical review</p>}
    </section>
  );
}

export function Summary({ lines }: { lines: [string, ReactNode][] }) {
  return (
    <div className={cn('mb-6 space-y-1.5 rounded-lg border bg-[#f6f8fb] px-4 py-3', T.line)}>
      {lines.map(([t, body]) => (
        <p key={t} className={cn('grid grid-cols-[76px_minmax(0,1fr)] text-sm', T.ink)}><span className={cn('pt-px text-xs font-semibold', T.ink3)}>{t}</span><span>{body}</span></p>
      ))}
    </div>
  );
}

function Likelihood({ label }: { label?: string | null }) {
  const w = likelihoodWidth(label);
  if (!label) return null;
  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-[#3d4450]">
      <span className="h-1.5 w-9 overflow-hidden rounded-full bg-[#e6e9ee]"><i className="block h-full rounded-full bg-[#59616c]" style={{ width: `${w}%` }} /></span>
      {label}
    </span>
  );
}

export interface MatchDoctor { name: string; sub: string; code?: string }
/** V13: AI top 5 ↔ the doctor's diagnoses. "=" pick, "≈" D3 equivalent (rule label), "+" not in the AI list. */
export function MatchTable({ ranked, matchOf, equivalent, doctorOnly, why }: {
  ranked: RankedDx[];
  matchOf: (d: RankedDx) => MatchDoctor | null;
  equivalent?: { aiRank: number; doctor: MatchDoctor; rule: string } | null;
  doctorOnly: MatchDoctor[];
  why: (name: string) => ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const cell = 'flex min-h-[44px] items-center px-3 py-2';
  return (
    <div className={cn('overflow-hidden rounded-lg border text-sm', T.line)} role="table" aria-label="AI diagnoses matched to the doctor's">
      <div className={cn('hidden grid-cols-[minmax(0,1.1fr)_40px_minmax(0,1fr)] border-b bg-[#f6f8fb] text-xs font-semibold sm:grid', T.line, T.ink3)} role="row">
        <div className="px-3 py-2">AI suggested · likelihood</div><div /><div className="px-3 py-2">Doctor</div>
      </div>
      {ranked.map((d) => {
        const m = matchOf(d);
        const eq = !m && equivalent && equivalent.aiRank === d.rank ? equivalent : null;
        const tint = m ? T.match : eq ? T.attn : '';
        return (
          <div key={d.rank} className={cn('border-b last:border-b-0', T.line, tint)} role="row">
            <div className="grid grid-cols-[minmax(0,1fr)_40px] sm:grid-cols-[minmax(0,1.1fr)_40px_minmax(0,1fr)]">
              <div className={cn(cell, 'gap-2', m || eq ? T.ink : T.dim)}>
                <span className={cn('w-6 text-xs', T.ink3)}>#{d.rank}</span>
                <span className={m || eq ? 'font-[650]' : ''}>{displayName(d.diagnosis)}</span>
                <Likelihood label={d.likelihood} />
                <button type="button" onClick={() => setOpen(open === d.rank ? null : d.rank)} className="text-xs font-medium text-[#1d5fbf] hover:underline">why</button>
              </div>
              <div className={cn(cell, 'justify-center')}>
                {m ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1d5fbf] text-sm font-bold text-white">=</span>
                  : eq ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#b86e00] text-sm font-bold text-white">≈</span>
                  : <span className={T.dim}>·</span>}
              </div>
              <div className={cn(cell, 'col-span-2 pt-0 sm:col-span-1 sm:pt-2', !m && !eq && 'hidden sm:flex')}>
                {m ? <span><b className={cn('font-[650]', T.ink)} title={m.code ? `SNOMED ${m.code}` : undefined}>{m.name}</b><span className={cn('block text-xs', T.ink3)}>{m.sub}</span></span>
                  : eq ? <span><b className={cn('font-[650]', T.ink)}>{eq.doctor.name}</b><span className={cn('block text-xs', T.ink3)}>{eq.doctor.sub}</span><span className={cn('mt-0.5 inline-block rounded px-1.5 text-[11px] font-semibold', 'bg-[#fff3d6] text-[#7a4d00]')}>{eq.rule}</span></span>
                  : <span className={T.dim}>—</span>}
              </div>
            </div>
            {open === d.rank && <div className="px-3 pb-3 pl-11">{why(d.diagnosis)}</div>}
          </div>
        );
      })}
      {doctorOnly.map((x) => (
        <div key={x.name} className={cn('grid grid-cols-[minmax(0,1fr)_40px] border-b last:border-b-0 sm:grid-cols-[minmax(0,1.1fr)_40px_minmax(0,1fr)]', T.line, T.attn)} role="row">
          <div className={cn(cell, 'text-xs font-semibold', T.attnInk)}>Not in the AI list</div>
          <div className={cn(cell, 'justify-center')}><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#b86e00] text-sm font-bold text-white">+</span></div>
          <div className={cn(cell, 'col-span-2 pt-0 sm:col-span-1 sm:pt-2')}><span><b className={cn('font-[650]', T.ink)} title={x.code ? `SNOMED ${x.code}` : undefined}>{x.name}</b><span className={cn('block text-xs', T.ink3)}>{x.sub}</span></span></div>
        </div>
      ))}
    </div>
  );
}

function Line({ i }: { i: PlanItem }) {
  if (i.outcome === 'changed') {
    const d = diffParts(i.ai, i.doctor);
    return (
      <div className={cn('text-sm', T.ink2)}>
        {d.same.join(' · ')}{d.same.length ? ' · ' : ''}
        {d.aiOnly.map((x, k) => <span key={k}>{k ? ' · ' : ''}<del className="decoration-[#c0392b] decoration-2">{x}</del></span>)}
        {(d.aiOnly.length > 0 || d.doctorOnly.length > 0) && ' → '}
        {d.doctorOnly.map((x, k) => <span key={k}>{k ? ' · ' : ''}<ins className="rounded bg-[#ffe9a8] px-1 font-semibold text-[#111418] no-underline">{x}</ins></span>)}
      </div>
    );
  }
  if (i.outcome === 'not_used') return <div className={cn('text-sm', T.ink3)}><del className="decoration-[#c0392b] decoration-2">{i.ai}</del> · not prescribed</div>;
  return <div className={cn('text-sm', T.ink2)}>{i.outcome === 'added' ? i.doctor : i.ai}</div>;
}

const adviceIn = (s: string, lang: 'en' | 'mr') => {
  const m = /^(.*?)\s+-\s+(.*[^\x00-\x7F].*)$/.exec(s);
  return m ? (lang === 'mr' ? m[2] : m[1]) : s;
};

function Count({ n }: { n: ReactNode }) {
  return <span className={cn('ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e6e9ee] px-1.5 text-xs font-semibold', T.ink2)}>{n}</span>;
}

/** V14: the treatment plan as a diff, grouped by outcome over every plan type, then the rest of the plan. */
export function TreatmentDiff({ plan, lang, why }: { plan: PlanItem[]; lang: 'en' | 'mr'; why: (name: string) => ReactNode }) {
  const g = planGroups(plan);
  const groups: [string, PlanItem[], string][] = [
    ['Changed', g.changed, ''], ['Suggested by the AI, not used', g.not_used, 'bg-[#f6f8fb]'], ['Added by the doctor', g.added, 'border-l-4 border-l-[#1d5fbf]'], ['Kept as suggested', g.exact, ''],
  ];
  const rest = g.rest;
  const restOf = (t: PlanItem['type']) => rest.filter((i) => i.type === t);
  return (
    <div className="space-y-4">
      {groups.map(([title, items, extra]) => (
        <div key={title}>
          <h3 className={cn('mb-2 flex items-center text-sm font-[650]', T.ink)}>{title}<Count n={items.length} /></h3>
          {items.map((i, k) => (
            <div key={k} className={cn('mb-2 rounded-lg border px-4 py-3', T.line, extra)}>
              <div className={cn('text-sm font-[650]', T.ink)}>{displayName(i.name)}{i.type !== 'medicine' && <span className={cn('ml-1 text-xs font-normal', T.ink3)}>· {i.type}</span>}</div>
              <Line i={i} />
              {i.type === 'medicine' && i.ai !== null && why(i.name)}
            </div>
          ))}
        </div>
      ))}
      <div>
        <h3 className={cn('mb-2 flex items-center text-sm font-[650]', T.ink)}>Rest of the plan<Count n="Not suggested by the AI yet" /></h3>
        <div className={cn('divide-y divide-[#eef0f3] rounded-lg border px-4', T.line)}>
          {([['Tests', 'test'], ['Advice', 'advice'], ['Referral', 'referral'], ['Follow-up', 'followup']] as const).map(([label, t]) => {
            const items = restOf(t);
            if (!items.length) return null;
            return (
              <div key={t} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 py-2.5 text-sm">
                <span className={cn('text-xs font-semibold', T.ink3)}>{label}</span>
                <div className={T.ink}>
                  {t === 'test' && items.map((i) => displayName(i.name)).join(' · ') + ' · ordered'}
                  {t === 'advice' && <ul className="list-disc space-y-0.5 pl-4">{items.map((i, k) => <li key={k}>{displayName(adviceIn(i.doctor ?? i.name, lang))}</li>)}</ul>}
                  {t === 'referral' && items.map((i, k) => {
                    const r = i.referral;
                    const urgent = !!r && /urgent|emergency/i.test(r.urgency);
                    return (
                      <div key={k}>
                        {urgent && <span className="mr-1.5 inline-flex h-5 items-center rounded bg-[#ffedea] px-1.5 text-xs font-semibold text-[#831c1e]">Urgent referral</span>}
                        {r ? [displayName(r.specialist), r.facility, urgent ? '' : r.urgency.toLowerCase()].filter(Boolean).join(' · ') : displayName(i.name)}
                        {r?.reason && <div className={cn('text-xs', T.ink3)}>&ldquo;{r.reason}&rdquo;</div>}
                      </div>
                    );
                  })}
                  {t === 'followup' && items.map((i, k) => {
                    const f = i.followUp;
                    if (!f) return <span key={k}>{i.name}</span>;
                    const soon = (f.inDays !== null && f.inDays >= 0 && f.inDays <= 3) || /urgent/i.test(f.remark);
                    return (
                      <div key={k}>
                        {f.inDays !== null && <span className={cn('mr-1.5 inline-flex h-5 items-center rounded px-1.5 text-xs font-semibold', soon ? 'bg-[#fff4d6] text-[#8a4b00]' : 'bg-[#eef0f3] text-[#3a414a]')}>{f.inDays === 0 ? 'Today' : f.inDays < 0 ? `${-f.inDays} days before` : `In ${f.inDays} day${f.inDays === 1 ? '' : 's'}`}</span>}
                        {new Date(`${f.date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}{f.time ? `, ${f.time}` : ''}
                        {f.remark && <div className={cn('text-xs', T.ink3)}>{f.remark}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!rest.length && <p className={cn('py-2.5 text-sm', T.ink3)}>None</p>}
        </div>
      </div>
    </div>
  );
}

/** Verdict buttons: 52 px, key badges, hover / focus ring / ink-filled selected; optional dashed 5th option. */
export function VerdictGroup({ question, options, extra, value, onChange, active, onActivate, showKeys, optional }: {
  question: ReactNode; options: VerdictOption[]; extra?: VerdictOption; value?: string; onChange: (v: string) => void;
  active: boolean; onActivate: () => void; showKeys: boolean; optional?: boolean;
}) {
  const btn = (o: VerdictOption, key: number, ghost = false) => {
    const sel = value === o.value;
    return (
      <button key={o.value} type="button" role="radio" aria-checked={sel} data-value={o.value} onClick={() => onChange(o.value)}
        className={cn('relative flex items-center rounded-lg pl-10 pr-3 text-left text-sm leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d5fbf]',
          ghost ? 'col-span-full min-h-[36px] border-[1.5px] border-dashed border-[#aab3bf] text-[13px]' : 'min-h-[52px] border-[1.5px] border-[#c3cad4]',
          sel ? 'border-[#111418] bg-[#111418] text-white' : 'bg-transparent text-[#111418] hover:border-[#8a94a3] hover:bg-[#eef2f8]')}>
        <kbd className={cn('absolute left-3 flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold', sel ? 'bg-white text-[#111418]' : 'bg-[#e6e9ee] text-[#3d4450]')}>{key}</kbd>
        {o.label}
      </button>
    );
  };
  return (
    <div onFocusCapture={onActivate} onMouseDown={onActivate} className={cn('-mx-3 rounded-lg px-3 py-3', active && showKeys ? 'bg-[#eef3fb] ring-1 ring-[#9fb8e6]' : 'bg-[#f6f8fb]')}>
      <p className="mb-2.5 flex items-start justify-between gap-3 text-base font-[650] text-[#111418]">
        <span>{question}{optional && <span className="ml-1.5 text-xs font-medium text-[#59616c]">optional</span>}</span>
        {active && showKeys && <span className="shrink-0 rounded bg-[#1d5fbf] px-1.5 py-0.5 text-[11px] font-medium text-white">keys</span>}
      </p>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4" role="radiogroup" aria-label={typeof question === 'string' ? question : 'Verdict'}>
        {options.map((o, i) => btn(o, i + 1))}
        {extra && btn(extra, 5, true)}
      </div>
    </div>
  );
}

export function Chips({ label, options, value, onChange }: { label?: string; options: { value: string; label: string }[]; value?: string; onChange: (v: string | undefined) => void }) {
  return (
    <div className="mt-2.5">
      {label && <div className="mb-1.5 text-xs font-semibold text-[#59616c]">{label}</div>}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label ?? 'Reason'}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(value === o.value ? undefined : o.value)}
            className={cn('h-[30px] rounded-full border px-3 text-[13px] transition-colors', value === o.value ? 'border-[#111418] bg-[#111418] text-white' : 'border-[#c3cad4] bg-white text-[#111418] hover:bg-[#eef2f8]')}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** "?" overlay: one line per key (functional help only). */
export function KeysHelp() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button type="button" aria-label="Keyboard keys" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c3cad4] text-sm font-semibold text-[#3d4450] hover:bg-[#eef2f8]">?</button>
      {open && (
        <span role="dialog" aria-label="Keyboard keys" className="absolute bottom-10 left-0 z-40 w-56 rounded-lg border border-[#d9dee5] bg-white p-3 text-xs text-[#111418] shadow-lg">
          {[['1–4', 'Verdict (marked question)'], ['5', 'Note too thin to judge'], ['Enter', 'Save & next'], ['I', 'Images'], ['Esc', 'Back to the queue']].map(([k, l]) => (
            <span key={k} className="flex justify-between gap-3 py-0.5"><kbd className="rounded bg-[#e6e9ee] px-1.5 font-semibold">{k}</kbd><span>{l}</span></span>
          ))}
        </span>
      )}
    </span>
  );
}
