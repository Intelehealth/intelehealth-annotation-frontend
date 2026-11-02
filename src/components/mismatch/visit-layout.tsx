'use client';

/**
 * Wave 2 visit page building blocks (drop-2 visit.html as the layout reference;
 * the PM's written treatment-plan spec governs content):
 *   evidence column = vitals strip, Dx AI vs doctor (one ranked list, doctor's
 *   pick marked inline), treatment plan (one AI | Doctor table for medicines,
 *   tests, advice, referral, follow-up), images, clinical note as labelled rows;
 *   rail = the decision only (D3 question, verdict buttons with keys 1-4, reason
 *   chips after a disagreeing verdict, save bar with "Next in this view").
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { dash, displayName, referralParts } from '@/lib/format-display';
import { noteSections } from '@/lib/note-sections';
import type { VitalBand } from '@/lib/vital-bands';
import { PLAN_TYPE_LABEL, type PlanItem, type PlanType, type RankedDx } from '@/lib/api/mismatch';

export function Card({ title, meta, action, children, className, id }: { title?: ReactNode; meta?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('rounded-lg border border-border bg-surface', className)}>
      {(title || meta || action) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 pt-4">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
          {action}
        </div>
      )}
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}

export function Pill({ tone = 'n', children, title }: { tone?: 'n' | 'warn' | 'neg' | 'pos'; children: ReactNode; title?: string }) {
  const c = { n: 'bg-pill-n-bg text-pill-n-ink', warn: 'bg-pill-warn-bg text-pill-warn-ink', neg: 'bg-pill-neg-bg text-pill-neg-ink', pos: 'bg-pill-pos-bg text-pill-pos-ink' }[tone];
  return <span title={title} className={cn('inline-flex h-5 items-center whitespace-nowrap rounded px-1.5 text-xs font-medium', c)}>{children}</span>;
}

/** Signature mark: where the doctor's Dx sat in the AI's list (#1-#5, or the sixth cell = not in the top 5). */
export function Ladder({ rank, miss }: { rank: number | null; miss?: boolean }) {
  return (
    <span className="inline-grid grid-cols-6 gap-0.5 align-middle" aria-label={rank ? `doctor picked the AI #${rank}` : miss ? 'not in the AI top 5' : 'no AI list'}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <i key={i} className={cn('h-3.5 w-3.5 rounded-sm', rank === i ? 'bg-data' : miss && i === 6 ? 'bg-bad' : 'bg-control/55')} />
      ))}
    </span>
  );
}

const BAND_TONE: Record<VitalBand['tone'], string> = {
  normal: 'text-muted-foreground', out: 'bg-pill-warn-bg text-pill-warn-ink', critical: 'bg-pill-neg-bg text-pill-neg-ink', none: 'text-faint',
};

/** Vitals strip; pulse / BP / BMI carry a band (V10): always colour AND a word, never colour alone. */
export function VitalsStrip({ items }: { items: [string, unknown, string, VitalBand?][] }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== '');
  const banded = shown.some((x) => x[3]);
  return (
    <div>
    <section className="grid grid-cols-[repeat(auto-fit,minmax(78px,1fr))] overflow-hidden rounded-lg border border-border bg-surface" aria-label="Vitals">
      {shown.map(([k, v, unit, band]) => (
        <div key={k} className="-ml-px min-w-0 border-l border-border px-3 py-2.5">
          <div className="text-xs text-muted-foreground">{k}</div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1 text-base font-medium tabular-nums">{String(v)}{unit && <small className="text-xs font-normal text-muted-foreground">{unit}</small>}</div>
          {band && <div className={cn('mt-0.5 inline-flex rounded px-1 text-[11px] font-medium', BAND_TONE[band.tone])}>{band.word}</div>}
        </div>
      ))}
    </section>
    {banded && <p className="mt-1 text-[11px] text-faint">Pulse, BP and BMI bands: reference ranges pending clinical review.</p>}
    </div>
  );
}

/** V7: one ranked list; the doctor's pick is marked inline, the doctor's own diagnoses follow as "+" rows. */
export function DxList({ ranked, doctor, otherAi, why }: {
  ranked: RankedDx[]; doctor: { name: string; role?: string; status?: string; code?: string; fromAi: boolean }[]; otherAi: string[]; why: (name: string) => ReactNode;
}) {
  return (
    <>
      <ol className="divide-y divide-rule text-sm">
        {ranked.map((d) => (
          <li key={`${d.rank}-${d.diagnosis}`} className={cn('grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2 py-2', d.picked && 'font-semibold')}>
            <span className={cn('pt-0.5 text-xs', d.picked ? 'font-bold text-data' : 'text-faint')}>#{d.rank}</span>
            <span>{displayName(d.diagnosis)}{d.picked && <span className="font-normal text-muted-foreground"> · doctor{d.picked === 'name' ? ' (typed the name)' : ''}</span>}{why(d.diagnosis)}</span>
            <span className="pt-0.5 text-xs font-normal text-muted-foreground">{d.likelihood ?? ''}</span>
          </li>
        ))}
        {doctor.filter((x) => !x.fromAi).map((x, i) => (
          <li key={`own-${i}`} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2 py-2">
            <span className="pt-0.5 text-xs text-faint">+</span>
            <span><span className="font-medium">{displayName(x.name)}</span> <span className="text-muted-foreground">· added by the doctor</span>
              <span className="block text-xs text-muted-foreground">{[x.role, x.status, x.code && x.code !== 'NA' ? `SNOMED ${x.code}` : null].filter(Boolean).join(' · ')}</span></span>
            <span />
          </li>
        ))}
      </ol>
      {otherAi.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Also suggested by the AI: {otherAi.map(displayName).join(', ')}</p>}
    </>
  );
}

