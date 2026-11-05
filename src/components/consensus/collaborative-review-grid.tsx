'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { consensusAPI } from '@/lib/api/consensus';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { DecisionCardEngine, parseOptions } from '@/components/new-column-components/new-column-data-panel';
import { Loader2, CheckCircle2, Users, RefreshCw, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const POLL_MS = 7000;

type AnnotatorAnswer = { annotatorName: string; value: unknown; submitted: boolean };
type CollabField = {
  fieldName: string;
  question: string;
  displayName: string;
  fieldType?: string;
  columnType?: string;
  options?: string[];
  maxRating?: number;
  maxSelections?: number;
  status: string;
  winner: string | null;
  agreementPercentage: number;
  annotatorAnswers: AnnotatorAnswer[];
  voteDistribution: { label: string; votes: number }[];
  sharedAnswer: string | null;
  suggestedAnswer: string | null;
  /** Verification datasets only: the prefilled value reviewers were asked to verify. */
  originalValue?: string | null;
};
type CollabRow = {
  rowIndex: number;
  primaryKey: unknown;
  rowStatus: string;
  orderRank: number;
  fields: CollabField[];
};
type CollabGrid = {
  sessionId: string;
  reviewMode: string;
  status: string;
  primaryKeyField: string | null;
  rows: CollabRow[];
};

const STATUS_STYLE: Record<string, string> = {
  CONFLICT: 'bg-red-100 text-red-700',
  TIE: 'bg-fuchsia-100 text-fuchsia-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  AGREED: 'bg-green-100 text-green-700',
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-gray-100 text-gray-500',
};

// Decision widgets (binary / rating / category / multiselect) are dispatched to
// the real annotation UI. Anything else falls back to a plain input so free-text
// / number fields still work.
const isDecisionField = (f: CollabField): boolean => {
  const ct = (f.columnType || '').toLowerCase();
  if (['rating', 'checkbox', 'multiselect', 'select', 'dropdown', 'category', 'radio', 'boolean', 'binary'].includes(ct)) {
    return true;
  }
  return (f.options?.length || 0) >= 2;
};

// Verification: compare answers the way the backend analytics do — order,
// case and spacing inside a "; "-joined list don't count as a correction.
const norm = (v: unknown): string =>
  v === null || v === undefined
    ? ''
    : String(v).split(';').map((x) => x.trim().toLowerCase()).filter(Boolean).sort().join('; ');

const submittedAnswers = (f: CollabField) => f.annotatorAnswers.filter((a) => a.submitted);

// A field with an original to verify. Review-only fields (Verdict, comments)
// come back with originalValue null — nothing to compare them against.
const hasOriginal = (f: CollabField) => f.originalValue !== null && f.originalValue !== undefined;

/** True when a reviewer corrected the original, or reviewers disagree with each other. */
const needsDiscussion = (f: CollabField): boolean => {
  const answers = submittedAnswers(f).map((a) => norm(a.value));
  if (answers.length === 0) return false;
  if (new Set(answers).size > 1) return true;
  return hasOriginal(f) && answers[0] !== norm(f.originalValue);
};

const isVerificationGrid = (rows: CollabRow[]) => rows.some((r) => r.fields.some(hasOriginal));

function SharedAnswerField({
  field,
  disabled,
  onSave,
}: {
  field: CollabField;
  disabled: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const committed = field.sharedAnswer !== null && field.sharedAnswer !== undefined;
  const initial = (committed ? field.sharedAnswer : field.suggestedAnswer) ?? '';
  const [draft, setDraft] = useState<string>(initial);
  const [saving, setSaving] = useState(false);

  // Keep in sync when another reviewer changes the shared answer (poll refresh).
  useEffect(() => {
    setDraft((field.sharedAnswer ?? field.suggestedAnswer ?? '') as string);
  }, [field.sharedAnswer, field.suggestedAnswer]);

  const save = useCallback(async (value: string) => {
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  const options = useMemo(() => parseOptions(field.options || []), [field.options]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Final consensus answer</span>
        {saving ? (
          <span className="text-[10px] text-gray-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> saving…</span>
        ) : committed ? (
          <span className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> saved</span>
        ) : field.suggestedAnswer ? (
          <span className="text-[10px] text-amber-600">suggested from majority — confirm to save</span>
        ) : null}
      </div>

      {isDecisionField(field) ? (
        <DecisionCardEngine
          field={{
            fieldName: field.fieldName,
            columnType: field.columnType,
            maxRating: field.maxRating,
            maxSelections: field.maxSelections,
          }}
          options={options}
          value={draft}
          onChange={(v: string) => { setDraft(v); if (!disabled) void save(v); }}
        />
      ) : (
        <input
          type={(field.columnType || '').toLowerCase() === 'number' ? 'number' : 'text'}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (!disabled && draft !== (field.sharedAnswer ?? '')) void save(draft); }}
          placeholder="Type the agreed final value…"
          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-fuchsia-400 bg-white disabled:bg-gray-50"
        />
      )}
    </div>
  );
}

const CHIP_TONE = {
  original: 'bg-sky-50 border-sky-200 text-sky-900',
  corrected: 'bg-amber-50 border-amber-300 text-amber-900',
  plain: 'bg-gray-50 border-gray-200 text-gray-800',
  missing: 'bg-gray-50 border-gray-200 text-gray-300 italic',
} as const;

function AnswerChip({ label, value, tone, selected, disabled, onPick }: {
  label: string;
  value: string;
  tone: keyof typeof CHIP_TONE;
  selected: boolean;
  disabled: boolean;
  onPick: (value: string) => void;
}) {
  return (
    <button type="button" disabled={disabled} onClick={() => onPick(value)}
      title={disabled ? undefined : `Use ${label}'s answer as the final answer`}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border text-left max-w-full',
        CHIP_TONE[tone],
        !disabled && 'hover:ring-2 hover:ring-fuchsia-200 cursor-pointer',
        selected && 'ring-2 ring-green-400',
      )}>
      {selected && <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />}
      <span className="opacity-70 shrink-0">{label}:</span>
      <span className="font-medium break-words">{value !== '' ? value : '—'}</span>
    </button>
  );
}

