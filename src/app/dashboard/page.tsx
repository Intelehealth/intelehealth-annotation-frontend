'use client';

import { Button } from '@/components/ui/button';
import {
  Plus,
  RefreshCw,
  Database,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
  GitBranch,
  Play,
  Folder,
  LayoutDashboard,
  ClipboardList,
  AlertCircle,
  BarChart3,
  Target,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { datasetsAPI } from '@/lib/api/datasets';
import { usersAPI } from '@/lib/api/users';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import type { AnnotationTask } from '@/types/feature1';
import { computeTaskStatus } from '@/types/feature1';

// ─── Time formatting ──────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = new Date();
  const t = new Date(dateStr);
  const mins = Math.floor((now.getTime() - t.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  color = 'blue',
  empty,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
  color?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'violet' | 'rose';
  empty?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald:'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    rose:   'bg-rose-50 text-rose-600 border-rose-100',
  };
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={cn('p-2 rounded-lg border', colorMap[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {empty ? (
        <p className="text-sm text-gray-400 italic mt-1">—</p>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

// ─── Dataset Type badge ───────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    text:       'bg-slate-100 text-slate-600',
    image:      'bg-purple-50 text-purple-600',
    audio:      'bg-pink-50 text-pink-600',
    multimodal: 'bg-blue-50 text-blue-600',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', map[type] ?? 'bg-gray-100 text-gray-600')}>
      {type}
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = 'blue' }: { pct: number; color?: string }) {
  const barColor = color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Progress</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub, action }: {
  icon: React.ElementType; title: string; sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-400" />
        <div>
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, sub }: {
  icon: React.ElementType; title: string; sub?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
function AdminDashboard({ user }: { user: any }) {
  const { showToast } = useToast();
  const [allDatasets, setAllDatasets] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Accordion state
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, any[]>>({});
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const [ds, us] = await Promise.all([
        datasetsAPI.getAll(),
        usersAPI.getAll().catch(() => []),
      ]);
      setAllDatasets(ds as any[]);
      setAllUsers(us as any[]);

      // Pre-load assignments for parent datasets that have clones
      const parentIdsWithClones = ds
        .filter((d: any) => !d.isClone && ds.some((c: any) => c.cloneParentId?.toString() === d._id?.toString()))
        .map((d: any) => d._id);

      const assMap: Record<string, any[]> = {};
      await Promise.all(
        parentIdsWithClones.map(async (id: string) => {
          try {
            const ass = await datasetsAPI.getAssignments(id);
            assMap[id] = ass;
          } catch (e) {
            console.error('Failed to pre-load assignments for parent', id, e);
          }
        })
      );
      setAssignmentsMap(assMap);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleParent = async (datasetId: string) => {
    setExpandedParents((prev) => ({ ...prev, [datasetId]: !prev[datasetId] }));
    if (!assignmentsMap[datasetId]) {
      try {
        const ass = await datasetsAPI.getAssignments(datasetId);
        setAssignmentsMap((prev) => ({ ...prev, [datasetId]: ass }));
      } catch (err) {
        console.error('Failed to load assignments', err);
      }
    }
  };

  const handleReviewComplete = async (assignmentId: string, parentDatasetId: string) => {
    try {
      await datasetsAPI.updateAssignmentStatus(assignmentId, 'COMPLETED');
      showToast({
        title: 'Assignment completed',
        description: 'The assignment has been successfully reviewed and completed.',
        type: 'success',
      });
      // Reload assignments for this dataset
      const ass = await datasetsAPI.getAssignments(parentDatasetId);
      setAssignmentsMap((prev) => ({ ...prev, [parentDatasetId]: ass }));
    } catch (err) {
      showToast({
        title: 'Action failed',
        description: 'Failed to complete the assignment.',
        type: 'error',
      });
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = () => { setRefreshing(true); load(); };

  // Separate parent datasets from clones
  const parentDatasets = allDatasets.filter((d: any) => !d.isClone);
  const cloneDatasets  = allDatasets.filter((d: any) =>  d.isClone);

  // Annotators (all non-admin users)
  const annotators = allUsers.filter((u: any) => u.role?.toUpperCase() !== 'ADMIN');

  // Active tasks: parent datasets that have clones (consensus in progress)
  const datasetsWithClones = parentDatasets.filter((d: any) =>
    cloneDatasets.some((c: any) => c.cloneParentId?.toString() === d._id?.toString())
  );

  // KPIs
  const totalDatasets = parentDatasets.length;
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u: any) => u.status?.toUpperCase() === 'ACTIVE').length;
  const pendingUsers = allUsers.filter((u: any) => u.status?.toUpperCase() === 'PENDING').length;

  // Recent parent datasets (sorted newest first, up to 5)
  const recentParents = [...parentDatasets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Recent activity from parent datasets only
  const recentActivity = [...parentDatasets]
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Here's your platform overview · Last updated {timeAgo(lastRefresh.toISOString())}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5 text-sm"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Link href="/dataset/add-dataset">
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm">
              <Plus className="h-3.5 w-3.5" />
              New Dataset
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Stats Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Datasets"
          value={totalDatasets}
          icon={Database}
          sub="Active datasets in workspace"
          color="blue"
          empty={totalDatasets === 0}
        />
        <StatCard
          label="Total Users"
          value={totalUsers}
          icon={Users}
          sub="Total registered users"
          color="indigo"
          empty={totalUsers === 0}
        />
        <StatCard
          label="Active Users"
          value={activeUsers}
          icon={CheckCircle}
          sub="Can login and annotate"
          color="emerald"
          empty={activeUsers === 0}
        />
        <StatCard
          label="Pending Users"
          value={pendingUsers}
          icon={Clock}
          sub="Pending invitations"
          color="amber"
          empty={pendingUsers === 0}
        />
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {[
            { href: '/dataset/add-dataset', label: '+ New Dataset', icon: Plus },
            { href: '/users?add=true',       label: '+ Add User', icon: Plus },
            { href: '/dataset',             label: '+ Assign Annotator', icon: GitBranch },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors">
                <Icon className="h-3.5 w-3.5 text-gray-500" />
                {label}
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main Two-Column Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Datasets (left, wider) */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <SectionHeader
            icon={Folder}
            title="Recent Datasets"
            sub="Your most recently created datasets (clones hidden)"
            action={
              <Link href="/dataset">
                <button className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </Link>
            }
          />
          {recentParents.length === 0 ? (
            <EmptyState icon={Database} title="No datasets yet" sub="Create your first dataset to get started." />
          ) : (
            <div className="space-y-3">
              {recentParents.map((ds: any) => {
                const clones = cloneDatasets.filter(
                  (c: any) => c.cloneParentId?.toString() === ds._id?.toString()
                );
                const hasClones = clones.length > 0;
                const isExpanded = !!expandedParents[ds._id];
                const parentAssignments = assignmentsMap[ds._id] || [];

                return (
                  <div
                    key={ds._id}
                    className="p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-100 shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center justify-between group">
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => hasClones && toggleParent(ds._id)}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{ds.name}</p>
                          <TypeBadge type={ds.datasetType} />
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-gray-400">{timeAgo(ds.createdAt)}</span>
                          {hasClones && (
                            <span className="text-xs text-indigo-500 font-medium flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {clones.length} annotator{clones.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {hasClones && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleParent(ds._id)}
                            className="h-8 px-2 text-gray-500 hover:text-blue-600 hover:bg-blue-55"
                          >
                            <TrendingUp className={cn("h-4 w-4 transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                            <span className="text-xs ml-1 font-semibold">{isExpanded ? 'Hide' : 'Progress'}</span>
                          </Button>
                        )}
                        <Link href={`/dataset/${ds._id}`}>
                          <button className="px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                            Open
                          </button>
                        </Link>
                      </div>
                    </div>

                    {/* Accordion Panel */}
                    {hasClones && isExpanded && (
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Annotator Handoff &amp; Progress</p>
                        {parentAssignments.length === 0 ? (
                          <div className="text-center py-4 text-xs text-gray-400 italic">
                            No assignments found.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {parentAssignments.map((ass: any) => {
                              const pct = ass.progressPercentage || 0;
                              return (
                                <div
                                  key={ass._id}
                                  className="p-3 bg-gray-50 border border-gray-150/50 rounded-xl flex flex-col justify-between space-y-3 shadow-xs"
                                >
                                  <div>
                                    <div className="flex items-start justify-between">
                                      <p className="text-xs font-bold text-gray-800 truncate">
                                        {ass.assignedTo?.firstName} {ass.assignedTo?.lastName || ass.assignedTo?.email}
                                      </p>
                                      <span
                                        className={cn(
                                          'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider',
                                          ass.status === 'COMPLETED' && 'bg-green-100 text-green-700 border border-green-200',
                                          ass.status === 'SUBMITTED' && 'bg-indigo-100 text-indigo-700 border border-indigo-200',
                                          ass.status === 'IN_PROGRESS' && 'bg-blue-100 text-blue-700 border border-blue-200',
                                          ass.status === 'PENDING' && 'bg-gray-100 text-gray-600 border border-gray-200'
                                        )}
                                      >
                                        {ass.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                      {ass.completedRows} of {ass.totalRows} rows annotated
                                    </p>
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1.5">
                                      <div
                                        className={cn(
                                          'h-full rounded-full transition-all duration-300',
                                          ass.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-500'
                                        )}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Administrative Sign-off */}
                                  {ass.status === 'SUBMITTED' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleReviewComplete(ass._id, ds._id)}
                                      className="w-full h-7 text-[10px] font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm flex items-center justify-center gap-1"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      Review &amp; Complete Handoff
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity (right) */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <SectionHeader icon={Activity} title="Recent Activity" sub="Dataset updates" />
          {recentActivity.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" sub="Activity will appear as you work." />
          ) : (
            <div className="space-y-4">
              {recentActivity.map((ds: any) => (
                <div key={ds._id} className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-7 h-7 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center">
                      <Database className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{ds.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Created · {timeAgo(ds.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Datasets With Consensus (if any) ──────────────────────────────── */}
      {datasetsWithClones.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <SectionHeader
            icon={GitBranch}
            title="Consensus Assignments"
            sub="Datasets assigned to multiple annotators for consensus review"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {datasetsWithClones.map((ds: any) => {
              const clones = cloneDatasets.filter(
                (c: any) => c.cloneParentId?.toString() === ds._id?.toString()
              );
              return (
                <div key={ds._id} className="border border-gray-100 rounded-lg p-4 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all group">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900 truncate flex-1">{ds.name}</p>
                    <TypeBadge type={ds.datasetType} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {clones.length} annotator{clones.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Link href={`/dataset/${ds._id}`}>
                    <button className="w-full text-xs py-1.5 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors">
                      Open Dataset
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ANNOTATOR DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
function AnnotatorDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<AnnotationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    datasetsAPI.getMyTasks()
      .then(setTasks)
      .catch(e => setError(e?.response?.data?.message || 'Failed to load tasks'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Resolve status from real progress
  const getStatus = (task: AnnotationTask) => computeTaskStatus(task.progress, task.taskStatus);

  const notStarted  = tasks.filter(t => { const s = getStatus(t); return s === 'not_started' || s === 'pending'; }).length;
  const inProgress  = tasks.filter(t => getStatus(t) === 'in_progress').length;
  const completed   = tasks.filter(t => getStatus(t) === 'completed').length;
  const totalRows   = tasks.reduce((s, t) => s + (t.progress?.totalRows ?? 0), 0);
  const doneRows    = tasks.reduce((s, t) => s + (t.progress?.completedRows ?? 0), 0);
  const overallPct  = totalRows > 0 ? Math.round((doneRows / totalRows) * 100) : 0;

  // Sort: in_progress first, then not_started, then completed
  const sortedTasks = [...tasks].sort((a, b) => {
    const order: Record<string, number> = { in_progress: 0, not_started: 1, pending: 1, completed: 2 };
    return (order[getStatus(a)] ?? 3) - (order[getStatus(b)] ?? 3);
  });

  const activeTasks    = sortedTasks.filter(t => { const s = getStatus(t); return s !== 'completed'; });
  const completedTasks = sortedTasks.filter(t => getStatus(t) === 'completed');

  const statusConfig = {
    not_started: { label: 'Not Started', cls: 'bg-gray-100 text-gray-500', icon: Clock },
    pending:     { label: 'Not Started', cls: 'bg-gray-100 text-gray-500', icon: Clock },
    in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-600', icon: Play },
    completed:   { label: 'Completed',   cls: 'bg-emerald-100 text-emerald-600', icon: CheckCircle },
  } as const;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          My Annotation Workspace
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Welcome back, {user?.firstName}! Here are your assigned datasets.
        </p>
      </div>

      {/* ── Personal Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Assigned Tasks"  value={tasks.length}  icon={ClipboardList} color="blue"    empty={tasks.length === 0} />
        <StatCard label="Completed Tasks" value={completed}     icon={CheckCircle}   color="emerald" empty={tasks.length === 0} />
        <StatCard label="Pending Tasks"   value={tasks.length - completed} icon={Clock} color="amber" empty={tasks.length === 0} />
        <StatCard
          label="Completion Rate"
          value={tasks.length === 0 ? '—' : `${overallPct}%`}
          icon={TrendingUp}
          sub={tasks.length > 0 ? `${doneRows} / ${totalRows} rows` : undefined}
          color="indigo"
          empty={tasks.length === 0}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Active Tasks ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <SectionHeader
          icon={Target}
          title="My Active Tasks"
          sub={activeTasks.length > 0 ? `${activeTasks.length} task${activeTasks.length !== 1 ? 's' : ''} waiting` : 'No active tasks'}
        />
        {activeTasks.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No active tasks"
            sub={completed > 0 ? 'All tasks completed — great work!' : 'Your admin will assign datasets to you.'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTasks.map(task => {
              const status  = getStatus(task);
              const config  = statusConfig[status] ?? statusConfig.not_started;
              const Icon    = config.icon;
              const total   = task.progress?.totalRows ?? 0;
              const done    = task.progress?.completedRows ?? 0;
              const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
              const name    = task.name ?? task.dataset?.name ?? `Task ${task.cloneIndex ?? ''}`;
              const parent  = task.parentName;

              return (
                <div
                  key={task._id}
                  className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all group"
                >
                  {/* Name */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate flex-1">{name}</p>
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', config.cls)}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                  {/* Parent */}
                  {parent && (
                    <p className="text-xs text-indigo-400 flex items-center gap-1 mb-2">
                      <GitBranch className="h-3 w-3" />from {parent}
                    </p>
                  )}
                  {/* Progress */}
                  {status === 'in_progress' && total > 0 ? (
                    <ProgressBar pct={pct} />
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">
                      {total > 0 ? `${total} rows to annotate` : 'Awaiting data'}
                    </p>
                  )}
                  {/* Action */}
                  <button
                    onClick={() => router.push(`/dataset/${task._id}/annotation`)}
                    className="mt-3 w-full text-sm py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {status === 'in_progress' ? 'Resume' : 'Start Annotating'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Completed Tasks ────────────────────────────────────────────────── */}
      {completedTasks.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <SectionHeader
            icon={CheckCircle}
            title="Completed Tasks"
            sub={`${completedTasks.length} task${completedTasks.length !== 1 ? 's' : ''} done`}
          />
          <div className="space-y-2">
            {completedTasks.map(task => {
              const total  = task.progress?.totalRows ?? 0;
              const done   = task.progress?.completedRows ?? 0;
              const name   = task.name ?? task.dataset?.name ?? `Task ${task.cloneIndex ?? ''}`;
              return (
                <div key={task._id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{name}</p>
                      {total > 0 && (
                        <p className="text-xs text-gray-400">{done} / {total} rows completed</p>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                    Done
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No tasks at all ────────────────────────────────────────────────── */}
      {tasks.length === 0 && !error && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-10 text-center">
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">No tasks assigned yet</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Your admin will assign annotation datasets to you. Once assigned, your tasks will appear here with progress tracking.
          </p>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT DASHBOARD — role gate
// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Non-invited users see restricted dashboard
  if (user && user.invitedByAdmin === false) {
    return <NonInvitedDashboard user={user} />;
  }

  if (user?.role?.toUpperCase() === 'ADMIN') return <AdminDashboard user={user} />;
  return <AnnotatorDashboard user={user} />;
}

// ═════════════════════════════════════════════════════════════════════════════
// NON-INVITED DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
function NonInvitedDashboard({ user }: { user: any }) {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome, {user.firstName || 'User'}!
        </h1>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          You are not invited by administrator yet. Please wait for an invitation to access tasks and datasets.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          Pending administrator invitation
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/profile"
          className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all hover:border-blue-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
              <LayoutDashboard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Profile Settings</p>
              <p className="text-xs text-gray-400">Manage your profile and password</p>
            </div>
          </div>
        </Link>

        <Link
          href="/documentation"
          className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all hover:border-blue-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Documentation</p>
              <p className="text-xs text-gray-400">Learn about the platform</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
