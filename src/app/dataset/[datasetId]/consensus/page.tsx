'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/sidebar';
import { TopNav } from '@/components/top-nav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { consensusAPI, DatasetReliability } from '@/lib/api/consensus';
import { datasetsAPI, type DatasetResponse } from '@/lib/api/datasets';
import { useReliabilityMetric } from '@/lib/use-reliability-metric';
import { cn } from '@/lib/utils';
import { STATUS_BADGE, buildFieldTree, walkFieldTree, formatValue, getClinicalNotes, type FieldNode } from '@/components/consensus/consensus-utils';
import { ConsensusRowReview, type FinalAnswerHandlers, type RowEdge } from '@/components/consensus/row-review';
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Lock,
  Loader2,
  RefreshCw,
  Search,
  Scale,
  Square,
  CheckSquare,
  Users,
  X,
} from 'lucide-react';

function formatReliability(r: { key: string; score: number | null; percentage: number | null; supported: boolean } | null | undefined): string {
  if (!r || !r.supported || r.score === null) return 'N/A';
  if (r.key === 'PERCENT_AGREEMENT') return `${r.percentage}%`;
  return r.score.toFixed(3);
}

const PENDING_STATUSES = new Set(['NOT_STARTED', 'PENDING', 'not_started', 'pending', '']);

function isPendingStatus(status?: string): boolean {
  return status == null || PENDING_STATUSES.has(status);
}

// QUESTIONS column label: live question count, with dead branches noted apart.
function questionSummary(fields: any[]): string {
  const { active, inactive } = walkFieldTree(buildFieldTree(fields));
  const base = `${active.length} question${active.length === 1 ? '' : 's'}`;
  return inactive.length > 0 ? `${base} · ${inactive.length} hidden` : base;
}

// AGREEMENT column: labelled rollup of the live questions instead of
// "33% · 0% · 0% · 0% …". Scored questions show their %, the rest collapse
// into a single "N pending" line.
function AgreementCell({ fields }: { fields: any[] }) {
  const { active } = walkFieldTree(buildFieldTree(fields));
  if (active.length === 0) return <span className="text-gray-400">—</span>;
  const scored = active.map((a) => a.node).filter((n) => !isPendingStatus(n.status));
  const pending = active.length - scored.length;
  return (
    <div className="space-y-0.5">
      {scored.slice(0, 3).map((n) => (
        <div key={n.fieldName} className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="max-w-[120px] truncate text-gray-500">{n.displayName || n.question || n.fieldName}</span>
          <span className="font-semibold text-gray-800">{n.agreementPercentage}%</span>
          {n.status === 'TIE' && <span className="text-[10px] font-medium text-fuchsia-600">tie</span>}
        </div>
      ))}
      {scored.length > 3 && <div className="text-[10px] text-gray-400">+{scored.length - 3} more scored</div>}
      {scored.length === 0 && <div className="text-gray-400">Not started</div>}
      {pending > 0 && <div className="text-[10px] text-gray-400">{pending} pending</div>}
    </div>
  );
}

// WINNER column: winners of live questions only, labelled by question.
function WinnerCell({ fields }: { fields: any[] }) {
  const { active } = walkFieldTree(buildFieldTree(fields));
  const decided = active.map((a) => a.node).filter((n) => n.winner);
  if (decided.length === 0) return <span className="text-gray-500">Pending</span>;
  return (
    <div className="space-y-0.5">
      {decided.slice(0, 3).map((n) => (
        <div key={n.fieldName} className="whitespace-nowrap">
          <span className="text-gray-400">{n.displayName || n.fieldName}: </span>
          <span className="font-medium text-gray-700">{n.winner}</span>
        </div>
      ))}
      {decided.length > 3 && <span className="text-[10px] text-gray-400">+{decided.length - 3} more</span>}
    </div>
  );
}

