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
import { datasetsAPI, DatasetResponse } from '@/lib/api/datasets';
import { usersAPI, UserResponse } from '@/lib/api/users';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import type { AnnotationTask } from '@/types/feature1';
import { computeTaskStatus } from '@/types/feature1';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Page entrance animation variants ─────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 18 },
  },
};

// ─── Sticky Navbar ─────────────────────────────────────────────────────────
function TopNav({ title, onRefresh, refreshing, children }: {
  title: string; onRefresh?: () => void; refreshing?: boolean; children?: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled
          ? 'glass-strong shadow-sm'
          : 'bg-background/80 backdrop-blur-sm'
      )}
    >
      <div className="flex items-center justify-between px-4 md:px-6 h-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground whitespace-nowrap">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {children}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="h-9 gap-1.5 text-sm flex-shrink-0">
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

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

// ─── Stat Card (animated, with depth) ─────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, sub, color = 'blue', empty,
}: {
  label: string; value: number | string; icon: React.ElementType;
  sub?: string; color?: string; empty?: boolean;
}) {
  return (
    <motion.div variants={itemVariants}
      className={cn(
        'relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-1 card-3d-inner',
        'before:absolute before:inset-0 before:rounded-xl before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100',
        color === 'blue' && 'bg-gradient-to-br from-blue-50/80 to-white border-blue-200/40 before:bg-blue-500/5',
        color === 'indigo' && 'bg-gradient-to-br from-indigo-50/80 to-white border-indigo-200/40 before:bg-indigo-500/5',
        color === 'emerald' && 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200/40 before:bg-emerald-500/5',
        color === 'amber' && 'bg-gradient-to-br from-amber-50/80 to-white border-amber-200/40 before:bg-amber-500/5',
        color === 'violet' && 'bg-gradient-to-br from-violet-50/80 to-white border-violet-200/40 before:bg-violet-500/5',
        color === 'rose' && 'bg-gradient-to-br from-rose-50/80 to-white border-rose-200/40 before:bg-rose-500/5',
      )}
    >
      <div className="relative z-10 flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={cn(
          'p-2 rounded-lg',
          color === 'blue' && 'bg-blue-100/60 text-blue-600',
          color === 'indigo' && 'bg-indigo-100/60 text-indigo-600',
          color === 'emerald' && 'bg-emerald-100/60 text-emerald-600',
          color === 'amber' && 'bg-amber-100/60 text-amber-600',
          color === 'violet' && 'bg-violet-100/60 text-violet-600',
          color === 'rose' && 'bg-rose-100/60 text-rose-600',
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {empty ? (
        <p className="relative z-10 text-sm text-gray-400 italic mt-1">—</p>
      ) : (
        <>
          <p className="relative z-10 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="relative z-10 text-xs text-gray-400 mt-1">{sub}</p>}
        </>
      )}
    </motion.div>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    text:       'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    image:      'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    audio:      'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    multimodal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', map[type] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400')}>
      {type}
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = 'blue' }: { pct: number; color?: string }) {
  const barColor = color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>Progress</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub, action }: {
  icon: React.ElementType; title: string; sub?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Recharts: Admin KPI Charts ──────────────────────────────────────────────
function AdminCharts({ totalDatasets, totalUsers, activeUsers, pendingUsers, datasetsWithClones, allDatasets }: {
  totalDatasets: number; totalUsers: number; activeUsers: number; pendingUsers: number;
  datasetsWithClones: any[]; allDatasets: any[];
}) {
  const barData = [
    { name: 'Datasets', value: totalDatasets, fill: '#6366f1' },
    { name: 'Users', value: totalUsers, fill: '#3b82f6' },
    { name: 'Active', value: activeUsers, fill: '#22c55e' },
    { name: 'Pending', value: pendingUsers, fill: '#f59e0b' },
  ];
  return (
    <motion.div variants={itemVariants}>
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Platform Overview</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD (redesigned)
// ═════════════════════════════════════════════════════════════════════════════
function AdminDashboard({ user }: { user: any }) {
  const { showToast } = useToast();
  const [allDatasets, setAllDatasets] = useState<DatasetResponse[]>([]);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, any[]>>({});
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const [ds, us] = await Promise.all([
        datasetsAPI.getAll(),
        usersAPI.getAll().catch(() => []),
      ]);
      setAllDatasets(ds);
      setAllUsers(us);
      const parentIdsWithClones = ds
        .filter((d: any) => !d.isClone && ds.some((c: any) => c.cloneParentId?.toString() === d._id?.toString()))
        .map((d: any) => d._id);
      const assMap: Record<string, any[]> = {};
      await Promise.all(parentIdsWithClones.map(async (id: string) => {
        try { const ass = await datasetsAPI.getAssignments(id); assMap[id] = ass; } catch (e) { console.error(e); }
      }));
      setAssignmentsMap(assMap);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const toggleParent = async (datasetId: string) => {
    setExpandedParents((prev) => ({ ...prev, [datasetId]: !prev[datasetId] }));
    if (!assignmentsMap[datasetId]) {
      try { const ass = await datasetsAPI.getAssignments(datasetId); setAssignmentsMap((prev) => ({ ...prev, [datasetId]: ass })); }
      catch (err) { console.error(err); }
    }
  };

  const handleReviewComplete = async (assignmentId: string, parentDatasetId: string) => {
    try {
      await datasetsAPI.updateAssignmentStatus(assignmentId, 'COMPLETED');
      showToast({ title: 'Assignment completed', description: 'The assignment has been successfully reviewed and completed.', type: 'success' });
      const ass = await datasetsAPI.getAssignments(parentDatasetId);
      setAssignmentsMap((prev) => ({ ...prev, [parentDatasetId]: ass }));
    } catch (err) {
      showToast({ title: 'Action failed', description: 'Failed to complete the assignment.', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []);
  const handleRefresh = () => { setRefreshing(true); load(); };

  const parentDatasets = allDatasets.filter((d) => !d.isClone);
  const cloneDatasets = allDatasets.filter((d) => d.isClone);
  const annotators = allUsers.filter((u) => u.role?.toUpperCase() !== 'ADMIN');
  const datasetsWithClones = parentDatasets.filter((d) => cloneDatasets.some((c) => c.cloneParentId?.toString() === d._id?.toString()));
  const totalDatasets = parentDatasets.length;
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => u.status?.toUpperCase() === 'ACTIVE').length;
  const pendingUsers = allUsers.filter((u) => u.status?.toUpperCase() === 'PENDING').length;
  const recentParents = [...parentDatasets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentActivity = [...parentDatasets].sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()).slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-4 md:px-6 pb-8 space-y-6 max-w-7xl mx-auto"
    >
      {/* Hero + Actions + Stats — one cohesive group */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's your platform overview · Last updated {timeAgo(lastRefresh.toISOString())}
          </p>
        </div>

        {/* Quick Actions — 3D elevated buttons */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
        <Link href="/dataset/add-dataset">
          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ y: 1, scale: 0.98 }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white
              bg-gradient-to-br from-blue-600 to-blue-700
              shadow-[0_4px_14px_rgba(37,99,235,0.3),0_2px_4px_rgba(37,99,235,0.15)]
              hover:shadow-[0_6px_20px_rgba(37,99,235,0.4),0_3px_6px_rgba(37,99,235,0.2)]
              active:shadow-[0_1px_3px_rgba(37,99,235,0.2)]
              transition-shadow duration-200 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Dataset
          </motion.button>
        </Link>
        <Link href="/users?add=true">
          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ y: 1, scale: 0.98 }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold
              bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700
              border border-indigo-200/60
              shadow-[0_3px_10px_rgba(99,102,241,0.15),0_1px_3px_rgba(99,102,241,0.08)]
              hover:shadow-[0_5px_16px_rgba(99,102,241,0.25),0_2px_5px_rgba(99,102,241,0.12)]
              active:shadow-[0_1px_2px_rgba(99,102,241,0.1)]
              transition-shadow duration-200 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add User
          </motion.button>
        </Link>
        <Link href="/dataset">
          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ y: 1, scale: 0.98 }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold
              bg-white text-gray-600 border border-gray-200/80
              shadow-[0_2px_8px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)]
              hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]
              active:shadow-[0_1px_2px_rgba(0,0,0,0.02)]
              hover:text-gray-800 hover:border-gray-300
              transition-shadow duration-200 flex items-center gap-1.5"
          >
            <GitBranch className="h-4 w-4" />
            Assign Annotator
          </motion.button>
        </Link>
      </motion.div>

      {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <StatCard label="Total Datasets" value={totalDatasets} icon={Database} sub="Active datasets" color="blue" empty={totalDatasets === 0} />
          <StatCard label="Total Users" value={totalUsers} icon={Users} sub="Total registered users" color="indigo" empty={totalUsers === 0} />
          <StatCard label="Active Users" value={activeUsers} icon={CheckCircle} sub="Can login and annotate" color="emerald" empty={activeUsers === 0} />
          <StatCard label="Pending Users" value={pendingUsers} icon={Clock} sub="Pending invitations" color="amber" empty={pendingUsers === 0} />
        </div>
      </motion.div>

      {/* Charts */}
      <AdminCharts totalDatasets={totalDatasets} totalUsers={totalUsers} activeUsers={activeUsers} pendingUsers={pendingUsers} datasetsWithClones={datasetsWithClones} allDatasets={allDatasets} />

      {/* Main Two-Column Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Datasets */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
          <SectionHeader icon={Folder} title="Recent Datasets" sub="Your most recently created datasets (clones hidden)"
            action={<Link href="/dataset"><button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></button></Link>}
          />
          {recentParents.length === 0 ? (
            <EmptyState icon={Database} title="No datasets yet" sub="Create your first dataset to get started." />
          ) : (
            <div className="space-y-3">
              {recentParents.map((ds: any) => {
                const clones = cloneDatasets.filter((c: any) => c.cloneParentId?.toString() === ds._id?.toString());
                const hasClones = clones.length > 0;
                const isExpanded = !!expandedParents[ds._id];
                const parentAssignments = assignmentsMap[ds._id] || [];
                return (
                  <div key={ds._id} className="p-4 rounded-xl border bg-card hover:border-primary/20 shadow-sm transition-all duration-200">
                    <div className="flex items-center justify-between group">
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => hasClones && toggleParent(ds._id)}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{ds.name}</p>
                          <TypeBadge type={ds.datasetType} />
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-muted-foreground">{timeAgo(ds.createdAt)}</span>
                          {hasClones && <span className="text-xs text-indigo-500 font-medium flex items-center gap-1"><Users className="h-3 w-3" />{clones.length} annotator{clones.length !== 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {hasClones && (
                          <Button variant="ghost" size="sm" onClick={() => toggleParent(ds._id)} className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10">
                            <TrendingUp className={cn("h-4 w-4 transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                            <span className="text-xs ml-1 font-semibold">{isExpanded ? 'Hide' : 'Progress'}</span>
                          </Button>
                        )}
                        <Link href={`/dataset/${ds._id}`}>
                          <button className="px-3 py-1 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all">Open</button>
                        </Link>
                      </div>
                    </div>
                    {hasClones && isExpanded && (
                      <div className="mt-4 pt-3 border-t space-y-2.5">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Annotator Handoff & Progress</p>
                        {parentAssignments.length === 0 ? (
                          <div className="text-center py-4 text-xs text-muted-foreground italic">No assignments found.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {parentAssignments.map((ass: any) => {
                              const pct = ass.progressPercentage || 0;
                              return (
                                <div key={ass._id} className="p-3 bg-muted/50 rounded-xl flex flex-col justify-between space-y-3 shadow-xs">
                                  <div>
                                    <div className="flex items-start justify-between">
                                      <p className="text-xs font-bold text-foreground truncate">{ass.assignedTo?.firstName} {ass.assignedTo?.lastName || ass.assignedTo?.email}</p>
                                      <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider',
                                        ass.status === 'COMPLETED' && 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                                        ass.status === 'SUBMITTED' && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
                                        ass.status === 'IN_PROGRESS' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                                        ass.status === 'PENDING' && 'bg-muted text-muted-foreground',
                                      )}>{ass.status}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">{ass.completedRows} of {ass.totalRows} rows annotated</p>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                                      <div className={cn('h-full rounded-full transition-all duration-300', ass.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-500')} style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                  {ass.status === 'SUBMITTED' && (
                                    <Button size="sm" onClick={() => handleReviewComplete(ass._id, ds._id)} className="w-full h-7 text-[10px] font-bold gap-1">
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      Review & Complete Handoff
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

        {/* Recent Activity */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <SectionHeader icon={Activity} title="Recent Activity" sub="Dataset updates" />
          {recentActivity.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" sub="Activity will appear as you work." />
          ) : (
            <div className="space-y-4">
              {recentActivity.map((ds: any) => (
                <div key={ds._id} className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                      <Database className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{ds.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Created · {timeAgo(ds.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Consensus Assignments */}
      {datasetsWithClones.length > 0 && (
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
          <SectionHeader icon={GitBranch} title="Consensus Assignments" sub="Datasets assigned to multiple annotators for consensus review" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {datasetsWithClones.map((ds: any) => {
              const clones = cloneDatasets.filter((c: any) => c.cloneParentId?.toString() === ds._id?.toString());
              return (
                <div key={ds._id} className="border rounded-lg p-4 hover:border-primary/30 hover:bg-accent/30 transition-all group">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground truncate flex-1">{ds.name}</p>
                    <TypeBadge type={ds.datasetType} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{clones.length} annotator{clones.length !== 1 ? 's' : ''}</span>
                  </div>
                  <Link href={`/dataset/${ds._id}`}>
                    <button className="w-full text-xs py-1.5 border border-primary/30 text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors">Open Dataset</button>
                  </Link>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ANNOTATOR DASHBOARD (redesigned)
// ═════════════════════════════════════════════════════════════════════════════
function AnnotatorDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<AnnotationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    datasetsAPI.getMyTasks().then(setTasks).catch(e => setError(e?.response?.data?.message || 'Failed to load tasks')).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const getStatus = (task: AnnotationTask) => computeTaskStatus(task.progress, task.taskStatus);
  const notStarted = tasks.filter(t => { const s = getStatus(t); return s === 'not_started' || s === 'pending'; }).length;
  const inProgress = tasks.filter(t => getStatus(t) === 'in_progress').length;
  const completed = tasks.filter(t => getStatus(t) === 'completed').length;
  const totalRows = tasks.reduce((s, t) => s + (t.progress?.totalRows ?? 0), 0);
  const doneRows = tasks.reduce((s, t) => s + (t.progress?.completedRows ?? 0), 0);
  const overallPct = totalRows > 0 ? Math.round((doneRows / totalRows) * 100) : 0;
  const sortedTasks = [...tasks].sort((a, b) => {
    const order: Record<string, number> = { in_progress: 0, not_started: 1, pending: 1, completed: 2 };
    return (order[getStatus(a)] ?? 3) - (order[getStatus(b)] ?? 3);
  });
  const activeTasks = sortedTasks.filter(t => { const s = getStatus(t); return s !== 'completed'; });
  const completedTasks = sortedTasks.filter(t => getStatus(t) === 'completed');
  const statusConfig = {
    not_started: { label: 'Not Started', cls: 'bg-muted text-muted-foreground', icon: Clock },
    pending:     { label: 'Not Started', cls: 'bg-muted text-muted-foreground', icon: Clock },
    in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Play },
    completed:   { label: 'Completed',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: CheckCircle },
  } as const;

  // Bar chart data for annotator
  const barChartData = [
    { name: 'Not Started', value: notStarted, fill: '#94a3b8' },
    { name: 'In Progress', value: inProgress, fill: '#3b82f6' },
    { name: 'Completed', value: completed, fill: '#22c55e' },
  ].filter(d => d.value > 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-4 md:px-6 pb-8 space-y-6 max-w-6xl mx-auto"
    >
      {/* Hero */}
      <motion.div variants={itemVariants} className="pt-6 pb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Annotation Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.firstName}! Here are your assigned datasets.</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Assigned Tasks" value={tasks.length} icon={ClipboardList} color="blue" empty={tasks.length === 0} />
        <StatCard label="Completed Tasks" value={completed} icon={CheckCircle} color="emerald" empty={tasks.length === 0} />
        <StatCard label="Pending Tasks" value={tasks.length - completed} icon={Clock} color="amber" empty={tasks.length === 0} />
        <StatCard label="Completion Rate" value={tasks.length === 0 ? '—' : `${overallPct}%`} icon={TrendingUp} sub={tasks.length > 0 ? `${doneRows} / ${totalRows} rows` : undefined} color="indigo" empty={tasks.length === 0} />
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div variants={itemVariants} className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Annotator Stats Chart */}
      {barChartData.length > 0 && (
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Task Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barChartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Active Tasks */}
      <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
        <SectionHeader icon={Target} title="My Active Tasks" sub={activeTasks.length > 0 ? `${activeTasks.length} task${activeTasks.length !== 1 ? 's' : ''} waiting` : 'No active tasks'} />
        {activeTasks.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No active tasks" sub={completed > 0 ? 'All tasks completed — great work!' : 'Your admin will assign datasets to you.'} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTasks.map(task => {
              const status = getStatus(task);
              const config = statusConfig[status] ?? statusConfig.not_started;
              const Icon = config.icon;
              const total = task.progress?.totalRows ?? 0;
              const done = task.progress?.completedRows ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const name = task.name ?? task.dataset?.name ?? `Task ${task.cloneIndex ?? ''}`;
              const parent = task.parentName;
              return (
                <div key={task._id} className="border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground truncate flex-1">{name}</p>
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', config.cls)}>
                      <Icon className="h-3 w-3" />{config.label}
                    </span>
                  </div>
                  {parent && <p className="text-xs text-indigo-400 flex items-center gap-1 mb-2"><GitBranch className="h-3 w-3" />from {parent}</p>}
                  {status === 'in_progress' && total > 0 ? <ProgressBar pct={pct} /> : <p className="text-xs text-muted-foreground mt-1">{total > 0 ? `${total} rows to annotate` : 'Awaiting data'}</p>}
                  <button onClick={() => router.push(`/dataset/${task._id}/annotation`)} className="mt-3 w-full text-sm py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center justify-center gap-1.5 transition-colors">
                    {status === 'in_progress' ? 'Resume' : 'Start Annotating'}<ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
          <SectionHeader icon={CheckCircle} title="Completed Tasks" sub={`${completedTasks.length} task${completedTasks.length !== 1 ? 's' : ''} done`} />
          <div className="space-y-2">
            {completedTasks.map(task => {
              const total = task.progress?.totalRows ?? 0;
              const done = task.progress?.completedRows ?? 0;
              const name = task.name ?? task.dataset?.name ?? `Task ${task.cloneIndex ?? ''}`;
              return (
                <div key={task._id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {total > 0 && <p className="text-xs text-muted-foreground">{done} / {total} rows completed</p>}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full">Done</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {tasks.length === 0 && !error && (
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-10 text-center shadow-sm">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No tasks assigned yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">Your admin will assign annotation datasets to you. Once assigned, your tasks will appear here with progress tracking.</p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT DASHBOARD
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

  if (user && user.invitedByAdmin === false) return <NonInvitedDashboard user={user} />;
  if (user?.role?.toUpperCase() === 'ADMIN') return <AdminDashboard user={user} />;
  return <AnnotatorDashboard user={user} />;
}

// ═════════════════════════════════════════════════════════════════════════════
// NON-INVITED DASHBOARD (redesigned)
// ═════════════════════════════════════════════════════════════════════════════
function NonInvitedDashboard({ user }: { user: any }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-4 md:px-6 pb-8 space-y-6 max-w-4xl mx-auto"
    >
      <motion.div variants={itemVariants} className="rounded-2xl border bg-card p-8 shadow-sm text-center">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 dark:border-amber-900/40">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome, {user.firstName || 'User'}!</h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">You are not invited by administrator yet. Please wait for an invitation to access tasks and datasets.</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-xl text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />Pending administrator invitation
        </div>
      </motion.div>
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/profile" className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:border-primary/30 group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><LayoutDashboard className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Profile Settings</p>
              <p className="text-xs text-muted-foreground">Manage your profile and password</p>
            </div>
          </div>
        </Link>
        <Link href="/documentation" className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:border-primary/30 group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /></div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Documentation</p>
              <p className="text-xs text-muted-foreground">Learn about the platform</p>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
