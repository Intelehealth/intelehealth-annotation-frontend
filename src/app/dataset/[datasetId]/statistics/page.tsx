'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { consensusAPI } from '@/lib/api/consensus';
import { TopNav } from '@/components/top-nav';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, BarChart3, Users, List, Clock, GitCompare, Activity, FileText, Settings, Download, RefreshCw, RotateCcw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const KPI_CARD_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'bg-green-100 text-green-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'bg-red-100 text-red-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'bg-amber-100 text-amber-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'bg-blue-100 text-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'bg-purple-100 text-purple-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'bg-indigo-100 text-indigo-600' },
};

export default function StatisticsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const datasetId = params.datasetId as string;
  const { showToast } = useToast();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!datasetId) return;
    consensusAPI.listSessions(datasetId).then((data) => {
      setSessions(data || []);
      if (data?.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0]._id);
      }
    }).catch(() => {});
  }, [datasetId]);

  const fetchStats = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await consensusAPI.getStatistics(sessionId);
      setStats(data);
    } catch (err: any) {
      showToast({ title: 'Error', description: err?.response?.data?.message || 'Failed to load statistics', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedSessionId) fetchStats(selectedSessionId);
  }, [selectedSessionId, fetchStats]);

  const handleCompute = async () => {
    if (!selectedSessionId) return;
    setComputing(true);
    try {
      const data = await consensusAPI.computeStatistics(selectedSessionId);
      setStats(data);
      showToast({ title: 'Statistics Computed', description: 'Latest statistics are now available.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err?.response?.data?.message || 'Failed to compute statistics', type: 'error' });
    } finally {
      setComputing(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!selectedSessionId) return;
    try {
      const resp = await consensusAPI.exportReport(selectedSessionId, format);
      const blob = new Blob([resp.data], { type: resp.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consensus-statistics-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast({ title: 'Export Error', description: 'Failed to export statistics.', type: 'error' });
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const overview = stats?.overview || {};
  const kpis = stats?.kpis || [];
  const annotators = stats?.annotators || [];
  const fields = stats?.fields || [];
  const timeline = stats?.timeline || [];
  const comparison = stats?.comparison || [];
  const agreement = stats?.agreement || {};
  const health = stats?.health || {};

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar className="hidden lg:flex" />
      <div className="flex-1 flex flex-col overflow-auto">
        <TopNav />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Consensus Statistics</h1>
                <p className="text-xs text-gray-500">Dataset: {datasetId?.slice(-8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="h-8 px-2 border border-gray-200 rounded-lg text-xs bg-white"
              >
                <option value="">Select session...</option>
                {sessions.map((s: any) => (
                  <option key={s._id} value={s._id}>{s.title || `Session ${s._id?.slice(-6)}`}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={() => selectedSessionId && fetchStats(selectedSessionId)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
              <Button size="sm" onClick={handleCompute} disabled={computing || !selectedSessionId}>
                {computing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                Compute
              </Button>
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Export
                </Button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
              <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          )}

          {/* Empty State */}
          {!loading && !stats && (
            <div className="flex flex-col items-center justify-center py-20">
              <BarChart3 className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-semibold text-gray-500">No Statistics Available</h3>
              <p className="text-sm text-gray-400 mb-4">Select a session and click Compute to generate statistics.</p>
              <Button onClick={handleCompute} disabled={!selectedSessionId}>Compute Statistics</Button>
            </div>
          )}

          {/* Error State */}
          {!loading && stats?.error && (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="h-12 w-12 text-red-300 mb-3" />
              <h3 className="text-lg font-semibold text-red-500">Failed to Load Statistics</h3>
              <p className="text-sm text-gray-400 mb-4">{stats.error}</p>
              <Button onClick={() => selectedSessionId && fetchStats(selectedSessionId)}>Retry</Button>
            </div>
          )}

          {/* Statistics Content */}
          {!loading && stats && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {kpis.map((kpi: any) => {
                  const style = KPI_CARD_STYLES[kpi.color] || KPI_CARD_STYLES.blue;
                  return (
                    <div key={kpi.id} className={`${style.bg} ${style.border} border rounded-xl p-3 shadow-sm`}>
                      <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
                      <p className={`text-2xl font-bold ${style.text} mt-1`}>{kpi.value}</p>
                      {kpi.trend && (
                        <span className={`text-xs ${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-400'}`}>
                          {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'} {kpi.change ?? ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Card className="col-span-2">
                  <CardHeader><CardTitle className="text-sm">Agreement Trend</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-32 flex items-center justify-center text-gray-400 text-xs">
                      Chart data available when multiple rounds are completed
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Health Score</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center">
                      <div className="text-4xl font-bold text-indigo-600">{health.score ?? '-'}</div>
                      <span className="text-xs text-gray-500 mt-1">{health.interpretation ?? 'N/A'}</span>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, health.score ?? 0)}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex-wrap">
                  <TabsTrigger value="overview"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Overview</TabsTrigger>
                  <TabsTrigger value="annotators"><Users className="h-3.5 w-3.5 mr-1" /> Annotators</TabsTrigger>
                  <TabsTrigger value="fields"><List className="h-3.5 w-3.5 mr-1" /> Fields</TabsTrigger>
                  <TabsTrigger value="timeline"><Clock className="h-3.5 w-3.5 mr-1" /> Timeline</TabsTrigger>
                  <TabsTrigger value="comparison"><GitCompare className="h-3.5 w-3.5 mr-1" /> Comparison</TabsTrigger>
                  <TabsTrigger value="agreement"><Activity className="h-3.5 w-3.5 mr-1" /> Agreement</TabsTrigger>
                  <TabsTrigger value="reports"><FileText className="h-3.5 w-3.5 mr-1" /> Reports</TabsTrigger>
                  <TabsTrigger value="configuration"><Settings className="h-3.5 w-3.5 mr-1" /> Configuration</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-3">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {[
                          { label: 'Total Rows', value: overview.totalRows },
                          { label: 'Agreed', value: overview.agreedRows, color: 'text-green-600' },
                          { label: 'Conflict', value: overview.conflictedRows, color: 'text-red-600' },
                          { label: 'Tie', value: overview.tieRows, color: 'text-amber-600' },
                          { label: 'Pending', value: overview.pendingRows, color: 'text-blue-600' },
                          { label: 'Resolved', value: overview.resolvedRows, color: 'text-purple-600' },
                          { label: 'Agreement %', value: `${overview.agreementPercentage}%`, color: 'text-green-600' },
                          { label: 'Health Score', value: health.score, color: 'text-indigo-600' },
                        ].map((item) => (
                          <div key={item.label} className="p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">{item.label}</p>
                            <p className={`text-lg font-bold ${item.color || 'text-gray-900'}`}>{item.value ?? '-'}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {overview.mostConflictingField && (
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Most Conflicting Field</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-lg font-bold text-red-600">{overview.mostConflictingField}</p>
                        <p className="text-xs text-gray-500">{overview.mostConflictingFieldCount} conflicts</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Annotators Tab */}
                <TabsContent value="annotators">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Annotator Performance</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-left p-2 font-medium">Name</th>
                              <th className="text-center p-2 font-medium">Assigned</th>
                              <th className="text-center p-2 font-medium">Completed</th>
                              <th className="text-center p-2 font-medium">Agreement %</th>
                              <th className="text-center p-2 font-medium">Pending</th>
                              <th className="text-center p-2 font-medium">Participation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {annotators.length === 0 && (
                              <tr><td colSpan={6} className="text-center p-4 text-gray-400">No annotator data available</td></tr>
                            )}
                            {annotators.map((a: any) => (
                              <tr key={a.userId} className="border-b border-gray-100 hover:bg-gray-50/50">
                                <td className="p-2 font-medium">{a.userName}</td>
                                <td className="text-center p-2">{a.assignedRows}</td>
                                <td className="text-center p-2">{a.completedRows}</td>
                                <td className="text-center p-2">
                                  <span className={a.agreementRate >= 80 ? 'text-green-600' : a.agreementRate >= 60 ? 'text-amber-600' : 'text-red-600'}>
                                    {a.agreementRate}%
                                  </span>
                                </td>
                                <td className="text-center p-2">{a.pendingAssignments}</td>
                                <td className="text-center p-2">{a.participationPercentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Fields Tab */}
                <TabsContent value="fields">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Field-Level Statistics (sorted by most conflicting)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-left p-2 font-medium">Field</th>
                              <th className="text-center p-2 font-medium">Total</th>
                              <th className="text-center p-2 font-medium">Agreed</th>
                              <th className="text-center p-2 font-medium">Conflict</th>
                              <th className="text-center p-2 font-medium">Tie</th>
                              <th className="text-center p-2 font-medium">Agreement %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fields.length === 0 && (
                              <tr><td colSpan={6} className="text-center p-4 text-gray-400">No field data available</td></tr>
                            )}
                            {fields.map((f: any) => (
                              <tr key={f.fieldName} className="border-b border-gray-100 hover:bg-gray-50/50">
                                <td className="p-2 font-medium">{f.displayName || f.fieldName}</td>
                                <td className="text-center p-2">{f.total}</td>
                                <td className="text-center p-2 text-green-600">{f.agreed}</td>
                                <td className="text-center p-2 text-red-600">{f.conflicted}</td>
                                <td className="text-center p-2 text-amber-600">{f.tied}</td>
                                <td className="text-center p-2">{f.agreementPercentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Activity Timeline</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-0">
                        {timeline.length === 0 && (
                          <p className="text-center text-gray-400 py-8 text-sm">No timeline events available</p>
                        )}
                        {timeline.map((event: any, i: number) => (
                          <div key={i} className="flex gap-3 pb-3 relative">
                            {i < timeline.length - 1 && <div className="absolute left-2 top-5 bottom-0 w-px bg-gray-200" />}
                            <div className={cn(
                              'w-4 h-4 rounded-full mt-0.5 shrink-0 border-2',
                              event.severity === 'success' ? 'bg-green-400 border-green-200' :
                              event.severity === 'warning' ? 'bg-amber-400 border-amber-200' :
                              event.severity === 'error' ? 'bg-red-400 border-red-200' :
                              'bg-blue-400 border-blue-200'
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900">{event.displayLabel}</p>
                              <p className="text-xs text-gray-500">
                                {event.userName} · {new Date(event.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Comparison Tab */}
                <TabsContent value="comparison">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Original vs Resolved</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-left p-2 font-medium">Field</th>
                              <th className="text-left p-2 font-medium">Original</th>
                              <th className="text-left p-2 font-medium">Resolved</th>
                              <th className="text-center p-2 font-medium">Changed</th>
                              <th className="text-left p-2 font-medium">Method</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparison.length === 0 && (
                              <tr><td colSpan={5} className="text-center p-4 text-gray-400">No comparison data available</td></tr>
                            )}
                            {comparison.map((c: any, i: number) => (
                              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                                <td className="p-2 font-medium">{c.displayName || c.fieldName}</td>
                                <td className="p-2 text-gray-500">{c.originalValue || '-'}</td>
                                <td className="p-2 text-green-700 font-medium">{c.resolvedValue || '-'}</td>
                                <td className="text-center p-2">
                                  {c.changed ? <span className="text-green-600">✓</span> : <span className="text-gray-400">—</span>}
                                </td>
                                <td className="p-2 text-gray-500">{c.resolutionMethod || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Agreement Tab */}
                <TabsContent value="agreement">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Agreement Summary</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between"><span className="text-xs text-gray-500">Agreement %</span><span className="text-sm font-bold">{agreement.agreementPercentage}%</span></div>
                        <div className="flex justify-between"><span className="text-xs text-gray-500">Majority Count</span><span className="text-sm font-bold">{agreement.majorityCount}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-gray-500">Tie Count</span><span className="text-sm font-bold text-amber-600">{agreement.tieCount}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-gray-500">Total Votes</span><span className="text-sm font-bold">{agreement.totalVotes}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-gray-500">Alpha Score</span><span className="text-sm font-bold">{agreement.alphaScore ?? 'N/A'}</span></div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Health Score</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between"><span className="text-xs text-gray-500">Score</span><span className="text-sm font-bold text-indigo-600">{health.score}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-gray-500">Interpretation</span><span className="text-sm font-bold">{health.interpretation}</span></div>
                        {health.components && Object.entries(health.components).map(([key, val]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
<span className="text-sm font-bold">{typeof val === 'number' ? Math.round(val as number) : String(val)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Export Reports</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['csv', 'xlsx', 'json', 'pdf'].map((format) => (
                          <Button key={format} variant="outline" className="h-20 flex-col gap-1" onClick={() => handleExport(format)}>
                            <Download className="h-5 w-5" />
                            <span className="text-xs uppercase">{format}</span>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Configuration Tab */}
                <TabsContent value="configuration">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Consensus Configuration</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {[
                          { label: 'Agreement Method', value: stats.configuration?.agreementMethod || 'MAJORITY' },
                          { label: 'Tie Strategy', value: stats.configuration?.tieStrategy || 'DISCUSSION' },
                          { label: 'Minimum Agreement', value: `${stats.configuration?.minimumAgreement || 70}%` },
                          { label: 'Minimum Reviewers', value: stats.configuration?.minimumReviewers || 3 },
                          { label: 'Allow Even Reviewers', value: stats.configuration?.allowEvenReviewers ? 'Yes' : 'No' },
                          { label: 'Enable Alpha', value: stats.configuration?.enableAlpha ? 'Yes' : 'No' },
                          { label: 'Health Score Weights', value: Object.entries(stats.configuration?.healthScoreWeights || {}).map(([k, v]) => `${k}: ${v}`).join(', ') },
                        ].map((item) => (
                          <div key={item.label} className="p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">{item.label}</p>
                            <p className="text-sm font-medium text-gray-900 mt-0.5">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
