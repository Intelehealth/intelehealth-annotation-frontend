'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePanels } from '@/components/ui/resizable-panels';
import { ImageThumbnails } from '@/components/annotation-components/image-thumbnails';
import { ImageOverlay } from '@/components/annotation-components/media-overlays';
import { cn } from '@/lib/utils';
import { STATUS_BADGE, buildFieldTree, walkFieldTree, formatValue, getClinicalNotes, type FieldNode } from './consensus-utils';

// ─── Agreement classification ───────────────────────────────────────────────

export type AgreementLevel = 'agreed' | 'partial' | 'conflict' | 'pending';

export interface AgreementResult {
  level: AgreementLevel;
  /** Normalised value shared by all (agreed) or a strict majority (partial). */
  majorityValue: string | null;
  /** Normalised value → number of annotators who gave it. */
  counts: Record<string, number>;
}

interface AnswerLike {
  value?: unknown;
  submitted?: boolean;
  applicable?: boolean;
}

// Canonical form of an answer for comparison: trimmed, case-insensitive, and
// multiselect arrays sorted so option order does not count as disagreement.
// Returns null for "not answered" (null, '', '[]').
export function normalizeAnswer(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const fromArray = (arr: unknown[]) => {
    const items = arr.map((v) => String(v ?? '').trim().toLowerCase()).filter(Boolean).sort();
    return items.length ? items.join('\u0001') : null;
  };
  if (Array.isArray(value)) return fromArray(value);
  const str = String(value).trim();
  if (!str) return null;
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return fromArray(parsed);
    } catch {
      // Not JSON — compare as plain text.
    }
  }
  return str.toLowerCase();
}

export function classifyAgreement(answers: AnswerLike[]): AgreementResult {
  const counts: Record<string, number> = {};
  let answered = 0;
  (answers || []).forEach((a) => {
    if (!a?.submitted || a.applicable === false) return;
    const norm = normalizeAnswer(a.value);
    if (norm === null) return;
    counts[norm] = (counts[norm] || 0) + 1;
    answered += 1;
  });
  if (answered < 2) return { level: 'pending', majorityValue: null, counts };
  const [topValue, topCount] = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
  if (topCount === answered) return { level: 'agreed', majorityValue: topValue, counts };
  if (topCount * 2 > answered) return { level: 'partial', majorityValue: topValue, counts };
  return { level: 'conflict', majorityValue: null, counts };
}

const LEVEL_STYLE: Record<AgreementLevel, { card: string; pill: string; dot: string; label: string }> = {
  agreed: { card: 'bg-green-50 border-green-300', pill: 'bg-green-100 text-green-800', dot: 'bg-green-500', label: 'Agreed' },
  partial: { card: 'bg-orange-50 border-orange-300', pill: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500', label: 'Slight disagreement' },
  conflict: { card: 'bg-red-50 border-red-300', pill: 'bg-red-100 text-red-800', dot: 'bg-red-500', label: 'Conflict' },
  pending: { card: 'bg-gray-50 border-gray-200', pill: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', label: 'Pending' },
};

// ─── Source data helpers ────────────────────────────────────────────────────

function htmlToText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function rawToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function prettifyKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

const isImageKey = (key: string, value: string) => /image/i.test(key) && /https?:\/\//i.test(value);

// ─── Components ─────────────────────────────────────────────────────────────

function SourcePane({
  rawData,
  datasetId,
  onImageClick,
}: {
  rawData: any;
  datasetId?: string;
  onImageClick: (urls: string[], index: number) => void;
}) {
  const data: Record<string, unknown> = rawData && typeof rawData === 'object' ? rawData : {};
  const notes = htmlToText(getClinicalNotes(data));
  const entries = Object.entries(data).map(([key, value]) => [key, rawToString(value)] as const);
  const imageEntries = entries.filter(([key, value]) => isImageKey(key, value));

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Source data</div>
      <div className="space-y-2">
        {notes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Clinical notes</div>
            <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-800">{notes}</div>
          </div>
        )}
        {imageEntries.map(([key, value]) => (
          <div key={key} className="rounded-lg border bg-white p-2">
            <ImageThumbnails
              imageUrls={value}
              columnName={prettifyKey(key)}
              datasetId={datasetId}
              maxDisplay={50}
              onImageClick={onImageClick}
            />
          </div>
        ))}
        {!notes && imageEntries.length === 0 && (
          <div className="text-xs italic text-gray-400">No clinical notes or images for this row.</div>
        )}
      </div>
    </div>
  );
}