function RowCard({
  row,
  primaryKeyField,
  disabled,
  verification,
  onSave,
}: {
  row: CollabRow;
  primaryKeyField: string | null;
  disabled: boolean;
  verification: boolean;
  onSave: (rowIndex: number, fieldName: string, value: string) => Promise<void>;
}) {
  // In verification, show only the fields someone corrected or disagreed on.
  const [showAll, setShowAll] = useState(false);
  const discussed = verification ? row.fields.filter(needsDiscussion) : row.fields;
  const fields = showAll || discussed.length === 0 ? row.fields : discussed;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <p className="text-xs font-semibold text-gray-700">
          Row {row.rowIndex}
          {primaryKeyField && (
            <span className="text-gray-400 font-normal"> · {primaryKeyField}: <span className="font-mono">{String(row.primaryKey)}</span></span>
          )}
        </p>
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', STATUS_STYLE[row.rowStatus] || 'bg-gray-100 text-gray-500')}>
          {row.rowStatus}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {fields.map((f) => (
          <div key={f.fieldName} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-gray-900">{f.question || f.displayName || f.fieldName}</h4>
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', STATUS_STYLE[f.status] || 'bg-gray-100 text-gray-500')}>
                {f.status}{f.agreementPercentage ? ` · ${Math.round(f.agreementPercentage)}%` : ''}
              </span>
            </div>

            {/* The original (verification only) and what each reviewer entered.
                Click a value to make it the final answer. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mr-1">
                {verification ? 'Accept' : 'Annotators'}
              </span>
              {verification && hasOriginal(f) && (
                <AnswerChip label="Consensus" value={f.originalValue ?? ''} tone="original"
                  selected={f.sharedAnswer != null && norm(f.sharedAnswer) === norm(f.originalValue)}
                  disabled={disabled} onPick={(v) => onSave(row.rowIndex, f.fieldName, v)} />
              )}
              {f.annotatorAnswers.map((a, i) => (
                <AnswerChip key={i} label={a.annotatorName}
                  value={a.submitted && a.value !== null && a.value !== undefined ? String(a.value) : ''}
                  tone={!a.submitted ? 'missing' : verification && hasOriginal(f) && norm(a.value) !== norm(f.originalValue) ? 'corrected' : 'plain'}
                  selected={a.submitted && f.sharedAnswer != null && norm(f.sharedAnswer) === norm(a.value)}
                  disabled={disabled || !a.submitted || !verification}
                  onPick={(v) => onSave(row.rowIndex, f.fieldName, v)} />
              ))}
            </div>

            <SharedAnswerField
              field={f}
              disabled={disabled}
              onSave={(value) => onSave(row.rowIndex, f.fieldName, value)}
            />
          </div>
        ))}
        {verification && discussed.length > 0 && discussed.length < row.fields.length && (
          <button type="button" onClick={() => setShowAll((s) => !s)}
            className="w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-700 text-left">
            {showAll ? 'Show only fields to discuss' : `Show all ${row.fields.length} fields (${row.fields.length - discussed.length} kept as consensus)`}
          </button>
        )}
      </div>
    </div>
  );
}

export function CollaborativeReviewGrid({
  sessionId,
  datasetId,
  isAdmin,
  sessionStatus,
  onSessionChanged,
}: {
  sessionId: string;
  datasetId: string;
  isAdmin: boolean;
  sessionStatus: string;
  onSessionChanged?: () => void;
}) {
  const { showToast } = useToast();
  const [grid, setGrid] = useState<CollabGrid | null>(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showAgreed, setShowAgreed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const data = await consensusAPI.getCollabGrid(sessionId);
      setGrid(data);
    } catch {
      /* transient — keep last good grid */
    } finally {
      if (spinner) setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  // Live sync so every reviewer sees others' shared answers as they land.
  useEffect(() => {
    pollRef.current = setInterval(() => load(false), POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const editable = ['CREATED', 'ACTIVE'].includes(sessionStatus);

  const handleSave = useCallback(async (rowIndex: number, fieldName: string, value: string) => {
    try {
      await consensusAPI.setSharedAnswer(sessionId, { rowIndex, fieldName, value });
      // Optimistically reflect the saved value without waiting for the poll.
      setGrid((prev) => prev && {
        ...prev,
        rows: prev.rows.map((r) => r.rowIndex !== rowIndex ? r : {
          ...r,
          fields: r.fields.map((f) => f.fieldName !== fieldName ? f : { ...f, sharedAnswer: value }),
        }),
      });
    } catch (err: any) {
      showToast({ title: 'Could not save', description: err?.response?.data?.message || 'Failed to save the shared answer', type: 'error' });
      load(false);
    }
  }, [sessionId, showToast, load]);

  const handleMerge = async () => {
    setMerging(true);
    try {
      const res = await consensusAPI.mergeSession(datasetId, sessionId);
      showToast({ title: 'Merged', description: res.message, type: 'success' });
      onSessionChanged?.();
    } catch (err: any) {
      showToast({ title: 'Merge failed', description: err?.response?.data?.message || 'Enter at least one shared answer first', type: 'error' });
    } finally {
      setMerging(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await consensusAPI.finalizeSession(datasetId, sessionId);
      showToast({ title: 'Finalized', description: 'Resolved dataset is ready for export.', type: 'success' });
      onSessionChanged?.();
    } catch (err: any) {
      showToast({ title: 'Finalize failed', description: err?.response?.data?.message || 'Session must be merged first', type: 'error' });
    } finally {
      setFinalizing(false);
    }
  };

  const verification = useMemo(() => isVerificationGrid(grid?.rows || []), [grid]);

  // Verification: a row needs discussion when any reviewer corrected the
  // original or the reviewers disagree — even if they agree with each other.
  const { unresolved, agreed, notReviewed } = useMemo(() => {
    const rows = grid?.rows || [];
    const open = verification
      ? (r: CollabRow) => r.fields.some(needsDiscussion)
      : (r: CollabRow) => r.orderRank < 4;
    const reviewed = (r: CollabRow) => r.fields.some((f) => submittedAnswers(f).length > 0);
    return {
      unresolved: rows.filter(open),
      agreed: rows.filter((r) => !open(r) && (!verification || reviewed(r))),
      notReviewed: verification ? rows.filter((r) => !reviewed(r)).length : 0,
    };
  }, [grid, verification]);

  const answeredCount = useMemo(() => {
    let n = 0;
    for (const r of grid?.rows || []) for (const f of r.fields) if (f.sharedAnswer !== null && f.sharedAnswer !== undefined) n++;
    return n;
  }, [grid]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-fuchsia-600" /></div>;
  }
  if (!grid) {
    return <div className="text-center text-gray-500 py-16">Could not load the collaborative grid.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
        <span className="flex items-center gap-1 text-xs text-gray-600">
          <Users className="h-3.5 w-3.5" /> {grid.rows.length} rows · {answeredCount} final answers set
        </span>
        <span className="text-xs text-gray-400">
          {verification
            ? `${unresolved.length} to discuss · ${agreed.length} kept as consensus by everyone · ${notReviewed} not reviewed yet`
            : `${unresolved.length} need consensus · ${agreed.length} already agreed`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => load()} className="h-7 text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
          {isAdmin && editable && (
            <Button size="sm" onClick={handleMerge} disabled={merging || answeredCount === 0}
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              {merging ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />} Merge into resolved
            </Button>
          )}
          {isAdmin && sessionStatus === 'MERGED' && (
            <Button size="sm" onClick={handleFinalize} disabled={finalizing}
              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white">
              {finalizing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />} Finalize
            </Button>
          )}
        </div>
      </div>

      {!editable && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          This session is <span className="font-semibold">{sessionStatus}</span> — shared answers are locked.
        </div>
      )}

      {/* Needs consensus (unresolved first) */}
      {unresolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{verification ? 'To discuss' : 'Needs consensus'} ({unresolved.length})</h3>
          {unresolved.map((row) => (
            <RowCard key={row.rowIndex} row={row} primaryKeyField={grid.primaryKeyField} disabled={!editable} verification={verification} onSave={handleSave} />
          ))}
        </div>
      )}

      {/* Already agreed / majority — collapsed at the bottom */}
      {agreed.length > 0 && (
        <div className="space-y-3">
          <button onClick={() => setShowAgreed((s) => !s)}
            className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700">
            {showAgreed ? '▾' : '▸'} {verification ? 'Kept as consensus by everyone' : 'Already agreed / majority'} ({agreed.length})
          </button>
          {showAgreed && agreed.map((row) => (
            <RowCard key={row.rowIndex} row={row} primaryKeyField={grid.primaryKeyField} disabled={!editable} verification={verification} onSave={handleSave} />
          ))}
        </div>
      )}
    </div>
  );
}
