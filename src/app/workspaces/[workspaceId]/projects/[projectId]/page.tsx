'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Plus, RefreshCw, Search, Database, Users, CheckCircle, Clock,
  TrendingUp, Activity, ArrowRight, Folder, LayoutDashboard,
  AlertCircle, FileText, Menu, Settings, Eye, Play, Pause,
  GitBranch, BarChart3, Cpu, Upload, Scan, FileCheck, Layers,
  Zap, ChevronRight, Home, Loader2, Star, Bot, Grid3X3, List,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
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
  health: string;
  type?: string;
  owner?: string;
}

interface WorkspaceDataset {
  _id: string;
  name: string;
  type: string;
  owner: string;
  status: string;
  progress: number;
  docCount: number;
  annotated: number;
  pendingReview: number;
  completed: number;
  failed: number;
  createdAt: string;
  updatedAt: string;
}
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

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

function StatCard({ label, value, icon: Icon, sub, color = 'blue', empty }: {
  label: string; value: number | string; icon: React.ElementType; sub?: string; color?: string; empty?: boolean;
}) {
  return (
    <motion.div variants={itemVariants}
      className={cn(
        'relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-1 card-3d-inner',
        color === 'blue' && 'bg-gradient-to-br from-blue-50/80 to-white border-blue-200/40',
        color === 'indigo' && 'bg-gradient-to-br from-indigo-50/80 to-white border-indigo-200/40',
        color === 'emerald' && 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200/40',
        color === 'amber' && 'bg-gradient-to-br from-amber-50/80 to-white border-amber-200/40',
        color === 'violet' && 'bg-gradient-to-br from-violet-50/80 to-white border-violet-200/40',
        color === 'rose' && 'bg-gradient-to-br from-rose-50/80 to-white border-rose-200/40',
      )}
    >
      <div className="relative z-10 flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={cn('p-2 rounded-lg', color === 'blue' && 'bg-blue-100/60 text-blue-600', color === 'indigo' && 'bg-indigo-100/60 text-indigo-600', color === 'emerald' && 'bg-emerald-100/60 text-emerald-600', color === 'amber' && 'bg-amber-100/60 text-amber-600', color === 'violet' && 'bg-violet-100/60 text-violet-600', color === 'rose' && 'bg-rose-100/60 text-rose-600')}>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    healthy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
    in_review: 'bg-violet-100 text-violet-700 border-violet-200',
    annotated: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  const s = map[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border', s)}>
      {status}
    </span>
  );
}

function ProgressBar({ pct, color = 'blue' }: { pct: number; color?: string }) {
  const barColor = color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
        <span>Progress</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
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

function PipelineStage({ label, active, completed, index }: { label: string; active: boolean; completed: boolean; index: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2',
        completed && 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm',
        active && !completed && 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-4 ring-emerald-100 shadow-md',
        !active && !completed && 'bg-gray-50 border-gray-200 text-gray-400',
      )}>
        {completed ? (
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        ) : active ? (
          <div className="w-5 h-5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        ) : (
          index + 1
        )}
      </div>
      <span className={cn(
        'text-[10px] font-semibold text-center leading-tight max-w-[80px]',
        active && 'text-emerald-700 font-bold',
        completed && 'text-emerald-600',
        !active && !completed && 'text-gray-400'
      )}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

export default function ProjectDashboard() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;

  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [datasets, setDatasets] = useState<WorkspaceDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSearch, setAiSearch] = useState('');

  const load = async () => {
    try {
      const mockDatasets: WorkspaceDataset[] = [
        { _id: 'ds-1', name: 'Patient Admission Forms', type: 'Clinical Informatics', owner: 'Sarah Chen', status: 'active', progress: 88, docCount: 12402, annotated: 10913, pendingReview: 1489, completed: 9243, failed: 12, createdAt: '2025-01-15', updatedAt: '2025-06-20' },
        { _id: 'ds-2', name: 'Lab Reports', type: 'Clinical Informatics', owner: 'Sarah Chen', status: 'in_review', progress: 65, docCount: 8102, annotated: 5266, pendingReview: 2836, completed: 4200, failed: 5, createdAt: '2025-02-10', updatedAt: '2025-06-18' },
        { _id: 'ds-3', name: 'Discharge Summaries', type: 'Clinical Informatics', owner: 'Sarah Chen', status: 'pending', progress: 0, docCount: 14648, annotated: 0, pendingReview: 0, completed: 0, failed: 0, createdAt: '2025-01-05', updatedAt: '2025-05-30' },
      ];

      const mockProject: WorkspaceProject = {
        _id: projectId,
        name: 'Medical Records Extraction',
        code: 'MED-EX-2024',
        description: 'Clinical Informatics document pipelines',
        status: 'active',
        progress: 70,
        datasetCount: mockDatasets.length,
        memberCount: 12,
        updatedAt: '2025-06-22',
        health: 'healthy',
      };

      setProject(mockProject);
      setDatasets(mockDatasets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!project) return null;

  const totalDocs = datasets.reduce((s, d) => s + (d.docCount || 0), 0);
  const totalAnnotated = datasets.reduce((s, d) => s + (d.annotated || 0), 0);
  const totalPendingReview = datasets.reduce((s, d) => s + (d.pendingReview || 0), 0);
  const totalCompleted = datasets.reduce((s, d) => s + (d.completed || 0), 0);

  const aiAccuracy = project.health === 'healthy' ? 96 : project.health === 'warning' ? 78 : 52;
  const ocrAccuracy = project.health === 'healthy' ? 94 : project.health === 'warning' ? 72 : 45;

  const annotationChartData = [
    { name: 'Completed', value: totalCompleted, fill: '#22c55e' },
    { name: 'In Review', value: totalPendingReview, fill: '#8b5cf6' },
    { name: 'Consensus', value: Math.round(totalCompleted * 0.3), fill: '#3b82f6' },
    { name: 'Pending', value: totalDocs - totalAnnotated, fill: '#f59e0b' },
    { name: 'Returned', value: Math.max(0, totalAnnotated - totalCompleted - totalPendingReview), fill: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="relative min-h-screen bg-[#f8fafc] overflow-hidden">
      {/* Decorative gradient blur circles in background */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 px-4 md:px-6 pb-8 space-y-6 max-w-7xl mx-auto">
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
              <Link href={`/workspaces/${workspaceId}/projects`} className="text-muted-foreground hover:text-foreground transition-colors">Projects</Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-semibold text-foreground">{project.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={project.health} />
          </div>
        </div>
      </header>

      {/* KPI Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
        <StatCard label="Total Datasets" value="12" icon={Database} sub="Standard Capacity" color="blue" />
        <StatCard label="Medical Records" value="45.2k" icon={FileText} sub="+12% vs last week" color="indigo" />
        <StatCard label="Docs Processed" value="38.1k" icon={Activity} sub="92% of quarterly target" color="emerald" />
        <StatCard label="AI Accuracy" value="98.4%" icon={Cpu} sub="Benchmark: 95.0%" color="violet" />
        <StatCard label="OCR Accuracy" value="99.1%" icon={Scan} sub="Model: Omni-Vision v4" color="amber" />
        <StatCard label="Review Queue" value="1.2k" icon={Eye} sub="Requires attention" color="rose" />
      </motion.div>

      {/* Annotation Progress + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm space-y-5 flex flex-col justify-between min-h-[260px]">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">Annotation Progress Breakdown</span>
            </div>
            <span className="text-muted-foreground text-xs">Total: <span className="font-bold text-gray-900">45,200 Documents</span></span>
          </div>
          
          {/* Horizontal Stacked Progress Bar */}
          <div className="h-4.5 w-full rounded-full bg-gray-100 flex overflow-hidden shadow-inner my-2">
            <div className="h-full bg-emerald-500 transition-all hover:opacity-90 cursor-pointer" style={{ width: '70%' }} title="Completed: 70%" />
            <div className="h-full bg-blue-500 transition-all hover:opacity-90 cursor-pointer" style={{ width: '12%' }} title="In Review: 12%" />
            <div className="h-full bg-amber-500 transition-all hover:opacity-90 cursor-pointer" style={{ width: '5%' }} title="Consensus: 5%" />
            <div className="h-full bg-gray-300 transition-all hover:opacity-90 cursor-pointer" style={{ width: '8%' }} title="Pending: 8%" />
            <div className="h-full bg-red-400 transition-all hover:opacity-90 cursor-pointer" style={{ width: '5%' }} title="Returned: 5%" />
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <div className="flex items-center gap-2 border-r last:border-0 border-gray-100 pr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-gray-900">31.6k <span className="text-gray-400 font-normal">(70%)</span></p>
                <p className="text-[9px] text-muted-foreground uppercase font-semibold">Completed</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-r last:border-0 border-gray-100 pr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-gray-900">5.4k <span className="text-gray-400 font-normal">(12%)</span></p>
                <p className="text-[9px] text-muted-foreground uppercase font-semibold">In Review</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-r last:border-0 border-gray-100 pr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-gray-900">2.2k <span className="text-gray-400 font-normal">(5%)</span></p>
                <p className="text-[9px] text-muted-foreground uppercase font-semibold">Consensus</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-r last:border-0 border-gray-100 pr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-gray-900">3.6k <span className="text-gray-400 font-normal">(8%)</span></p>
                <p className="text-[9px] text-muted-foreground uppercase font-semibold">Pending</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-gray-900">2.2k <span className="text-gray-400 font-normal">(5%)</span></p>
                <p className="text-[9px] text-muted-foreground uppercase font-semibold">Returned</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between min-h-[260px]">
          <SectionHeader icon={Cpu} title="AI Processing Pipeline (Live Status)" />
          <div className="flex items-center justify-between px-1 py-2 overflow-x-auto gap-1.5">
            {['Upload', 'Enhancement', 'OCR', 'Extraction', 'Classification', 'Validation'].map((stage, i) => (
              <PipelineStage key={stage} label={stage} index={i} active={i === 3} completed={i < 3} />
            ))}
          </div>
          <div className="mt-2 p-2.5 rounded-lg bg-gray-50 text-center border border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Pipeline Status: <span className="text-emerald-600 font-bold">Extraction Active</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">2,341 items currently in queue</p>
          </div>
        </motion.div>
      </div>

      {/* Dataset Overview + Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Database} title="Dataset Overview" sub={`${datasets.length} dataset${datasets.length !== 1 ? 's' : ''}`} />
            {datasets.length === 0 ? (
              <EmptyState icon={Database} title="No datasets yet" sub="Upload documents to create datasets." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {datasets.map(ds => (
                  <div key={ds._id} className="border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{ds.name}</p>
                        <p className="text-xs text-muted-foreground">{ds.type} · {ds.owner}</p>
                      </div>
                      <StatusBadge status={ds.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{ds.docCount} documents</p>
                    <ProgressBar pct={ds.progress} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 h-8 text-xs gap-1"
                      onClick={() => router.push(`/workspaces/${workspaceId}/projects/${projectId}/datasets/${ds._id}`)}
                    >
                      <Eye className="h-3.5 w-3.5" /> Quick Open
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Medical AI Assistant */}
          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <SectionHeader icon={Bot} title="Medical AI Assistant" />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search patients, documents..."
                  value={aiSearch}
                  onChange={e => setAiSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested Queries</p>
              <div className="flex flex-col gap-1">
                {[
                  'Show pending medical reviews',
                  'Find low-confidence diagnoses',
                  'Show OCR failures in Lab Reports'
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => setAiSearch(q)}
                    className="text-left py-1.5 px-3 rounded-lg bg-gray-50 border text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors truncate"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Zap} title="Quick Actions" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1.5 text-xs text-gray-700 hover:bg-blue-50">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-[10px]">ASSIGN STAFF</span>
              </Button>
              <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1.5 text-xs text-gray-700 hover:bg-blue-50">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-[10px]">RETRY OCR</span>
              </Button>
              <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1.5 text-xs text-gray-700 hover:bg-blue-50">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-[10px]">REVIEW QUEUE</span>
              </Button>
              <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1.5 text-xs text-gray-700 hover:bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-[10px]">COMPLIANCE</span>
              </Button>
            </div>
          </motion.div>

          {/* System Health */}
          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">System Health</h2>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            
            <div className="space-y-3 text-[11px]">
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500 uppercase font-semibold">Extraction Engine</span>
                  <span className="text-emerald-600 font-bold">OPTIMAL</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '95%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500 uppercase font-semibold">Worker Availability</span>
                  <span className="text-gray-900 font-bold">14/16 Active</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '87.5%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500 uppercase font-semibold">Processing Latency</span>
                  <span className="text-gray-900 font-bold">142ms</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '92%' }} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Neural Network Activity */}
          <motion.div variants={itemVariants} className="rounded-xl bg-[#090d16] p-5 text-white space-y-2 border border-gray-900 relative overflow-hidden">
            <div className="absolute top-3 right-3 flex gap-1">
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            </div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Neural Network Activity</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Live processing nodes for <code className="text-blue-300 font-mono text-[9px] bg-blue-950/50 px-1 py-0.5 rounded border border-blue-900/30">ENTITY_RECOGNITION_MODULE_V4</code>
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  </div>
  );
}