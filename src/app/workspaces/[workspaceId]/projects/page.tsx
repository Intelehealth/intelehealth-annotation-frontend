'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus, RefreshCw, Search, Grid3X3, List, Filter, ArrowUpDown,
  Folder, FolderOpen, Activity, Clock, CheckCircle, Users,
  Database, FileText, TrendingUp, AlertCircle, LayoutDashboard,
  Menu, ChevronRight, BarChart3, Zap, Layers, Cpu, GitBranch,
  User, Edit, MoreHorizontal, Loader2, Star, Eye, Play,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { workspacesAPI } from '@/lib/api/workspaces';
import { projectsAPI } from '@/lib/api/projects';
import { useEffect, useState } from 'react';

interface Member {
  _id: string;
  firstName: string;
  lastName: string;
}

interface WorkspaceProject {
  _id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  progress: number;
  datasetCount: number;
  memberCount: number;
  domainTags?: string[];
  members?: Member[];
  updatedAt: string;
  health?: string;
}

interface PlatformSummary {
  total: number;
  active: number;
  completed: number;
}
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 100, damping: 18 } },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const t = new Date(dateStr);
  const mins = Math.floor((now.getTime() - t.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    healthy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
  };
  const s = map[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border', s)}>
      {status}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full">
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

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

function RandomAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];
  const c = colors[name.length % colors.length];
  return (
    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white', c, className)}>
      {initials}
    </div>
  );
}

export default function ProjectsListing() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  const workspaceId = params.workspaceId as string;

  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createOpen, setCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const load = async () => {
    try {
      const res = await projectsAPI.getWorkspaceProjects(workspaceId);
      if (res && '_isError' in res) {
        console.error(res.message);
      } else {
        setProjects(res as unknown as WorkspaceProject[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (workspaceId) load(); }, [workspaceId]);

  const handleRefresh = () => { setRefreshing(true); load(); };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      showToast({ title: 'Validation Error', description: 'Project name is required.', type: 'error' });
      return;
    }
    try {
      const res = await projectsAPI.createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
        workspaceId,
      });
      if (res && '_isError' in res) {
        showToast({ title: 'Creation Failed', description: res.message, type: 'error' });
        return;
      }
      showToast({ title: 'Project Created', description: `${res.name} has been created successfully.`, type: 'success' });
      setCreateOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      load();
    } catch (err: any) {
      showToast({ title: 'Creation Failed', description: err.message || 'Something went wrong.', type: 'error' });
    }
  };

  // Extended filter and sort logic
  let filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'progress') return b.progress - a.progress;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const totalProjects = projects.length;
  const runningProjects = projects.filter(p => p.status.toLowerCase() === 'active').length;
  const completedProjects = projects.filter(p => p.status.toLowerCase() === 'completed').length;

  if (loading) {
    return (
      <div className="px-4 md:px-6 pb-8 space-y-6 max-w-7xl mx-auto animate-pulse pt-4">
        <div className="h-16 border-b flex items-center justify-between border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2 w-1/3">
            <div className="h-8 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 border border-gray-200 rounded-xl bg-white p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                    <div className="space-y-1 w-24">
                      <div className="h-3 bg-gray-200 rounded" />
                      <div className="h-4 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-12 bg-gray-200 rounded-full" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-1.5 bg-gray-200 rounded w-full pt-1" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <div className="h-40 border border-gray-200 rounded-xl bg-white p-5" />
            <div className="h-32 border border-gray-200 rounded-xl bg-white p-5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 md:px-6 pb-8 space-y-6 max-w-7xl mx-auto">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm -mx-4 md:-mx-6 px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <Sidebar forceCollapsed={false} />
              </SheetContent>
            </Sheet>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <Link href={`/workspaces/${workspaceId}`} className="text-muted-foreground hover:text-foreground transition-colors">Workspace</Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-semibold text-foreground">Projects</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-9 gap-1.5">
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalProjects} project{totalProjects !== 1 ? 's' : ''} in this workspace</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Create Project
        </Button>
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-9 h-9 text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-2.5 py-1 bg-white">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-0 py-0.5 focus:ring-0 focus:outline-none cursor-pointer font-medium text-gray-700 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-2.5 py-1 bg-white">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-0 py-0.5 focus:ring-0 focus:outline-none cursor-pointer font-medium text-gray-700 text-xs"
            >
              <option value="updated">Recently Updated</option>
              <option value="name">Name (A-Z)</option>
              <option value="progress">Progress Completion</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setViewMode('grid')}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {filtered.length === 0 ? (
            <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
              <EmptyState icon={Folder} title={searchQuery ? 'No projects match your search' : 'No projects yet'} sub={searchQuery ? 'Try a different search term' : 'Create your first project to get started.'} />
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(project => (
                <motion.div
                  key={project._id}
                  variants={itemVariants}
                  onClick={() => router.push(`/workspaces/${workspaceId}/projects/${project._id}`)}
                  className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Folder className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-mono text-muted-foreground">{project.code}</p>
                        <p className="text-sm font-semibold text-foreground truncate max-w-[160px]">{project.name}</p>
                      </div>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {project.domainTags?.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Database className="h-3 w-3" />{project.datasetCount} datasets</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{project.memberCount} members</span>
                  </div>

                  <ProgressBar pct={project.progress} />

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex -space-x-1.5">
                      {project.members?.slice(0, 4).map((m: Member, i: number) => (
                        <RandomAvatar key={m._id} name={`${m.firstName} ${m.lastName}`} className="ring-2 ring-white" />
                      ))}
                      {(project.members?.length || 0) > 4 && (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground ring-2 ring-white">
                          +{(project.members?.length || 0) - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Updated {timeAgo(project.updatedAt)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(project => (
                <motion.div
                  key={project._id}
                  variants={itemVariants}
                  onClick={() => router.push(`/workspaces/${workspaceId}/projects/${project._id}`)}
                  className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Folder className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{project.name}</p>
                        <span className="text-xs font-mono text-muted-foreground">{project.code}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <StatusBadge status={project.status} />
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Database className="h-3 w-3" />{project.datasetCount}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{project.memberCount}</span>
                      </div>
                    </div>
                    <div className="w-32">
                      <ProgressBar pct={project.progress} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex -space-x-1.5">
                      {project.members?.slice(0, 3).map((m: Member) => (
                        <RandomAvatar key={m._id} name={`${m.firstName} ${m.lastName}`} className="w-6 h-6 text-[8px] ring-2 ring-white" />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(project.updatedAt)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={BarChart3} title="Platform Summary" />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Total</span>
                </div>
                <span className="text-lg font-bold text-blue-700">{totalProjects}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">Running</span>
                </div>
                <span className="text-lg font-bold text-emerald-700">{runningProjects}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Completed</span>
                </div>
                <span className="text-lg font-bold text-blue-700">{completedProjects}</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Activity} title="System Throughput" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Docs/min</span><span className="font-semibold">1,247</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avg Latency</span><span className="font-semibold">230ms</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Queue Depth</span><span className="font-semibold">42</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Success Rate</span><span className="font-semibold text-emerald-600">99.2%</span></div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Activity} title="Recent Activity" sub="Latest project updates" />
            <div className="space-y-3">
              {filtered.slice(0, 5).map(p => (
                <div key={p._id} className="flex gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.status} · {timeAgo(p.updatedAt)}</p>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No activity yet.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Create a new project within this workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <Input
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Brief description..."
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProject}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}