// One field card in the expanded detail — indented by nesting depth, with the
// annotator answers, winner, pending list and vote distribution.
function FieldDetailCard({ field, depth, inactive }: { field: FieldNode; depth: number; inactive?: boolean }) {
  return (
    <div
      style={{ marginLeft: depth * 20 }}
      className={cn(
        'rounded-lg border bg-white p-3',
        depth > 0 && 'border-l-2 border-l-indigo-200',
        inactive && 'opacity-60',
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            {depth > 0 && <span className="text-[10px] font-normal text-indigo-400">└ nested</span>}
            {field.question || field.fieldName}
            {inactive && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-400">inactive branch</span>}
          </div>
          <div className="text-[10px] text-gray-400">{field.fieldName}</div>
        </div>
        <span className="text-xs font-medium text-gray-600">{field.status} · {field.agreementPercentage}%</span>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {field.annotatorAnswers?.map((answer: any) => (
          <div key={`${field.fieldName}-${answer.annotatorId}`} className="rounded border bg-gray-50 p-2">
            <div className="text-[10px] font-semibold text-gray-500">{answer.annotatorName}</div>
            <div className={cn('mt-1 text-sm', answer.submitted ? 'text-gray-900' : 'text-gray-400')}>{formatValue(answer.value)}</div>
            <div className="mt-1 text-[10px] text-gray-400">{answer.submitted ? 'Submitted' : 'Pending'}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
        <span>Winner: <strong>{field.winner || 'Pending'}</strong></span>
        <span>Pending: <strong>{field.missingAnnotations?.join(', ') || 'None'}</strong></span>
        <span>Votes: <strong>{field.voteDistribution?.map((entry: any) => `${entry.label} ${entry.votes}`).join(', ') || 'None'}</strong></span>
      </div>
    </div>
  );
}

// Expanded row detail: live questions grouped parent → child, dead conditional
// branches tucked behind a toggle so they stop masquerading as pending work.
function RowDetails({ row }: { row: any }) {
  const [showInactive, setShowInactive] = useState(false);
  const { active, inactive } = walkFieldTree(buildFieldTree(row.fields));
  return (
    <div className="space-y-3">
      {active.map(({ node, depth }) => (
        <FieldDetailCard key={node.fieldName} field={node} depth={depth} />
      ))}
      {inactive.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowInactive((v) => !v)}
            className="text-[11px] font-medium text-gray-400 hover:text-gray-600"
          >
            {showInactive ? 'Hide' : 'Show'} {inactive.length} inactive branch question{inactive.length > 1 ? 's' : ''}
          </button>
          {showInactive && (
            <div className="mt-2 space-y-2">
              {inactive.map((node) => (
                <FieldDetailCard key={node.fieldName} field={node} depth={0} inactive />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClinicalNotes({ rawData }: { rawData: any }) {
  const notes = getClinicalNotes(rawData);
  if (!notes) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Clinical notes</div>
      <div className="max-h-56 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-gray-800">{notes}</div>
    </div>
  );
}

// Toolbar dropdown: checked = the annotator's answers count in the consensus.
function AnnotatorPicker({
  annotators,
  excluded,
  onChange,
}: {
  annotators: { annotatorId: string; annotatorName: string }[];
  excluded: string[];
  onChange: (excluded: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const known = new Set(annotators.map((a) => a.annotatorId));
  const excludedKnown = excluded.filter((id) => known.has(id));
  const included = annotators.length - excludedKnown.length;
  if (!annotators.length) return null;
  const toggle = (id: string) => {
    if (excluded.includes(id)) onChange(excluded.filter((x) => x !== id));
    else if (included > 1) onChange([...excluded, id]);
  };
  return (
    <div className="relative flex items-center gap-2">
      <Button variant="outline" size="sm" className="h-10" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Users className="mr-1 h-4 w-4" /> Annotators <ChevronDown className="ml-1 h-3.5 w-3.5" />
      </Button>
      <span className={cn('text-xs', excludedKnown.length ? 'font-medium text-amber-700' : 'text-gray-500')}>
        {included} of {annotators.length} annotators included
      </span>
      {excluded.length > 0 && (
        <button onClick={() => onChange([])} className="text-xs font-medium text-indigo-600 hover:underline">Reset</button>
      )}
      {open && (
        <>
          <button type="button" aria-label="Close annotator picker" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-white p-2 shadow-lg">
            <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Include in consensus</div>
            <div className="max-h-72 overflow-y-auto">
              {annotators.map((a) => {
                const checked = !excluded.includes(a.annotatorId);
                const locked = checked && included <= 1;
                return (
                  <label key={a.annotatorId} className={cn('flex items-center gap-2 rounded px-1 py-1 text-sm text-gray-700 hover:bg-gray-50', locked && 'opacity-60')}>
                    <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggle(a.annotatorId)} />
                    <span className="truncate">{a.annotatorName || a.annotatorId}</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-1 px-1 text-[10px] text-gray-400">At least one annotator must stay included.</div>
            <div className="mt-0.5 px-1 text-[10px] text-gray-400">Saved for everyone reviewing this dataset.</div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className={cn('rounded-xl border p-4 shadow-sm', tone)}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-xs font-medium text-gray-500">{label}</div>
    </div>
  );
}

export default function ReviewConsensusPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isReviewOnly, user } = useAuth();
  const { showToast } = useToast();
  const datasetId = params.datasetId as string;

  // Reviewers see the consensus and export it; opening review rounds and
  // sessions stays with the people who run the dataset.
  const [dataset, setDataset] = useState<DatasetResponse | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !datasetId) return;
    datasetsAPI.getById(datasetId).then(setDataset).catch(() => setDataset(null));
  }, [isAuthenticated, datasetId]);
  const reviewOnly = isReviewOnly(dataset);

  const { catalog: metricCatalog, metric, setMetric } = useReliabilityMetric();
  const [reliability, setReliability] = useState<DatasetReliability | null>(null);
  const [gridData, setGridData] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reliabilityOpen, setReliabilityOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  // Rows are open by default; this tracks the ones the reviewer collapsed.
  const [collapsedRows, setCollapsedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [startingSession, setStartingSession] = useState(false);
  // Review = one row at a time (source data | answers); List = the card list.
  const [viewMode, setViewMode] = useState<'review' | 'list'>('review');
  const [showSummary, setShowSummary] = useState(false);
  const [reviewRowIndex, setReviewRowIndex] = useState<number | null>(null);
  const [reviewEdge, setReviewEdge] = useState<RowEdge>('first');
  const [resolvedStatus, setResolvedStatus] = useState<{
    available: boolean; status: string | null; resolvedCount: number;
    mergedAt: string | null; finalizedAt: string | null;
  } | null>(null);
  // Annotators left out of the consensus, saved on the server for the whole
  // dataset. Grid and reliability default to it, so the first grid fetch waits
  // for it and the page never shows excluded annotators' answers.
  const [selection, setSelection] = useState<{ datasetId: string; excluded: string[] } | null>(null);
  const selectionLoaded = selection?.datasetId === datasetId;
  const excludedAnnotators = useMemo(() => (selectionLoaded ? selection!.excluded : []), [selectionLoaded, selection]);
  const selectionSaveSeq = useRef(0);
  const canPickAnnotators = !!(user?.canManage || user?.isReviewer);

  useEffect(() => {
    if (!isAuthenticated || !datasetId) return;
    let cancelled = false;
    consensusAPI.getAnnotatorSelection(datasetId)
      .then((res) => { if (!cancelled) setSelection({ datasetId, excluded: res?.excludedAnnotatorIds || [] }); })
      .catch(() => { if (!cancelled) setSelection({ datasetId, excluded: [] }); });
    return () => { cancelled = true; };
  }, [isAuthenticated, datasetId]);

  const setExcludedAnnotators = async (ids: string[]) => {
    const previous = excludedAnnotators;
    const seq = ++selectionSaveSeq.current;
    setSelection({ datasetId, excluded: ids });
    try {
      const saved = await consensusAPI.saveAnnotatorSelection(datasetId, ids);
      if (seq !== selectionSaveSeq.current) return;
      setSelection({ datasetId, excluded: saved?.excludedAnnotatorIds || [] });
      loadData(false);
    } catch (error: any) {
      if (seq !== selectionSaveSeq.current) return;
      setSelection({ datasetId, excluded: previous });
      showToast({
        title: 'Could not update annotators',
        description: error?.response?.data?.message || error?.message || 'The annotator selection could not be saved.',
        type: 'error',
      });
    }
  };

  const loadData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [grid, progressData] = await Promise.all([
        consensusAPI.getConsensusGrid(datasetId, {
          page,
          pageSize,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        consensusAPI.getProgress(datasetId),
      ]);
      setGridData(grid);
      setProgress(progressData);
    } catch {
      setGridData(null);
      showToast({ title: 'Unable to load consensus', description: 'The consensus data could not be loaded.', type: 'error' });
    } finally {
      if (showLoader) setLoading(false);
    }
    loadReliability();
  };

  const loadReliability = async () => {
    if (!metric) return;
    try {
      setReliability(await consensusAPI.getReliability(datasetId, metric));
    } catch {
      setReliability(null);
    }
  };

  const loadResolvedStatus = async () => {
    try {
      setResolvedStatus(await consensusAPI.getResolvedStatus(datasetId));
    } catch {
      setResolvedStatus(null);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!selectionLoaded) return;
    loadData();
    loadResolvedStatus();
  }, [authLoading, isAuthenticated, datasetId, page, statusFilter, search, selectionLoaded]);

  // Refetch field-level reliability when the selected metric changes.
  useEffect(() => {
    if (!isAuthenticated || !metric || !selectionLoaded) return;
    loadReliability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, datasetId, isAuthenticated, selectionLoaded]);

  useEffect(() => {
    if (!isAuthenticated || !selectionLoaded) return;
    const timer = window.setInterval(() => { loadData(false); loadResolvedStatus(); }, 7000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, datasetId, page, statusFilter, search, selectionLoaded]);

  // Every annotator on the dataset, from the unfiltered progress response, so
  // excluded annotators stay listed in the picker.
  const allAnnotators = useMemo(() => {
    const source: any[] = progress?.allAnnotators || progress?.annotators || (excludedAnnotators.length ? [] : gridData?.annotators) || [];
    const byId = new Map<string, { annotatorId: string; annotatorName: string }>();
    source.forEach((a) => {
      if (a?.annotatorId && !byId.has(a.annotatorId)) byId.set(a.annotatorId, { annotatorId: a.annotatorId, annotatorName: a.annotatorName });
    });
    return [...byId.values()];
  }, [progress, gridData, excludedAnnotators.length]);

  const progressAnnotatorCount = (progress?.annotators || gridData?.annotators || []).length;
  const removedAnnotators = useMemo(
    () => allAnnotators.filter((a) => excludedAnnotators.includes(a.annotatorId)),
    [allAnnotators, excludedAnnotators],
  );

  const updateGridField = (rowIndex: number, fieldName: string, patch: Record<string, unknown>) => {
    setGridData((prev: any) => prev && {
      ...prev,
      rows: (prev.rows || []).map((r: any) => r.rowIndex !== rowIndex ? r : {
        ...r,
        fields: (r.fields || []).map((f: any) => (f.fieldName === fieldName ? { ...f, ...patch } : f)),
      }),
    });
  };

  // Mirrors the backend: confirmed when every submitted answer equals the decision.
  const decisionStatus = (field: any, value: string) => {
    const values = new Set(
      (field?.annotatorAnswers || [])
        .filter((a: any) => a.submitted && a.value !== null && a.value !== undefined && String(a.value).trim() !== '')
        .map((a: any) => (typeof a.value === 'string' ? a.value : JSON.stringify(a.value)).trim()),
    );
    return values.size === 1 && values.has(value) ? 'ADMIN_CONFIRMED' : 'OVERRIDDEN';
  };

  const finalAnswers: FinalAnswerHandlers = {
    canDecide: !!(user?.canManage || user?.isReviewer),
    onSave: async (row, fieldName, value) => {
      try {
        await consensusAPI.resolveField(datasetId, row.reviewId, fieldName, value, user?._id || '');
        const field = (row.fields || []).find((f: any) => f.fieldName === fieldName);
        updateGridField(row.rowIndex, fieldName, { finalDecision: value, status: decisionStatus(field, value) });
        return true;
      } catch (error: any) {
        showToast({ title: 'Could not save final answer', description: error?.response?.data?.message || error?.message || 'Save failed.', type: 'error' });
        return false;
      }
    },
    onClear: async (row, fieldName) => {
      try {
        // The backend treats a single space as "no final answer".
        await consensusAPI.resolveField(datasetId, row.reviewId, fieldName, ' ', user?._id || '');
        updateGridField(row.rowIndex, fieldName, { finalDecision: undefined });
        return true;
      } catch (error: any) {
        showToast({ title: 'Could not clear final answer', description: error?.response?.data?.message || error?.message || 'Clear failed.', type: 'error' });
        return false;
      }
    },
    onGenerate: async () => {
      try {
        const result = await consensusAPI.generate(datasetId);
        showToast({ title: 'Consensus generated', description: result?.message || 'Final answers can now be recorded.', type: 'success' });
        await loadData(false);
      } catch (error: any) {
        showToast({ title: 'Could not generate consensus', description: error?.response?.data?.message || error?.message || 'Generate failed.', type: 'error' });
      }
    },
  };

  const stats = useMemo(() => {
    const fieldCounts = progress?.fieldCounts || {};
    const rowCounts = progress?.rowCounts || {};
    return {
      totalRows: progress?.totalRows || gridData?.totalRows || 0,
      // GET /consensus/:id/progress returns flat row counts; rowCounts/fieldCounts
      // are the older shape, kept as a fallback.
      agreed: progress?.agreedRows ?? rowCounts.AGREED ?? 0,
      partial: progress?.partialRows ?? rowCounts.PARTIAL ?? 0,
      conflict: progress?.conflictRows ?? rowCounts.CONFLICT ?? 0,
      tie: progress?.tieRows ?? rowCounts.TIE ?? 0,
      notStarted: progress?.notStartedRows ?? rowCounts.NOT_STARTED ?? 0,
      agreedFields: progress?.suggestedAgreement ?? fieldCounts.AGREED ?? 0,
    };
  }, [gridData, progress]);

  const toggleRow = (rowIndex: number) => {
    const next = new Set(collapsedRows);
    if (next.has(rowIndex)) next.delete(rowIndex);
    else next.add(rowIndex);
    setCollapsedRows(next);
  };

  const setAllRowsCollapsed = (collapsed: boolean) => {
    setCollapsedRows(collapsed ? new Set((gridData?.rows || []).map((row: any) => row.rowIndex)) : new Set());
  };

  const toggleSelected = (rowIndex: number) => {
    const next = new Set(selectedRows);
    if (next.has(rowIndex)) next.delete(rowIndex);
    else next.add(rowIndex);
    setSelectedRows(next);
  };

  const toggleAll = () => {
    const indexes = (gridData?.rows || []).map((row: any) => row.rowIndex);
    setSelectedRows(selectedRows.size === indexes.length ? new Set() : new Set(indexes));
  };

  const handleExport = async (type: string) => {
    try {
      await consensusAPI.exportCsv(datasetId, type);
      showToast({ title: 'Exported', description: 'Pre-consensus report downloaded.', type: 'success' });
    } catch {
      showToast({ title: 'Export failed', description: 'The report could not be generated.', type: 'error' });
    }
  };

  const handleResolvedExport = async (format: 'csv' | 'json') => {
    try {
      await consensusAPI.exportResolvedReport(datasetId, format);
      showToast({ title: 'Exported', description: 'Resolved report downloaded.', type: 'success' });
    } catch (error: any) {
      showToast({
        title: 'Export failed',
        description: error?.response?.data?.message || 'The resolved report could not be generated.',
        type: 'error',
      });
    }
  };

  const handleStartCollaborativeReview = async () => {
    try {
      setStartingSession(true);
      // Resume an in-progress collaborative session instead of creating a new
      // one — so admin and annotators share the same link and answers.
      const existing = await consensusAPI.listSessions(datasetId).catch(() => []);
      const active = (existing || []).find(
        (s: any) => s.reviewMode === 'COLLABORATIVE' && ['CREATED', 'ACTIVE', 'DISCUSSION', 'TIE'].includes(s.status),
      );
      if (active?.shareCode) {
        router.push(`/dataset/${datasetId}/review-session/${active.shareCode}`);
        return;
      }
      const cloneGroup = await datasetsAPI.getCloneGroup(datasetId);
      const participantIds = (cloneGroup?.clones || [])
        .map((clone: any) => clone.assignedAnnotatorId || clone.annotator?._id)
        .filter(Boolean);
      if (!participantIds.length) throw new Error('No assigned annotators found.');
      const snapshot = await consensusAPI.createSnapshot(datasetId);
      const session = await consensusAPI.createReviewSession(datasetId, {
        snapshotId: snapshot._id,
        title: `${cloneGroup?.original?.name || 'Dataset'} - Consensus Review`,
        participantIds,
        fromTiesOnly: false,
      });
      router.push(`/dataset/${datasetId}/review-session/${session.shareCode}`);
    } catch (error: any) {
      showToast({
        title: 'Could not start review',
        description: error?.response?.data?.message || error?.message || 'No tied rows are available.',
        type: 'error',
      });
    } finally {
      setStartingSession(false);
    }
  };

  const handleRequestReview = async () => {
    try {
      const result = await consensusAPI.requestReview(datasetId);
      showToast({ title: 'Review round opened', description: result.message, type: 'success' });
      await loadData(false);
    } catch (error: any) {
      showToast({
        title: 'Could not open review round',
        description: error?.response?.data?.message || 'No consensus rows are available yet.',
        type: 'error',
      });
    }
  };

  // Review view is a full-height workbench; the summary blocks fold away until asked for.
  const reviewFocus = viewMode === 'review';
  const summaryVisible = !reviewFocus || showSummary;

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className={cn('flex-1', reviewFocus ? 'flex min-w-0 flex-col overflow-hidden' : 'overflow-auto')}>
        <TopNav />
        <div className={reviewFocus ? 'flex min-h-0 w-full flex-1 flex-col gap-2 p-2' : 'mx-auto max-w-[1500px] space-y-4 p-4 md:p-6'}>
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/dataset/${datasetId}`)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100"><Scale className="h-5 w-5 text-indigo-600" /></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Review Consensus</h1>
                {!reviewFocus && <p className="text-xs text-gray-500">Live aggregation from assigned clone annotations</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border bg-white p-0.5 text-xs font-medium" role="tablist" aria-label="Consensus view">
              {(['review', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  role="tab"
                  aria-selected={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={cn('rounded-md px-3 py-1', viewMode === mode ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900')}
                >
                  {mode === 'review' ? 'Review' : 'List'}
                </button>
              ))}
            </div>
              {reviewFocus && <Button variant="outline" size="sm" onClick={() => setShowSummary((v) => !v)}>{showSummary ? 'Hide summary' : 'Show summary'}</Button>}
              <Button variant="outline" size="sm" onClick={() => { loadData(); loadResolvedStatus(); }} disabled={loading}><RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} /> Refresh</Button>
              {!reviewOnly && (<><Button variant="outline" onClick={handleRequestReview}>Review Again</Button><Button variant="outline" onClick={handleStartCollaborativeReview} disabled={startingSession || !gridData?.totalRows}>{startingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Start Collaborative Review</Button></>)}
            </div>
          </header>

          {/* Reports — clearly separated pre-consensus vs post-resolution */}
          {summaryVisible && (<>
          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800"><FileText className="h-4 w-4 text-indigo-600" /> Reports</div>
            <div className="grid gap-3 md:grid-cols-2">
              {/* Before resolution */}
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Pre-consensus report</div>
                    <div className="mt-0.5 text-xs text-gray-500">Every annotator&apos;s answers with agreement %, conflicts and ties — the raw input <span className="font-medium">before</span> resolution.</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">LIVE</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" disabled={!gridData?.totalRows} onClick={() => handleExport('dataset')}><Download className="mr-1 h-3.5 w-3.5" /> Full CSV</Button>
                  <Button variant="outline" size="sm" disabled={!gridData?.totalRows} onClick={() => handleExport('json')}>JSON</Button>
                  <Button variant="outline" size="sm" disabled={!gridData?.totalRows} onClick={() => handleExport('conflict')}>Conflicts only</Button>
                </div>
              </div>

              {/* After resolution */}
              <div className={cn('rounded-lg border p-3', resolvedStatus?.available ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Resolved report</div>
                    <div className="mt-0.5 text-xs text-gray-500">The final consensus answers with a <span className="font-medium">before/after</span> comparison showing what changed vs the majority.</div>
                  </div>
                  {resolvedStatus?.available
                    ? <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{resolvedStatus.status}</span>
                    : <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400"><Lock className="h-3 w-3" /> NOT RESOLVED</span>}
                </div>
                {resolvedStatus?.available ? (
                  <>
                    <div className="mt-1.5 text-[11px] text-gray-500">{resolvedStatus.resolvedCount} field(s) resolved{resolvedStatus.finalizedAt ? ' · finalized' : resolvedStatus.mergedAt ? ' · merged' : ''}</div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleResolvedExport('csv')}><Download className="mr-1 h-3.5 w-3.5" /> CSV (with comparison)</Button>
                      <Button variant="outline" size="sm" onClick={() => handleResolvedExport('json')}>JSON</Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-[11px] text-gray-500">Run a collaborative review and <span className="font-semibold text-gray-600">Merge into resolved</span> to generate this report.</div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800"><Users className="h-4 w-4 text-indigo-600" /> Annotator Progress</div>
            <div className="grid gap-4 md:grid-cols-3">
              {(progress?.annotators || gridData?.annotators || []).map((annotator: any) => <div key={annotator.annotatorId}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-gray-700">{annotator.annotatorName}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-gray-500">
                    {annotator.completedRows}/{annotator.assignedRows} · {annotator.completionPercentage}%
                    {canPickAnnotators && (
                      <button
                        type="button"
                        title={progressAnnotatorCount <= 1 ? 'At least one annotator must stay included' : 'Remove from consensus and progress'}
                        aria-label={`Remove ${annotator.annotatorName} from consensus`}
                        disabled={progressAnnotatorCount <= 1}
                        onClick={() => setExcludedAnnotators([...excludedAnnotators, annotator.annotatorId])}
                        className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      ><X className="h-3.5 w-3.5" /></button>
                    )}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${annotator.completionPercentage}%` }} /></div>
              </div>)}
              {!((progress?.annotators || gridData?.annotators || []).length) && <p className="text-xs text-gray-500">No annotators assigned.</p>}
            </div>
            {canPickAnnotators && removedAnnotators.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-gray-500">
                <span>Removed:</span>
                {removedAnnotators.map((a) => (
                  <button
                    key={a.annotatorId}
                    type="button"
                    onClick={() => setExcludedAnnotators(excludedAnnotators.filter((id) => id !== a.annotatorId))}
                    className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-800 hover:bg-amber-100"
                    title="Add back"
                  >{a.annotatorName || a.annotatorId} <span className="text-amber-600">+ add back</span></button>
                ))}
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <StatCard label="Rows" value={stats.totalRows} tone="border-gray-200 bg-white" />
            <StatCard label="Agreed" value={stats.agreed} tone="border-blue-100 bg-blue-50/40" />
            <StatCard label="Partial" value={stats.partial} tone="border-yellow-100 bg-yellow-50/40" />
            <StatCard label="Conflict" value={stats.conflict} tone="border-red-100 bg-red-50/40" />
            <StatCard label="Tie" value={stats.tie} tone="border-fuchsia-100 bg-fuchsia-50/40" />
            <StatCard label="Not Started" value={stats.notStarted} tone="border-gray-200 bg-gray-50" />
          </section>

          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setReliabilityOpen((open) => !open)}
                aria-expanded={reliabilityOpen}
                className="flex items-center gap-2 text-sm font-semibold text-gray-800"
              >
                {reliabilityOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                <Scale className="h-4 w-4 text-indigo-600" /> Inter-rater Reliability
                <span className="text-[11px] font-normal text-gray-400">field-level over {reliability?.totalRows ?? stats.totalRows} rows · not per-row</span>
                {!reliabilityOpen && reliability && (
                  <span className="rounded border border-indigo-100 bg-indigo-50/50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    Overall: {formatReliability(reliability.selectedOverall)}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                <label htmlFor="reliability-metric" className="text-xs text-gray-500">Metric</label>
                <select
                  id="reliability-metric"
                  value={metric}
                  onChange={(event) => setMetric(event.target.value)}
                  disabled={!metricCatalog.length}
                  className="h-9 rounded-lg border bg-white px-3 text-sm text-gray-700 outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  {metricCatalog.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
            </div>
            {!reliabilityOpen ? null : reliability ? (
              <div className="mt-3 flex flex-wrap items-stretch gap-3">
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-indigo-500">Overall · {reliability.selectedOverall?.label}</div>
                  <div className="text-lg font-bold text-gray-900">{formatReliability(reliability.selectedOverall)}</div>
                  <div className="text-[11px] text-gray-500">{reliability.selectedOverall?.interpretation}</div>
                </div>
                {reliability.perField.map((field) => (
                  <div key={field.fieldName} className="rounded-lg border bg-gray-50 px-3 py-2">
                    <div className="text-[11px] font-medium text-gray-600">{field.displayName}</div>
                    <div className="text-base font-semibold text-gray-900">{formatReliability(field.selected)}</div>
                    <div className="text-[10px] text-gray-400">{field.selected?.interpretation}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-xs text-gray-400">Reliability not available yet.</div>
            )}
          </section>

          </>)}

          <section className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search rows, questions, answers, annotators..." className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-500" /></div>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-10 rounded-lg border bg-white px-3 text-sm text-gray-700 outline-none focus:border-indigo-500">
              <option value="">All Statuses</option><option value="NOT_STARTED">Not Started</option><option value="PARTIAL">Partial</option><option value="AGREED">Agreed</option><option value="CONFLICT">Conflict</option><option value="TIE">Tie</option>
            </select>
            {canPickAnnotators && <AnnotatorPicker annotators={allAnnotators} excluded={excludedAnnotators} onChange={setExcludedAnnotators} />}
            {selectedRows.size > 0 && <span className="text-xs font-semibold text-indigo-700">{selectedRows.size} selected</span>}
          </section>

          <section className={reviewFocus ? 'flex min-h-0 flex-1 flex-col gap-2' : 'space-y-3'}>
            {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div> : !gridData ? <div className="p-10 text-center text-sm text-red-500">Consensus data could not be loaded.</div> : viewMode === 'review' ? (
              <ConsensusRowReview
                rows={gridData.rows || []}
                datasetId={datasetId}
                totalRows={gridData.totalRows || 0}
                page={page}
                totalPages={gridData.totalPages || 1}
                pageSize={pageSize}
                selectedRowIndex={reviewRowIndex}
                edge={reviewEdge}
                onSelectRow={(rowIndex) => { setReviewRowIndex(rowIndex); setReviewEdge('first'); }}
                onChangePage={(nextPage, edge) => { setReviewRowIndex(null); setReviewEdge(edge); setPage(nextPage); }}
                finalAnswers={finalAnswers}
                excludedAnnotatorIds={excludedAnnotators}
              />
            ) : <>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <button onClick={toggleAll} className="flex items-center gap-1.5 font-medium hover:text-gray-800">
                  {selectedRows.size === (gridData.rows || []).length && gridData.rows.length > 0 ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4" />} Select all on page
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setAllRowsCollapsed(false)} className="font-medium text-indigo-600 hover:underline">Expand all</button>
                  <button onClick={() => setAllRowsCollapsed(true)} className="font-medium text-indigo-600 hover:underline">Collapse all</button>
                </div>
              </div>
              {(gridData.rows || []).map((row: any) => {
                const expanded = !collapsedRows.has(row.rowIndex);
                const rowBadge = STATUS_BADGE[row.rowStatus] || STATUS_BADGE.NOT_STARTED;
                return (
                  <div key={row.rowIndex} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 bg-gray-50 px-4 py-2 text-xs">
                      <button onClick={() => toggleSelected(row.rowIndex)}>{selectedRows.has(row.rowIndex) ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4 text-gray-400" />}</button>
                      <button onClick={() => toggleRow(row.rowIndex)} aria-expanded={expanded} className="flex items-center gap-1 font-semibold text-gray-800">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}Row {row.rowIndex + 1}
                      </button>
                      <span className="text-gray-500">{questionSummary(row.fields)}</span>
                      <span className={cn('inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium', rowBadge.bg, rowBadge.text)}><span className={cn('h-1.5 w-1.5 rounded-full', rowBadge.dot)} />{rowBadge.label}</span>
                      {!expanded && <div className="ml-auto flex flex-wrap gap-x-6 gap-y-1"><WinnerCell fields={row.fields} /><AgreementCell fields={row.fields} /></div>}
                    </div>
                    {expanded && (
                      <div className="space-y-3 border-t p-4">
                        <ClinicalNotes rawData={row.rowRawData} />
                        <RowDetails row={row} />
                      </div>
                    )}
                  </div>
                );
              })}
              {gridData.rows?.length === 0 && <div className="rounded-xl border bg-white p-12 text-center text-sm italic text-gray-400">No consensus data matches the current filter.</div>}
            </>}
          </section>

          {!reviewFocus && <footer className="flex items-center justify-between text-xs text-gray-500"><span>Page {gridData?.currentPage || page} of {gridData?.totalPages || 1} · {gridData?.totalRows || 0} rows</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(gridData?.totalPages || current + 1, current + 1))} disabled={page >= (gridData?.totalPages || 1)}><ChevronRight className="h-4 w-4" /></Button></div></footer>}

        </div>
      </main>
    </div>
  );
}
