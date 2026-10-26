'use client';

import { KeyboardEvent, ReactNode, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CaseStage } from '@/lib/api/training';

/** Colour per diagnosis slot, used to tie pinned evidence in the note to the diagnosis it supports. */
export const DX_COLORS = [
  { dot: 'bg-teal-500', soft: 'bg-teal-50 ring-teal-300 text-teal-900', text: 'text-teal-700', border: 'border-teal-300' },
  { dot: 'bg-violet-500', soft: 'bg-violet-50 ring-violet-300 text-violet-900', text: 'text-violet-700', border: 'border-violet-300' },
  { dot: 'bg-amber-500', soft: 'bg-amber-50 ring-amber-300 text-amber-900', text: 'text-amber-700', border: 'border-amber-300' },
  { dot: 'bg-sky-500', soft: 'bg-sky-50 ring-sky-300 text-sky-900', text: 'text-sky-700', border: 'border-sky-300' },
];

export function scoreTone(score: number) {
  if (score >= 80) return { ring: '#059669', text: 'text-emerald-600', label: 'Excellent' };
  if (score >= 65) return { ring: '#0d9488', text: 'text-teal-600', label: 'Good' };
  if (score >= 50) return { ring: '#d97706', text: 'text-amber-600', label: 'Needs work' };
  return { ring: '#dc2626', text: 'text-red-600', label: 'Review this case' };
}

export function ScoreRing({ score, size = 132, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={10} fill="none" className="text-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={tone.ring} strokeWidth={10} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className={cn('text-3xl font-semibold tabular-nums', tone.text)}>{score}</div>
        <div className="text-[11px] text-muted-foreground">{label ?? 'out of 100'}</div>
      </div>
    </div>
  );
}

export function Meter({ label, value, max, className }: { label: string; value: number; max: number; className?: string }) {
  const pct = Math.round((100 * value) / max);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}/{max}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-[width] duration-1000', pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-teal-500' : pct >= 45 ? 'bg-amber-500' : 'bg-red-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Chip({ children, onRemove, className }: { children: ReactNode; onRemove?: () => void; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs', className)}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} className="-mr-1 rounded-full px-1 text-muted-foreground hover:text-foreground" aria-label="Remove">
          ×
        </button>
      )}
    </span>
  );
}

/** Text input with a suggestion list. Enter or click adds the value (free text allowed). */
export function Autocomplete({
  options, onPick, placeholder, className, inputClassName, testId,
}: {
  options: string[];
  onPick: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  testId?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const starts = options.filter((o) => o.toLowerCase().startsWith(s));
    const contains = options.filter((o) => !o.toLowerCase().startsWith(s) && o.toLowerCase().includes(s));
    return [...starts, ...contains].slice(0, 8);
  }, [q, options]);
  const pick = (v: string) => {
    if (!v.trim()) return;
    onPick(v.trim());
    setQ('');
    setOpen(false);
    setActive(0);
    ref.current?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(matches[active] ?? q); }
    else if (e.key === 'Escape') setOpen(false);
  };
  return (
    <div className={cn('relative', className)}>
      <input
        ref={ref}
        data-testid={testId}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={onKey}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={cn('h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40', inputClassName)}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover py-1 text-sm shadow-lg">
          {matches.map((m, i) => (
            <li key={m}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(m); }}
                className={cn('w-full px-3 py-1.5 text-left', i === active ? 'bg-teal-50 text-teal-900' : 'hover:bg-muted')}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The clinical note, revealed stage by stage. When `onPick` is given every
 * finding is clickable so the trainee can pin it as evidence; pinned findings
 * are tinted with the colour of the diagnosis they support.
 */
export function CaseFile({
  stages, revealed, pinned, onPick, highlight,
}: {
  stages: CaseStage[];
  revealed: number;
  pinned?: Map<string, number[]>;
  onPick?: (item: string) => void;
  highlight?: Set<string>;
}) {
  return (
    <div className="space-y-4">
      {stages.slice(0, revealed).map((stage, si) => (
        <section key={stage.key} className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border bg-card duration-500" data-testid={`stage-${stage.key}`}>
          <header className="flex items-center gap-2 border-b px-4 py-2.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[11px] font-semibold text-white">{si + 1}</span>
            <h3 className="text-sm font-semibold">{stage.title}</h3>
          </header>
          <div className="space-y-3 px-4 py-3">
            {stage.sections.map((sec, i) => (
              <div key={i}>
                {sec.heading && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{sec.heading}</div>}
                {(() => {
                  // symptom checklists read better as chips; everything else as bullet lines
                  const compact = sec.heading.startsWith('Associated symptoms');
                  return (
                    <ul className={cn('text-sm', compact ? 'flex flex-wrap gap-1.5' : 'space-y-0.5')}>
                      {sec.items.map((item, k) => {
                        const slots = pinned?.get(item) ?? [];
                        const Tag = onPick ? 'button' : 'span';
                        return (
                          <li key={k}>
                            <Tag
                              {...(onPick ? { type: 'button' as const, onClick: () => onPick(item) } : {})}
                              data-finding={item}
                              className={cn(
                                'group block text-left transition-colors',
                                compact ? 'inline-block rounded-full border px-2 py-0.5 text-xs' : 'w-full rounded px-1.5 py-0.5',
                                onPick && 'cursor-pointer hover:bg-teal-50',
                                slots.length > 0 && `ring-1 ${DX_COLORS[slots[0] % DX_COLORS.length].soft}`,
                                highlight?.has(item) && 'bg-yellow-100 ring-1 ring-yellow-400',
                              )}
                            >
                              {!compact && <span className="mr-1.5 text-muted-foreground">•</span>}
                              {item}
                              {slots.map((s) => (
                                <span key={s} className={cn('ml-1.5 inline-block h-2 w-2 rounded-full align-middle', DX_COLORS[s % DX_COLORS.length].dot)} />
                              ))}
                            </Tag>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