const OUTCOME: Record<string, { text: string; tone: 'n' | 'warn' | 'neg' | 'pos' }> = {
  exact: { text: 'Kept as is', tone: 'pos' }, changed: { text: 'Changed', tone: 'warn' }, not_used: { text: 'Not used', tone: 'neg' },
  added: { text: 'Added by the doctor', tone: 'n' }, ai_not_available: { text: '', tone: 'n' },
};

// "Drink water - पाणी प्या": English part, or the Marathi part when the note language is Marathi.
const adviceIn = (s: string, lang: 'en' | 'mr') => {
  const m = /^(.*?)\s+-\s+(.*[^\x00-\x7F].*)$/.exec(s);
  return m ? (lang === 'mr' ? m[2] : m[1]) : s;
};

/** Treatment plan: medicines, tests, advice, referral and follow-up in one AI | Doctor table. */
export function TreatmentPlan({ plan, lang, medWhy, unflagged }: {
  plan: PlanItem[]; lang: 'en' | 'mr'; medWhy: (name: string) => ReactNode; unflagged: (name: string) => string | null;
}) {
  const order: PlanType[] = ['medicine', 'test', 'advice', 'referral', 'followup'];
  return (
    <table className="block w-full border-collapse text-sm sm:table sm:table-fixed">
      <colgroup><col className="w-[30%]" /><col className="w-[35%]" /><col className="w-[35%]" /></colgroup>
      {/* On a phone each row stacks: item, then AI, then Doctor (labelled). */}
      <thead className="hidden sm:table-header-group"><tr className="text-left text-xs text-muted-foreground"><th className="border-b border-border py-1.5 pr-2 font-medium">Item</th><th className="border-b border-border py-1.5 pr-2 font-medium">AI</th><th className="border-b border-border py-1.5 font-medium">Doctor</th></tr></thead>
      {order.map((type) => {
        const rows = plan.filter((i) => i.type === type);
        return (
          <tbody key={type} className="block sm:table-row-group">
            <tr className="block sm:table-row"><th colSpan={3} className="pb-1 pt-3 text-left text-xs font-semibold text-foreground">{PLAN_TYPE_LABEL[type]}</th></tr>
            {rows.length === 0 && (
              <tr className="block sm:table-row"><td colSpan={3} className="block border-b border-rule py-2 text-muted-foreground sm:table-cell">{type === 'medicine' ? 'No medicines recorded.' : 'None entered by the doctor.'}{type !== 'medicine' && <span className="text-faint"> The AI does not suggest {PLAN_TYPE_LABEL[type].toLowerCase()} yet.</span>}</td></tr>
            )}
            {rows.map((i, k) => {
              const o = OUTCOME[i.outcome];
              const ref = i.referral ?? (type === 'referral' && i.doctor ? referralParts(i.doctor) : undefined);
              const urgent = !!ref && /urgent|emergency/i.test(ref.urgency);
              const fu = i.followUp;
              const fuSoon = !!fu && ((fu.inDays !== null && fu.inDays <= 3) || /urgent/i.test(fu.remark));
              const flag = type === 'medicine' ? unflagged(i.name) : null;
              return (
                <tr key={`${type}-${k}`} className="block border-b border-rule py-2 align-top sm:table-row sm:border-0 sm:py-0">
                  <td className="block pr-2 font-medium sm:table-cell sm:border-b sm:border-rule sm:py-2">
                    {/* Medicines and tests show their name; advice / referral / follow-up label the group once. */}
                    {type === 'medicine' || type === 'test' ? displayName(i.name) : k > 0 ? '' : type === 'advice' ? 'Advice' : type === 'referral' ? 'Referral' : 'Follow-up'}
                    {type === 'medicine' && medWhy(i.name)}
                  </td>
                  <td className={cn('block pr-2 sm:table-cell sm:border-b sm:border-rule sm:py-2', !i.ai && 'text-faint')}>
                    {/* "Not suggested by the AI yet" once per group, not on every line. */}
                    {(i.ai || i.outcome !== 'ai_not_available' || k === 0) && <span className="mr-1 text-xs text-muted-foreground sm:hidden">AI:</span>}
                    {i.ai ?? (i.outcome === 'ai_not_available' ? (k === 0 ? 'Not suggested by the AI yet' : '') : 'Not suggested')}
                  </td>
                  <td className="block sm:table-cell sm:border-b sm:border-rule sm:py-2">
                    <span className="mr-1 text-xs text-muted-foreground sm:hidden">Doctor:</span>
                    {type === 'referral' && ref ? (
                      <>
                        {urgent && <Pill tone="neg">Urgent referral</Pill>}{' '}
                        {[displayName(ref.specialist), ref.facility, ref.urgency && !urgent ? ref.urgency.toLowerCase() : ''].filter(Boolean).join(' · ')}
                        {ref.reason && <div className="text-muted-foreground">&ldquo;{ref.reason}&rdquo;</div>}
                      </>
                    ) : type === 'followup' && fu ? (
                      <>
                        {fu.inDays !== null && <Pill tone={fuSoon ? 'warn' : 'n'}>{fu.inDays === 0 ? 'Today' : fu.inDays < 0 ? `${-fu.inDays} days before the visit` : `In ${fu.inDays} day${fu.inDays === 1 ? '' : 's'}`}</Pill>}{' '}
                        {new Date(`${fu.date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}{fu.time ? `, ${fu.time}` : ''}
                        {fu.remark && <div className="text-muted-foreground">{fu.remark}</div>}
                      </>
                    ) : type === 'advice' && i.doctor ? (
                      displayName(adviceIn(i.doctor, lang))
                    ) : (
                      (type === 'test' && i.doctor ? 'Ordered' : i.doctor) ?? <span className="text-faint">{i.outcome === 'not_used' ? (type === 'test' ? 'Not ordered' : 'Not prescribed') : '—'}</span>
                    )}
                    {o.text && <div className="mt-1"><Pill tone={o.tone}>{o.text}{i.changes?.length ? `: ${i.changes.join(', ')}` : ''}</Pill></div>}
                    {flag && <div className="mt-1 text-xs text-pill-warn-ink">{flag}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        );
      })}
    </table>
  );
}

/** Clinical note as labelled rows (one group per complaint / section). */
export function NoteBlock({ heading, text, cut }: { heading: string; text: string; cut?: boolean }) {
  const groups = noteSections(text);
  if (!groups.length) return null;
  const show = (v: string) => (dash(v) === '—' ? <span className="text-faint">—</span> : v);
  return (
    <div className="border-t border-rule py-3.5 first:border-t-0">
      {groups.map((g, gi) => (
        <div key={gi} className={gi ? 'mt-3' : ''}>
          <h3 className="mb-2 text-[13px] font-semibold">{heading}{g.title ? ` · ${g.title}` : ''}</h3>
          <dl className="grid grid-cols-[minmax(96px,38%)_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm md:grid-cols-[200px_minmax(0,1fr)]">
            {g.rows.map((r, i) => r.label ? (
              <div key={i} className="contents"><dt className="text-muted-foreground">{r.label}</dt><dd>{show(r.value)}</dd></div>
            ) : (
              <dd key={i} className="col-span-2">{show(r.value)}</dd>
            ))}
          </dl>
        </div>
      ))}
      {cut && <p className="mt-1.5 text-xs text-pill-warn-ink">(cut off in the source record)</p>}
    </div>
  );
}

/** V6: four big verdict buttons; keys 1-4 select them when this group is the active one. */
export function VerdictButtons({ label, options, value, onChange, active, onActivate, prompt, showKeysTag }: {
  label: string; options: { value: string; label: string }[]; value?: string; onChange: (v: string) => void; active: boolean;
  /** Clicking or focusing the group makes it the one keys 1-4 act on. */
  onActivate?: () => void;
  prompt?: ReactNode;
  /** Show the "keys 1-4" tag on the active group (only when there are several groups). */
  showKeysTag?: boolean;
}) {
  return (
    <div onFocusCapture={onActivate} onMouseDown={onActivate}
      className={cn('-mx-2 rounded-md px-2 py-1.5', active && showKeysTag && 'bg-data-soft/40 ring-1 ring-data/40')}>
      <h2 className="flex items-center justify-between gap-2 text-[15px] font-semibold">{label}
        {active && showKeysTag && <span className="rounded bg-data px-1.5 text-[11px] font-medium text-white">keys 1–4</span>}</h2>
      {prompt && <p className="mt-0.5 text-[13px] text-muted-foreground">{prompt}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={label}>
        {options.map((o, i) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
            className={cn('relative min-h-[48px] rounded-md border bg-surface py-2 pl-9 pr-2.5 text-left text-sm leading-snug',
              value === o.value ? 'border-foreground outline outline-1 -outline-offset-2 outline-foreground' : 'border-control hover:bg-raised')}>
            <kbd className={cn('absolute left-2.5 top-2.5 h-[18px] w-[18px] rounded text-center text-[11px] font-semibold leading-[18px]',
              value === o.value ? 'bg-foreground text-surface' : active ? 'bg-active text-foreground' : 'bg-active text-muted-foreground')}>{i + 1}</kbd>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReasonChips({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange: (v: string | undefined) => void }) {
  return (
    <div>
      <div className="mb-1.5 mt-2.5 text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(value === o ? undefined : o)}
            className={cn('h-[26px] rounded-full border px-2.5 text-[13px]', value === o ? 'border-primary bg-primary text-primary-foreground' : 'border-control bg-surface hover:bg-raised')}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
