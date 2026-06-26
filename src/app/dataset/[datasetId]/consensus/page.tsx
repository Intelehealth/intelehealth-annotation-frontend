'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { consensusAPI } from '@/lib/api/consensus';
import {
  ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle,
  Users, Scale, RotateCcw, Download, Search, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200/80 text-center shadow-sm bg-white">
      <p className={cn('text-2xl font-bold font-mono', color)}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
    </div>
  );
}

function getStatusBadge(status: string): { bg: string; label: string; border: string } {
  const map: Record<string, { bg: string; label: string; border: string }> = {
    AGREE: { bg: 'bg-green-50 text-green-700 border-green-200', label: 'Agreed', border: 'border-l-4 border-l-green-500' },
    CONFLICT: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Conflict', border: 'border-l-4 border-l-red-500' },
    PARTIAL: { bg: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Partial', border: 'border-l-4 border-l-yellow-500' },
    NOT_ANNOTATED: { bg: 'bg-gray-50 text-gray-400 border-gray-200', label: 'Unannotated', border: 'border-l-4 border-l-gray-300' },
  };
  return map[status] || map.NOT_ANNOTATED;
}

function computeReviewStats(reviews: any[]) {
  let agreed = 0, disagreed = 0, resolved = 0;
  for (const r of reviews) {
    if (r.isAgreement) agreed++; else disagreed++;
    const fr = r.fieldReviews || [];
    if (fr.some((f: any) => f.finalDecision)) resolved++;
  }
  return { total: reviews.length, agreed, disagreed, resolved, pending: disagreed - resolved };
}

export default function ConsensusPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const datasetId = params.datasetId as string;

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role?.toUpperCase() !== 'ADMIN') { router.push('/dashboard'); return; }
    loadReviews();
  }, [authLoading, isAuthenticated, user, datasetId]);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await consensusAPI.getReviews(datasetId);
      setReviews(data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load consensus reviews');
    } finally {
      setLoading(false);
    }
  }, [datasetId]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await consensusAPI.generate(datasetId);
      showToast({
        title: 'Consensus generated!',
        description: `${result.reviewsCreated} rows compared.`,
        type: 'success',
      });
      await loadReviews();
    } catch (err: any) {
      showToast({
        title: 'Error',
        description: err?.response?.data?.message || err?.message || 'Failed to generate consensus',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResolve = async (reviewId: string, fieldName: string, decision: string) => {
    if (!user) return;
    const key = `${reviewId}__${fieldName}`;
    try {
      setSavingKey(key);
      const updated = await consensusAPI.resolveField(datasetId, reviewId, fieldName, decision, user._id);
      setReviews((prev) => prev.map((r) => (r._id === reviewId ? updated : r)));
    } catch (err: any) {
      showToast({ title: 'Error', description: err?.response?.data?.message || 'Failed to save', type: 'error' });
    } finally {
      setSavingKey(null);
    }
  };

  const handleExport = async (type: 'audit' | 'dataset') => {
    try {
      await consensusAPI.exportCsv(datasetId, type);
      showToast({ title: 'Exported', description: `CSV downloaded successfully.`, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Export failed', description: err?.message || 'Could not export CSV', type: 'error' });
    }
  };

  // Compute stats from reviews
  const stats = computeReviewStats(reviews);

  // Filter reviews
  let filtered = [...reviews];
  if (statusFilter === 'agreed') filtered = filtered.filter((r) => r.isAgreement);
  else if (statusFilter === 'conflict') filtered = filtered.filter((r) => !r.isAgreement);
  else if (statusFilter === 'resolved') filtered = filtered.filter((r) => (r.fieldReviews || []).some((f: any) => f.finalDecision));
  else if (statusFilter === 'unresolved') filtered = filtered.filter((r) => (r.fieldReviews || []).every((f: any) => !f.finalDecision));

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((r) => {
      const rowText = JSON.stringify(r.rowRawData || {}).toLowerCase();
      return rowText.includes(q) || String(r.rowIndex + 1).includes(q);
    });
  }

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!isAuthenticated || user?.role?.toUpperCase() !== 'ADMIN') return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/dataset/${datasetId}`)} className="text-gray-500">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Scale className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-950">Consensus Review</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={loadReviews} variant="outline" disabled={loading}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleGenerate} disabled={isGenerating || loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Scale className="h-4 w-4 mr-1" />}
                Generate
              </Button>
              {reviews.length > 0 && (
                <>
                  <Button size="sm" onClick={() => handleExport('audit')} variant="outline">
                    <Download className="h-4 w-4 mr-1" /> Audit CSV
                  </Button>
                  <Button size="sm" onClick={() => handleExport('dataset')} className="bg-green-600 hover:bg-green-700 text-white">
                    <Download className="h-4 w-4 mr-1" /> Dataset CSV
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-red-200 rounded-2xl shadow-sm">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Failed to load</h3>
              <p className="text-gray-500 mb-4 text-sm">{error}</p>
              <Button onClick={loadReviews} className="bg-blue-600 text-white">Retry</Button>
            </div>
          )}

          {/* Loading */}
          {loading && !error && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                {[1,2,3,4,5].map(n => <div key={n} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
              </div>
              <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          )}

          {/* Stats */}
          {!loading && !error && reviews.length > 0 && (
            <div className="grid grid-cols-5 gap-3">
              <StatCard label="Total Rows" value={stats.total} color="text-gray-900" />
              <StatCard label="Agreed" value={stats.agreed} color="text-green-600" />
              <StatCard label="Conflicts" value={stats.disagreed} color="text-red-600" />
              <StatCard label="Resolved" value={stats.resolved} color="text-blue-600" />
              <StatCard label="Pending" value={stats.pending} color="text-amber-600" />
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && reviews.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-gray-200 rounded-2xl shadow-sm">
              <Users className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No consensus reviews</h3>
              <p className="text-sm text-gray-500 max-w-md mb-6">
                Click <strong>Generate</strong> to compare annotator answers and create consensus reviews.
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Scale className="h-4 w-4 mr-1" />}
                Generate Consensus
              </Button>
            </div>
          )}

          {/* Filters */}
          {!loading && !error && reviews.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text" placeholder="Search rows..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 border border-gray-200 rounded-lg text-sm w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              {['all','agreed','conflict','resolved','unresolved'].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  )}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Spreadsheet Table */}
          {!loading && !error && filtered.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 text-center w-16">Row</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 min-w-[200px]">Original Data</th>
                      {reviews[0]?.taskAnnotations?.map((_: any, i: number) => (
                        <th key={i} className="px-4 py-3 w-36">Annotator {i + 1}</th>
                      ))}
                      <th className="px-4 py-3 w-48">Admin Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((review) => {
                      const fieldReviews = review.fieldReviews || [];
                      const taskAnnotations = review.taskAnnotations || [];
                      const firstFieldReview = fieldReviews[0] || {};
                      const status = review.isAgreement ? 'AGREE' : 'CONFLICT';
                      const badge = getStatusBadge(status);

                      return (
                        <tr key={review._id} className={cn('hover:bg-gray-50 transition-colors', badge.border)}>
                          <td className="px-4 py-3 text-center font-mono text-gray-500">{review.rowIndex + 1}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', badge.bg)}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                            {JSON.stringify(review.rowRawData || {}).slice(0, 100)}
                          </td>
                          {taskAnnotations.map((ta: any, i: number) => (
                            <td key={i} className="px-4 py-3 text-xs text-gray-600">
                              {fieldReviews.map((fr: any) => (
                                <div key={fr.fieldName} className="truncate max-w-[120px]">
                                  <span className="text-gray-400">{fr.fieldName}: </span>
                                  {ta.annotations?.[fr.fieldName] || '-'}
                                </div>
                              ))}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <select
                              value={firstFieldReview.finalDecision || ''}
                              onChange={(e) => handleResolve(review._id, firstFieldReview.fieldName || '', e.target.value)}
                              disabled={savingKey === `${review._id}__${firstFieldReview.fieldName || ''}`}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-full focus:border-blue-500 outline-none"
                            >
                              <option value="">Pending...</option>
                              {taskAnnotations.map((ta: any, i: number) => (
                                <option key={i} value={`Annotator ${i + 1}`}>
                                  Annotator {i + 1}
                                </option>
                              ))}
                              <option value="Neutral">Neutral</option>
                              <option value="Custom">Custom...</option>
                            </select>
                            {firstFieldReview.finalDecision && firstFieldReview.finalDecision !== 'Custom' && (
                              <span className="text-[10px] text-green-600 font-semibold mt-1 block">✓ Saved</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No matches */}
          {!loading && !error && reviews.length > 0 && filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2" />
              <p>No reviews match your filters</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}