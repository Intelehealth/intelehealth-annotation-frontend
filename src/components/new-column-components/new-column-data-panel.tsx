'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { AnnotationField, AnnotationConfig } from '@/lib/api/csv-imports';
import { cn } from '@/lib/utils';
import { DragDropHelper } from '@/lib/drag-drop-helper';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewColumnData {
  [fieldName: string]: string;
}

interface NewColumnDataPanelProps {
  annotationConfig: AnnotationConfig | null;
  newColumnData: NewColumnData;
  onNewColumnChange: (fieldName: string, value: string) => void;
  onSaveAllNewColumnData: () => void;
  onExportSelectedColumns: () => void;
  onExportAllColumns: () => void;
  isSaving: boolean;
  completedCount: number;
  pendingCount: number;
  currentRowIndex?: number;
  onPanelDragOver?: (e: React.DragEvent) => void;
  onDropFromMetadata?: () => void;
  draggedField?: string | null;
  onAnnotationFieldDragStart?: (e: React.DragEvent, fieldName: string) => void;
  onAnnotationFieldDragOver?: (e: React.DragEvent) => void;
  onAnnotationFieldDrop?: (e: React.DragEvent, targetFieldName: string) => void;
}

/** Structured option — UI-only. value is always the original raw string for storage. */
export interface RichOption {
  id: string;
  value: string;       // Original raw string → written to newColumnData (never mutated)
  label: string;       // Atomic normalized label for UI display only
  description?: string;// Secondary semantic text always shown below label
}

/** Render mode drives which Decision Card component is used */
export type DecisionRenderMode = 'binary' | 'score' | 'category' | 'multi-chip';

/** One accordion group instance */
interface GroupInstance {
  key: string;          // `${groupId}::${repeatIndex}`
  groupId: string;
  instanceIndex: number;
  title: string;        // "Finding #1"
  fields: AnnotationField[];
}

type CompletionState = 'untouched' | 'partial' | 'completed';
type ValidationState = 'valid' | 'error';
interface InstanceStatus { completion: CompletionState; validation: ValidationState; }

// ─── Option helpers ────────────────────────────────────────────────────────────

/** Normalize the display label only — never mutates the storage value */
const normalizeLabel = (raw: string): string => {
  const clean = raw.trim().toLowerCase();
  if (clean === 'yes' || clean === 'true') return 'YES';
  if (clean === 'no' || clean === 'false') return 'NO';
  if (clean === 'high') return 'HIGH';
  if (clean === 'medium' || clean === 'med') return 'MEDIUM';
  if (clean === 'low') return 'LOW';
  if (clean.includes('ambiguity') || clean.includes('ambiguous')) return 'AMBIGUOUS';
  if (clean.includes('insufficient') || clean.includes('gap')) return 'INSUFFICIENT';
  if (clean.includes('optimal') || clean.includes('excellent')) return 'OPTIMAL';
  if (clean.includes('strong') || clean.includes('good')) return 'STRONG';
  if (clean.includes('partial') || clean.includes('minimal')) return 'PARTIAL';
  if (clean.includes('critical') || clean.includes('invalid')) return 'CRITICAL';
  if (raw.includes(':')) {
    const p = raw.split(':')[0].trim();
    return p.length <= 20 ? p.toUpperCase() : p.slice(0, 18).toUpperCase() + '…';
  }
  if (raw.trim().length > 18) {
    const words = raw.trim().split(/\s+/);
    const two = (words[0] + (words[1] ? ' ' + words[1] : ''));
    return two.length <= 20 ? two.toUpperCase() : words[0].toUpperCase();
  }
  return raw.trim().toUpperCase();
};

/**
 * Parse a raw option string into a RichOption.
 * RULE: value = original raw string (storage key, never mutated)
 *       label = normalized atomic display text (UI only)
 */
export const parseOption = (raw: string, idx: number): RichOption => {
  const colonIdx = raw.indexOf(':');
  const labelPart = colonIdx === -1 ? raw : raw.slice(0, colonIdx);
  const descPart = colonIdx === -1 ? undefined : raw.slice(colonIdx + 1).trim();
  return {
    id: `opt_${idx}`,
    value: raw.trim(), // ← storage key: original untouched
    label: normalizeLabel(labelPart),
    description: descPart || undefined,
  };
};

