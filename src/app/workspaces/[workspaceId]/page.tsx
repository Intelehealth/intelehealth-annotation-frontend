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
  Folder,
  LayoutDashboard,
  AlertCircle,
  FileText,
  Menu,
  Settings,
  Edit,
  Download,
  Search,
  Shield,
  Cpu,
  Upload,
  FileType,
  User,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  Play,
  Pause,
  GitBranch,
  BarChart3,
  Terminal,
  Zap,
  Eye,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { workspacesAPI, WorkspaceResponse } from '@/lib/api/workspaces';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Workspace extends WorkspaceResponse {
  clusterStatus?: string;
  complianceTags?: string[];
  health?: { score: number; issues: number };
}

interface WorkspaceProject {
  _id: string;
  name: string;
  code: string;
  status: string;
  health: string;
  owner: string;
}

interface WorkspaceDocument {
  _id: string;
  filename: string;
  status: string;
  updatedAt: string;
}

interface AuditEntry {
  _id: string;
  action: string;
  user: string;
  timestamp: string;
}

function mockProjects(workspaceId: string): WorkspaceProject[] {
  return [
    { _id: 'proj-1', name: 'Document Classification v2', code: 'DOC-CLASS-02', status: 'active', health: 'healthy', owner: 'alice@example.com' },
    { _id: 'proj-2', name: 'Invoice Extraction', code: 'INV-EXT-01', status: 'processing', health: 'healthy', owner: 'bob@example.com' },
    { _id: 'proj-3', name: 'Medical Record OCR', code: 'MED-OCR-03', status: 'active', health: 'warning', owner: 'carol@example.com' },
  ];
}