// ─── Final answers ──────────────────────────────────────────────────────────

/** Handlers for recording a per-question final answer on the persisted review. */
export interface FinalAnswerHandlers {
  /** Whether the current user may record final answers (the server still enforces it). */
  canDecide: boolean;
  /** Resolves true when saved; the caller shows any error toast. */
  onSave: (row: any, fieldName: string, value: string) => Promise<boolean>;
  onClear: (row: any, fieldName: string) => Promise<boolean>;
  /** Persist consensus reviews so rows get a reviewId. */
  onGenerate: () => Promise<void>;
}

/** The persisted final answer, or null when unset (the backend clears with ' '). */
export function getFinalDecision(field: any): string | null {
  const value = field?.finalDecision;
  return typeof value === 'string' && value.trim() ? value : null;
}

// Raw annotator value → the string stored as a final decision (arrays as JSON).
function toDecisionValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseMulti(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((v) => String(v));
  } catch {
    // Plain comma-separated text.
  }
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

const isMultiField = (field: any) => /multi[_-]?select|checkbox/i.test(String(field?.fieldType || field?.columnType || ''));

function CustomAnswerEditor({
  field,
  initial,
  busy,
  onSave,
  onCancel,
}: {
  field: any;
  initial: string | null;
  busy: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const options: string[] = Array.isArray(field.options) ? field.options.filter((o: unknown) => o !== null && o !== '').map(String) : [];
  const multi = options.length > 0 && isMultiField(field);
  const [text, setText] = useState(() => (options.length && !multi && initial && options.includes(initial) ? initial : options.length ? '' : initial || ''));
  const [picked, setPicked] = useState<string[]>(() => (multi ? parseMulti(initial).filter((v) => options.includes(v)) : []));
  const value = multi ? (picked.length ? JSON.stringify(picked) : '') : text;
  const control = 'rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-indigo-500';

  return (
    <div className="mt-1.5 space-y-1.5 rounded border border-gray-200 bg-white/80 p-2">
      {multi ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {options.map((option) => (
            <label key={option} className="inline-flex items-center gap-1 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={picked.includes(option)}
                onChange={() => setPicked((prev) => (prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]))}
              />
              {option}
            </label>
          ))}
        </div>
      ) : options.length ? (
        <select value={text} onChange={(e) => setText(e.target.value)} className={cn(control, 'w-full')}>
          <option value="">Select an option…</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Final answer" className={cn(control, 'w-full resize-y')} />
      )}
      <div className="flex gap-1.5">
        <Button size="sm" className="h-6 px-2 text-[11px]" disabled={busy || !value.trim()} onClick={() => onSave(multi ? value : value.trim())}>Save</Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function FinalAnswerForm({
  field,
  final,
  busy,
  canDecide,
  onSave,
  onClear,
}: {
  field: any;
  final: string | null;
  busy: boolean;
  canDecide: boolean;
  onSave: (value: string) => Promise<boolean>;
  onClear: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const winner = typeof field.winner === 'string' && field.winner.trim() ? field.winner : null;
  const badge = field.status === 'ADMIN_CONFIRMED' ? 'Confirmed' : field.status === 'OVERRIDDEN' ? 'Overridden' : null;
  const small = 'h-6 px-2 text-[11px]';

  return (
    <div className="mt-1.5 border-t border-black/5 pt-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />}
        {final ? (
          <>
            <Check className="h-3.5 w-3.5 text-green-600" />
            <span className="text-gray-600">Final:</span>
            <strong className="break-words text-gray-900">{formatValue(final)}</strong>
            {badge && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">{badge}</span>}
          </>
        ) : (
          <span className="italic text-gray-500">No final answer yet</span>
        )}
        {canDecide && (
          <div className="ml-auto flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              className={small}
              disabled={busy || !winner || final === winner}
              title={winner ? `Use the winner: ${winner}` : 'No winner yet'}
              onClick={() => onSave(winner as string)}
            >
              Accept winner
            </Button>
            <Button size="sm" variant="outline" className={small} disabled={busy} onClick={() => setEditing((v) => !v)}>Custom…</Button>
            {final && <Button size="sm" variant="ghost" className={cn(small, 'text-red-600')} disabled={busy} onClick={() => onClear()}>Clear</Button>}
          </div>
        )}
      </div>
      {canDecide && editing && (
        <CustomAnswerEditor
          field={field}
          initial={final}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSave={async (value) => {
            if (await onSave(value)) setEditing(false);
          }}
        />
      )}
    </div>
  );
}

// Drops answers from annotators left out of the consensus, in case a stale
// response still carries them.
function includedAnswers(field: any, excludedAnnotatorIds?: string[]): any[] {
  const answers: any[] = field?.annotatorAnswers || [];
  if (!excludedAnnotatorIds?.length) return answers;
  return answers.filter((a) => !excludedAnnotatorIds.includes(a?.annotatorId));
}

function QuestionCard({
  field,
  depth,
  inactive,
  row,
  finalAnswers,
  excludedAnnotatorIds,
}: {
  field: FieldNode;
  depth: number;
  inactive?: boolean;
  row?: any;
  finalAnswers?: FinalAnswerHandlers;
  excludedAnnotatorIds?: string[];
}) {
  const answers = includedAnswers(field, excludedAnnotatorIds);
  const result = classifyAgreement(answers);
  const style = LEVEL_STYLE[result.level];
  const [busy, setBusy] = useState(false);
  // Final answers need a persisted review; inactive branches are moot.
  const decidable = !inactive && !!finalAnswers && !!row?.reviewId;
  const canDecide = decidable && !!finalAnswers?.canDecide;
  const final = getFinalDecision(field);
  const track = async (action: () => Promise<boolean>) => {
    setBusy(true);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  };
  const save = (value: string) => track(() => finalAnswers!.onSave(row, field.fieldName, value));
  const clear = () => track(() => finalAnswers!.onClear(row, field.fieldName));
  return (
    <div
      style={{ marginLeft: depth * 16 }}
      className={cn('rounded-md border px-2.5 py-2', style.card, depth > 0 && 'border-l-2', inactive && 'opacity-60')}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {depth > 0 && <span className="text-[10px] text-indigo-400">└</span>}
        <span className="text-xs font-semibold text-gray-900">{field.question || field.displayName || field.fieldName}</span>
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', style.pill)}>{style.label}</span>
        {inactive && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-400">inactive branch</span>}
        {field.winner && <span className="ml-auto text-[11px] text-gray-600">Winner: <strong className="text-gray-900">{field.winner}</strong></span>}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-1.5">
        {answers.map((answer: any) => {
          const norm = normalizeAnswer(answer.value);
          const answered = answer.submitted && answer.applicable !== false && norm !== null;
          let chip = 'bg-white border-gray-200';
          if (!answer.submitted) chip = 'bg-gray-100 border-gray-200';
          else if (answered && result.level !== 'pending') {
            if (result.majorityValue !== null && norm === result.majorityValue) chip = 'bg-green-100 border-green-300';
            else chip = result.level === 'partial' ? 'bg-orange-100 border-orange-300' : 'bg-red-100 border-red-300';
          }
          const valueText = !answer.submitted
            ? 'Pending'
            : answer.applicable === false
              ? 'N/A'
              : norm === null
                ? 'No answer'
                : formatValue(answer.value);
          return (
            <div key={`${field.fieldName}-${answer.annotatorId}`} className={cn('rounded border px-2 py-1', chip)}>
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className="truncate font-semibold text-gray-600">{answer.annotatorName}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className={answer.submitted ? 'text-gray-500' : 'text-gray-400'}>{answer.submitted ? 'Submitted' : 'Pending'}</span>
                  {canDecide && answered && (
                    <button
                      type="button"
                      disabled={busy || (final !== null && normalizeAnswer(final) === norm)}
                      onClick={() => save(toDecisionValue(answer.value))}
                      title={`Use ${answer.annotatorName}'s answer as the final answer`}
                      className="rounded border border-indigo-200 bg-white px-1 font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
                    >
                      Use
                    </button>
                  )}
                </span>
              </div>
              <div className={cn('break-words text-xs', answered ? 'text-gray-900' : 'italic text-gray-400')}>{valueText}</div>
            </div>
          );
        })}
      </div>
      {decidable && (
        <FinalAnswerForm field={field} final={final} busy={busy} canDecide={canDecide} onSave={save} onClear={clear} />
      )}
    </div>
  );
}

function GenerateBanner({ onGenerate }: { onGenerate: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs text-indigo-800">
      <span>Final answers are recorded on the generated consensus.</span>
      <Button
        size="sm"
        className="h-7 text-[11px]"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onGenerate();
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Generate consensus to enable final answers
      </Button>
    </div>
  );
}

function QuestionsPane({
  row,
  finalAnswers,
  excludedAnnotatorIds,
}: {
  row: any;
  finalAnswers?: FinalAnswerHandlers;
  excludedAnnotatorIds?: string[];
}) {
  const [showInactive, setShowInactive] = useState(false);
  const { active, inactive } = useMemo(() => walkFieldTree(buildFieldTree(row.fields)), [row.fields]);
  return (
    <div className="h-full overflow-y-auto p-3">
      {finalAnswers?.canDecide && !row.reviewId && active.length > 0 && <GenerateBanner onGenerate={finalAnswers.onGenerate} />}
      <div className="space-y-1.5">
        {active.map(({ node, depth }) => (
          <QuestionCard key={node.fieldName} field={node} depth={depth} row={row} finalAnswers={finalAnswers} excludedAnnotatorIds={excludedAnnotatorIds} />
        ))}
        {active.length === 0 && <div className="text-xs italic text-gray-400">No questions for this row.</div>}
        {inactive.length > 0 && (
          <div className="pt-1">
            <button onClick={() => setShowInactive((v) => !v)} className="text-[11px] font-medium text-gray-400 hover:text-gray-600">
              {showInactive ? 'Hide' : 'Show'} {inactive.length} inactive branch question{inactive.length > 1 ? 's' : ''}
            </button>
            {showInactive && (
              <div className="mt-1.5 space-y-1.5">
                {inactive.map((node) => (
                  <QuestionCard key={node.fieldName} field={node} depth={0} inactive excludedAnnotatorIds={excludedAnnotatorIds} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export type RowEdge = 'first' | 'last';

interface ConsensusRowReviewProps {
  /** Rows of the currently loaded page. */
  rows: any[];
  datasetId?: string;
  /** Total rows matching the current filter, across all pages. */
  totalRows: number;
  page: number;
  totalPages: number;
  pageSize: number;
  /** rowIndex of the row being reviewed; null → fall back to `edge` of the page. */
  selectedRowIndex: number | null;
  /** Which end of the page to land on when no row is selected (after a page change). */
  edge: RowEdge;
  onSelectRow: (rowIndex: number) => void;
  /** Move to another page and land on its first/last row. */
  onChangePage: (page: number, edge: RowEdge) => void;
  /** Enables the per-question final answer form. */
  finalAnswers?: FinalAnswerHandlers;
  /** Annotators left out of the consensus; their answers are hidden. */
  excludedAnnotatorIds?: string[];
}

export function ConsensusRowReview({
  rows,
  datasetId,
  totalRows,
  page,
  totalPages,
  pageSize,
  selectedRowIndex,
  edge,
  onSelectRow,
  onChangePage,
  finalAnswers,
  excludedAnnotatorIds,
}: ConsensusRowReviewProps) {
  const [overlay, setOverlay] = useState<{ urls: string[]; index: number } | null>(null);
  // The selected row is derived, so a page change or a filter that drops the
  // selected row lands on the requested edge without an extra render pass.
  const position = useMemo(() => {
    if (!rows.length) return -1;
    const found = selectedRowIndex === null ? -1 : rows.findIndex((r) => r.rowIndex === selectedRowIndex);
    if (found >= 0) return found;
    return edge === 'last' ? rows.length - 1 : 0;
  }, [rows, selectedRowIndex, edge]);
  const row = position >= 0 ? rows[position] : null;
  const globalPosition = (page - 1) * pageSize + position + 1;
  const hasPrev = position > 0 || page > 1;
  const hasNext = position < rows.length - 1 || page < totalPages;

  const goPrev = useCallback(() => {
    if (position > 0) onSelectRow(rows[position - 1].rowIndex);
    else if (page > 1) onChangePage(page - 1, 'last');
  }, [position, rows, page, onSelectRow, onChangePage]);

  const goNext = useCallback(() => {
    if (position >= 0 && position < rows.length - 1) onSelectRow(rows[position + 1].rowIndex);
    else if (page < totalPages) onChangePage(page + 1, 'first');
  }, [position, rows, page, totalPages, onSelectRow, onChangePage]);

  const overlayOpen = overlay !== null;
  const openOverlay = useCallback((urls: string[], index: number) => setOverlay({ urls, index }), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))) return;
      // The image lightbox uses the arrow keys for its own navigation.
      if (overlayOpen) return;
      if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, overlayOpen]);

  const { levelCounts, finalCounts } = useMemo(() => {
    const counts: Record<AgreementLevel, number> = { agreed: 0, partial: 0, conflict: 0, pending: 0 };
    const finals = { decided: 0, total: 0 };
    if (!row) return { levelCounts: counts, finalCounts: finals };
    walkFieldTree(buildFieldTree(row.fields)).active.forEach(({ node }) => {
      counts[classifyAgreement(includedAnswers(node, excludedAnnotatorIds)).level] += 1;
      finals.total += 1;
      if (getFinalDecision(node)) finals.decided += 1;
    });
    return { levelCounts: counts, finalCounts: finals };
  }, [row, excludedAnnotatorIds]);

  if (!row) {
    return <div className="rounded-xl border bg-white p-12 text-center text-sm italic text-gray-400">No consensus data matches the current filter.</div>;
  }

  const rowBadge = STATUS_BADGE[row.rowStatus] || STATUS_BADGE.NOT_STARTED;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="space-y-2 border-b bg-gray-50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={goPrev} disabled={!hasPrev} aria-label="Previous row"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={goNext} disabled={!hasNext} aria-label="Next row"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <span className="font-semibold text-gray-800">Row {globalPosition} of {totalRows}</span>
          <span className="text-gray-400">#{row.rowIndex + 1}</span>
          <span className={cn('inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium', rowBadge.bg, rowBadge.text)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', rowBadge.dot)} />{rowBadge.label}
          </span>
          <span className="text-gray-600">
            {levelCounts.agreed} agreed · {levelCounts.partial} partial · {levelCounts.conflict} conflict · {levelCounts.pending} pending
          </span>
          {finalAnswers && finalCounts.total > 0 && (
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              Final answers: <strong className="text-gray-800">{finalCounts.decided} / {finalCounts.total}</strong> questions
              {finalCounts.decided === finalCounts.total && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                  <Check className="h-3 w-3" />All decided
                </span>
              )}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2.5 text-[10px] text-gray-500">
            {(['agreed', 'partial', 'conflict', 'pending'] as AgreementLevel[]).map((level) => (
              <span key={level} className="inline-flex items-center gap-1">
                <span className={cn('h-2 w-2 rounded-sm', LEVEL_STYLE[level].dot)} />{LEVEL_STYLE[level].label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5" role="listbox" aria-label="Rows on this page">
          {rows.map((r, i) => {
            const badge = STATUS_BADGE[r.rowStatus] || STATUS_BADGE.NOT_STARTED;
            const selected = i === position;
            return (
              <button
                key={r.rowIndex}
                role="option"
                aria-selected={selected}
                title={`Row ${r.rowIndex + 1} · ${badge.label}`}
                onClick={() => onSelectRow(r.rowIndex)}
                className={cn(
                  'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                  badge.bg,
                  badge.text,
                  selected && 'ring-2 ring-indigo-500 ring-offset-1',
                )}
              >
                {r.rowIndex + 1}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative min-h-[320px] flex-1">
        <div className="absolute inset-0"><ResizablePanels
          defaultLeftWidth={40}
          minLeftWidth={20}
          maxLeftWidth={70}
          leftPanel={<SourcePane key={row.rowIndex} rawData={row.rowRawData} datasetId={datasetId} onImageClick={openOverlay} />}
          rightPanel={<QuestionsPane key={row.rowIndex} row={row} finalAnswers={finalAnswers} excludedAnnotatorIds={excludedAnnotatorIds} />}
        /></div>
      </div>
      <ImageOverlay
        isOpen={overlay !== null}
        imageUrl={overlay ? overlay.urls[overlay.index] : ''}
        imageUrls={overlay?.urls || []}
        currentIndex={overlay?.index || 0}
        onClose={() => setOverlay(null)}
        onNavigate={(direction) =>
          setOverlay((prev) => {
            if (!prev || prev.urls.length === 0) return prev;
            const n = prev.urls.length;
            return { ...prev, index: (prev.index + (direction === 'next' ? 1 : -1) + n) % n };
          })
        }
      />
    </div>
  );
}
