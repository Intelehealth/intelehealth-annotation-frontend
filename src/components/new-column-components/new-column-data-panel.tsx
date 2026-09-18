import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { FieldInfo } from '@/components/annotation-components/metadata-display';
import { resolveImages } from '@/lib/image-source';
import { GroupFieldInput, groupKey, readList } from './group-field-input';
import type { GroupChildField } from '@/types/feature1';
import type { LensSettings } from '@/components/annotation-components/magnifier';
import { captionInputs } from './caption-input';
import { rowCompletedBy } from '@/lib/required-answers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GripVertical, ChevronDown, ChevronRight, Settings, Plus, Trash2, Edit3, Wrench, Lock } from 'lucide-react';
import { AnnotationField, AnnotationConfig } from '@/lib/api/csv-imports';
import { cn } from '@/lib/utils';
import { DragDropHelper } from '@/lib/drag-drop-helper';
import { ConditionalFieldRenderer } from './conditional-field-renderer';
import { FieldTypeConfigurator } from '@/components/field-config-components/field-type-configurator';
import { RecursiveFieldEditor } from '@/components/field-config-components/recursive-field-editor';
import { LivePreviewTree } from '@/components/field-config-components/live-preview-tree';
import { FieldGroupEditor } from '@/components/field-config-components/field-group-editor';
import { AudioPreview, VideoPreview } from '@/components/annotation-components/media-preview';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { schemaRequestsAPI } from '@/lib/api/schema-requests';
import { permissionsAPI } from '@/lib/api/permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewColumnData {
  [fieldName: string]: string;
}