export const parseOptions = (raw: string[]): RichOption[] => raw.map(parseOption);

/**
 * Resolve which Decision Card component to use.
 * binary  → 2 big stacked full-width cards (YES/NO)
 * score   → horizontal number-block segments (1-N rating)
 * category→ full-width stacked selectable decision cards
 * multi-chip → pill-chip multi-select
 */
const resolveRenderMode = (field: AnnotationField, opts: RichOption[]): DecisionRenderMode => {
  if (field.columnType === 'rating') return 'score';
  if (field.columnType === 'checkbox' || field.columnType === 'multiselect') return 'multi-chip';
  if (
    opts.length === 2 &&
    opts.every(o => ['YES','NO','TRUE','FALSE'].includes(o.label))
  ) return 'binary';
  return 'category';
};

// ─── Status engine ─────────────────────────────────────────────────────────────

const getInstanceStatus = (
  fields: AnnotationField[],
  data: Record<string, any>,
  isVisible: (f: AnnotationField) => boolean,
): InstanceStatus => {
  const visible = fields.filter(isVisible);
  if (visible.length === 0) return { completion: 'untouched', validation: 'valid' };

  const validation: ValidationState = visible.some(f => {
    const v = data[f.fieldName];
    if (v === undefined || v === null || String(v).trim() === '') return false;
    if (f.maxLength && String(v).length > f.maxLength) return true;
    if (f.min !== undefined && Number(v) < f.min) return true;
    if (f.max !== undefined && Number(v) > f.max) return true;
    return false;
  }) ? 'error' : 'valid';

  const filled = visible.filter(f => {
    const v = data[f.fieldName];
    return v !== undefined && v !== null && String(v).trim() !== '';
  });

  let completion: CompletionState = 'untouched';
  if (filled.length > 0) {
    const allRequired = visible
      .filter(f => f.isRequired)
      .every(f => filled.some(ff => ff.fieldName === f.fieldName));
    completion = allRequired ? 'completed' : 'partial';
  }

  return { completion, validation };
};

const getAnsweredCount = (fields: AnnotationField[], data: Record<string, any>): number =>
  fields.filter(f => {
    const v = data[f.fieldName];
    return v !== undefined && v !== null && String(v).trim() !== '';
  }).length;

// ─── Atomic UI components ──────────────────────────────────────────────────────

/** Status pill. Law 2: text only in the pill overlay, never inside OptionCard */
function StatusPill({ status }: { status: InstanceStatus }) {
  const { completion, validation } = status;

  if (validation === 'error') {
    return (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 uppercase tracking-wider select-none">
        Error
      </span>
    );
  }
  if (completion === 'completed') {
    return (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 uppercase tracking-wider select-none">
        Completed
      </span>
    );
  }
  if (completion === 'partial') {
    return (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider select-none">
        Partial
      </span>
    );
  }
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-200 uppercase tracking-wider select-none">
      Not Started
    </span>
  );
}

// ─── Decision Card primitives ──────────────────────────────────────────────────
// LAW: The entire card surface is the click target. No radio inputs. No list.
// LAW: Only CSS tokens change on selection — no text/icon/label mutations.
// LAW: value (storage) never changes — only className maps to selection state.

/**
 * BINARY CARD — used for YES/NO decisions.
 * Two tall full-width stacked cards. Subtitle always visible.
 * Click anywhere on card = select. No radio input.
 */
