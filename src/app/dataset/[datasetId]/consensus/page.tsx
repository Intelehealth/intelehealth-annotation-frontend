'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { datasetsAPI, DatasetResponse } from '@/lib/api/datasets';
import { fieldSelectionAPI } from '@/lib/api/field-config';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Scale,
  Check,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  enrichConsensusReview,
  computeConsensusStats,
  type ConsensusReview,
  type EnrichedConsensusReview,
  type EnrichedFieldReview,
  type FieldMetaForConsensus,
  type ConsensusStats,
  type ResolveConsensusRequest,
} from '@/types/feature1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fieldTypeBadge(columnType?: string): string {
  if (!columnType) return 'Text';
  const map: Record<string, string> = {
    text: 'Text',
    textarea: 'Long Text',
    number: 'Number',
    select: 'Select',
    radio: 'Radio',
    checkbox: 'Checkbox',
    multiselect: 'Multiselect',
    selectrange: 'Range',
    rating: 'Rating',
    date: 'Date',
  };
  return map[columnType] || columnType;
}

/** Returns true for types where freeform custom entry should be blocked */
function isClosedType(type?: string): boolean {
  return ['select', 'radio', 'checkbox', 'selectrange'].includes(type ?? '');
}

// ─── Sub-component: single stat card ─────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn('p-4 rounded-xl border border-gray-200 text-center', bg)}>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Sub-component: single field row within a review ─────────────────────────

interface FieldRowProps {
  fieldReview: EnrichedFieldReview;
  taskAnnotations: Array<{ label: string; annotations: Record<string, any> }>;
  onResolve: (fieldName: string, decision: string) => Promise<void>;
  isSaving: boolean;
}

