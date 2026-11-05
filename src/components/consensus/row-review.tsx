'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePanels } from '@/components/ui/resizable-panels';
import { ImageThumbnails } from '@/components/annotation-components/image-thumbnails';
import { ImageOverlay } from '@/components/annotation-components/media-overlays';
import { cn } from '@/lib/utils';
import { ChildInput, GroupFieldInput, groupKey, readList } from '@/components/new-column-components/group-field-input';
import type { GroupChildField } from '@/types/feature1';
import { STATUS_BADGE, buildFieldTree, walkFieldTree, formatValue, getClinicalNotes, collectBranchNotes, type FieldNode } from './consensus-utils';

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
  /** Reload the grid (verification mode, once after a save). */
  onRefresh?: () => Promise<void>;
}

/** The persisted final answer, or null when unset (the backend clears with ' '). */
export function getFinalDecision(field: any): string | null {
  const value = field?.finalDecision;
  return typeof value === 'string' && value.trim() ? value : null;
}

/** An explicit empty answer: finalDecision "" stamped with who/when (a blank without a stamp means "unset"). */
export function isLeftEmpty(field: any): boolean {
  return typeof field?.finalDecision === 'string' && field.finalDecision.trim() === '' && !!(field.finalDecisionAt || field.finalDecisionBy);
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

// Select value for "Other"; cannot collide with a real option.
const OTHER_CHOICE = '\u0000other';

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
  // Option fields also accept free text (combined medications, a corrected
  // dose, a drug outside the list); a saved value outside the options reopens
  // as free text rather than being dropped.
  const [choice, setChoice] = useState(() => (!initial || multi ? '' : options.includes(initial) ? initial : OTHER_CHOICE));
  const [text, setText] = useState(() => (initial && !multi && !options.includes(initial) ? initial : ''));
  const initialMulti = multi ? parseMulti(initial) : [];
  const [picked, setPicked] = useState<string[]>(() => initialMulti.filter((v) => options.includes(v)));
  const [extras, setExtras] = useState<string[]>(() => initialMulti.filter((v) => !options.includes(v)));
  const [draft, setDraft] = useState('');
  const multiValues = [...picked, ...extras];
  const value = multi
    ? (multiValues.length ? JSON.stringify(multiValues) : '')
    : options.length && choice !== OTHER_CHOICE ? choice : text;
  const control = 'rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-indigo-500';
  const addExtra = () => {
    const v = draft.trim();
    if (v && !multiValues.includes(v)) setExtras((prev) => [...prev, v]);
    setDraft('');
  };

  return (
    <div className="mt-1.5 space-y-1.5 rounded border border-gray-200 bg-white/80 p-2">
      {multi ? (
        <>
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
            {extras.map((extra) => (
              <label key={extra} className="inline-flex items-center gap-1 text-xs text-gray-700">
                <input type="checkbox" checked onChange={() => setExtras((prev) => prev.filter((v) => v !== extra))} />
                {extra}
              </label>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addExtra();
                }
              }}
              placeholder="Other value…"
              className={cn(control, 'flex-1')}
            />
            <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" disabled={!draft.trim()} onClick={addExtra}>Add</Button>
          </div>
        </>
      ) : options.length ? (
        <>
          <select value={choice} onChange={(e) => setChoice(e.target.value)} className={cn(control, 'w-full')}>
            <option value="">Select an option…</option>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
            <option value={OTHER_CHOICE}>Other (type your own)…</option>
          </select>
          {choice === OTHER_CHOICE && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              autoFocus
              placeholder="Free text, e.g. two medications or a corrected dose"
              className={cn(control, 'w-full resize-y')}
            />
          )}
        </>
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
            {field.finalSource === 'auto_agreed' && <span className="rounded bg-gray-100 px-1 py-px text-[9px] font-medium text-gray-500">auto-agreed</span>}
            {field.finalDecisionByName && (
              <span className="text-[10px] text-gray-500">set by {field.finalDecisionByName}{field.finalDecisionAt ? ` · ${formatTime(field.finalDecisionAt)}` : ''}</span>
            )}
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

// ─── Verification mode (doctor answers on this page) ────────────────────────

/** A field of the source annotation form (from `dataset.verificationForm`). */
export interface VerificationFormField {
  fieldName: string;
  columnType: string;
  options?: string[];
  groupChildren?: Array<Record<string, any>>;
  groupRepeatable?: boolean;
  groupMaxEntries?: number;
  groupEntryLabel?: string;
}

export interface VerificationHandlers {
  myUserId: string;
  /** The annotation form's inputs; edits render these instead of free text. */
  form?: VerificationFormField[];
  /** Case decisions; the caller toasts errors and refetches. */
  onAcceptCase: (row: any) => Promise<CaseDecisionResult>;
  onCheckCase: (row: any, body: { sections: string[]; note: string }) => Promise<boolean>;
  onReopenCase: (row: any) => Promise<boolean>;
}

const PENDING_RE = /^\s*pending\s*$/i;
const isPendingValue = (value: unknown) => value !== null && value !== undefined && PENDING_RE.test(toDecisionValue(value));
const originalOf = (field: any): string | null => (typeof field?.originalValue === 'string' ? field.originalValue : null);

const isFilled = (value: string | null | undefined) => (value ?? '').split(';').some((part) => part.trim() !== '' && !PENDING_RE.test(part));
const DX_RE = /^Diagnosis\s*(\d+)\./;
const TX_RE = /^Treatment Plan \d+ for Diagnosis\s*(\d+)\./;
const TESTS_RE = /^Medical Tests\.\s*Diagnosis\s*(\d+)\s*Tests$/;
const DX_CHILD = ['Diagnostic Array'];
const TX_CHILD = ['Drug name-Strength-Route-Form', 'Other medication (free text, if not in list)'];
const isChild = (name: string, children: string[]) => children.some((c) => name.endsWith(c));

/** Mirrors the backend's accept rule: diagnosis/treatment pairing plus any other PENDING answer. */
// Questions that may always be left empty (agreed with Intelehealth), matched on the
// question's own name (after the last "."), so they apply in every Treatment Plan.
const OPTIONAL_FIELDS = ['Remarks', 'Other medication (free text, if not in list)', 'Instruction (Remarks)'];
const isOptionalField = (fieldName: string) => OPTIONAL_FIELDS.includes(String(fieldName).split('.').pop()!.trim());
export function checkAccept(fields: any[], effectiveOf: (field: any) => string | null) {
  const dx = new Map<string, boolean>();
  const tx = new Map<string, boolean>();
  const tests = new Map<string, boolean>();
  const slotOf = new Map<string, string>();
  fields.forEach((f) => {
    const name = String(f.fieldName).trim();
    const value = effectiveOf(f);
    let m = name.match(DX_RE);
    if (m) {
      slotOf.set(f.fieldName, m[1]);
      if (isChild(name, DX_CHILD)) dx.set(m[1], (dx.get(m[1]) ?? false) || isFilled(value));
      return;
    }
    if ((m = name.match(TX_RE))) {
      slotOf.set(f.fieldName, m[1]);
      if (isChild(name, TX_CHILD)) tx.set(m[1], (tx.get(m[1]) ?? false) || isFilled(value));
      return;
    }
    if ((m = name.match(TESTS_RE))) {
      slotOf.set(f.fieldName, m[1]);
      tests.set(m[1], (tests.get(m[1]) ?? false) || isFilled(value));
    }
  });
  const slots = [...new Set([...dx.keys(), ...tx.keys()])].sort((a, b) => Number(a) - Number(b));
  const problems: string[] = [];
  if (dx.size > 0 && ![...dx.values()].some(Boolean)) problems.push('Add at least one diagnosis');
  if (tx.size > 0 && ![...tx.values()].some(Boolean)) problems.push('Add at least one treatment plan');
  slots.forEach((n) => {
    if (dx.get(n) && !tx.get(n) && !tests.get(n)) problems.push(`Diagnosis ${n} has no treatment plan or tests`);
    if (tx.get(n) && !dx.get(n)) problems.push(`Treatment Plan ${n} has no diagnosis`);
  });
  const optionalFields = new Set<string>();
  slotOf.forEach((n, name) => {
    if (!dx.get(n) && !tx.get(n) && !tests.get(n)) optionalFields.add(name);
    // Tests are optional once the diagnosis has a treatment plan.
    else if (tx.get(n) && TESTS_RE.test(String(name).trim())) optionalFields.add(name);
  });
  fields.forEach((f) => { if (isOptionalField(f.fieldName)) optionalFields.add(f.fieldName); });
  const pending = fields.filter((f) => !optionalFields.has(f.fieldName) && isPendingValue(effectiveOf(f))).map((f) => f.fieldName as string);
  return { pending, problems, optionalFields };
}
const effectiveOfNode = (node: any) => (isLeftEmpty(node) ? '' : (getFinalDecision(node) ?? originalOf(node)));

// ─── Annotation-form editors (verification mode) ───────────────────────────

const toChild = (c: Record<string, any>): GroupChildField => ({ ...c, id: String(c.id ?? c.fieldName), fieldName: String(c.fieldName), columnType: c.columnType ?? 'text' }) as GroupChildField;

// Stored "A; B" (entry 1, entry 2) <-> the JSON array the group inputs use.
function toEditorList(stored: string): string {
  const parts = stored.split(';').map((v) => v.trim());
  while (parts.length && parts[parts.length - 1] === '') parts.pop();
  return JSON.stringify(parts.length ? parts : ['']);
}
function fromEditorList(raw: string): string {
  const parts = readList(raw).map((v) => v.trim());
  while (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts.join('; ');
}

const storedOf = (node: any): string => (isLeftEmpty(node) ? '' : (getFinalDecision(node) ?? originalOf(node) ?? ''));

function groupOf(form: VerificationFormField[] | undefined, fieldName: string): VerificationFormField | undefined {
  return form?.find((f) => !!f.groupChildren?.length && fieldName.startsWith(`${f.fieldName}.`));
}

function SectionEditor({
  group,
  nodes,
  onApply,
  onCancel,
}: {
  group: VerificationFormField;
  nodes: FieldNode[];
  onApply: (changes: { key: string; value: string }[]) => Promise<boolean>;
  onCancel: () => void;
}) {
  const children = useMemo(() => (group.groupChildren || []).map(toChild), [group]);
  const byKey = useMemo(() => new Map(nodes.map((n) => [n.fieldName, n])), [nodes]);
  const isList = (child: GroupChildField) => !!group.groupRepeatable || !!child.repeatable;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    children.forEach((child) => {
      const key = groupKey(group.fieldName, child);
      const stored = storedOf(byKey.get(key));
      init[key] = isList(child) ? toEditorList(stored) : stored;
    });
    return init;
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const changes: { key: string; value: string }[] = [];
    children.forEach((child) => {
      const key = groupKey(group.fieldName, child);
      const node = byKey.get(key);
      if (!node) return;
      const next = isList(child) ? fromEditorList(values[key] ?? '') : (values[key] ?? '').trim();
      if (normalizeAnswer(next) !== normalizeAnswer(storedOf(node))) changes.push({ key, value: next });
    });
    setBusy(true);
    try {
      if (!changes.length || (await onApply(changes))) onCancel();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2 rounded-md border border-indigo-200 bg-indigo-50/40 p-2">
      <GroupFieldInput
        fieldName={group.fieldName}
        childrenFields={children}
        values={values}
        onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        repeatable={group.groupRepeatable}
        maxEntries={group.groupMaxEntries}
        entryLabel={group.groupEntryLabel || 'Entry'}
      />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-6 px-2 text-[11px]" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Save section</Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function FormFieldEditor({
  entry,
  initial,
  busy,
  onSave,
  onCancel,
}: {
  entry: VerificationFormField;
  initial: string | null;
  busy: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const child = useMemo(() => toChild({ fieldName: entry.fieldName, columnType: entry.columnType, options: entry.options }), [entry]);
  const multi = child.columnType === 'multiselect';
  const [value, setValue] = useState(() => (multi ? parseMulti(initial).join('|') : initial ?? ''));
  const out = multi ? (value ? JSON.stringify(value.split('|').filter(Boolean)) : '') : value.trim();
  return (
    <div className="mt-1.5 space-y-1.5 rounded border border-gray-200 bg-white/80 p-2">
      <ChildInput child={child} value={value} onChange={setValue} />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-6 px-2 text-[11px]" disabled={busy || !out} onClick={() => onSave(out)}>Save</Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
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

// ─── Case decision bar (verification mode) ──────────────────────────────────

const CHECK_SECTIONS = ['Diagnosis', 'Treatment', 'Tests', 'Advice', 'Image', 'Data completeness'];

export interface CaseDecisionResult {
  ok: boolean;
  /** Questions the backend says still need a final answer. */
  fields?: string[];
  /** Doctors who have not finished the row (backend `notCompleted`). */
  waiting?: string[];
  /** Diagnosis/treatment pairing problems from the backend. */
  problems?: string[];
}

const caseStatusOf = (row: any): 'OPEN' | 'ACCEPTED' | 'CHECK' => (row?.caseStatus === 'ACCEPTED' || row?.caseStatus === 'CHECK' ? row.caseStatus : 'OPEN');

function formatTime(value: unknown, withDate = false): string {
  const d = value ? new Date(String(value)) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return withDate ? `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${time}` : time;
}

function CheckCaseForm({ busy, onSubmit, onCancel }: { busy: boolean; onSubmit: (sections: string[], note: string) => void; onCancel: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const ready = picked.length > 0 && note.trim().length > 0;
  return (
    <div className="w-full space-y-1.5 rounded-md border border-violet-200 bg-violet-50/60 p-2">
      <div className="flex flex-wrap gap-1">
        {CHECK_SECTIONS.map((name) => {
          const on = picked.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked((prev) => (on ? prev.filter((v) => v !== name) : [...prev, name]))}
              className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', on ? 'border-violet-600 bg-violet-600 text-white' : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50')}
            >
              {name}
            </button>
          );
        })}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="What should the source doctors check? (required)"
        className="w-full resize-y rounded border border-violet-200 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-violet-500"
      />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-6 bg-violet-600 px-2 text-[11px] text-white hover:bg-violet-700" disabled={busy || !ready} onClick={() => onSubmit(picked, note.trim())}>Submit</Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function CaseBar({
  row,
  pendingCount,
  problems,
  busy,
  confirming,
  needs,
  waiting,
  onAccept,
  onCheck,
  onReopen,
}: {
  row: any;
  pendingCount: number;
  problems: string[];
  busy: boolean;
  confirming: boolean;
  needs: string[];
  waiting: string[];
  onAccept: () => void;
  onCheck: (sections: string[], note: string) => Promise<boolean>;
  onReopen: () => void;
}) {
  const [checkOpen, setCheckOpen] = useState(false);
  const status = caseStatusOf(row);
  const decision = row.caseDecision || null;
  const spin = busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />;
  const reopen = <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={onReopen}>{spin}Reopen</Button>;

  if (status === 'ACCEPTED') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
          <Check className="h-3 w-3" />Accepted{decision?.byName ? ` by ${decision.byName}` : ''}{decision?.at ? ` · ${formatTime(decision.at, true)}` : ''}
        </span>
        {reopen}
      </div>
    );
  }
  if (status === 'CHECK') {
    const sections = Array.isArray(decision?.sections) ? decision.sections.join(', ') : '';
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex max-w-xl items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
          <span aria-hidden>⚑</span>
          <span className="truncate">Check{sections ? `: ${sections}` : ''}{decision?.note ? ` — ${decision.note}` : ''}</span>
        </span>
        {reopen}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" className="h-7 bg-emerald-600 text-[11px] text-white hover:bg-emerald-700" disabled={busy || pendingCount > 0 || problems.length > 0} title="Accept this case (A)" onClick={onAccept}>
        {spin}Accept case
      </Button>
      <Button size="sm" variant="outline" className="h-7 border-violet-400 text-[11px] text-violet-700 hover:bg-violet-50" disabled={busy} onClick={() => setCheckOpen((v) => !v)}>
        Check with source doctors
      </Button>
      {problems.map((p) => <span key={p} className="text-[11px] font-medium text-red-600">{p}</span>)}
      {pendingCount > 0 && <span className="text-[11px] font-medium text-red-600">{pendingCount} question{pendingCount === 1 ? '' : 's'} still PENDING — fill {pendingCount === 1 ? 'it' : 'them'} before accepting</span>}
      {confirming && <span className="text-[11px] font-medium text-emerald-700">Accept case #{row.rowIndex + 1}? Press A again or Esc</span>}
      {needs.length > 0 && <span className="text-[11px] font-medium text-red-600">Needs a final answer: {needs.join(', ')}</span>}
      {waiting.length > 0 && <span className="text-[11px] font-medium text-red-600">Waiting for: {waiting.join(', ')}</span>}
      {checkOpen && (
        <CheckCaseForm
          busy={busy}
          onCancel={() => setCheckOpen(false)}
          onSubmit={async (sections, note) => {
            if (await onCheck(sections, note)) setCheckOpen(false);
          }}
        />
      )}
    </div>
  );
}

function QuestionCard({
  field,
  depth,
  inactive,
  row,
  finalAnswers,
  excludedAnnotatorIds,
  verification,
  optional,
  onEditSection,
}: {
  field: FieldNode;
  depth: number;
  inactive?: boolean;
  row?: any;
  finalAnswers?: FinalAnswerHandlers;
  excludedAnnotatorIds?: string[];
  verification?: VerificationHandlers;
  /** Belongs to an optional diagnosis slot left empty, so PENDING does not block. */
  optional?: boolean;
  onEditSection?: (name: string) => void;
}) {
  const allAnswers = includedAnswers(field, excludedAnnotatorIds);
  const locked = !!verification && caseStatusOf(row) === 'ACCEPTED';
  // Verification shows one shared answer, so individual annotators' chips are left out.
  const answers = verification ? [] : allAnswers;
  const result = classifyAgreement(allAnswers);
  const style = LEVEL_STYLE[result.level];
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  // Final answers need a persisted review; inactive branches are moot.
  const decidable = !inactive && !!finalAnswers && !!row?.reviewId;
  const canDecide = decidable && !!finalAnswers?.canDecide && !locked;
  const final = getFinalDecision(field);
  const leftEmpty = isLeftEmpty(field);
  const branchNotes = inactive ? [] : collectBranchNotes(field, excludedAnnotatorIds);
  const track = async (action: () => Promise<boolean>) => {
    setBusy(true);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  };
  const save = (value: string) => track(async () => {
    const ok = await finalAnswers!.onSave(row, field.fieldName, value);
    if (ok && verification) await finalAnswers!.onRefresh?.();
    return ok;
  });
  const clear = () => track(() => finalAnswers!.onClear(row, field.fieldName));
  const original: string | null = typeof (field as any).originalValue === 'string' ? (field as any).originalValue : null;
  const originalNorm = original === null ? null : normalizeAnswer(original);
  const effective = leftEmpty ? '' : (final ?? original);
  const effectivePending = !!verification && !inactive && !optional && isPendingValue(effective);
  const optionalEmpty = !!verification && !inactive && !!optional && isPendingValue(effective);
  const group = verification ? groupOf(verification.form, field.fieldName) : undefined;
  const formEntry = verification && !group ? verification.form?.find((f) => f.fieldName === field.fieldName && !f.groupChildren?.length) : undefined;
  const finalChanged = leftEmpty ? originalNorm !== null && !isPendingValue(original) : final !== null && original !== null && normalizeAnswer(final) !== originalNorm;
  return (
    <div
      id={row ? `q-${row.rowIndex}-${field.fieldName}` : undefined}
      style={{ marginLeft: depth * 16 }}
      className={cn('rounded-md border px-2.5 py-2', style.card, depth > 0 && 'border-l-2', inactive && 'opacity-60')}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {depth > 0 && <span className="text-[10px] text-indigo-400">└</span>}
        <span className="text-xs font-semibold text-gray-900">{field.question || field.displayName || field.fieldName}</span>
        {!verification && <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', style.pill)}>{style.label}</span>}
        {effectivePending && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">PENDING</span>}
        {optionalEmpty && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">optional · left empty</span>}
        {inactive && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-400">inactive branch</span>}
        {field.winner && !verification && <span className="ml-auto text-[11px] text-gray-600">Winner: <strong className="text-gray-900">{field.winner}</strong></span>}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-1.5">
        {original !== null && (
          <div className="rounded border border-sky-300 bg-sky-50 px-2 py-1">
            <div className="flex items-center justify-between gap-1 text-[10px]">
              <span className="truncate font-semibold text-sky-700">Consensus</span>
              {canDecide && (
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy || (!leftEmpty && final !== null && normalizeAnswer(final) === originalNorm)}
                    onClick={() => save(original)}
                    title="Use the consensus answer as the final answer"
                    className="rounded border border-indigo-200 bg-white px-1 font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
                  >
                    Use
                  </button>
                  {verification && (
                    <button
                      type="button"
                      disabled={busy || leftEmpty}
                      onClick={() => save('')}
                      title="Answer this question with nothing (clears it)"
                      className={cn(
                        'rounded px-1 font-medium disabled:opacity-40',
                        isPendingValue(effective) ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'text-gray-500 hover:text-gray-800 hover:underline',
                      )}
                    >
                      Leave empty
                    </button>
                  )}
                </span>
              )}
            </div>
            <div className={cn('break-words text-xs', originalNorm !== null ? 'text-gray-900' : 'italic text-gray-400')}>{originalNorm === null ? 'No answer' : formatValue(original)}</div>
          </div>
        )}
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
                <span className="truncate font-semibold text-gray-600">
                  {answer.annotatorName}
                  {original !== null && answered && norm !== originalNorm && <span className="ml-1 text-[10px] text-amber-700">changed</span>}
                </span>
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
      {verification && decidable && (
        <div className="mt-1.5 border-t border-black/5 pt-1.5">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />}
            {leftEmpty ? (
              <>
                <span className="italic text-gray-500">
                  Left empty{field.finalDecisionByName ? ` · set by ${field.finalDecisionByName}` : ''}{field.finalDecisionAt ? ` · ${formatTime(field.finalDecisionAt)}` : ''}
                </span>
                {finalChanged && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">changed</span>}
              </>
            ) : final ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                <span className="text-gray-600">Final:</span>
                <strong className="break-words text-gray-900">{formatValue(final)}</strong>
                {field.finalDecisionByName && (
                  <span className="text-[10px] text-gray-500">· set by {field.finalDecisionByName}{field.finalDecisionAt ? ` · ${formatTime(field.finalDecisionAt)}` : ''}</span>
                )}
                {Number(field.finalEditCount) > 1 && (
                  <span
                    title={field.finalOverwrittenBy ? 'Changed by a different doctor than the previous answer' : undefined}
                    className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', field.finalOverwrittenBy ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500')}
                  >
                    edited {field.finalEditCount}×
                  </span>
                )}
                {finalChanged && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">changed</span>}
              </>
            ) : (
              <span className="italic text-gray-500">Final: consensus kept</span>
            )}
            {canDecide && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-6 px-2 text-[11px]"
                disabled={busy}
                onClick={() => (group ? onEditSection?.(group.fieldName) : setEditing((v) => !v))}
              >
                {group ? 'Edit section' : 'Edit'}
              </Button>
            )}
          </div>
          {editing && canDecide && !group && (
            formEntry ? (
              <FormFieldEditor
                entry={formEntry}
                initial={final ?? original}
                busy={busy}
                onCancel={() => setEditing(false)}
                onSave={async (value) => {
                  if (await save(value)) setEditing(false);
                }}
              />
            ) : (
              <CustomAnswerEditor
                field={field}
                initial={final ?? original}
                busy={busy}
                onCancel={() => setEditing(false)}
                onSave={async (value) => {
                  if (await save(value)) setEditing(false);
                }}
              />
            )
          )}
        </div>
      )}
      {branchNotes.length > 0 && (
        <div className="mt-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Notes from other branches (not counted)</div>
          {branchNotes.map((b) => (
            <div key={b.fieldName} className="mt-1">
              <div className="text-[11px] font-semibold text-gray-800">{b.question}</div>
              {b.notes.map((n) => (
                <div key={n.annotatorId} className="break-words text-xs text-gray-700">
                  {n.annotatorName}: {formatValue(n.value)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {decidable && !verification && (
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

const GENERAL = 'General';
const REVIEW_SECTION = 'Your review';

// Blank imported cell (originalValue "") that nobody answered.
function isBlankQuestion(node: FieldNode, answers: any[]): boolean {
  return originalOf(node) === '' && answers.every((a) => normalizeAnswer(a.value) === null);
}

function sectionOf(node: FieldNode, reviewOnlyNull: boolean): string {
  if (reviewOnlyNull && originalOf(node) === null) return REVIEW_SECTION;
  const dot = String(node.fieldName).indexOf('.');
  return dot > 0 ? String(node.fieldName).slice(0, dot) : GENERAL;
}

interface SectionInfo {
  name: string;
  entries: { node: FieldNode; depth: number }[];
  changed: number;
  disagree: number;
  pending: number;
  redPending: number;
  blank: number;
  defaultOpen: boolean;
}

function QuestionsPane({
  row,
  finalAnswers,
  excludedAnnotatorIds,
  verification,
  focus,
}: {
  row: any;
  finalAnswers?: FinalAnswerHandlers;
  excludedAnnotatorIds?: string[];
  verification?: VerificationHandlers;
  /** Questions to reveal and scroll to (a new nonce re-triggers). */
  focus?: { fields: string[]; nonce: number } | null;
}) {
  const [showInactive, setShowInactive] = useState(false);
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
  const [showBlank, setShowBlank] = useState<Record<string, boolean>>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const { active, inactive } = useMemo(() => walkFieldTree(buildFieldTree(row.fields)), [row.fields]);

  const optionalFields = useMemo(() => (verification ? checkAccept(active.map((e) => e.node), effectiveOfNode).optionalFields : new Set<string>()), [active, verification]);
  const sections = useMemo(() => {
    const rowHasOriginal = (row.fields || []).some((f: any) => originalOf(f) !== null);
    const list: SectionInfo[] = [];
    let current: SectionInfo | null = null;
    active.forEach((entry) => {
      if (entry.depth === 0 || !current) {
        const name = sectionOf(entry.node, rowHasOriginal);
        current = list.find((sec) => sec.name === name) || null;
        if (!current) {
          current = { name, entries: [], changed: 0, disagree: 0, pending: 0, redPending: 0, blank: 0, defaultOpen: false };
          list.push(current);
        }
      }
      current.entries.push(entry);
      const answers = includedAnswers(entry.node, excludedAnnotatorIds);
      if (isBlankQuestion(entry.node, answers)) {
        current.blank += 1;
        return;
      }
      const visible = answers;
      const original = originalOf(entry.node);
      const originalNorm = original === null ? null : normalizeAnswer(original);
      if (verification) {
        const fin = getFinalDecision(entry.node);
        const empty = isLeftEmpty(entry.node);
        if (empty ? original !== null && !isPendingValue(original) && originalNorm !== null : fin !== null && original !== null && normalizeAnswer(fin) !== originalNorm) current.changed += 1;
        if (!optionalFields.has(entry.node.fieldName) && isPendingValue(effectiveOfNode(entry.node))) current.redPending += 1;
      } else if (original !== null && visible.some((a) => a.submitted && a.applicable !== false && normalizeAnswer(a.value) !== null && normalizeAnswer(a.value) !== originalNorm)) current.changed += 1;
      const level = classifyAgreement(answers).level;
      if (verification) return;
      if (level === 'partial' || level === 'conflict') current.disagree += 1;
      else if (level === 'pending') current.pending += 1;
    });
    list.forEach((sec) => {
      sec.defaultOpen = sec.blank < sec.entries.length && (sec.changed + sec.disagree + sec.pending + sec.redPending > 0 || /diagnosis|treatment/i.test(sec.name));
    });
    // "Your review" always goes last.
    return [...list.filter((sec) => sec.name !== REVIEW_SECTION), ...list.filter((sec) => sec.name === REVIEW_SECTION)];
  }, [active, row.fields, excludedAnnotatorIds, verification, optionalFields]);

  const isOpen = (sec: SectionInfo) => openOverride[sec.name] ?? sec.defaultOpen;
  const setAll = (open: boolean) => setOpenOverride(Object.fromEntries(sections.map((sec) => [sec.name, open])));
  const jump = (sec: SectionInfo, index: number) => {
    setOpenOverride((prev) => ({ ...prev, [sec.name]: true }));
    document.getElementById(`sec-${row.rowIndex}-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const count = 'rounded px-1 py-px text-[10px] font-medium';
  const canEditSections = !!finalAnswers?.canDecide && !!row.reviewId && caseStatusOf(row) !== 'ACCEPTED';

  // Reveal the focused questions' sections (state adjusted during render).
  const [seenNonce, setSeenNonce] = useState<number | undefined>(focus?.nonce);
  if (focus && focus.nonce !== seenNonce) {
    setSeenNonce(focus.nonce);
    const names = sections.filter((sec) => sec.entries.some(({ node }) => focus.fields.includes(node.fieldName))).map((sec) => sec.name);
    setOpenOverride((prev) => ({ ...prev, ...Object.fromEntries(names.map((n) => [n, true])) }));
  }
  useEffect(() => {
    if (!focus?.fields.length) return;
    const timer = window.setTimeout(() => {
      const first = focus.fields.map((f) => document.getElementById(`q-${row.rowIndex}-${f}`)).find(Boolean);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  return (
    <div className="h-full overflow-y-auto p-3">
      {finalAnswers?.canDecide && !row.reviewId && active.length > 0 && <GenerateBanner onGenerate={finalAnswers.onGenerate} />}
      {sections.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          <button type="button" onClick={() => setAll(true)} className="font-medium text-indigo-600 hover:underline">Expand all</button>
          <button type="button" onClick={() => setAll(false)} className="font-medium text-indigo-600 hover:underline">Collapse all</button>
          <span className="text-gray-300">|</span>
          {sections.map((sec, i) => (
            <button key={sec.name} type="button" onClick={() => jump(sec, i)} className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-gray-600 hover:bg-gray-50">{sec.name}</button>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {sections.map((sec, i) => {
          const open = isOpen(sec);
          const sectionGroup = verification?.form?.find((f) => f.fieldName === sec.name && !!f.groupChildren?.length);
          return (
            <div key={sec.name} id={`sec-${row.rowIndex}-${i}`} className="space-y-1.5">
              <div className="flex items-stretch gap-1">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenOverride((prev) => ({ ...prev, [sec.name]: !open }))}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border bg-gray-100 px-2 py-1 text-left text-xs hover:bg-gray-200"
              >
                <ChevronDown className={cn('h-3.5 w-3.5 text-gray-500 transition-transform', !open && '-rotate-90')} />
                <span className="font-semibold text-gray-800">{sec.name}</span>
                <span className="text-[10px] text-gray-500">{sec.entries.length} question{sec.entries.length === 1 ? '' : 's'}</span>
                <span className="ml-auto flex flex-wrap items-center gap-1">
                  {sec.redPending > 0 && <span className={cn(count, 'bg-red-100 font-bold text-red-700')}>{sec.redPending} PENDING</span>}
                  {sec.changed > 0 && <span className={cn(count, 'bg-amber-100 text-amber-800')}>{sec.changed} changed</span>}
                  {sec.disagree > 0 && <span className={cn(count, 'bg-orange-100 text-orange-800')}>{sec.disagree} disagree</span>}
                  {sec.pending > 0 && <span className={cn(count, 'bg-gray-200 text-gray-600')}>{sec.pending} pending</span>}
                </span>
              </button>
              {sectionGroup && canEditSections && (
                <Button size="sm" variant="outline" className="h-auto px-2 text-[11px]" onClick={() => { setOpenOverride((prev) => ({ ...prev, [sec.name]: true })); setEditingSection(sec.name); }}>Edit section</Button>
              )}
              </div>
              {sectionGroup && canEditSections && editingSection === sec.name && (
                <SectionEditor
                  key={sec.name}
                  group={sectionGroup}
                  nodes={sec.entries.map((e) => e.node)}
                  onCancel={() => setEditingSection(null)}
                  onApply={async (changes) => {
                    for (const change of changes) {
                      const ok = change.value.trim() ? await finalAnswers!.onSave(row, change.key, change.value) : await finalAnswers!.onClear(row, change.key);
                      if (!ok) return false;
                    }
                    await finalAnswers!.onRefresh?.();
                    return true;
                  }}
                />
              )}
              {open && sec.entries.map(({ node, depth }) => {
                const blank = isBlankQuestion(node, includedAnswers(node, excludedAnnotatorIds));
                if (blank && !showBlank[sec.name]) return null;
                return <QuestionCard key={node.fieldName} field={node} depth={depth} row={row} finalAnswers={finalAnswers} excludedAnnotatorIds={excludedAnnotatorIds} verification={verification} optional={optionalFields.has(node.fieldName)} onEditSection={setEditingSection} />;
              })}
              {open && sec.blank > 0 && (
                <button type="button" onClick={() => setShowBlank((prev) => ({ ...prev, [sec.name]: !prev[sec.name] }))} className="px-1 text-[11px] text-gray-400 hover:text-gray-600">
                  {sec.blank} blank question{sec.blank === 1 ? '' : 's'} ({showBlank[sec.name] ? 'hide' : 'show'})
                </button>
              )}
            </div>
          );
        })}
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
  /** Verification mode only: lets the logged-in doctor answer on this page. */
  verification?: VerificationHandlers;
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
  verification,
}: ConsensusRowReviewProps) {
  const [caseBusy, setCaseBusy] = useState(false);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [needs, setNeeds] = useState<{ rowIndex: number; fields: string[]; nonce: number } | null>(null);
  const [waiting, setWaiting] = useState<{ rowIndex: number; names: string[] } | null>(null);
  const [serverProblems, setServerProblems] = useState<{ rowIndex: number; list: string[]; accept: unknown } | null>(null);
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

  const rowCase = row ? caseStatusOf(row) : 'OPEN';
  // Keyed by row + state so moving rows or a decision drops a pending confirm.
  const caseKey = `${row?.rowIndex}:${rowCase}`;
  const confirmAccept = confirmFor === caseKey;
  const accept = useMemo(
    () => (row && verification ? checkAccept(walkFieldTree(buildFieldTree(row.fields)).active.map((e) => e.node), effectiveOfNode) : { pending: [] as string[], problems: [] as string[] }),
    [row, verification],
  );
  const pendingCount = accept.pending.length;
  const canAccept = !!verification && rowCase === 'OPEN' && !caseBusy && pendingCount === 0 && accept.problems.length === 0;
  const labelOf = useMemo(() => {
    const map: Record<string, string> = {};
    if (row) {
      const hasOriginal = (row.fields || []).some((f: any) => originalOf(f) !== null);
      walkFieldTree(buildFieldTree(row.fields)).active.forEach(({ node }) => {
        map[node.fieldName] = `${sectionOf(node, hasOriginal)} · ${node.question || node.displayName || node.fieldName}`;
      });
    }
    return map;
  }, [row]);
  // After a decision, jump to the next OPEN case (forward first, then from the start of the page).
  const advance = useCallback(() => {
    const others = [...rows.slice(position + 1), ...rows.slice(0, Math.max(position, 0))];
    const next = others.find((r) => caseStatusOf(r) === 'OPEN');
    if (next) onSelectRow(next.rowIndex);
  }, [rows, position, onSelectRow]);
  const acceptCase = useCallback(async () => {
    if (!row || !verification) return;
    setConfirmFor(null);
    setCaseBusy(true);
    try {
      const res = await verification.onAcceptCase(row);
      setNeeds(res.ok || !res.fields?.length ? null : { rowIndex: row.rowIndex, fields: res.fields, nonce: Date.now() });
      setWaiting(!res.ok && res.waiting?.length ? { rowIndex: row.rowIndex, names: res.waiting } : null);
      setServerProblems(!res.ok && res.problems?.length ? { rowIndex: row.rowIndex, list: res.problems, accept } : null);
      if (res.ok) advance();
    } finally {
      setCaseBusy(false);
    }
  }, [row, verification, advance, accept]);
  const runCase = async (action: () => Promise<boolean>) => {
    setCaseBusy(true);
    try {
      return await action();
    } finally {
      setCaseBusy(false);
    }
  };
  useEffect(() => {
    if (!confirmFor) return;
    const timer = window.setTimeout(() => setConfirmFor(null), 5000);
    return () => window.clearTimeout(timer);
  }, [confirmFor]);
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
      else if (verification) {
        const key = event.key.toLowerCase();
        if (key === 'a' && canAccept) {
          if (confirmAccept) void acceptCase();
          else setConfirmFor(caseKey);
        } else if (event.key === 'Escape') setConfirmFor(null);
        else if (key === 'j') goNext();
        else if (key === 'k') goPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, overlayOpen, verification, canAccept, confirmAccept, acceptCase, caseKey]);

  const { levelCounts, finalCounts } = useMemo(() => {
    const counts: Record<AgreementLevel, number> = { agreed: 0, partial: 0, conflict: 0, pending: 0 };
    const finals = { decided: 0, total: 0 };
    if (!row) return { levelCounts: counts, finalCounts: finals };
    walkFieldTree(buildFieldTree(row.fields)).active.forEach(({ node }) => {
      counts[classifyAgreement(includedAnswers(node, excludedAnnotatorIds)).level] += 1;
      finals.total += 1;
      if (getFinalDecision(node) !== null || isLeftEmpty(node) || (node as any).finalSource) finals.decided += 1;
    });
    return { levelCounts: counts, finalCounts: finals };
  }, [row, excludedAnnotatorIds]);

  if (!row) {
    return <div className="rounded-xl border bg-white p-12 text-center text-sm italic text-gray-400">No consensus data matches the current filter.</div>;
  }

  const rowBadge = STATUS_BADGE[row.rowStatus] || STATUS_BADGE.NOT_STARTED;
  const casePill = verification && rowCase === 'ACCEPTED'
    ? { label: 'Accepted', cls: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' }
    : verification && rowCase === 'CHECK'
      ? { label: 'Check', cls: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-500' }
      : null;

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
          <span className={cn('inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium', casePill ? casePill.cls : cn(rowBadge.bg, rowBadge.text))}>
            <span className={cn('h-1.5 w-1.5 rounded-full', casePill ? casePill.dot : rowBadge.dot)} />{casePill ? casePill.label : rowBadge.label}
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
                title={`Row ${r.rowIndex + 1} · ${badge.label}${r.caseStatus === 'ACCEPTED' ? ' · Accepted' : r.caseStatus === 'CHECK' ? ' · Check' : ''}`}
                onClick={() => onSelectRow(r.rowIndex)}
                className={cn(
                  'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                  badge.bg,
                  badge.text,
                  selected && 'ring-2 ring-indigo-500 ring-offset-1',
                )}
              >
                {r.rowIndex + 1}
                {r.caseStatus === 'ACCEPTED' && <span className="ml-0.5 font-bold text-emerald-600" aria-label="Accepted">✓</span>}
                {r.caseStatus === 'CHECK' && <span className="ml-0.5 font-bold text-violet-600" aria-label="Needs check">⚑</span>}
              </button>
            );
          })}
        </div>
        {verification && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
            {rowCase !== 'ACCEPTED' && <span className="text-[10px] text-gray-400">J next · K previous</span>}
            {rowCase !== 'ACCEPTED' && <span aria-hidden className="mx-2 h-6 w-px bg-gray-300" />}
            <CaseBar
              key={row.rowIndex}
              row={row}
              busy={caseBusy}
              confirming={confirmAccept}
              pendingCount={pendingCount}
              problems={[...new Set([...accept.problems, ...(serverProblems && serverProblems.rowIndex === row.rowIndex && serverProblems.accept === accept ? serverProblems.list : [])])]}
              needs={needs && needs.rowIndex === row.rowIndex ? needs.fields.map((f) => labelOf[f] || f) : []}
              onAccept={() => void acceptCase()}
              waiting={waiting && waiting.rowIndex === row.rowIndex ? waiting.names : []}
              onCheck={async (sections, note) => {
                const ok = await runCase(() => verification.onCheckCase(row, { sections, note }));
                if (ok) advance();
                return ok;
              }}
              onReopen={() => void runCase(() => verification.onReopenCase(row))}
            />
          </div>
        )}
      </div>
      <div className="relative min-h-[320px] flex-1">
        <div className="absolute inset-0"><ResizablePanels
          defaultLeftWidth={40}
          minLeftWidth={20}
          maxLeftWidth={70}
          leftPanel={<SourcePane key={row.rowIndex} rawData={row.rowRawData} datasetId={datasetId} onImageClick={openOverlay} />}
          rightPanel={<QuestionsPane key={row.rowIndex} row={row} finalAnswers={finalAnswers} excludedAnnotatorIds={excludedAnnotatorIds} verification={verification} focus={needs && needs.rowIndex === row.rowIndex ? needs : null} />}
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