function BinaryCards({
  fieldName, options, value, onChange,
}: {
  fieldName: string; options: RichOption[]; value: string; onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  const hasSelection = value !== '' && value !== undefined;

  return (
    <div className="flex flex-col gap-3" role="group" aria-label={fieldName}>
      {options.map((opt) => {
        const isSelected = value === opt.value;
        const isDimmed = hasSelection && !isSelected;
        return (
          <div
            key={opt.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(opt.value); } }}
            className={cn(
              // Fixed geometry — NEVER shifts on selection (Law 3)
              'w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-l-[6px] cursor-pointer select-none',
              'transition-all duration-75',
              'focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none',
              isSelected
                ? 'border-teal-500 border-l-teal-600 bg-teal-50 shadow-md ring-2 ring-teal-200/50'
                : isDimmed
                  ? 'border-gray-200 border-l-gray-200 bg-white opacity-50 hover:opacity-75 hover:border-gray-300'
                  : 'border-gray-200 border-l-gray-300 bg-white hover:border-teal-300 hover:bg-teal-50/30'
            )}
          >
            {/* Selection indicator — fixed 24px circle, state changes only fill */}
            <div className={cn(
              'shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-75',
              isSelected
                ? 'border-teal-600 bg-teal-600'
                : 'border-gray-300 bg-white'
            )}>
              {isSelected && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            {/* Text block */}
            <div className="flex-1 min-w-0">
              <span className={cn(
                'block text-sm font-bold leading-tight',
                isSelected ? 'text-teal-900' : 'text-slate-800'
              )}>
                {opt.label}
              </span>
              {opt.description && (
                <span className={cn(
                  'block text-xs leading-snug mt-0.5 font-normal',
                  isSelected ? 'text-teal-700' : 'text-slate-500'
                )}>
                  {opt.description}
                </span>
              )}
            </div>
            {/* Right badge on selection */}
            {isSelected && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-full select-none">
                Selected
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * CATEGORY CARDS — used for multi-class decisions (HIGH/MEDIUM/LOW etc.).
 * Full-width stacked cards. Each card = one clinical decision.
 * Entire surface clickable. No radio. No grid columns.
 */
function CategoryCards({
  fieldName, options, value, onChange,
}: {
  fieldName: string; options: RichOption[]; value: string; onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  const hasSelection = value !== '' && value !== undefined;

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={fieldName}>
      {options.map((opt, idx) => {
        const isSelected = value === opt.value;
        const isDimmed = hasSelection && !isSelected;
        return (
          <div
            key={opt.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(opt.value); } }}
            className={cn(
              // Full-width fixed-height surface. Geometry NEVER changes.
              'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-l-[6px] cursor-pointer select-none',
              'transition-all duration-75',
              'focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none',
              isSelected
                ? 'border-teal-500 border-l-teal-600 bg-teal-50 shadow-md ring-2 ring-teal-200/50'
                : isDimmed
                  ? 'border-gray-200 border-l-gray-200 bg-white opacity-50 hover:opacity-75 hover:border-gray-300'
                  : 'border-gray-200 border-l-slate-300 bg-white hover:border-teal-300 hover:bg-teal-50/20'
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Keyboard shortcut badge — always visible, never changes */}
              <span className={cn(
                'shrink-0 h-6 w-6 rounded-md text-[11px] font-bold font-mono flex items-center justify-center border transition-all duration-75',
                isSelected
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              )}>
                {idx + 1}
              </span>
              <div className="min-w-0">
                <span className={cn(
                  'block text-sm font-bold leading-tight truncate',
                  isSelected ? 'text-teal-900' : 'text-slate-800'
                )}>
                  {opt.label}
                </span>
                {opt.description && (
                  <span className={cn(
                    'block text-xs leading-snug mt-0.5 font-normal',
                    isSelected ? 'text-teal-700' : 'text-slate-400'
                  )}>
                    {opt.description}
                  </span>
                )}
              </div>
            </div>
            {/* Right: checkmark on selection */}
            <div className={cn(
              'shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center ml-3 transition-all duration-75',
              isSelected ? 'border-teal-600 bg-teal-600' : 'border-gray-300 bg-white'
            )}>
              {isSelected && (
                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * SCORE SEGMENTS — used for numeric rating (1-N).
 * Horizontal fixed-size number blocks with severity color coding.
 * Legend rail beneath maps score → clinical meaning.
 */
function ScoreSegments({
  fieldName, options, value, maxRating, onChange,
}: {
  fieldName: string; options: RichOption[]; value: string; maxRating: number; onChange: (v: string) => void;
}) {
  const getSeverityColor = (score: number, max: number) => {
    const frac = (score - 1) / Math.max(max - 1, 1);
    if (frac >= 0.9) return { sel: 'bg-emerald-600 border-emerald-600 text-white', idle: 'hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700' };
    if (frac >= 0.7) return { sel: 'bg-green-600 border-green-600 text-white',   idle: 'hover:border-green-400 hover:bg-green-50 hover:text-green-700' };
    if (frac >= 0.4) return { sel: 'bg-slate-600 border-slate-600 text-white',   idle: 'hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700' };
    if (frac >= 0.2) return { sel: 'bg-amber-600 border-amber-600 text-white',   idle: 'hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700' };
    return               { sel: 'bg-rose-600 border-rose-600 text-white',     idle: 'hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700' };
  };

  return (
    <div className="space-y-4">
      {/* Score blocks row */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={`Score for ${fieldName}`}>
        {Array.from({ length: maxRating }, (_, i) => i + 1).map((score) => {
          const isSelected = String(value) === String(score);
          const colors = getSeverityColor(score, maxRating);
          return (
            <button
              key={score}
              type="button"
              aria-label={`Score ${score} of ${maxRating}`}
              aria-pressed={isSelected}
              onClick={() => onChange(isSelected ? '' : String(score))}
              className={cn(
                // Fixed 44×44 — geometry NEVER changes
                'h-11 w-11 rounded-lg border-2 text-sm font-bold font-mono select-none cursor-pointer',
                'transition-all duration-75',
                'focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none',
                isSelected
                  ? `${colors.sel} shadow-md scale-110 ring-2 ring-white/40`
                  : `bg-white border-gray-300 text-slate-600 ${colors.idle}`
              )}
            >
              {score}
            </button>
          );
        })}
      </div>

      {/* Legend rail — clinical meaning for each score level */}
      {options.length > 0 && (
        <div className="border-l-2 border-slate-200 pl-3 space-y-1">
          {options.map((opt, idx) => {
            const score = idx + 1;
            const isActive = String(value) === String(score);
            return (
              <div key={opt.id} className={cn(
                'flex items-start gap-2 text-[11px] transition-opacity duration-75',
                isActive ? 'opacity-100' : 'opacity-50'
              )}>
                <span className={cn(
                  'shrink-0 font-bold font-mono text-[11px] w-4',
                  isActive ? 'text-teal-700' : 'text-slate-400'
                )}>{score}</span>
                <span className={cn(
                  'leading-snug',
                  isActive ? 'text-teal-800 font-semibold' : 'text-slate-500'
                )}>
                  {opt.description || opt.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-gray-400 font-mono select-none">
        Press 1–{maxRating} · Click again to deselect
      </p>
    </div>
  );
}

/**
 * MULTI-CHIP — full-width pill chips for multiselect / checkbox.
 * Each chip is full-width for clarity on small panels.
 */
function MultiChip({
  fieldName, options, value, onChange, maxSelections,
}: {
  fieldName: string; options: RichOption[]; value: string; onChange: (v: string) => void; maxSelections?: number;
}) {
  const selected: string[] = useMemo(() => {
    try {
      if (value.startsWith('[')) return JSON.parse(value);
      return value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
    } catch { return []; }
  }, [value]);

  const toggle = (optVal: string) => {
    const isOn = selected.includes(optVal);
    let next: string[];
    if (isOn) {
      next = selected.filter(s => s !== optVal);
    } else {
      if (maxSelections !== undefined && selected.length >= maxSelections) return;
      next = [...selected, optVal];
    }
    onChange(JSON.stringify(next));
  };

  const limitMsg = maxSelections !== undefined
    ? `Select up to ${maxSelections}`
    : 'Select all that apply';

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-slate-400 font-mono select-none">{limitMsg}</p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          const limitReached = maxSelections !== undefined && selected.length >= maxSelections && !isSelected;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={isSelected}
              disabled={limitReached}
              onClick={() => toggle(opt.value)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-l-[6px] text-left cursor-pointer select-none',
                'transition-all duration-75',
                'focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none',
                isSelected
                  ? 'border-teal-500 border-l-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-200/50'
                  : 'border-gray-200 border-l-gray-300 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/20',
                limitReached && 'opacity-40 cursor-not-allowed'
              )}
            >
              {/* Square checkbox indicator */}
              <div className={cn(
                'shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-75',
                isSelected ? 'bg-teal-600 border-teal-600' : 'bg-white border-gray-400'
              )}>
                {isSelected && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-semibold leading-tight truncate">{opt.label}</span>
                {opt.description && (
                  <span className="block text-xs text-slate-400 leading-snug mt-0.5">{opt.description}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Central Decision Card Engine — dispatches to the correct primitive */
export function DecisionCardEngine({
  field, options, value, onChange,
}: {
  field: any; options: RichOption[]; value: string; onChange: (v: string) => void;
}) {
  const mode = resolveRenderMode(field, options);

  if (mode === 'binary') {
    return <BinaryCards fieldName={field.fieldName} options={options} value={value} onChange={onChange} />;
  }
  if (mode === 'score') {
    return <ScoreSegments fieldName={field.fieldName} options={options} value={value} maxRating={field.maxRating || 5} onChange={onChange} />;
  }
  if (mode === 'multi-chip') {
    return <MultiChip fieldName={field.fieldName} options={options} value={value} onChange={onChange} maxSelections={field.maxSelections} />;
  }
  // category (default)
  return <CategoryCards fieldName={field.fieldName} options={options} value={value} onChange={onChange} />;
}

/** Inline validation message (overlay layer — never inside OptionCard) */
function ValidationMessage({ field, value }: { field: AnnotationField; value: string }) {
  if (!value && !field.isRequired) return null;
  if (!value && field.isRequired) return null; // shown on submit only

  if (field.maxLength && String(value).length > field.maxLength) {
    return (
      <p className="text-xs text-red-500 font-medium mt-1.5">
        ⚠ Maximum {field.maxLength} characters. Currently: {String(value).length}
      </p>
    );
  }
  if (field.min !== undefined && Number(value) < field.min) {
    return <p className="text-xs text-red-500 font-medium mt-1.5">⚠ Minimum value is {field.min}</p>;
  }
  if (field.max !== undefined && Number(value) > field.max) {
    return <p className="text-xs text-red-500 font-medium mt-1.5">⚠ Maximum value is {field.max}</p>;
  }
  return null;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function NewColumnDataPanel({
  annotationConfig,
  newColumnData,
  onNewColumnChange,
  onSaveAllNewColumnData,
  onExportSelectedColumns,
  onExportAllColumns,
  isSaving,
  completedCount,
  pendingCount,
  currentRowIndex,
  onPanelDragOver,
  onDropFromMetadata,
  draggedField,
  onAnnotationFieldDragStart,
  onAnnotationFieldDragOver,
  onAnnotationFieldDrop,
}: NewColumnDataPanelProps) {

  // ── UIState ──────────────────────────────────────────────────────────────────
  /** Single globally open accordion key: `${groupId}::${instanceIndex}` */
  const [openAccordionKey, setOpenAccordionKey] = useState<string | null>(null);
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Visibility engine ────────────────────────────────────────────────────────
  const isFieldVisible = useCallback((field: AnnotationField): boolean => {
    if (!field.visibilityRule?.dependsOn) return true;
    const { dependsOn, operator, value } = field.visibilityRule;
    const dep = String(newColumnData[dependsOn] ?? '').toLowerCase();
    const target = String(value ?? '').toLowerCase();
    switch (operator) {
      case 'equals':     return dep === target;
      case 'not_equals': return dep !== target;
      case 'contains':   return dep.includes(target);
      case 'empty':      return dep === '';
      case 'not_empty':  return dep !== '';
      default:           return true;
    }
  }, [newColumnData]);

  // ── Derived annotation fields ────────────────────────────────────────────────
  const annotationFields = useMemo(() =>
    annotationConfig?.annotationFields.filter(f => f.isAnnotationField) ?? [],
    [annotationConfig]
  );

  // ── GroupInstance builder ────────────────────────────────────────────────────
  const groupInstances = useMemo((): GroupInstance[] => {
    if (!annotationConfig?.fieldGroups) return [];
    const escapeRegExp = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const instances: GroupInstance[] = [];
    for (const group of annotationConfig.fieldGroups) {
      const repeatCount = group.repeatCount || 0;
      for (let i = 1; i <= repeatCount; i++) {
        const instanceFields = annotationFields.filter(f => {
          if (!f.fieldName || !f.fieldName.includes('_')) return false;
          const parts = f.fieldName.split('_');
          const suffix = parts[parts.length - 1];
          if (String(suffix) !== String(i)) return false;

          return (group.fields || []).some(gf => {
            const groupName = group.groupName || '';
            const gfFieldName = gf.fieldName || '';
            const escapedGroupName = escapeRegExp(groupName);
            const escapedGfFieldName = escapeRegExp(gfFieldName);
            const pattern = new RegExp(`^${escapedGroupName}_${escapedGfFieldName}_(?:\\d+_)?${i}$`);
            return pattern.test(f.fieldName);
          });
        });
        if (instanceFields.length > 0) {
          instances.push({
            key: `${group.groupId}::${i}`,
            groupId: group.groupId,
            instanceIndex: i,
            title: `${group.groupTitle || group.groupName || 'Group'} #${i}`,
            fields: instanceFields,
          });
        }
      }
    }
    return instances;
  }, [annotationConfig, annotationFields]);

  const groupInstanceKeys = useMemo(() =>
    new Set(groupInstances.flatMap(gi => (gi.fields || []).map(f => f.fieldName))),
    [groupInstances]
  );

  const baseFields = useMemo(() =>
    annotationFields.filter(f => !groupInstanceKeys.has(f.fieldName)),
    [annotationFields, groupInstanceKeys]
  );

  // ── Sections from base fields ────────────────────────────────────────────────
  const baseSections = useMemo(() => {
    const sections: { section: string; fields: AnnotationField[] }[] = [];
    let currentSection = '';
    for (const f of baseFields) {
      const sec = (f.section || '').trim();
      if (sec !== currentSection || sections.length === 0) {
        currentSection = sec;
        sections.push({ section: sec, fields: [f] });
      } else {
        sections[sections.length - 1].fields.push(f);
      }
    }
    return sections;
  }, [baseFields]);

  // ── Accordion controls ───────────────────────────────────────────────────────
  const toggleAccordion = useCallback((key: string) => {
    setOpenAccordionKey(prev => prev === key ? null : key);
  }, []);

  // ── Auto-scroll on focus ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!focusedFieldId) return;
    const el = document.getElementById(`card-${focusedFieldId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedFieldId]);

  // ── Sidebar click handler ────────────────────────────────────────────────────
  const handleSidebarClick = useCallback((fieldName: string, accordionKey?: string) => {
    if (accordionKey && openAccordionKey !== accordionKey) {
      setOpenAccordionKey(accordionKey);
    }
    setFocusedFieldId(fieldName);
    setTimeout(() => {
      document.getElementById(`card-${fieldName}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }, [openAccordionKey]);

  // ── Helper: question number ──────────────────────────────────────────────────
  const getQuestionNumber = useCallback((fields: AnnotationField[], fieldName: string): number =>
    fields.filter(f => isFieldVisible(f)).findIndex(f => f.fieldName === fieldName) + 1,
    [isFieldVisible]
  );

  // ── Helper: clean field label for repeatable group fields ────────────────────
  const getCleanFieldLabel = (fieldName: string, groupName: string, groupInstanceIndex: number): string => {
    let s = fieldName || '';
    const prefix = `${groupName || ''}_`;
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length);
    }
    const suffix = `_${groupInstanceIndex}`;
    if (s.endsWith(suffix)) {
      s = s.slice(0, -suffix.length);
    }
    const match = s.match(/_(\d+)$/);
    let childIndexSuffix = '';
    if (match) {
      childIndexSuffix = ` #${match[1]}`;
      s = s.slice(0, -match[0].length);
    }
    const title = s
      .split('_')
      .map(word => word ? (word.charAt(0).toUpperCase() + word.slice(1)) : '')
      .join(' ');
    return `${title}${childIndexSuffix}`;
  };

  // ── Render single question card ──────────────────────────────────────────────
  const renderQuestionCard = useCallback((
    field: AnnotationField,
    qNum: number,
    isDraggable: boolean = false,
    group?: any,
    groupInstanceIndex?: number
  ) => {
    if (!isFieldVisible(field)) return null;
    const value = newColumnData[field.fieldName] ?? (field.defaultValue ? String(field.defaultValue) : '');
    const options = parseOptions(field.options ?? []);
    const isFocused = focusedFieldId === field.fieldName;
    const isTextType = !field.columnType || field.columnType === 'textarea' || field.columnType === 'text' || field.columnType === 'number' || field.columnType === 'date';

    return (
      <div
        key={field.fieldName}
        id={`card-${field.fieldName}`}
        onClick={() => setFocusedFieldId(field.fieldName)}
        draggable={isDraggable}
        onDragStart={isDraggable ? (e) => onAnnotationFieldDragStart?.(e, field.csvColumnName) : undefined}
        onDragOver={onAnnotationFieldDragOver}
        onDrop={(e) => {
          if (isDraggable) {
            e.preventDefault();
            e.stopPropagation();
            onAnnotationFieldDrop?.(e, field.csvColumnName);
          }
        }}
        className={cn(
          'p-4 border border-gray-200 rounded-lg bg-gray-50 transition-all duration-200 relative',
          isFocused
            ? 'border-teal-500 bg-teal-50/10 shadow-md'
            : 'hover:shadow-md hover:bg-gray-100/70',
          isDraggable ? 'cursor-move' : 'cursor-default',
          draggedField === field.csvColumnName && 'opacity-50 bg-teal-50 border-teal-300'
        )}
      >
        {/* Question Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {isDraggable && <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />}
            <span className="text-sm font-medium text-gray-700">
              {group ? getCleanFieldLabel(field.fieldName, group.groupName, groupInstanceIndex!) : (field.questionTitle || field.fieldName)}
              {field.isRequired && <span className="text-red-500 ml-1 font-bold">*</span>}
            </span>
          </div>
        </div>

        {/* Answer control */}
        <div className="mt-0">
          {isTextType ? (
            field.columnType === 'text' ? (
              <Input
                type="text"
                value={value}
                onChange={e => onNewColumnChange(field.fieldName, e.target.value)}
                onFocus={() => setFocusedFieldId(field.fieldName)}
                placeholder={field.placeholder || `Enter value…`}
                maxLength={field.maxLength}
                className="w-full text-sm h-9 border-gray-200 rounded-lg focus-visible:ring-1 focus-visible:ring-teal-500"
              />
            ) : field.columnType === 'number' ? (
              <Input
                type="number"
                value={value}
                onChange={e => onNewColumnChange(field.fieldName, e.target.value)}
                onFocus={() => setFocusedFieldId(field.fieldName)}
                min={field.min} max={field.max}
                className="w-full text-sm h-9 border-gray-200 rounded-lg focus-visible:ring-1 focus-visible:ring-teal-500"
              />
            ) : field.columnType === 'date' ? (
              <Input
                type="date"
                value={value}
                onChange={e => onNewColumnChange(field.fieldName, e.target.value)}
                min={field.minDate} max={field.maxDate}
                className="w-full text-sm h-9 border-gray-200 rounded-lg focus-visible:ring-1 focus-visible:ring-teal-500"
              />
            ) : (
              <Textarea
                value={value}
                onChange={e => onNewColumnChange(field.fieldName, e.target.value)}
                onFocus={() => setFocusedFieldId(field.fieldName)}
                onBlur={() => setFocusedFieldId(null)}
                placeholder={field.placeholder || `Enter details…`}
                maxLength={field.maxLength}
                rows={field.rows || 3}
                className="resize-y border-gray-200 rounded-lg focus-visible:ring-1 focus-visible:ring-teal-500 text-sm"
              />
            )
          ) : (
            <DecisionCardEngine
              field={field}
              options={options}
              value={value}
              onChange={v => onNewColumnChange(field.fieldName, v)}
            />
          )}
        </div>

        {/* Validation overlay layer (separate from OptionCard surfaces) */}
        <ValidationMessage field={field} value={value} />
      </div>
    );
  }, [newColumnData, focusedFieldId, draggedField, isFieldVisible, onNewColumnChange]);

  // ── Progress totals ──────────────────────────────────────────────────────────
  const { totalVisible, totalAnswered } = useMemo(() => {
    const all = annotationFields.filter(f => isFieldVisible(f));
    const answered = all.filter(f => {
      const v = newColumnData[f.fieldName];
      return v !== undefined && v !== null && String(v).trim() !== '';
    });
    return { totalVisible: all.length, totalAnswered: answered.length };
  }, [annotationFields, newColumnData, isFieldVisible]);

  const progressPct = totalVisible > 0 ? Math.round((totalAnswered / totalVisible) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={panelRef}
      className="h-full bg-white flex flex-col"
      onDragOver={e => { if (onPanelDragOver) onPanelDragOver(e); }}
      onDrop={e => { e.preventDefault(); if (onDropFromMetadata) onDropFromMetadata(); }}
    >

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-gray-100 bg-white">
        <div className="h-10 hidden sm:block" /> {/* spacer for nav */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900">Annotation Workbench</h2>
            <div className="flex items-center gap-3 mt-1">
              {currentRowIndex !== undefined && (
                <span className="text-xs text-slate-500 font-mono">
                  Case {currentRowIndex + 1}
                </span>
              )}
              <span className="text-xs text-slate-500">
                Progress: <span className="font-bold text-teal-700">{progressPct}%</span>
              </span>
              {/* Save status */}
              <span className="text-xs flex items-center gap-1">
                {isSaving ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                    <span className="text-amber-600 font-semibold">Saving…</span>
                  </>
                ) : (
                  <span className="text-green-600 font-semibold">✓ Saved</span>
                )}
              </span>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onExportAllColumns}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-8 px-3 cursor-pointer transition-colors shadow-sm"
          >
            Download CSV
          </Button>
        </div>
      </div>

      {/* ── Main split content ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Questions column */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth">

          {/* Empty state */}
          {totalVisible === 0 && (
            <div className="text-center text-gray-500 py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                <span className="text-2xl text-gray-400">✏️</span>
              </div>
              <h3 className="text-base font-semibold mb-1">No Annotation Fields Available</h3>
              <p className="text-xs max-w-xs mx-auto text-gray-400">
                Ensure fields are configured in the field configuration page and satisfy any visibility rules.
              </p>
            </div>
          )}

          {/* Base fields by section */}
          {baseSections.map(({ section, fields }) => {
            const visibleFields = fields.filter(f => isFieldVisible(f));
            if (visibleFields.length === 0) return null;
            let qOffset = 0;
            // Count questions before this section for numbering
            for (const s of baseSections) {
              if (s.section === section) break;
              qOffset += s.fields.filter(f => isFieldVisible(f)).length;
            }

            return (
              <div key={section || '__base'} className="space-y-4">
                {visibleFields.map((field, fIdx) =>
                  renderQuestionCard(field, qOffset + fIdx + 1, true)
                )}
              </div>
            );
          })}

          {/* Repeatable group containers */}
          {annotationConfig?.fieldGroups?.map(group => {
            const instances = groupInstances.filter(gi => gi.groupId === group.groupId);
            if (instances.length === 0) return null;

            // Focus Lock: dim if any accordion is open and it's not this group
            const anyOpen = openAccordionKey !== null;
            const thisGroupOpen = anyOpen && openAccordionKey!.startsWith(group.groupId);

            return (
              <div key={group.groupId} className="space-y-4">
                {instances.map(instance => {
                  const isOpen = openAccordionKey === instance.key;
                  const visibleFields = instance.fields.filter(f => isFieldVisible(f));
                  const answered = getAnsweredCount(visibleFields, newColumnData);
                  const total = visibleFields.length;
                  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
                  const status = getInstanceStatus(instance.fields, newColumnData, isFieldVisible);

                  return (
                    <div
                      key={instance.key}
                      className={cn(
                        'border border-gray-200 rounded-lg bg-gray-50 transition-all duration-200 relative',
                        isOpen ? 'shadow-md border-teal-500 bg-teal-50/5' : 'hover:shadow-sm hover:bg-gray-100/70',
                        anyOpen && !thisGroupOpen ? 'opacity-50' : 'opacity-100'
                      )}
                    >
                      {/* Repeatable Group Card Header (styled like Left Panel Cards) */}
                      <button
                        id={`accordion-${instance.key}`}
                        type="button"
                        onClick={() => toggleAccordion(instance.key)}
                        className="w-full flex items-center justify-between p-4 cursor-pointer focus:outline-none text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="font-semibold text-gray-800 text-sm truncate">
                            {instance.title}
                          </span>
                          {total > 0 && (
                            <span className="text-xs text-gray-500 font-mono">
                              ({answered}/{total})
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-3 shrink-0">
                          <StatusPill status={status} />
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                      </button>

                      {/* Expanded child cards */}
                      {isOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-white rounded-b-lg space-y-4">
                          {visibleFields.map((field, fIdx) =>
                            renderQuestionCard(field, fIdx + 1, false, group, instance.instanceIndex)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Save controls ── */}
      <div className="p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-end">
        <Button
          size="sm"
          onClick={onSaveAllNewColumnData}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 h-9 transition-colors shadow-sm"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving…' : 'Save and Continue'}
        </Button>
      </div>
    </div>
  );
}