function FieldRow({ fieldReview, taskAnnotations, onResolve, isSaving }: FieldRowProps) {
  const meta: FieldMetaForConsensus | undefined = fieldReview.fieldMeta;
  const colType = meta?.columnType ?? '';
  const closed = isClosedType(colType);

  const [selectedDecision, setSelectedDecision] = useState<string>(
    fieldReview.finalDecision ?? '',
  );
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const customRef = useRef<HTMLInputElement>(null);

  const handleOptionClick = (value: string) => {
    setSelectedDecision(value);
    setShowCustom(false);
  };

  const handleConfirm = async () => {
    const decision = showCustom ? customInput.trim() : selectedDecision;
    if (!decision) return;
    await onResolve(fieldReview.fieldName, decision);
    setSelectedDecision(decision);
    setShowCustom(false);
    setCustomInput('');
  };

  // Rating validation for custom entry
  const ratingValid = (): boolean => {
    if (colType !== 'rating') return true;
    const n = Number(customInput);
    if (isNaN(n)) return false;
    const max = meta?.maxRating ?? 5;
    if (n < 1 || n > max) return false;
    if (!meta?.allowHalf && !Number.isInteger(n)) return false;
    return true;
  };

  const canConfirm =
    !fieldReview.isResolved &&
    !isSaving &&
    ((!showCustom && selectedDecision !== '') ||
      (showCustom && customInput.trim() !== '' && (colType !== 'rating' || ratingValid())));

  return (
    <div
      className={cn(
        'border rounded-lg p-3 space-y-2',
        fieldReview.isAgreement
          ? 'border-green-200 bg-green-50/30'
          : fieldReview.isResolved
          ? 'border-blue-200 bg-blue-50/20'
          : 'border-amber-200 bg-amber-50/20',
      )}
    >
      {/* Field header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {fieldReview.isAgreement ? (
            <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
          ) : fieldReview.isResolved ? (
            <CheckCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold text-gray-900 font-mono truncate">
            {fieldReview.fieldName}
          </span>
          {/* Field metadata pill */}
          {meta?.columnType && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 flex-shrink-0">
              <Tag className="h-2.5 w-2.5" />
              {fieldTypeBadge(meta.columnType)}
              {meta.isRequired && <span className="text-red-400">·required</span>}
            </span>
          )}
        </div>
        <div className="flex-shrink-0">
          {fieldReview.isAgreement && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Agreed
            </span>
          )}
          {!fieldReview.isAgreement && fieldReview.isResolved && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              Resolved
            </span>
          )}
          {!fieldReview.isAgreement && !fieldReview.isResolved && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              Needs review
            </span>
          )}
        </div>
      </div>

      {/* Annotator answers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {taskAnnotations.map((ann, i) => {
          const val = ann.annotations?.[fieldReview.fieldName];
          const rawVal =
            val === undefined || val === null || String(val).trim() === ''
              ? '-'
              : String(val).trim();
          const displayVal = rawVal === '-' ? '(empty)' : rawVal;
          const isMajority = rawVal === fieldReview.majorityValue;
          const isFinalMatch =
            fieldReview.isResolved && rawVal === fieldReview.finalDecision;

          return (
            <div
              key={i}
              className={cn(
                'p-2 rounded-md border text-xs',
                isFinalMatch
                  ? 'bg-blue-50 border-blue-200'
                  : isMajority && !fieldReview.isAgreement
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-white border-gray-200',
              )}
            >
              <p className="font-medium text-gray-400 mb-0.5">
                {ann.label}
                {isMajority && !fieldReview.isAgreement && (
                  <span className="ml-1 text-amber-600">(majority)</span>
                )}
              </p>
              <p
                className={cn(
                  'font-semibold break-words',
                  rawVal === '-' ? 'text-gray-400 italic' : 'text-gray-900',
                )}
              >
                {displayVal}
              </p>
            </div>
          );
        })}
      </div>

      {/* No majority notice */}
      {!fieldReview.isAgreement && !fieldReview.isResolved && fieldReview.majorityValue === null && taskAnnotations.length > 2 && (
        <p className="text-xs text-gray-400 italic">No clear majority — please select manually.</p>
      )}

      {/* Resolved decision display */}
      {fieldReview.isResolved && !fieldReview.isAgreement && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <CheckCircle className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-blue-700 font-medium">Final decision</p>
            <p className="text-sm font-semibold text-blue-900">{fieldReview.finalDecision}</p>
          </div>
        </div>
      )}

      {/* Resolution controls */}
      {!fieldReview.isAgreement && !fieldReview.isResolved && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600">Select the correct value:</p>

          <div className="flex flex-wrap gap-1.5">
            {/* --- closed types: only known values as buttons --- */}
            {colType === 'checkbox' && (
              <>
                {['true', 'false'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleOptionClick(v)}
                    disabled={isSaving}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                      selectedDecision === v && !showCustom
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </>
            )}

            {(colType === 'select' || colType === 'radio' || colType === 'selectrange') &&
              (meta?.options ?? []).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleOptionClick(value)}
                  disabled={isSaving}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                    selectedDecision === value && !showCustom
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50',
                  )}
                >
                  {value}
                </button>
              ))}

            {/* --- open types: show unique values + custom --- */}
            {!closed && fieldReview.uniqueValues
              .filter((v) => v !== '-')
              .map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleOptionClick(value)}
                  disabled={isSaving}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                    selectedDecision === value && !showCustom
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50',
                  )}
                >
                  {value}
                </button>
              ))}

            {/* Custom input toggler — hidden for closed types */}
            {!closed && (
              <button
                type="button"
                onClick={() => {
                  setShowCustom(true);
                  setSelectedDecision('');
                  setTimeout(() => customRef.current?.focus(), 50);
                }}
                disabled={isSaving}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                  showCustom
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-500 border-dashed border-gray-300 hover:border-purple-300',
                )}
              >
                + Custom
              </button>
            )}
          </div>

          {/* Custom input — type-specific */}
          {showCustom && (
            <div className="space-y-1">
              {colType === 'date' ? (
                <input
                  ref={customRef as any}
                  type="date"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  min={meta?.minDate}
                  max={meta?.maxDate}
                  className="h-8 px-2.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : colType === 'number' ? (
                <input
                  ref={customRef as any}
                  type="number"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  min={meta?.min}
                  max={meta?.max}
                  step={meta?.step}
                  placeholder={`Enter number${meta?.min !== undefined ? ` (min ${meta.min})` : ''}${meta?.max !== undefined ? ` (max ${meta.max})` : ''}`}
                  className="w-full h-8 px-2.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && canConfirm && handleConfirm()}
                />
              ) : colType === 'rating' ? (
                <div className="space-y-0.5">
                  <input
                    ref={customRef as any}
                    type="number"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    min={1}
                    max={meta?.maxRating ?? 5}
                    step={meta?.allowHalf ? 0.5 : 1}
                    placeholder={`Rating 1–${meta?.maxRating ?? 5}${meta?.allowHalf ? ' (halves ok)' : ' (whole numbers)'}`}
                    className={cn(
                      'w-full h-8 px-2.5 text-xs border rounded-md focus:outline-none focus:ring-2 focus:border-transparent',
                      !ratingValid() && customInput !== ''
                        ? 'border-red-300 focus:ring-red-400'
                        : 'border-gray-200 focus:ring-blue-500',
                    )}
                    onKeyDown={(e) => e.key === 'Enter' && canConfirm && handleConfirm()}
                  />
                  {!ratingValid() && customInput !== '' && (
                    <p className="text-[10px] text-red-500">
                      Must be 1–{meta?.maxRating ?? 5}{!meta?.allowHalf ? ', whole number' : ''}
                    </p>
                  )}
                </div>
              ) : colType === 'multiselect' ? (
                <div className="flex flex-wrap gap-1.5">
                  {(meta?.options ?? []).map((opt) => {
                    const selected = customInput.split(',').map(p => p.trim()).includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const parts = customInput
                            ? customInput.split(',').map(p => p.trim()).filter(Boolean)
                            : [];
                          const next = selected
                            ? parts.filter(p => p !== opt)
                            : [...parts, opt];
                          setCustomInput(next.join(','));
                        }}
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium border transition-all',
                          selected
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300',
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  ref={customRef as any}
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Type the correct value..."
                  className="w-full h-8 px-2.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && canConfirm && handleConfirm()}
                />
              )}
            </div>
          )}

          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            size="sm"
            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Confirm
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: single review row ────────────────────────────────────────

interface ReviewRowProps {
  review: EnrichedConsensusReview;
  onResolveField: (reviewId: string, fieldName: string, decision: string) => Promise<void>;
  savingKey: string | null;
}

function ReviewRow({ review, onResolveField, savingKey }: ReviewRowProps) {
  const [expanded, setExpanded] = useState(!review.isAgreement);

  const disagreedFields = review.fieldReviews.filter((fr) => !fr.isAgreement);
  const agreedFields = review.fieldReviews.filter((fr) => fr.isAgreement);
  const pendingCount = disagreedFields.filter((fr) => !fr.isResolved).length;
  const resolvedCount = disagreedFields.filter((fr) => fr.isResolved).length;

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden transition-all',
        review.isAgreement
          ? 'border-green-200 bg-green-50/20'
          : review.isResolved
          ? 'border-blue-200 bg-blue-50/10'
          : 'border-amber-200 bg-amber-50/10',
      )}
    >
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          {review.isAgreement ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : review.isResolved ? (
            <CheckCircle className="h-4 w-4 text-blue-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-sm font-semibold text-gray-900">
            Row {review.rowIndex + 1}
          </span>

          {review.isAgreement && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              All agreed
            </span>
          )}
          {!review.isAgreement && review.isResolved && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              Resolved
            </span>
          )}
          {!review.isAgreement && !review.isResolved && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              {pendingCount} field{pendingCount !== 1 ? 's' : ''} need review
            </span>
          )}
          {!review.isAgreement && resolvedCount > 0 && !review.isResolved && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {resolvedCount}/{disagreedFields.length} resolved
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
          <div className="pt-3 space-y-2">
            {disagreedFields.map((fr) => (
              <FieldRow
                key={fr.fieldName}
                fieldReview={fr}
                taskAnnotations={review.taskAnnotations}
                onResolve={(fieldName, decision) =>
                  onResolveField(review._id, fieldName, decision)
                }
                isSaving={savingKey === `${review._id}__${fr.fieldName}`}
              />
            ))}

            {agreedFields.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-3">
                  Agreed fields ({agreedFields.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {agreedFields.map((fr) => (
                    <FieldRow
                      key={fr.fieldName}
                      fieldReview={fr}
                      taskAnnotations={review.taskAnnotations}
                      onResolve={async () => {}}
                      isSaving={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded-lg w-20" />
        <div className="h-8 bg-gray-200 rounded-lg w-20" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsensusPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const datasetId = params.datasetId as string;

  const [dataset, setDataset] = useState<DatasetResponse | null>(null);
  const [reviews, setReviews] = useState<EnrichedConsensusReview[]>([]);
  const [stats, setStats] = useState<ConsensusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showOnlyDisagreed, setShowOnlyDisagreed] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Auth + role guard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role?.toUpperCase() !== 'ADMIN') { router.push('/dashboard'); return; }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role?.toUpperCase() === 'ADMIN') {
      loadData();
    }
  }, [authLoading, isAuthenticated, user, datasetId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [datasetData, rawReviews, expandedResult] = await Promise.all([
        datasetsAPI.getById(datasetId),
        datasetsAPI.getConsensusReviews(datasetId, false),
        fieldSelectionAPI.getExpandedFields(datasetId).catch(() => null),
      ]);

      setDataset(datasetData);

      // expandedResult.expandedFields or expandedResult itself depending on API shape
      const expandedFields: any[] | undefined =
        expandedResult?.expandedFields ?? (Array.isArray(expandedResult) ? expandedResult : undefined);

      const enriched = rawReviews.map((r) => enrichConsensusReview(r, expandedFields));
      setReviews(enriched);
      setStats(computeConsensusStats(enriched));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load consensus reviews.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveField = async (
    reviewId: string,
    fieldName: string,
    decision: string,
  ) => {
    if (!user) return;
    const key = `${reviewId}__${fieldName}`;
    try {
      setSavingKey(key);
      const updated = await datasetsAPI.resolveConsensus(datasetId, reviewId, {
        fieldName,
        finalDecision: decision,
        resolvedBy: user._id,
      } satisfies ResolveConsensusRequest);

      // Re-enrich with same field metadata
      const expandedResult = await fieldSelectionAPI.getExpandedFields(datasetId).catch(() => null);
      const expandedFields: any[] | undefined =
        expandedResult?.expandedFields ?? (Array.isArray(expandedResult) ? expandedResult : undefined);

      setReviews((prev) => {
        const next = prev.map((r) =>
          r._id === reviewId ? enrichConsensusReview(updated, expandedFields) : r,
        );
        setStats(computeConsensusStats(next));
        return next;
      });

      showToast({
        title: 'Field resolved',
        description: `"${fieldName}" on Row ${updated.rowIndex + 1} set to "${decision}".`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to save decision.',
        type: 'error',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleExportCsv = async (type: 'audit' | 'dataset') => {
    try {
      setIsExporting(true);
      await datasetsAPI.exportConsensusCsv(datasetId, type);
      showToast({
        title: 'CSV downloaded',
        description: `${type === 'audit' ? 'Audit' : 'Final Dataset'} CSV saved to your downloads.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({ title: 'Export failed', description: err?.message || 'Could not export CSV.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const disagreed = reviews.filter((r) => !r.isAgreement);
  const displayedReviews = showOnlyDisagreed ? disagreed : reviews;
  const allResolved = disagreed.length > 0 && disagreed.every((r) => r.isResolved);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar forceCollapsed />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-6" />
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
            {[1, 2, 3].map((n) => <SkeletonRow key={n} />)}
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') return null;

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar forceCollapsed />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-gray-700 mb-4 text-sm">{error}</p>
            <Button onClick={loadData} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar forceCollapsed />

      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-4xl mx-auto">

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dataset/${datasetId}`)}
            className="mb-5 text-gray-500 hover:text-gray-700 -ml-1"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to dataset
          </Button>

          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Scale className="h-5 w-5 text-blue-600" />
                <h1 className="text-2xl font-semibold text-gray-900">Consensus Review</h1>
              </div>
              <p className="text-gray-500 text-sm">
                {dataset?.name} — resolve annotation disagreements field by field
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData} className="text-gray-500">
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Refresh
              </Button>
              {reviews.length > 0 && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleExportCsv('audit')}
                    disabled={isExporting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1.5" />
                    )}
                    Export Audit CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExportCsv('dataset')}
                    disabled={isExporting}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1.5" />
                    )}
                    Export Dataset CSV
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard label="Total rows" value={stats.total} color="text-gray-900" bg="bg-white" />
              <StatCard label="Agreed" value={stats.agreed} color="text-green-700" bg="bg-green-50" />
              <StatCard label="Disagreed" value={stats.disagreed} color="text-amber-700" bg="bg-amber-50" />
              <StatCard label="Pending" value={stats.pending} color="text-red-700" bg="bg-red-50" />
            </div>
          )}

          {/* Progress bar */}
          {stats && stats.disagreed > 0 && (
            <div className="mb-5">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Resolution progress</span>
                <span>{stats.resolved} / {stats.disagreed} rows resolved</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.disagreed > 0 ? (stats.resolved / stats.disagreed) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Filter toggle */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setShowOnlyDisagreed(true)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                  showOnlyDisagreed
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300',
                )}
              >
                Disagreements ({disagreed.length})
              </button>
              <button
                type="button"
                onClick={() => setShowOnlyDisagreed(false)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                  !showOnlyDisagreed
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300',
                )}
              >
                All rows ({reviews.length})
              </button>
            </div>
          )}

          {/* Empty — no data yet */}
          {reviews.length === 0 && (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-blue-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No consensus data yet</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Click <strong>Generate Consensus</strong> in the dataset sidebar after
                all annotators have completed their tasks.
              </p>
            </div>
          )}

          {/* Empty — all agreed */}
          {reviews.length > 0 && disagreed.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <CheckCircle className="h-14 w-14 text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">All annotators agreed!</h3>
              <p className="text-sm text-gray-500">
                There are no field-level disagreements to resolve for this dataset.
              </p>
            </div>
          )}

          {/* Review list */}
          {displayedReviews.length > 0 && (
            <div className="space-y-4">
              {displayedReviews.map((review) => (
                <ReviewRow
                  key={review._id}
                  review={review}
                  onResolveField={handleResolveField}
                  savingKey={savingKey}
                />
              ))}
            </div>
          )}

          {/* All resolved banner */}
          {allResolved && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">All disagreements resolved!</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Every field in every disagreed row now has a final decision. Download
                  the CSV to export the resolved dataset.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}