interface NewColumnDataPanelProps {
  /** Enables the authenticated image proxy for remote images. */
  datasetId?: string;
  annotationConfig: AnnotationConfig | null;
  newColumnData: NewColumnData;
  onNewColumnChange: (fieldName: string, value: string) => void;
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
  onUpdateFieldConfig?: (updatedFields: AnnotationField[], updatedGroups?: any[]) => void;
  isAdmin?: boolean;
  cloneId?: string;
  currentRowId?: string;
  reviewRequestFields?: string[];
  onImageClick?: (imageUrls: string[], index: number, lens?: LensSettings | null) => void;
  onVideoClick?: (videoUrls: string[], index: number) => void;
  /** Inspecting another annotator's work: show their answers, allow no edits. */
  readOnly?: boolean;
  /** Keys of required questions left blank on the last Save and Continue. */
  missingFields?: string[];
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
  fieldName, options, value, onChange, renderChildFields,
}: {
  fieldName: string;
  options: RichOption[];
  value: string;
  onChange: (v: string) => void;
  renderChildFields?: (optionValue: string) => React.ReactNode;
}) {
  if (options.length === 0) return null;
  const hasSelection = value !== '' && value !== undefined;

  return (
    <div className="flex flex-col gap-3" role="group" aria-label={fieldName}>
      {options.map((opt) => {
        const isSelected = value !== '' && value !== undefined && value !== null && value === opt.value;
        const isDimmed = hasSelection && !isSelected;
        return (
          <div key={opt.id} className="flex flex-col gap-2">
            <div
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
            {isSelected && renderChildFields && (
              <div className="w-full">
                {renderChildFields(opt.value)}
              </div>
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
  fieldName, options, value, onChange, renderChildFields,
}: {
  fieldName: string;
  options: RichOption[];
  value: string;
  onChange: (v: string) => void;
  renderChildFields?: (optionValue: string) => React.ReactNode;
}) {
  if (options.length === 0) return null;
  const hasSelection = value !== '' && value !== undefined;

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={fieldName}>
      {options.map((opt, idx) => {
        const isSelected = value !== '' && value !== undefined && value !== null && value === opt.value;
        const isDimmed = hasSelection && !isSelected;
        return (
          <div key={opt.id} className="flex flex-col gap-2">
            <div
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
            {isSelected && renderChildFields && (
              <div className="w-full">
                {renderChildFields(opt.value)}
              </div>
            )}
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
  fieldName, options, value, maxRating, onChange, renderChildFields,
}: {
  fieldName: string;
  options: RichOption[];
  value: string;
  maxRating: number;
  onChange: (v: string) => void;
  renderChildFields?: (optionValue: string) => React.ReactNode;
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
      {options.length > 0 && options.some((opt, idx) => (opt.description || opt.label || '').trim() !== String(idx + 1)) && (
        <div className="border-l-2 border-slate-200 pl-3 space-y-1">
          {options.map((opt, idx) => {
            const score = idx + 1;
            const labelText = (opt.description || opt.label || '').trim();
            if (labelText === String(score)) {
              return null;
            }
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

      {value && renderChildFields && (
        <div className="w-full mt-2 border-t border-gray-100 pt-2">
          {renderChildFields(value)}
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
  fieldName, options, value, onChange, maxSelections, renderChildFields,
}: {
  fieldName: string;
  options: RichOption[];
  value: string;
  onChange: (v: string) => void;
  maxSelections?: number;
  renderChildFields?: (optionValue: string) => React.ReactNode;
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
            <div key={opt.id} className="flex flex-col gap-2">
              <button
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
              {isSelected && renderChildFields && (
                <div className="w-full">
                  {renderChildFields(opt.value)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Central Decision Card Engine — dispatches to the correct primitive */
export function DecisionCardEngine({
  field, options, value, onChange, renderChildFields,
}: {
  field: any;
  options: RichOption[];
  value: string;
  onChange: (v: string) => void;
  renderChildFields?: (optionValue: string) => React.ReactNode;
}) {
  const mode = resolveRenderMode(field, options);

  if (mode === 'binary') {
    return <BinaryCards fieldName={field.fieldName} options={options} value={value} onChange={onChange} renderChildFields={renderChildFields} />;
  }
  if (mode === 'score') {
    return <ScoreSegments fieldName={field.fieldName} options={options} value={value} maxRating={field.maxRating || 5} onChange={onChange} renderChildFields={renderChildFields} />;
  }
  if (mode === 'multi-chip') {
    return <MultiChip fieldName={field.fieldName} options={options} value={value} onChange={onChange} maxSelections={field.maxSelections} renderChildFields={renderChildFields} />;
  }
  // category (default)
  return <CategoryCards fieldName={field.fieldName} options={options} value={value} onChange={onChange} renderChildFields={renderChildFields} />;
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
  datasetId,
  annotationConfig,
  newColumnData,
  onNewColumnChange,
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
  onUpdateFieldConfig,
  isAdmin = false,
  cloneId,
  currentRowId,
  reviewRequestFields,
  onImageClick,
  onVideoClick,
  readOnly = false,
  missingFields = [],
}: NewColumnDataPanelProps) {

  // ── UIState ──────────────────────────────────────────────────────────────────
  /** Single globally open accordion key: `${groupId}::${instanceIndex}` */
  const [openAccordionKey, setOpenAccordionKey] = useState<string | null>(null);
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // ── Visual Form Builder Configuration State & Handlers ──
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());
  const [editingGroups, setEditingGroups] = useState<Set<string>>(new Set());

  // ── Dialog States ──
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [addQuestionForm, setAddQuestionForm] = useState({ name: '', type: 'text', required: false });

  const [showAddGroup, setShowAddGroup] = useState(false);
  const [addGroupName, setAddGroupName] = useState('');

  const [showAddGroupField, setShowAddGroupField] = useState<string | null>(null);
  const [addGroupFieldName, setAddGroupFieldName] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    type: 'field' | 'group' | 'groupField';
    targetId: string;
    childIdx?: number;
    title: string;
  } | null>(null);

  // Schema request editor dialog for annotators
  const [showRequestConfig, setShowRequestConfig] = useState<AnnotationField | null>(null);
  const [requestConfigForm, setRequestConfigForm] = useState<(AnnotationField & { note?: string }) | null>(null);

  const [showRequestGroupConfig, setShowRequestGroupConfig] = useState<any | null>(null);
  const [requestGroupConfigForm, setRequestGroupConfigForm] = useState<(any & { note?: string }) | null>(null);

  // Permission request dialog for annotators
  const [showPermissionRequest, setShowPermissionRequest] = useState<{
    fieldId: string;
    groupId?: string;
    action: string;
    fieldName: string;
  } | null>(null);
  const [permissionRequestNote, setPermissionRequestNote] = useState('');

  const toggleEditingField = (fieldName: string) => {
    setEditingFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  const isEditingField = (fieldName: string) => editingFields.has(fieldName);

  const toggleEditingGroup = (groupId: string) => {
    setEditingGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleUpdateSingleField = (oldFieldName: string, updatedField: AnnotationField) => {
    if (!annotationConfig || !onUpdateFieldConfig) return;
    const updatedFields = (annotationConfig.annotationFields || []).map((f) => {
      if (f.fieldName === oldFieldName) {
        return updatedField;
      }
      return f;
    });
    onUpdateFieldConfig(updatedFields);
  };

  const handleDeleteField = (fieldId: string) => {
    if (!annotationConfig || !onUpdateFieldConfig) return;
    const updatedFields = (annotationConfig.annotationFields || []).map((f) => {
      if ((f.id || f.fieldName) === fieldId) {
        return { ...f, isAnnotationField: false };
      }
      return f;
    });
    setEditingFields((prev) => {
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
    onUpdateFieldConfig(updatedFields);
  };

  const handleDuplicateField = (field: AnnotationField) => {
    if (!annotationConfig || !onUpdateFieldConfig) return;
    if (!field.isAnnotationField) return;
    const existingNames = new Set(
      (annotationConfig.annotationFields || [])
        .filter((f) => f.isAnnotationField)
        .map((f) => f.fieldName?.toLowerCase()),
    );
    let uniqueName = field.fieldName;
    let counter = 1;
    while (existingNames.has(uniqueName?.toLowerCase())) {
      uniqueName = `${field.fieldName}_${counter}`;
      counter++;
    }
    const copy: AnnotationField = {
      ...field,
      id: `dup_${Date.now()}`,
      fieldName: uniqueName,
      csvColumnName: uniqueName,
      questionTitle: `Copy of ${field.questionTitle || field.fieldName}`,
      isNewColumn: true,
      isAnnotationField: true,
    };
    const updatedFields = [...(annotationConfig.annotationFields || []), copy];
    onUpdateFieldConfig(updatedFields);
    // Copy the current value (e.g. media URL, text) so the duplicate shows the
    // same content immediately instead of an empty/broken preview.
    const currentValue = newColumnData[field.fieldName];
    if (currentValue) {
      onNewColumnChange(uniqueName, currentValue);
    }
  };

  const handleDuplicateGroup = (group: any) => {
    if (!annotationConfig || !onUpdateFieldConfig) return;
    const cloneGroup = JSON.parse(JSON.stringify(group));
    const newId = `group_${Date.now()}`;
    cloneGroup.groupId = newId;
    cloneGroup.groupName = group.groupName;
    if (cloneGroup.fields) {
      cloneGroup.fields = cloneGroup.fields.map((cf: any) => ({
        ...cf,
        id: `gf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        fieldName: cf.fieldName,
        csvColumnName: cf.csvColumnName,
      }));
    }
    const updatedGroups = [...(annotationConfig.fieldGroups || []), cloneGroup];
    onUpdateFieldConfig(annotationConfig.annotationFields, updatedGroups);
  };

  const handleAddNewQuestion = () => {
    setShowAddQuestion(true);
  };

  const submitAddQuestion = async () => {
    if (!annotationConfig) return;
    const { name, type, required } = addQuestionForm;
    if (!name) return;
    const cleanedName = name.replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanedName) return;

    const newField: AnnotationField = {
      id: `field_${Date.now()}`,
      csvColumnName: cleanedName,
      fieldName: cleanedName,
      fieldType: type as AnnotationField['fieldType'],
      columnType: type as AnnotationField['columnType'],
      isRequired: required,
      isAnnotationField: true,
      isPrimaryKey: false,
      isNewColumn: true,
      options: (type === 'select' || type === 'radio' || type === 'multiselect' || type === 'checkbox') ? ['Option 1'] : [],
    };

    if (isAdmin) {
      if (onUpdateFieldConfig) {
        const updatedFields = [...(annotationConfig.annotationFields || []), newField];
        onUpdateFieldConfig(updatedFields);
        showToast({ title: 'Auto-saved', description: `Question "${cleanedName}" added successfully.`, type: 'success' });
      }
    } else {
      try {
        await schemaRequestsAPI.create({
          type: 'ADD_FIELD',
          cloneId: cloneId || '',
          rowId: currentRowId,
          field: newField,
        });
        showToast({ title: 'Schema Request Sent', description: `Request to add question "${cleanedName}" sent to admin for review.`, type: 'success' });
      } catch (err: any) {
        showToast({ title: 'Error', description: err?.response?.data?.message || 'Failed to submit schema request.', type: 'error' });
      }
    }

    setShowAddQuestion(false);
    setAddQuestionForm({ name: '', type: 'text', required: false });
  };

  const handleAddRepeatGroup = () => {
    setShowAddGroup(true);
  };

  const submitAddRepeatGroup = async (group: any) => {
    if (!annotationConfig) return;

    if (isAdmin) {
      if (onUpdateFieldConfig) {
        const updatedGroups = [...(annotationConfig.fieldGroups || []), group];
        onUpdateFieldConfig(annotationConfig.annotationFields, updatedGroups);
        showToast({ title: 'Auto-saved', description: `Repeat group "${group.groupName}" added successfully.`, type: 'success' });
      }
    } else {
      try {
        await schemaRequestsAPI.create({
          type: 'ADD_GROUP',
          cloneId: cloneId || '',
          rowId: currentRowId,
          field: group,
        });
        showToast({ title: 'Schema Request Sent', description: `Request to add repeat group "${group.groupName}" sent to admin for review.`, type: 'success' });
      } catch (err: any) {
        showToast({ title: 'Error', description: err?.response?.data?.message || 'Failed to submit schema request.', type: 'error' });
      }
    }

    setShowAddGroup(false);
  };

  const handleUpdateGroupProperties = (groupId: string, updates: any) => {
    if (!annotationConfig || !onUpdateFieldConfig) return;
    const updatedGroups = (annotationConfig.fieldGroups || []).map((g) => {
      if (g.groupId === groupId) {
        return { ...g, ...updates };
      }
      return g;
    });
    onUpdateFieldConfig(annotationConfig.annotationFields, updatedGroups);
  };

  const handleAddGroupField = (groupId: string) => {
    setShowAddGroupField(groupId);
  };

  const submitAddGroupField = async () => {
    if (!annotationConfig || !showAddGroupField) return;
    if (!addGroupFieldName.trim()) return;

    const cleanedName = addGroupFieldName.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanedName) return;

    const newField = {
      fieldName: cleanedName,
      fieldType: 'text',
      isRequired: false,
    };

    if (isAdmin) {
      if (onUpdateFieldConfig) {
        const updatedGroups = (annotationConfig.fieldGroups || []).map((g) => {
          if (g.groupId === showAddGroupField) {
            return { ...g, fields: [...(g.fields || []), newField] };
          }
          return g;
        });
        onUpdateFieldConfig(annotationConfig.annotationFields, updatedGroups);
        showToast({ title: 'Auto-saved', description: `Field "${cleanedName}" added to group.`, type: 'success' });
      }
    } else {
      const targetGroup = (annotationConfig.fieldGroups || []).find(g => g.groupId === showAddGroupField);
      if (targetGroup) {
        const updatedGroup = {
          ...targetGroup,
          fields: [...(targetGroup.fields || []), newField]
        };
        try {
          await schemaRequestsAPI.create({
            type: 'UPDATE_FIELD',
            cloneId: cloneId || '',
            rowId: currentRowId,
            fieldName: showAddGroupField,
            field: updatedGroup,
          });
          showToast({ title: 'Schema Request Sent', description: `Request to add field "${cleanedName}" to group sent to admin.`, type: 'success' });
        } catch (err: any) {
          showToast({ title: 'Error', description: err?.response?.data?.message || 'Failed to submit schema request.', type: 'error' });
        }
      }
    }

    setShowAddGroupField(null);
    setAddGroupFieldName('');
  };

  const handleUpdateGroupField = (groupId: string, childIdx: number, updatedField: AnnotationField) => {
    if (!annotationConfig || !onUpdateFieldConfig) return;
    const updatedGroups = (annotationConfig.fieldGroups || []).map((g) => {
      if (g.groupId === groupId) {
        const nextFields = [...(g.fields || [])];
        nextFields[childIdx] = updatedField as any;
        return { ...g, fields: nextFields };
      }
      return g;
    });
    onUpdateFieldConfig(annotationConfig.annotationFields, updatedGroups);
  };

  const handleDeleteGroupField = (groupId: string, childIdx: number) => {
    if (!annotationConfig || !onUpdateFieldConfig) return;
    const updatedGroups = (annotationConfig.fieldGroups || []).map((g) => {
      if (g.groupId === groupId) {
        const nextFields = (g.fields || []).filter((_: any, i: any) => i !== childIdx);
        return { ...g, fields: nextFields };
      }
      return g;
    });
    onUpdateFieldConfig(annotationConfig.annotationFields, updatedGroups);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!annotationConfig || !onUpdateFieldConfig) return;
    const updatedGroups = (annotationConfig.fieldGroups || []).map((g) => {
      if (g.groupId === groupId) {
        return { ...g, deleted: true, deletedAt: new Date().toISOString() };
      }
      return g;
    });
    setEditingGroups((prev) => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
    onUpdateFieldConfig(annotationConfig.annotationFields, updatedGroups);
  };

  const submitDelete = async () => {
    if (!annotationConfig || !showDeleteConfirm) return;
    const { type, targetId, childIdx, title } = showDeleteConfirm;

    if (isAdmin) {
      if (type === 'field') {
        handleDeleteField(targetId);
      } else if (type === 'group') {
        handleDeleteGroup(targetId);
      } else if (type === 'groupField' && childIdx !== undefined) {
        handleDeleteGroupField(targetId, childIdx);
      }
      showToast({ title: 'Auto-saved', description: `"${title}" deleted successfully.`, type: 'success' });
    } else {
      try {
        await schemaRequestsAPI.create({
          type: 'DELETE_FIELD',
          cloneId: cloneId || '',
          rowId: currentRowId,
          fieldName: targetId,
        });
        showToast({ title: 'Schema Request Sent', description: `Request to delete "${title}" sent to admin for review.`, type: 'success' });
      } catch (err: any) {
        showToast({ title: 'Error', description: err?.response?.data?.message || 'Failed to submit schema request.', type: 'error' });
      }
    }
    setShowDeleteConfirm(null);
  };

  const submitRequestFieldChange = async (actionType: 'UPDATE_FIELD' | 'RENAME_FIELD' | 'DELETE_FIELD') => {
    if (!annotationConfig || !requestConfigForm) return;
    const { fieldName, questionTitle } = requestConfigForm;

    try {
      if (actionType === 'DELETE_FIELD') {
        await schemaRequestsAPI.create({
          type: 'DELETE_FIELD',
          cloneId: cloneId || '',
          rowId: currentRowId,
          fieldName,
        });
        showToast({ title: 'Delete Request Sent', description: `Request to delete field "${fieldName}" has been submitted.`, type: 'success' });
      } else if (actionType === 'RENAME_FIELD') {
        await schemaRequestsAPI.create({
          type: 'RENAME_FIELD',
          cloneId: cloneId || '',
          rowId: currentRowId,
          fieldName,
          newQuestionTitle: questionTitle,
        });
        showToast({ title: 'Rename Request Sent', description: `Request to rename field "${fieldName}" has been submitted.`, type: 'success' });
      } else {
        const { note, ...cleanFieldPayload } = requestConfigForm;
        await schemaRequestsAPI.create({
          type: 'UPDATE_FIELD',
          cloneId: cloneId || '',
          rowId: currentRowId,
          fieldName,
          field: cleanFieldPayload,
        });
        showToast({ title: 'Change Request Sent', description: `Request to update field "${fieldName}" has been submitted.`, type: 'success' });
      }
    } catch (err: any) {
      showToast({ title: 'Error', description: err?.response?.data?.message || 'Failed to submit schema request.', type: 'error' });
    }

    setShowRequestConfig(null);
    setRequestConfigForm(null);
  };

  const submitRequestGroupChange = async (actionType: 'UPDATE_FIELD' | 'DELETE_FIELD', updatedGroupFromEditor?: any) => {
    if (!annotationConfig || !requestGroupConfigForm) return;
    const { groupId } = requestGroupConfigForm;

    try {
      if (actionType === 'DELETE_FIELD') {
        await schemaRequestsAPI.create({
          type: 'DELETE_FIELD',
          cloneId: cloneId || '',
          rowId: currentRowId,
          fieldName: groupId,
        });
        showToast({ title: 'Delete Request Sent', description: `Request to delete repeat group "${groupId}" submitted.`, type: 'success' });
      } else {
        const targetGroupPayload = updatedGroupFromEditor || requestGroupConfigForm;
        const { note, ...cleanGroupPayload } = targetGroupPayload;
        await schemaRequestsAPI.create({
          type: 'UPDATE_FIELD',
          cloneId: cloneId || '',
          rowId: currentRowId,
          fieldName: groupId,
          field: cleanGroupPayload,
        });
        showToast({ title: 'Change Request Sent', description: `Request to update repeat group "${groupId}" submitted.`, type: 'success' });
      }
    } catch (err: any) {
      showToast({ title: 'Error', description: err?.response?.data?.message || 'Failed to submit schema request.', type: 'error' });
    }

    setShowRequestGroupConfig(null);
    setRequestGroupConfigForm(null);
  };

  const submitPermissionRequest = async () => {
    if (!showPermissionRequest || !cloneId) return;
    try {
      await permissionsAPI.request({
        datasetId: cloneId,
        fieldId: showPermissionRequest.fieldId,
        groupId: showPermissionRequest.groupId,
        action: showPermissionRequest.action,
        note: permissionRequestNote || undefined,
      });
      showToast({
        title: 'Permission Request Sent',
        description: `Request for "${showPermissionRequest.action}" on "${showPermissionRequest.fieldName}" sent to admin.`,
        type: 'success',
      });
      setShowPermissionRequest(null);
      setPermissionRequestNote('');
    } catch (err: any) {
      showToast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to submit permission request.',
        type: 'error',
      });
    }
  };

  // ── Visibility engine ────────────────────────────────────────────────────────
  const isFieldVisible = useCallback((field: AnnotationField): boolean => {
    if (!field.visibilityRule?.dependsOn) return true;
    const { dependsOn, operator, value } = field.visibilityRule;
    let dep = String(newColumnData[dependsOn] ?? '').trim();
    if (dep.includes(':')) {
      dep = dep.split(':')[0].trim();
    }
    dep = dep.toLowerCase();
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

  // A chosen option flagged "completes case" finishes the row on its own.
  const completedBy = useMemo(
    () => rowCompletedBy(annotationFields, newColumnData),
    [annotationFields, newColumnData]
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

          return (group.fields || []).some((gf: any) => {
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
    // fieldType wins for media: a column switched from text to image keeps a
    // stale columnType, and honouring that would render a text box over images.
    const isMediaField = ['image', 'audio', 'video'].includes(field.fieldType);
    const type = isMediaField ? field.fieldType : field.columnType || field.fieldType;
    const isTextType = !type || type === 'textarea' || type === 'text' || type === 'number' || type === 'date' || type === 'url';
    // Media fields have interactive native controls (play/seek/volume) — card-level
    // drag-and-drop must be disabled or the browser's native drag hijacks control clicks.
    const canDragCard = isDraggable && !['audio', 'video', 'image'].includes(field.fieldType);
    const fieldEditable =
      !readOnly && (reviewRequestFields === undefined || reviewRequestFields.includes(field.fieldName));
    const isRequestedField = reviewRequestFields?.includes(field.fieldName) === true;
    // Once a "completes case" option is chosen the red "required" highlights no longer apply.
    const missingHere = completedBy ? [] : missingFields.filter((m) => m === field.fieldName || m.startsWith(`${field.fieldName}.`));


    return (
      <div
        key={field.id || `${field.csvColumnName}-${field.fieldName}`}
        id={`card-${field.fieldName}`}
        onClick={() => setFocusedFieldId(field.fieldName)}
        draggable={canDragCard}
        onDragStart={canDragCard ? (e) => onAnnotationFieldDragStart?.(e, field.csvColumnName) : undefined}
        onDragOver={onAnnotationFieldDragOver}
        onDrop={(e) => {
          if (isDraggable) {
            e.preventDefault();
            e.stopPropagation();
            onAnnotationFieldDrop?.(e, field.csvColumnName);
          }
        }}
        className={cn(
          'p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50 transition-all duration-200 relative',
          missingHere.length > 0
            ? 'border-red-400 bg-red-50/40 shadow-[0_0_0_2px_rgba(248,113,113,0.25)]'
            : isFocused
            ? 'border-teal-500 bg-teal-50/10 shadow-md'
            : isRequestedField
              ? 'border-violet-400 bg-violet-50/60 shadow-[0_0_0_2px_rgba(139,92,246,0.15)]'
              : 'hover:shadow-md hover:bg-gray-100/70',
          canDragCard ? 'cursor-move' : 'cursor-default',
          draggedField === field.csvColumnName && 'opacity-50 bg-teal-50 border-teal-300'
        )}
      >
        {/* Question Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2 min-w-0">
            {canDragCard && <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />}
            <span className="text-sm font-medium text-gray-700 break-all min-w-0">
              {group ? getCleanFieldLabel(field.fieldName, group.groupName, groupInstanceIndex!) : (field.questionTitle || field.fieldName)}
              {field.isRequired && <span className="text-red-500 ml-1 font-bold">*</span>}
            </span>
            {field.questionDescription && <FieldInfo text={field.questionDescription} column={field.fieldName} />}
            {completedBy?.field.fieldName === field.fieldName && (
              <span className="shrink-0 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                Completes case
              </span>
            )}
          </div>
          {onUpdateFieldConfig && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (isAdmin) {
                  toggleEditingField(field.fieldName);
                } else {
                  setShowRequestConfig(field);
                  setRequestConfigForm({
                    ...field,
                    note: '',
                  });
                }
              }}
              className="h-7 px-2 text-xs border border-gray-200 hover:bg-gray-100 flex items-center gap-1 bg-white shrink-0"
            >
              <Settings className="h-3.5 w-3.5 text-gray-500" />
              <span>{isAdmin ? (isEditingField(field.fieldName) ? 'Done' : 'Configure') : 'Request Change'}</span>
            </Button>
          )}
        </div>

        {readOnly && <AnswerSummary field={field} data={newColumnData} />}
        {missingHere.length > 0 && (
          <div role="alert" className="mb-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
            Required, not filled
            {missingHere.some((m) => m !== field.fieldName) && (
              <>: {missingHere.map((m) => m.replace(`${field.fieldName}.captions.`, '').replace(`${field.fieldName}.`, '')).join(', ')}</>
            )}
          </div>
        )}

        {/* Answer control or config editor */}
        <div className="mt-0">
          {onUpdateFieldConfig && isEditingField(field.fieldName) ? (
            <div className="mt-3 p-4 bg-white border border-teal-200 rounded-xl space-y-4 shadow-sm text-left">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                  Field Configuration Builder
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm({
                      type: 'field',
                      targetId: field.id || field.fieldName,
                      title: `question "${field.fieldName}"`,
                    });
                  }}
                  className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove from Workbench
                </Button>
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Question Title</Label>
                  <Input
                    value={field.questionTitle || field.fieldName}
                    onChange={e => handleUpdateSingleField(field.fieldName, { ...field, questionTitle: e.target.value })}
                    placeholder="Enter question title..."
                    className="h-8 text-sm mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Field Identifier / Name</Label>
                  <Input
                    value={field.fieldName}
                    onChange={e => handleUpdateSingleField(field.fieldName, { ...field, fieldName: e.target.value })}
                    placeholder="Enter database field name..."
                    className="h-8 text-sm mt-1 bg-white"
                    disabled={!field.isNewColumn} // Cannot change fieldName for original columns
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Field Description</Label>
                  <Input
                    value={field.questionDescription || ''}
                    onChange={e => handleUpdateSingleField(field.fieldName, { ...field, questionDescription: e.target.value })}
                    placeholder="Enter description..."
                    className="h-8 text-sm mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Field Type</Label>
                  <select
                    value={field.columnType || field.fieldType || 'text'}
                    onChange={e => {
                      const val = e.target.value;
                      let fieldType = 'text';
                      let columnType = val;
                      if (val === 'image') {
                        fieldType = 'image';
                        columnType = 'text';
                      } else if (val === 'audio') {
                        fieldType = 'audio';
                        columnType = 'text';
                      }
                      handleUpdateSingleField(field.fieldName, {
                        ...field,
                        fieldType: fieldType as AnnotationField['fieldType'],
                        columnType: columnType as AnnotationField['columnType'],
                        options: (val === 'select' || val === 'radio' || val === 'multiselect' || val === 'checkbox')
                          ? (field.options && field.options.length > 0 ? field.options : ['Option 1'])
                          : []
                      });
                    }}
                    className="w-full h-8 text-sm border border-gray-200 rounded-lg px-2 mt-1 outline-none bg-white"
                  >
                    <option value="text">Text Input</option>
                    <option value="textarea">Long Text</option>
                    <option value="number">Numeric Input</option>
                    <option value="select">Dropdown Select</option>
                    <option value="radio">Radio Options</option>
                    <option value="multiselect">Multiple Select</option>
                    <option value="checkbox">Checkbox Toggle</option>
                    <option value="rating">Star Rating</option>
                    <option value="date">Date Picker</option>
                    <option value="url">URL Link</option>
                    <option value="image">Image Display</option>
                    <option value="audio">Audio Player</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`req-${field.fieldName}`}
                  checked={field.isRequired}
                  onChange={e => handleUpdateSingleField(field.fieldName, { ...field, isRequired: e.target.checked })}
                  className="rounded text-teal-600 h-4 w-4"
                />
                <Label htmlFor={`req-${field.fieldName}`} className="text-xs text-gray-700 cursor-pointer">
                  Required field
                </Label>
              </div>

              {/* Type configurator (Validation, etc.) */}
              <div className="border-t pt-3">
                <FieldTypeConfigurator
                  type={field.columnType || field.fieldType || 'text'}
                  field={field}
                  onChange={(updates) => handleUpdateSingleField(field.fieldName, { ...field, ...updates })}
                />
              </div>

              {/* Recursive editor for branching/options */}
              <div className="border-t pt-3">
                <RecursiveFieldEditor
                  field={field}
                  depth={0}
                  onChange={(updatedField) => {
                    handleUpdateSingleField(field.fieldName, updatedField as unknown as AnnotationField);
                  }}
                />
              </div>
            </div>
          ) : (
            isTextType ? (
              field.columnType === 'url' ? (
                <div className="w-full">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={value}
                      onChange={e => onNewColumnChange(field.fieldName, e.target.value)}
                      disabled={!fieldEditable}
                      onFocus={() => setFocusedFieldId(field.fieldName)}
                      placeholder={field.placeholder || 'https://…'}
                      className="w-full text-sm h-9 border-gray-200 rounded-lg focus-visible:ring-1 focus-visible:ring-teal-500"
                    />
                    {value && /^https?:\/\/.+/i.test(String(value).trim()) ? (
                      <a
                        href={String(value).trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-teal-500 bg-teal-50 px-2.5 h-9 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                        title="Open URL in new tab"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : field.columnType === 'text' ? (
                <Input
                  type="text"
                  value={value}
                  onChange={e => onNewColumnChange(field.fieldName, e.target.value)}
                  disabled={!fieldEditable}
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
                  disabled={!fieldEditable}
                  onFocus={() => setFocusedFieldId(field.fieldName)}
                  min={field.min} max={field.max}
                  className="w-full text-sm h-9 border-gray-200 rounded-lg focus-visible:ring-1 focus-visible:ring-teal-500"
                />
              ) : field.columnType === 'date' ? (
                <Input
                  type="date"
                  value={value}
                  onChange={e => onNewColumnChange(field.fieldName, e.target.value)}
                  disabled={!fieldEditable}
                  min={field.minDate} max={field.maxDate}
                  className="w-full text-sm h-9 border-gray-200 rounded-lg focus-visible:ring-1 focus-visible:ring-teal-500"
                />
              ) : (
                <Textarea
                  value={value}
                  onChange={e => onNewColumnChange(field.fieldName, e.target.value)}
                  disabled={!fieldEditable}
                  onFocus={() => setFocusedFieldId(field.fieldName)}
                  onBlur={() => setFocusedFieldId(null)}
                  placeholder={field.placeholder || `Enter details…`}
                  maxLength={field.maxLength}
                  rows={field.rows || 3}
                  className="resize-y border-gray-200 rounded-lg focus-visible:ring-1 focus-visible:ring-teal-500 text-sm"
                />
              )
            ) : type === 'group' ? (
              <GroupFieldInput
                fieldName={field.fieldName}
                childrenFields={field.groupChildren ?? []}
                values={newColumnData as Record<string, string>}
                onChange={(key, v) => (fieldEditable ? onNewColumnChange(key, v) : undefined)}
                disabled={!fieldEditable}
                repeatable={!!field.groupRepeatable}
                maxEntries={field.groupMaxEntries}
                entryLabel={field.groupEntryLabel || 'Entry'}
              />
            ) : field.fieldType === 'image' ? (
              (() => {
                // url / base64 / binary, one or many — remote URLs are fetched
                // by the server, so private hosts and cross-origin work.
                const images = resolveImages(value, {
                  imageFormat: field.imageFormat,
                  imageMultiple: field.imageMultiple,
                  imageDelimiter: field.imageDelimiter,
                  imageMimeType: field.imageMimeType,
                }, datasetId);
                if (images.length === 0) {
                  return <p className="text-xs text-gray-500">No image in this row.</p>;
                }
                const srcs = images.map((im) => im.src);
                // One answer list per caption input, indexed by image, under
                // `<field>.captions.<input>`. Fixed keys keep consensus simple.
                const inputs = captionInputs(field);
                const capKey = (c: GroupChildField) => `${field.fieldName}.captions.${c.fieldName}`;
                const lists = Object.fromEntries(inputs.map((c) => [c.id, readList(newColumnData[capKey(c)] as string)]));
                const valuesFor = (i: number) =>
                  Object.fromEntries(inputs.map((c) => [groupKey(field.fieldName, c), lists[c.id][i] ?? '']));
                const writeCaption = (i: number, key: string, v: string) => {
                  const c = inputs.find((x) => groupKey(field.fieldName, x) === key);
                  if (!c) return;
                  const next = images.map((_, idx) => lists[c.id][idx] ?? '');
                  next[i] = v;
                  onNewColumnChange(capKey(c), JSON.stringify(next));
                };
                return (
                  <div className="space-y-2" onMouseDown={(e) => e.stopPropagation()} draggable={false} onDragStart={(e) => e.preventDefault()}>
                    {field.captionEnabled ? (
                      // One image per row with its caption beside it, so it is
                      // obvious which image a caption belongs to.
                      images.map((im, i) => (
                        <div key={im.raw + i} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-2">
                          <img
                            src={im.src}
                            alt={`Image ${i + 1}`}
                            draggable={false}
                            title={im.raw}
                            className="h-20 w-20 shrink-0 cursor-zoom-in rounded-md border border-gray-200 object-cover transition-opacity hover:opacity-80"
                            onClick={(e) => { e.stopPropagation(); onImageClick?.(srcs, i, field); }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 text-[10px] text-gray-400">image {i + 1} of {images.length}</div>
                            <GroupFieldInput
                              fieldName={field.fieldName}
                              childrenFields={inputs}
                              values={valuesFor(i)}
                              disabled={!fieldEditable}
                              onChange={(key, v) => writeCaption(i, key, v)}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {images.map((im, i) => (
                          <img
                            key={im.raw + i}
                            src={im.src}
                            alt={`Image ${i + 1}`}
                            draggable={false}
                            title={im.raw}
                            className="h-16 w-16 sm:h-20 sm:w-20 max-w-full object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); onImageClick?.(srcs, i, field); }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : field.fieldType === 'audio' ? (
              <div className="space-y-2">
                {value.split(/[,;\n]+/).filter(Boolean).map((url, i) => (
                  <AudioPreview key={url.trim() + i} url={url.trim()} />
                ))}
              </div>
            ) : field.fieldType === 'video' ? (
              <div className="space-y-2">
                {value.split(/[,;\n]+/).filter(Boolean).map((url, i) => {
                  const urls = value.split(/[,;\n]+/).filter(Boolean).map((u: string) => u.trim());
                  return (
                    <VideoPreview key={url.trim() + i} url={url.trim()} onExpand={() => onVideoClick?.(urls, i)} />
                  );
                })}
              </div>
            ) : field.branching?.enabled ? (
              <ConditionalFieldRenderer
                field={field}
                formData={newColumnData}
                onChange={fieldEditable ? (data) => {
                  Object.keys(data).forEach(key => {
                    if (data[key] !== newColumnData[key]) {
                      onNewColumnChange(key, data[key]);
                    }
                  });
                } : () => {}}
              />
            ) : (
              <DecisionCardEngine
                field={field}
                options={options}
                value={value}
                onChange={fieldEditable ? v => onNewColumnChange(field.fieldName, v) : () => {}}
              />
            )
          )}
        </div>

        {/* Admin action bar */}
        {isAdmin && onUpdateFieldConfig && !field.isDataFieldLink && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-gray-200">
            <button
              onClick={(e) => { e.stopPropagation(); toggleEditingField(field.fieldName); }}
              className="flex-1 sm:flex-none justify-center text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDuplicateField(field); }}
              className="flex-1 sm:flex-none justify-center text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 font-medium"
            >
              <Plus className="h-3.5 w-3.5" /> Duplicate
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id || field.fieldName); }}
              className="flex-1 sm:flex-none justify-center text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <button
              onClick={(e) => { e.stopPropagation(); toggleEditingField(field.fieldName); }}
              className="flex-1 sm:flex-none justify-center text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 font-medium sm:ml-auto"
            >
              <Settings className="h-3.5 w-3.5" /> Configure
            </button>
          </div>
        )}

        {/* Annotator locked action bar */}
        {!isAdmin && !readOnly && !field.isDataFieldLink && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-gray-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPermissionRequest({ fieldId: field.id || field.fieldName, action: 'EDIT', fieldName: field.fieldName });
              }}
              className="flex-1 sm:flex-none justify-center text-xs text-gray-400 cursor-pointer flex items-center gap-1 font-medium"
            >
              <Lock className="h-3 w-3" /> Edit
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPermissionRequest({ fieldId: field.id || field.fieldName, action: 'DUPLICATE', fieldName: field.fieldName });
              }}
              className="flex-1 sm:flex-none justify-center text-xs text-gray-400 cursor-pointer flex items-center gap-1 font-medium"
            >
              <Lock className="h-3 w-3" /> Duplicate
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPermissionRequest({ fieldId: field.id || field.fieldName, action: 'DELETE', fieldName: field.fieldName });
              }}
              className="flex-1 sm:flex-none justify-center text-xs text-gray-400 cursor-pointer flex items-center gap-1 font-medium"
            >
              <Lock className="h-3 w-3" /> Delete
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPermissionRequest({ fieldId: field.id || field.fieldName, action: 'CONFIGURE', fieldName: field.fieldName });
              }}
              className="flex-1 sm:flex-none justify-center text-xs text-gray-400 cursor-pointer flex items-center gap-1 font-medium sm:ml-auto"
            >
              <Lock className="h-3 w-3" /> Configure
            </button>
          </div>
        )}

        {/* Validation overlay layer (separate from OptionCard surfaces) */}
        <ValidationMessage field={field} value={value} />
      </div>
    );
  }, [newColumnData, completedBy, focusedFieldId, draggedField, isFieldVisible, onNewColumnChange, editingFields]);

  // ── Progress totals ──────────────────────────────────────────────────────────
  const { totalVisible, totalAnswered } = useMemo(() => {
    const all = annotationFields.filter(f => isFieldVisible(f));
    const answered = all.filter(f => {
      const v = newColumnData[f.fieldName];
      return v !== undefined && v !== null && String(v).trim() !== '';
    });
    return { totalVisible: all.length, totalAnswered: answered.length };
  }, [annotationFields, newColumnData, isFieldVisible]);

  const progressPct = completedBy ? 100 : totalVisible > 0 ? Math.round((totalAnswered / totalVisible) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={panelRef}
      className="h-full bg-white flex flex-col"
      onDragOver={e => { if (onPanelDragOver) onPanelDragOver(e); }}
      onDrop={e => { e.preventDefault(); if (onDropFromMetadata) onDropFromMetadata(); }}
    >

      {/* Section divider: Data Fields → Annotation Workbench (mobile & tablet only) */}
      <div className="lg:hidden relative my-8 px-4 sm:px-5" aria-hidden="true">
        <div className="h-0.5 w-full bg-gray-400" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-14 rounded-full bg-gray-500" />
      </div>

      {/* ── Header ── */}
      <div className="px-4 sm:px-5 pt-3 sm:pt-4 pb-3 sm:pb-4 border-b border-gray-100 bg-white">
        {/* Spacer matching the "Back to Dataset" button row in the left panel (h-9 button + pb-2),
            so both panel headers share the same baseline when shown side by side. */}
        <div className="hidden lg:block h-9 mb-2" aria-hidden="true" />
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl lg:text-base font-bold text-slate-900 leading-8">
              {readOnly ? "Annotator's answers" : 'Annotation Workbench'}
            </h2>
            <div className="flex items-center gap-3 mt-1 min-h-5 flex-wrap">
              {currentRowIndex !== undefined && (
                <span className="text-xs text-slate-500 font-mono">
                  Case {currentRowIndex + 1}
                </span>
              )}
              <span className="text-xs text-slate-500">
                Progress: <span className="font-bold text-teal-700">{progressPct}%</span>
              </span>
              {/* Save status */}
              {readOnly ? (
                <span className="text-xs font-semibold text-blue-700">Read only</span>
              ) : (
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
              )}
            </div>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center flex-wrap gap-2 w-full lg:w-auto shrink-0">
            {onUpdateFieldConfig && (
              <div className="flex flex-1 lg:flex-none gap-2 w-full lg:w-auto lg:min-w-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddNewQuestion}
                  className="border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-semibold h-8 flex-1 lg:flex-none justify-center min-w-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1 shrink-0" />
                  Add New Question
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddRepeatGroup}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-semibold h-8 flex-1 lg:flex-none justify-center min-w-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1 shrink-0" />
                  Add Repeat Group
                </Button>
              </div>
            )}
            <Button
              type="button"
              size="sm"
              onClick={onExportAllColumns}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-8 px-3 cursor-pointer transition-colors shadow-sm w-full lg:w-auto justify-center"
            >
              Download CSV
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main split content ── */}
      <div className="flex-1 flex overflow-hidden min-w-0">

        {/* Questions column */}
        <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5 scroll-smooth">

          {/* Case finished early by a "completes case" option */}
          {completedBy && !readOnly && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
            >
              <span className="font-semibold">“{completedBy.option}”</span> completes this case.
              The remaining questions are optional — click <span className="font-semibold">Save and Continue</span> to close it.
            </div>
          )}

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
          {annotationConfig?.fieldGroups?.filter(g => !g.deleted).map(group => {
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
                      <div
                        id={`accordion-${instance.key}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleAccordion(instance.key)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAccordion(instance.key); } }}
                        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 cursor-pointer focus:outline-none text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-wrap">
                          <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="font-semibold text-gray-800 text-sm break-all min-w-0">
                            {instance.title}
                          </span>
                          {total > 0 && (
                            <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                              ({answered}/{total})
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <StatusPill status={status} />
                          {onUpdateFieldConfig && isAdmin && (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleEditingGroup(group.groupId); }}
                                className="flex-1 sm:flex-none justify-center text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                              >
                                <Edit3 className="h-3.5 w-3.5" /> Edit
                              </button>
                              <span className="text-gray-300 text-xs hidden sm:inline">|</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDuplicateGroup(group); }}
                                className="flex-1 sm:flex-none justify-center text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 font-medium"
                              >
                                <Plus className="h-3.5 w-3.5" /> Duplicate
                              </button>
                              <span className="text-gray-300 text-xs hidden sm:inline">|</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm({
                                    type: 'group',
                                    targetId: group.groupId,
                                    title: `repeat group "${group.groupTitle || group.groupName}"`,
                                  });
                                }}
                                className="flex-1 sm:flex-none justify-center text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                              <span className="text-gray-300 text-xs hidden sm:inline">|</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleEditingGroup(group.groupId); }}
                                className={`flex-1 sm:flex-none justify-center text-xs flex items-center gap-1 font-medium ${editingGroups.has(group.groupId) ? 'text-green-600 hover:text-green-800' : 'text-gray-600 hover:text-gray-800'}`}
                              >
                                <Settings className="h-3.5 w-3.5" /> {editingGroups.has(group.groupId) ? 'Done' : 'Configure'}
                              </button>
                            </div>
                          )}
                          {onUpdateFieldConfig && !isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowRequestGroupConfig(group);
                                setRequestGroupConfigForm({
                                  ...group,
                                  note: '',
                                });
                              }}
                              className="h-7 px-2 text-xs border border-gray-200 hover:bg-gray-100 flex items-center gap-1 bg-white"
                            >
                              <Settings className="h-3.5 w-3.5 text-gray-500" />
                              <span>Request Change</span>
                            </Button>
                          )}
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                          </div>
                        </div>

                      {/* Expanded child cards */}
                      {isOpen && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-gray-100 bg-white rounded-b-lg space-y-4">
                          {onUpdateFieldConfig && editingGroups.has(group.groupId) && (
                            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-3 mb-4 text-left">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2">
                                <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
                                  Repeat Group Configuration
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm({
                                      type: 'group',
                                      targetId: group.groupId,
                                      title: `repeat group "${group.groupTitle || group.groupName}"`,
                                    });
                                  }}
                                  className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 flex items-center gap-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete Group
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Group Title</Label>
                                  <Input
                                    value={group.groupTitle || group.groupName}
                                    onChange={e => handleUpdateGroupProperties(group.groupId, { groupTitle: e.target.value })}
                                    placeholder="Enter group title..."
                                    className="h-8 text-sm mt-1 bg-white"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Repeat Count</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={group.repeatCount || 1}
                                    onChange={e => handleUpdateGroupProperties(group.groupId, { repeatCount: Number(e.target.value) || 1 })}
                                    className="h-8 text-sm mt-1 bg-white"
                                  />
                                </div>
                              </div>

                              <div className="border-t border-purple-100 pt-3 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-medium text-gray-600">
                                  Child Fields ({group.fields?.length || 0})
                                </span>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddGroupField(group.groupId);
                                  }}
                                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-7 px-2"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" />
                                  Add Field to Group
                                </Button>
                              </div>

                              {group.fields && group.fields.map((childField: any, childIdx: number) => (
                                <div key={childField.id || childIdx} className="mt-3 p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase break-all min-w-0">
                                      Child Field: {childField.fieldName || `Field #${childIdx + 1}`}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteConfirm({
                                          type: 'groupField',
                                          targetId: group.groupId,
                                          childIdx,
                                          title: `field "${childField.fieldName}" from group`,
                                        });
                                      }}
                                      className="h-6 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 flex items-center gap-0.5"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Remove
                                    </Button>
                                  </div>
                                  <RecursiveFieldEditor
                                    field={childField}
                                    depth={1}
                                    onChange={(updatedChild) => {
                                      handleUpdateGroupField(group.groupId, childIdx, updatedChild as unknown as AnnotationField);
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}

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

      {/* ── Dialog Components ── */}
      {/* 1. Add Question Dialog */}
      <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>
              Create a new annotation question in the workbench.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="questionName">Question Name / Identifier</Label>
              <Input
                id="questionName"
                placeholder="use letters, numbers, underscores only..."
                value={addQuestionForm.name}
                onChange={(e) => setAddQuestionForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="questionType">Field Type</Label>
              <select
                id="questionType"
                value={addQuestionForm.type}
                onChange={(e) => setAddQuestionForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full h-9 text-sm border border-gray-200 rounded-md px-2 outline-none bg-white"
              >
                <option value="text">Text Input</option>
                <option value="textarea">Long Text</option>
                <option value="number">Numeric Input</option>
                <option value="select">Dropdown Select</option>
                <option value="radio">Radio Options</option>
                <option value="multiselect">Multiple Select</option>
                <option value="checkbox">Checkbox Toggle</option>
                <option value="rating">Star Rating</option>
                <option value="date">Date Picker</option>
                <option value="url">URL Link</option>
                <option value="image">Image Display</option>
                <option value="audio">Audio Player</option>
              </select>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="questionRequired"
                checked={addQuestionForm.required}
                onChange={(e) => setAddQuestionForm(prev => ({ ...prev, required: e.target.checked }))}
                className="rounded text-teal-600 h-4 w-4"
              />
              <Label htmlFor="questionRequired" className="text-sm font-normal cursor-pointer">
                Required Field
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddQuestion(false)}>
              Cancel
            </Button>
            <Button onClick={submitAddQuestion} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold">
              Save Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Add Repeat Group Dialog */}
      <Dialog open={showAddGroup} onOpenChange={setShowAddGroup}>
        <DialogContent className="sm:max-w-[700px] w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Repeat Group</DialogTitle>
            <DialogDescription>
              Create a new repeatable question group with child fields.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <FieldGroupEditor
              onSave={(group) => submitAddRepeatGroup(group)}
              onCancel={() => setShowAddGroup(false)}
              existingGroup={null}
              existingColumnNames={
                new Set([
                  ...(annotationConfig?.annotationFields || []).map(f => f.fieldName.toLowerCase()),
                  ...(annotationConfig?.fieldGroups || []).flatMap(g => (g.fields || []).map((f: any) => f.fieldName.toLowerCase()))
                ])
              }
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Add Child Field Dialog */}
      <Dialog open={!!showAddGroupField} onOpenChange={(open) => !open && setShowAddGroupField(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Field to Group</DialogTitle>
            <DialogDescription>
              Create a new child field inside the repeatable group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="groupFieldName">Field Name / Identifier</Label>
              <Input
                id="groupFieldName"
                placeholder="use letters, numbers, underscores only..."
                value={addGroupFieldName}
                onChange={(e) => setAddGroupFieldName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGroupField(null)}>
              Cancel
            </Button>
            <Button onClick={submitAddGroupField} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Delete Confirm Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {showDeleteConfirm?.title}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={submitDelete} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Request Config Dialog (Annotator only) */}
      <Dialog open={!!showRequestConfig} onOpenChange={(open) => !open && setShowRequestConfig(null)}>
        <DialogContent className="sm:max-w-[1000px] w-[95vw] lg:w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Propose Field Schema Change</DialogTitle>
            <DialogDescription>
              Propose updates or deletion for question: <strong className="font-mono text-slate-800">{requestConfigForm?.fieldName}</strong>.
            </DialogDescription>
          </DialogHeader>
          {requestConfigForm && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mt-4 text-left">
              {/* LEFT COLUMN: Configuration Editor */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Question Title</Label>
                    <Input
                      value={requestConfigForm.questionTitle || ''}
                      onChange={(e) => setRequestConfigForm(prev => prev ? { ...prev, questionTitle: e.target.value } : null)}
                      className="h-8 text-sm mt-1 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Field Type</Label>
                    <select
                      value={requestConfigForm.columnType || requestConfigForm.fieldType || 'text'}
                      onChange={(e) => {
                        const val = e.target.value;
                        let fieldType = 'text';
                        let columnType = val;
                        if (val === 'image') {
                          fieldType = 'image';
                          columnType = 'text';
                        } else if (val === 'audio') {
                          fieldType = 'audio';
                          columnType = 'text';
                        }
                        setRequestConfigForm((prev: any) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            fieldType,
                            columnType,
                            options: (val === 'select' || val === 'radio' || val === 'multiselect' || val === 'checkbox')
                              ? (prev.options && prev.options.length > 0 ? prev.options : ['Option 1'])
                              : []
                          };
                        });
                      }}
                      className="w-full h-8 text-sm border border-gray-200 rounded-lg px-2 mt-1 outline-none bg-white"
                    >
                      <option value="text">Text Input</option>
                      <option value="textarea">Long Text</option>
                      <option value="number">Numeric Input</option>
                      <option value="select">Dropdown Select</option>
                      <option value="radio">Radio Options</option>
                      <option value="multiselect">Multiple Select</option>
                      <option value="checkbox">Checkbox Toggle</option>
                      <option value="rating">Star Rating</option>
                      <option value="date">Date Picker</option>
                      <option value="url">URL Link</option>
                      <option value="image">Image Display</option>
                      <option value="audio">Audio Player</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Description</Label>
                  <Input
                    value={requestConfigForm.questionDescription || ''}
                    onChange={(e) => setRequestConfigForm(prev => prev ? { ...prev, questionDescription: e.target.value } : null)}
                    placeholder="Explain what this question is about..."
                    className="h-8 text-sm mt-1 bg-white"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="req-checkbox"
                    checked={!!requestConfigForm.isRequired}
                    onChange={(e) => setRequestConfigForm(prev => prev ? { ...prev, isRequired: e.target.checked } : null)}
                    className="rounded text-teal-600 h-4 w-4"
                  />
                  <Label htmlFor="req-checkbox" className="text-xs text-gray-700 cursor-pointer">
                    Required field
                  </Label>
                </div>

                {/* Validation and settings configurator */}
                <div className="border-t pt-3">
                  <FieldTypeConfigurator
                    type={requestConfigForm.columnType || requestConfigForm.fieldType || 'text'}
                    field={requestConfigForm}
                    onChange={(updates) => setRequestConfigForm(prev => prev ? { ...prev, ...updates } : null)}
                  />
                </div>

                {/* Choice branch options configurator */}
                {['radio', 'multiselect', 'select', 'rating', 'checkbox'].includes(requestConfigForm.columnType || requestConfigForm.fieldType || '') && (
                  <div className="pt-4 border-t border-gray-200">
                    <RecursiveFieldEditor
                      field={requestConfigForm}
                      depth={0}
                      onChange={(updated) => setRequestConfigForm(prev => prev ? { ...prev, ...updated } : null)}
                    />
                  </div>
                )}

                {/* note context for admin */}
                <div className="space-y-1 border-t pt-3">
                  <Label className="text-slate-600 font-semibold text-xs">Message / Reason for Admin</Label>
                  <Input
                    placeholder="Provide context for this request..."
                    value={requestConfigForm.note || ''}
                    onChange={(e) => setRequestConfigForm(prev => prev ? { ...prev, note: e.target.value } : null)}
                    className="h-8 text-sm bg-white"
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: Live Workflow Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[300px]">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span>👁</span> Live Workflow Preview
                </h4>
                <LivePreviewTree fields={[requestConfigForm]} />
                {!['radio', 'multiselect', 'select', 'rating', 'checkbox'].includes(requestConfigForm.columnType || requestConfigForm.fieldType || '') && (
                  <div className="text-xs text-gray-400 italic mt-4 text-center">
                    Branching is only available for choice-based fields (Radio, Multi-Select, Dropdown, Rating).
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => submitRequestFieldChange('DELETE_FIELD')}>
              Propose Delete
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowRequestConfig(null)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold" onClick={() => submitRequestFieldChange('UPDATE_FIELD')}>
              Propose Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Request Group Config Dialog (Annotator only) */}
      <Dialog open={!!showRequestGroupConfig} onOpenChange={(open) => !open && setShowRequestGroupConfig(null)}>
        <DialogContent className="sm:max-w-[700px] w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Propose Group Schema Change</DialogTitle>
            <DialogDescription>
              Propose updates or deletion for Repeat Group: <strong className="font-mono text-slate-800">{requestGroupConfigForm?.groupId}</strong>.
            </DialogDescription>
          </DialogHeader>
          {requestGroupConfigForm && (
            <div className="py-2">
              <FieldGroupEditor
                existingGroup={requestGroupConfigForm}
                existingColumnNames={
                  new Set([
                    ...(annotationConfig?.annotationFields || []).map(f => f.fieldName.toLowerCase()),
                    ...(annotationConfig?.fieldGroups || []).filter(g => g.groupId !== requestGroupConfigForm.groupId).flatMap(g => (g.fields || []).map((f: any) => f.fieldName.toLowerCase()))
                  ])
                }
                onSave={(group) => {
                  submitRequestGroupChange('UPDATE_FIELD', {
                    ...group,
                    note: requestGroupConfigForm.note || '',
                  });
                }}
                onCancel={() => setShowRequestGroupConfig(null)}
              />
              <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-3" onClick={() => submitRequestGroupChange('DELETE_FIELD')}>
                  Propose Delete Group
                </Button>
                <div className="space-y-1 w-full sm:w-2/3 text-left">
                  <Label className="text-slate-600 font-semibold text-xs">Message / Reason for Admin</Label>
                  <Input
                    placeholder="Provide context for this request..."
                    value={requestGroupConfigForm.note || ''}
                    onChange={(e) => setRequestGroupConfigForm((prev: any) => prev ? { ...prev, note: e.target.value } : null)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. Permission Request Dialog (Annotator only) */}
      <Dialog open={!!showPermissionRequest} onOpenChange={(open) => { if (!open) { setShowPermissionRequest(null); setPermissionRequestNote(''); } }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Request Permission</DialogTitle>
            <DialogDescription>
              You don&apos;t have permission to <strong>{showPermissionRequest?.action?.toLowerCase()}</strong> on &quot;{showPermissionRequest?.fieldName}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-gray-600">
              Would you like to request <strong>{showPermissionRequest?.action}</strong> access from the admin?
            </p>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Message / Reason (optional)</Label>
              <Input
                placeholder="Why do you need this permission?"
                value={permissionRequestNote}
                onChange={(e) => setPermissionRequestNote(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowPermissionRequest(null); setPermissionRequestNote(''); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitPermissionRequest} className="bg-blue-600 hover:bg-blue-700 text-white">
              Request Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// What the annotator answered, in words, for the read-only inspection view.
// Widgets stay on screen (disabled) so the layout is familiar, but a disabled
// radio dot is easy to miss; this line is the thing a reviewer reads.
function answerLines(field: AnnotationField, data: Record<string, any>): { label?: string; value: string }[] {
  const val = (k: string) => {
    const v = data[k];
    return v === undefined || v === null ? '' : String(v);
  };
  const list = (raw: string) => readList(raw).filter((x) => x.trim() !== '');
  if (field.columnType === 'group' && field.groupChildren?.length) {
    if (field.groupRepeatable) {
      // One line per entry ("Medication 1: Drug: …, Dose: …"), entries aligned by index.
      const per = field.groupChildren.map((c) => ({ c, values: readList(val(groupKey(field.fieldName, c))) }));
      const n = Math.max(0, ...per.map((p) => p.values.length));
      const label = field.groupEntryLabel || 'Entry';
      return Array.from({ length: n }, (_, i) => ({
        label: `${label} ${i + 1}`,
        value: per.map((p) => (p.values[i]?.trim() ? `${p.c.fieldName}: ${p.values[i]}` : '')).filter(Boolean).join(', '),
      }));
    }
    return field.groupChildren.map((c) => {
      const raw = val(groupKey(field.fieldName, c));
      return { label: c.fieldName, value: c.repeatable ? list(raw).join(' / ') : raw };
    });
  }
  const caps = captionInputs(field);
  if (field.fieldType === 'image' && caps.length) {
    const per = caps.map((c) => ({ c, values: readList(val(`${field.fieldName}.captions.${c.fieldName}`)) }));
    const n = Math.max(0, ...per.map((p) => p.values.length));
    return Array.from({ length: n }, (_, i) => ({
      label: `Image ${i + 1}`,
      value: per.map((p) => (p.values[i] ? `${p.c.fieldName}: ${p.values[i]}` : '')).filter(Boolean).join(', '),
    }));
  }
  const raw = val(field.fieldName);
  // Choice values may be stored as "value:description"; show the value.
  const shown = raw.includes(':') && (field.options || []).some((o) => o === raw) ? raw.split(':')[0] : raw;
  return [{ value: shown }];
}

function AnswerSummary({ field, data }: { field: AnnotationField; data: Record<string, any> }) {
  const lines = answerLines(field, data).filter((l) => l.value.trim() !== '');
  if (lines.length === 0) {
    return (
      <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
        No answer given
      </div>
    );
  }
  return (
    <div className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900">
      <span className="mr-1.5 font-bold uppercase tracking-wide text-[10px] text-emerald-700">Answered</span>
      {lines.map((l, i) => (
        <span key={i} className="mr-3 inline-block">
          {l.label && <span className="text-emerald-700">{l.label}: </span>}
          <span className="font-semibold">{l.value}</span>
        </span>
      ))}
    </div>
  );
}