function mockRecentFiles(workspaceId: string): WorkspaceDocument[] {
  return [
    { _id: 'file-1', filename: 'report_q2_2024.pdf', status: 'completed', updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { _id: 'file-2', filename: 'invoice_40291.pdf', status: 'processing', updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { _id: 'file-3', filename: 'patient_record_8872.pdf', status: 'completed', updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { _id: 'file-4', filename: 'contract_nguyen_llc.docx', status: 'pending', updatedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
  ];
}

function mockAuditStream(workspaceId: string): AuditEntry[] {
  return [
    { _id: 'audit-1', action: 'Pipeline started — Document Classification v2', user: 'system', timestamp: new Date(Date.now() - 1000 * 30).toISOString() },
    { _id: 'audit-2', action: 'File ingested: report_q2_2024.pdf', user: 'alice@example.com', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { _id: 'audit-3', action: 'Export completed — Invoice Extraction', user: 'bob@example.com', timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
    { _id: 'audit-4', action: 'Consensus review requested for patient_record_8872.pdf', user: 'carol@example.com', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  ];
}

function mockKpiData(workspaceId: string) {
  return {
    activeProjects: 3,
    datasets: 12,
    docsProcessed: 1847,
    aiAccuracy: 94,
    consensusPending: 8,
    failedDocs: 2,
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 18 },
  },
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

function StatCard({ label, value, icon: Icon, sub, color = 'blue', empty, onClick }: {
  label: string; value: number | string; icon: React.ElementType; sub?: string; color?: string; empty?: boolean; onClick?: () => void;
}) {
  return (
    <motion.div variants={itemVariants}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-1 card-3d-inner',
        onClick && 'cursor-pointer',
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
        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2',
        completed && 'bg-emerald-100 border-emerald-500 text-emerald-700',
        active && !completed && 'bg-blue-100 border-blue-500 text-blue-700 ring-4 ring-blue-200',
        !active && !completed && 'bg-muted border-muted-foreground/30 text-muted-foreground',
      )}>
        {completed ? <Check className="h-4 w-4" /> : index + 1}
      </div>
      <span className={cn(
        'text-[10px] font-medium text-center leading-tight max-w-[80px]',
        active && 'text-blue-700 font-semibold',
        completed && 'text-emerald-600',
        !active && !completed && 'text-muted-foreground',
      )}>{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    inactive: { label: 'Inactive', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    degraded: { label: 'Degraded', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    healthy: { label: 'Healthy', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    warning: { label: 'Warning', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    critical: { label: 'Critical', cls: 'bg-red-100 text-red-700 border-red-200' },
    completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    processing: { label: 'Processing', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    failed: { label: 'Failed', cls: 'bg-red-100 text-red-700 border-red-200' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    in_review: { label: 'In Review', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
    error: { label: 'Error', cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  const s = map[status.toLowerCase()] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border', s.cls)}>
      {s.label}
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
    <header className={cn('sticky top-0 z-40 transition-all duration-300', scrolled ? 'glass-strong shadow-sm' : 'bg-background/80 backdrop-blur-sm')}>
      <div className="flex items-center justify-between px-4 md:px-6 h-16 max-w-7xl mx-auto">
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
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {children}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="h-9 gap-1.5 text-sm">
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default function WorkspaceDashboard() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  const workspaceId = params.workspaceId as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [recentFiles, setRecentFiles] = useState<WorkspaceDocument[]>([]);
  const [auditStream, setAuditStream] = useState<AuditEntry[]>([]);
  const [kpiData, setKpiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePipeline, setActivePipeline] = useState(0);

  const load = async () => {
    try {
      const [ws, proj, files, audit, kpi] = await Promise.all([
        workspacesAPI.getWorkspace(workspaceId),
        Promise.resolve(mockProjects(workspaceId)),
        Promise.resolve(mockRecentFiles(workspaceId)),
        Promise.resolve(mockAuditStream(workspaceId)),
        Promise.resolve(mockKpiData(workspaceId)),
      ]);
      if (ws && !('_isError' in ws)) {
        setWorkspace(ws as Workspace);
      }
      setProjects(proj);
      setRecentFiles(files);
      setAuditStream(audit);
      setKpiData(kpi);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (workspaceId) load(); }, [workspaceId]);

  const handleRefresh = () => { setRefreshing(true); load(); };

  const kpi = kpiData || { activeProjects: 0, datasets: 0, docsProcessed: 0, aiAccuracy: 0, consensusPending: 0, failedDocs: 0 };

  if (loading) {
    return (
      <div className="px-4 md:px-6 pb-8 space-y-6 max-w-7xl mx-auto animate-pulse pt-4">
        {/* Top bar loading mock */}
        <div className="h-16 border-b flex items-center justify-between border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-9 bg-gray-200 rounded w-24" />
        </div>
        {/* Header loading mock */}
        <div className="space-y-3 pt-4">
          <div className="flex gap-3">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-6 bg-gray-200 rounded w-16" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        {/* Stat Cards loading mock */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 border border-gray-200 rounded-xl bg-white p-5 space-y-3">
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-6 w-6 bg-gray-200 rounded-lg" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        {/* Pipeline / Config summary loading mock */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-44 border border-gray-200 rounded-xl bg-white p-5 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="flex justify-between pt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 bg-gray-200 rounded-full" />
                  <div className="h-3 bg-gray-200 rounded w-12" />
                </div>
              ))}
            </div>
          </div>
          <div className="h-44 border border-gray-200 rounded-xl bg-white p-5 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="space-y-2 pt-2">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f8fafc] overflow-hidden">
      {/* Decorative gradient blur circles in background */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 px-4 md:px-6 pb-8 space-y-6 max-w-7xl mx-auto">
      <TopNav title={workspace?.name || 'Workspace'} onRefresh={handleRefresh} refreshing={refreshing} />

      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-4 pt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{workspace?.name || 'Workspace'}</h1>
            <StatusBadge status={workspace?.clusterStatus || 'active'} />
            {workspace?.complianceTags?.map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <Shield className="h-3 w-3" />{tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Settings
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{workspace?.description}</p>
      </motion.div>

      {/* KPI Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Active Projects" value={kpi.activeProjects} icon={Folder} color="blue" />
        <StatCard label="Datasets" value={kpi.datasets} icon={Database} color="indigo" />
        <StatCard label="Docs Processed" value={kpi.docsProcessed} icon={FileText} color="emerald" />
        <StatCard label="AI Accuracy" value={kpi.aiAccuracy ? `${kpi.aiAccuracy}%` : '—'} icon={Cpu} color="violet" />
        <StatCard label="Consensus Pending" value={kpi.consensusPending} icon={GitBranch} color="amber" />
        <StatCard 
          label="Failed Docs" 
          value={kpi.failedDocs} 
          icon={AlertCircle} 
          color="rose" 
          onClick={() => {
            router.push(`/workspaces/${workspaceId}/projects/proj-1/datasets/ds-1?status=failed`);
          }}
        />
      </motion.div>

      {/* Pipeline + Intelligence Search */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
          <SectionHeader icon={Cpu} title="Document Intelligence Pipeline" sub="Live processing stage tracker" />
          <div className="flex items-center justify-between px-2 py-6">
            {['Upload', 'OCR', 'Classification', 'Extraction', 'Validation'].map((stage, i) => (
              <PipelineStage key={stage} label={stage} index={i} active={i === activePipeline} completed={i < activePipeline} />
            ))}
          </div>
          <Separator className="my-3" />
          <div className="flex items-center gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Deep Intelligence Search — query documents across all pipelines..." className="pl-9 h-10 text-sm" />
            </div>
            <Button size="sm" className="h-10 gap-1.5">
              <Zap className="h-4 w-4" /> Search
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <SectionHeader icon={Activity} title="Configuration Summary" />
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Industry</span>
              <span className="font-semibold capitalize">{workspace?.industry || 'custom'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">OCR Engine Version</span>
              <span className="font-semibold">
                {workspace?.enabledAiModules?.some((m: any) => m.name === 'ocr' && m.enabled) ? 'Neural OCR v2' : 'Tesseract v5'}
              </span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="text-muted-foreground">Theme Color</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: workspace?.themeColor || '#0f2347' }} />
                <span className="font-mono text-[10px]">{workspace?.themeColor || '#0f2347'}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Active Users</span>
              <span className="font-semibold">8 Active</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Retention Policy</span>
              <span className="font-semibold">90 days</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Two-Column */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Files + Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Files */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Upload} title="Recent Ingested Files" sub="Latest documents added to the pipeline" />
            {recentFiles.length === 0 ? (
              <EmptyState icon={FileText} title="No files ingested yet" />
            ) : (
              <div className="space-y-2">
                {recentFiles.map(file => (
                  <div key={file._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileType className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.filename}</p>
                        <p className="text-[10px] text-muted-foreground">{timeAgo(file.updatedAt)}</p>
                      </div>
                    </div>
                    <StatusBadge status={file.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Projects */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Folder} title="Active Workspace Projects" sub={`${projects.length} project${projects.length !== 1 ? 's' : ''}`}
              action={<Link href={`/workspaces/${workspaceId}/projects`}><Button variant="ghost" size="sm" className="text-xs gap-1">View All <ChevronRight className="h-3 w-3" /></Button></Link>}
            />
            {projects.length === 0 ? (
              <EmptyState icon={Folder} title="No projects yet" sub="Create your first project to get started." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Project</th>
                      <th className="pb-2 font-medium">Stage</th>
                      <th className="pb-2 font-medium">Health</th>
                      <th className="pb-2 font-medium">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p._id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => router.push(`/workspaces/${workspaceId}/projects/${p._id}`)}>
                        <td className="py-3">
                          <div>
                            <span className="text-xs text-muted-foreground font-mono">{p.code}</span>
                            <p className="text-sm font-semibold text-foreground">{p.name}</p>
                          </div>
                        </td>
                        <td className="py-3"><StatusBadge status={p.status} /></td>
                        <td className="py-3"><StatusBadge status={p.health} /></td>
                        <td className="py-3 text-sm text-muted-foreground">{p.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Health */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Activity} title="Workspace Health" />
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold',
                (workspace?.health?.score ?? 95) >= 90 ? 'bg-emerald-100 text-emerald-700' :
                (workspace?.health?.score ?? 95) >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              )}>
                {workspace?.health?.score ?? 95}%
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">System Score</p>
                <p className="text-xs text-muted-foreground">{workspace?.health?.issues ?? 0} active issues</p>
              </div>
            </div>
            <ProgressBar pct={workspace?.health?.score ?? 95} color="emerald" />
          </div>

          {/* Audit Stream */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Terminal} title="Live Audit Stream" sub="Real-time workspace events" />
            {auditStream.length === 0 ? (
              <EmptyState icon={Terminal} title="No recent events" />
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {auditStream.slice(0, 10).map(entry => (
                  <div key={entry._id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{entry.action}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.user} · {timeAgo(entry.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}