'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/sidebar';
import { TopNav } from '@/components/top-nav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { consensusAPI } from '@/lib/api/consensus';
import { datasetsAPI } from '@/lib/api/datasets';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Scale,
  Square,
  CheckSquare,
  Users,
} from 'lucide-react';

const STATUS_BADGE: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  NOT_STARTED: { dot: 'bg-gray-400', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', label: 'Not Started' },
  PARTIAL: { dot: 'bg-yellow-500', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', label: 'Partial' },
  AGREED: { dot: 'bg-blue-500', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Agreed' },
  CONFLICT: { dot: 'bg-red-500', bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Conflict' },
  TIE: { dot: 'bg-fuchsia-500', bg: 'bg-fuchsia-50 border-fuchsia-200', text: 'text-fuchsia-700', label: 'Tie' },
  PENDING_UPDATE: { dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Pending Update' },
  ADMIN_CONFIRMED: { dot: 'bg-green-500', bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Confirmed' },
  OVERRIDDEN: { dot: 'bg-orange-500', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', label: 'Override' },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Pending';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join(', ') : value;
    } catch {
      return value;
    }
  }
  return String(value);
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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const datasetId = params.datasetId as string;

  const [gridData, setGridData] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [startingSession, setStartingSession] = useState(false);

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
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadData();
  }, [authLoading, isAuthenticated, datasetId, page, statusFilter, search]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = window.setInterval(() => loadData(false), 7000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, datasetId, page, statusFilter, search]);

  const stats = useMemo(() => {
    const fieldCounts = progress?.fieldCounts || {};
    const rowCounts = progress?.rowCounts || {};
    return {
      totalRows: progress?.totalRows || gridData?.totalRows || 0,
      agreed: rowCounts.AGREED || 0,
      partial: rowCounts.PARTIAL || 0,
      conflict: rowCounts.CONFLICT || 0,
      tie: rowCounts.TIE || 0,
      notStarted: rowCounts.NOT_STARTED || 0,
      agreedFields: fieldCounts.AGREED || 0,
    };
  }, [gridData, progress]);

  const toggleRow = (rowIndex: number) => {
    const next = new Set(expandedRows);
    if (next.has(rowIndex)) next.delete(rowIndex);
    else next.add(rowIndex);
    setExpandedRows(next);
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
      setExportMenuOpen(false);
      showToast({ title: 'Exported', description: 'Consensus report downloaded.', type: 'success' });
    } catch {
      showToast({ title: 'Export failed', description: 'The report could not be generated.', type: 'error' });
    }
  };

  const handleStartCollaborativeReview = async () => {
    try {
      setStartingSession(true);
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

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopNav />
        <div className="mx-auto max-w-[1500px] space-y-4 p-4 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/dataset/${datasetId}`)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100"><Scale className="h-5 w-5 text-indigo-600" /></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Review Consensus</h1>
                <p className="text-xs text-gray-500">Live aggregation from assigned clone annotations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}><RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} /> Refresh</Button>
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => setExportMenuOpen((open) => !open)} disabled={!gridData?.totalRows}><Download className="mr-1 h-4 w-4" /> Export <ChevronDown className="ml-1 h-3 w-3" /></Button>
                {exportMenuOpen && <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border bg-white py-1 shadow-xl">
                  {['dataset', 'json', 'audit', 'agreement', 'conflict', 'pending'].map((type) => <button key={type} onClick={() => handleExport(type)} className="block w-full px-4 py-2 text-left text-xs capitalize text-gray-700 hover:bg-gray-50">{type} export</button>)}
                </div>}
              </div>
            </div>
          </header>

          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800"><Users className="h-4 w-4 text-indigo-600" /> Annotator Progress</div>
            <div className="grid gap-4 md:grid-cols-3">
              {(progress?.annotators || gridData?.annotators || []).map((annotator: any) => <div key={annotator.annotatorId}>
                <div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium text-gray-700">{annotator.annotatorName}</span><span className="text-gray-500">{annotator.completedRows}/{annotator.assignedRows} · {annotator.completionPercentage}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${annotator.completionPercentage}%` }} /></div>
              </div>)}
              {!((progress?.annotators || gridData?.annotators || []).length) && <p className="text-xs text-gray-500">No annotators assigned.</p>}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <StatCard label="Rows" value={stats.totalRows} tone="border-gray-200 bg-white" />
            <StatCard label="Agreed" value={stats.agreed} tone="border-blue-100 bg-blue-50/40" />
            <StatCard label="Partial" value={stats.partial} tone="border-yellow-100 bg-yellow-50/40" />
            <StatCard label="Conflict" value={stats.conflict} tone="border-red-100 bg-red-50/40" />
            <StatCard label="Tie" value={stats.tie} tone="border-fuchsia-100 bg-fuchsia-50/40" />
            <StatCard label="Not Started" value={stats.notStarted} tone="border-gray-200 bg-gray-50" />
          </section>

          <section className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search rows, questions, answers, annotators..." className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-500" /></div>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-10 rounded-lg border bg-white px-3 text-sm text-gray-700 outline-none focus:border-indigo-500">
              <option value="">All Statuses</option><option value="NOT_STARTED">Not Started</option><option value="PARTIAL">Partial</option><option value="AGREED">Agreed</option><option value="CONFLICT">Conflict</option><option value="TIE">Tie</option>
            </select>
            {selectedRows.size > 0 && <span className="text-xs font-semibold text-indigo-700">{selectedRows.size} selected</span>}
          </section>

          <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
            {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div> : !gridData ? <div className="p-10 text-center text-sm text-red-500">Consensus data could not be loaded.</div> : <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="bg-gray-50"><tr className="border-b text-left text-[10px] uppercase tracking-wide text-gray-500"><th className="w-10 p-3"><button onClick={toggleAll}>{selectedRows.size === (gridData.rows || []).length && gridData.rows.length > 0 ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4" />}</button></th><th className="p-3">Row</th><th className="p-3">Questions</th><th className="p-3">Answers</th><th className="p-3">Winner</th><th className="p-3">Agreement</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                <tbody>{(gridData.rows || []).map((row: any) => {
                  const expanded = expandedRows.has(row.rowIndex);
                  const rowBadge = STATUS_BADGE[row.rowStatus] || STATUS_BADGE.NOT_STARTED;
                  return <Fragment key={row.rowIndex}>
                    <tr key={row.rowIndex} className="border-b hover:bg-gray-50/60"><td className="p-3"><button onClick={() => toggleSelected(row.rowIndex)}>{selectedRows.has(row.rowIndex) ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4 text-gray-400" />}</button></td><td className="p-3 font-semibold text-gray-700">Row {row.rowIndex + 1}</td><td className="max-w-[220px] p-3"><button onClick={() => toggleRow(row.rowIndex)} className="flex items-center gap-1 font-medium text-indigo-700 hover:underline">{expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}{row.fields?.length || 0} questions</button></td><td className="max-w-[360px] p-3"><div className="space-y-1">{row.fields?.slice(0, 3).map((field: any) => <div key={field.fieldName} className="truncate"><span className="font-medium text-gray-500">{field.question || field.fieldName}: </span>{field.annotatorAnswers?.map((answer: any) => `${answer.annotatorName}: ${formatValue(answer.value)}`).join(' · ')}</div>)}{row.fields?.length > 3 && <span className="text-gray-400">+{row.fields.length - 3} more</span>}</div></td><td className="p-3">{row.fields?.map((field: any) => field.winner).filter(Boolean).join(' · ') || 'Pending'}</td><td className="p-3">{row.fields?.map((field: any) => `${field.agreementPercentage}%`).join(' · ') || '0%'}</td><td className="p-3"><span className={cn('inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium', rowBadge.bg, rowBadge.text)}><span className={cn('h-1.5 w-1.5 rounded-full', rowBadge.dot)} />{rowBadge.label}</span></td><td className="p-3"><button onClick={() => toggleRow(row.rowIndex)} className="font-medium text-indigo-600 hover:underline">{expanded ? 'Hide details' : 'View details'}</button></td></tr>
                    {expanded && <tr key={`${row.rowIndex}-details`} className="border-b bg-indigo-50/20"><td colSpan={8} className="p-4"><div className="space-y-4">{row.fields?.map((field: any) => <div key={field.fieldName} className="rounded-lg border bg-white p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><div className="font-semibold text-gray-800">{field.question || field.fieldName}</div><div className="text-[10px] text-gray-400">{field.fieldName}</div></div><span className="text-xs font-medium text-gray-600">{field.status} · {field.agreementPercentage}%</span></div><div className="grid gap-2 md:grid-cols-3">{field.annotatorAnswers?.map((answer: any) => <div key={`${field.fieldName}-${answer.annotatorId}`} className="rounded border bg-gray-50 p-2"><div className="text-[10px] font-semibold text-gray-500">{answer.annotatorName}</div><div className={cn('mt-1 text-sm', answer.submitted ? 'text-gray-900' : 'text-gray-400')}>{formatValue(answer.value)}</div><div className="mt-1 text-[10px] text-gray-400">{answer.submitted ? 'Submitted' : 'Pending'}</div></div>)}</div><div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600"><span>Winner: <strong>{field.winner || 'Pending'}</strong></span><span>Pending: <strong>{field.missingAnnotations?.join(', ') || 'None'}</strong></span><span>Votes: <strong>{field.voteDistribution?.map((entry: any) => `${entry.label} ${entry.votes}`).join(', ') || 'None'}</strong></span></div></div>)}</div></td></tr>}
                  </Fragment>;
                })}{gridData.rows?.length === 0 && <tr><td colSpan={8} className="p-12 text-center italic text-gray-400">No consensus data matches the current filter.</td></tr>}</tbody>
              </table>
            </div>}
          </section>

          <footer className="flex items-center justify-between text-xs text-gray-500"><span>Page {gridData?.currentPage || page} of {gridData?.totalPages || 1} · {gridData?.totalRows || 0} rows</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(gridData?.totalPages || current + 1, current + 1))} disabled={page >= (gridData?.totalPages || 1)}><ChevronRight className="h-4 w-4" /></Button></div></footer>

          <div className="flex justify-end gap-2"><Button variant="outline" onClick={handleRequestReview}>Review Again</Button><Button variant="outline" onClick={handleStartCollaborativeReview} disabled={startingSession || !stats.tie}>{startingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Start Collaborative Review</Button></div>
        </div>
      </main>
    </div>
  );
}
