'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, RefreshCw, Search, Database, Users, CheckCircle, Clock,
  TrendingUp, Activity, ArrowRight, Folder, LayoutDashboard,
  AlertCircle, FileText, Menu, Settings, Eye, Upload, Download,
  Filter, ArrowUpDown, ChevronRight, Loader2, Home, BarChart3,
  Cpu, Scan, FileType, User, MoreHorizontal, Trash2, Grid3X3,
  List, Star, Save, X, FileSpreadsheet, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

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

interface WorkspaceDocument {
  _id: string;
  filename: string;
  type: string;
  status: string;
  assignedTo: string;
  updatedAt: string;
}
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/sidebar';
import { Separator } from '@/components/ui/separator';
import { workspacesAPI } from '@/lib/api/workspaces';

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
    <motion.div variants={itemVariants} className={cn(
      'relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300',
      'hover:shadow-lg hover:-translate-y-1 card-3d-inner',
      color === 'blue' && 'bg-gradient-to-br from-blue-50/80 to-white border-blue-200/40',
      color === 'emerald' && 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200/40',
      color === 'amber' && 'bg-gradient-to-br from-amber-50/80 to-white border-amber-200/40',
      color === 'violet' && 'bg-gradient-to-br from-violet-50/80 to-white border-violet-200/40',
      color === 'rose' && 'bg-gradient-to-br from-rose-50/80 to-white border-rose-200/40',
      color === 'indigo' && 'bg-gradient-to-br from-indigo-50/80 to-white border-indigo-200/40',
    )}>
      <div className="relative z-10 flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={cn('p-2 rounded-lg', color === 'blue' && 'bg-blue-100/60 text-blue-600', color === 'emerald' && 'bg-emerald-100/60 text-emerald-600', color === 'amber' && 'bg-amber-100/60 text-amber-600', color === 'violet' && 'bg-violet-100/60 text-violet-600', color === 'rose' && 'bg-rose-100/60 text-rose-600', color === 'indigo' && 'bg-indigo-100/60 text-indigo-600')}>
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
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
    annotated: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    in_review: 'bg-violet-100 text-violet-700 border-violet-200',
    paginated: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    ocr_done: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    validated: 'bg-teal-100 text-teal-700 border-teal-200',
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

function PipelineStepper({ activeStage }: { activeStage: number }) {
  const stages = ['Upload', 'Image Proc', 'OCR Stage', 'Validation', 'Annotation'];
  return (
    <div className="flex items-center gap-0">
      {stages.map((stage, i) => (
        <div key={stage} className="flex items-center flex-1">
          <div className={cn(
            'px-3 py-2 rounded-lg text-[10px] font-medium border transition-all whitespace-nowrap',
            i === activeStage ? 'bg-blue-100 text-blue-700 border-blue-200 ring-2 ring-blue-200' :
            i < activeStage ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
            'bg-muted text-muted-foreground border-transparent'
          )}>
            {stage}
          </div>
          {i < stages.length - 1 && <div className={cn('flex-1 h-px mx-1', i < activeStage ? 'bg-emerald-300' : 'bg-border')} />}
        </div>
      ))}
    </div>
  );
}

export default function DatasetDashboard() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;
  const datasetId = params.datasetId as string;

  const [workspace, setWorkspace] = useState<any>(null);
  const [dataset, setDataset] = useState<WorkspaceDataset | null>(null);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
  const [fintechStep, setFintechStep] = useState(1);

  // Sync status filter with status parameter from query string
  useEffect(() => {
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [statusParam]);

  const load = async () => {
    try {
      // Load workspace context to determine fintech mode
      const ws = await workspacesAPI.getWorkspace(workspaceId);
      if (ws && !('_isError' in ws)) {
        setWorkspace(ws);
      }

      const mockDocuments: WorkspaceDocument[] = [
        { _id: 'doc-1', filename: 'patient_intake_001.pdf', type: 'PDF', status: 'annotated', assignedTo: 'Dr. Sarah', updatedAt: '2025-06-22T10:30:00Z' },
        { _id: 'doc-2', filename: 'radiology_report_342.pdf', type: 'PDF', status: 'in_review', assignedTo: 'Dr. Chen', updatedAt: '2025-06-21T14:20:00Z' },
        { _id: 'doc-3', filename: 'lab_results_batch_87.xlsx', type: 'Spreadsheet', status: 'processing', assignedTo: 'Dr. Patel', updatedAt: '2025-06-20T09:15:00Z' },
        { _id: 'doc-4', filename: 'patient_survey_q2.pdf', type: 'PDF', status: 'pending', assignedTo: '', updatedAt: '2025-06-19T16:45:00Z' },
        { _id: 'doc-5', filename: 'discharge_summary_56.pdf', type: 'PDF', status: 'annotated', assignedTo: 'Dr. Sarah', updatedAt: '2025-06-18T11:00:00Z' },
        { _id: 'doc-6', filename: 'consent_form_112.pdf', type: 'PDF', status: 'failed', assignedTo: '', updatedAt: '2025-06-17T08:30:00Z' },
        { _id: 'doc-7', filename: 'imaging_notes_89.docx', type: 'Document', status: 'completed', assignedTo: 'Dr. Chen', updatedAt: '2025-06-16T13:10:00Z' },
        { _id: 'doc-8', filename: 'pathology_report_23.pdf', type: 'PDF', status: 'in_review', assignedTo: 'Dr. Patel', updatedAt: '2025-06-15T15:25:00Z' },
      ];

      const mockDataset: WorkspaceDataset = {
        _id: datasetId,
        name: 'Patient Admission Forms',
        type: 'Medical Records',
        owner: 'Sarah Chen',
        status: 'active',
        progress: 88,
        docCount: 12402,
        annotated: 10913,
        pendingReview: 1489,
        completed: 9243,
        failed: 12,
        createdAt: '2025-01-15T00:00:00Z',
        updatedAt: '2025-06-20T00:00:00Z',
      };

      setDataset(mockDataset);
      setDocuments(mockDocuments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (datasetId) load(); }, [datasetId]);

  const toggleSelect = (docId: string) => {
    setSelectedDocs(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);
  };

  const toggleSelectAll = () => {
    setSelectedDocs(prev => prev.length === filtered.length ? [] : filtered.map(d => d._id));
  };

  const filtered = documents.filter(d => {
    const matchesSearch = d.filename.toLowerCase().includes(searchQuery.toLowerCase()) || d.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!dataset) return null;

  const totalDocs = dataset.docCount || 0;
  const annotated = dataset.annotated || 0;
  const pendingReview = dataset.pendingReview || 0;
  const completed = dataset.completed || 0;
  const failed = dataset.failed || 0;

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
              <Link href={`/workspaces/${workspaceId}`} className="text-muted-foreground hover:text-foreground">Workspace</Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Link href={`/workspaces/${workspaceId}/projects`} className="text-muted-foreground hover:text-foreground">Projects</Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Link href={`/workspaces/${workspaceId}/projects/${projectId}`} className="text-muted-foreground hover:text-foreground">Project</Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-semibold text-foreground">{dataset.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={dataset.status} />
          </div>
        </div>
      </header>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{dataset.name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span>Owner: {dataset.owner}</span>
              <span>·</span>
              <span>Created: {dataset.createdAt ? new Date(dataset.createdAt).toLocaleDateString() : 'N/A'}</span>
              <span>·</span>
              <span>{totalDocs} documents</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setUploadDrawerOpen(true)}>
            <Upload className="h-3.5 w-3.5" /> Upload Docs
          </Button>
          <Link href={`/workspaces/${workspaceId}/projects/${projectId}/datasets/${datasetId}/analytics`}>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* KPI Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Docs" value={totalDocs} icon={FileText} color="blue" />
        <StatCard label="Annotated" value={annotated} icon={CheckCircle} color="emerald" />
        <StatCard label="Pending Review" value={pendingReview} icon={Eye} color="amber" />
        <StatCard label="Completed" value={completed} icon={CheckCircle} color="indigo" />
        <StatCard label="Failed" value={failed} icon={AlertCircle} color="rose" />
      </motion.div>

      {/* Pipeline Stepper */}
      <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
        <SectionHeader icon={Cpu} title="Batch Processing Pipeline" sub="Document processing stages" />
        <PipelineStepper activeStage={dataset.status === 'completed' ? 4 : dataset.status === 'processing' ? 2 : 1} />
      </motion.div>

      {/* Document Repository */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={FileText} title="Document Repository" sub={`${documents.length} document${documents.length !== 1 ? 's' : ''}`} />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  className="pl-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-2.5 py-1 bg-white h-9">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent border-0 py-0.5 focus:ring-0 focus:outline-none cursor-pointer font-medium text-gray-700 text-xs"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="processing">Processing</option>
                    <option value="in_review">In Review</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bulk action bar */}
            {selectedDocs.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <span className="text-sm font-medium text-blue-700">{selectedDocs.length} selected</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => {
                      showToast({ title: 'Documents Assigned', description: `Assigned ${selectedDocs.length} documents for team verification review.`, type: 'success' });
                      setSelectedDocs([]);
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      setDocuments(prev => prev.filter(d => !selectedDocs.includes(d._id)));
                      setSelectedDocs([]);
                      showToast({ title: 'Documents Deleted', description: 'Selected documents deleted successfully.', type: 'success' });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedDocs([])}>
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                </div>
              </div>
            )}

            {filtered.length === 0 ? (
              <EmptyState icon={FileText} title={searchQuery ? 'No documents match your search' : 'No documents uploaded'} sub={searchQuery ? 'Try a different search term' : 'Upload documents to get started.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 w-8">
                        <input
                          type="checkbox"
                          checked={selectedDocs.length === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="pb-2 font-medium">Filename</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Assigned To</th>
                      <th className="pb-2 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(doc => (
                      <tr key={doc._id} className={cn('border-b last:border-0 hover:bg-muted/30 transition-colors', selectedDocs.includes(doc._id) && 'bg-blue-50/50')}>
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={selectedDocs.includes(doc._id)}
                            onChange={() => toggleSelect(doc._id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <FileType className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{doc.filename}</span>
                          </div>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">{doc.type}</td>
                        <td className="py-3"><StatusBadge status={doc.status} /></td>
                        <td className="py-3 text-xs text-muted-foreground">{doc.assignedTo || '—'}</td>
                        <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(doc.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Search} title="Operational Search" />
            <div className="flex gap-2">
              <Input placeholder="Search across documents..." className="text-sm" />
              <Button size="sm"><Search className="h-4 w-4" /></Button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Star} title="Saved Queries" />
            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-muted/50 text-xs text-foreground cursor-pointer hover:bg-muted transition-colors">All PDF documents</div>
              <div className="p-2 rounded-lg bg-muted/50 text-xs text-foreground cursor-pointer hover:bg-muted transition-colors">Pending review</div>
              <div className="p-2 rounded-lg bg-muted/50 text-xs text-foreground cursor-pointer hover:bg-muted transition-colors">Failed processing</div>
              <div className="p-2 rounded-lg bg-muted/50 text-xs text-foreground cursor-pointer hover:bg-muted transition-colors">Assigned to me</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader icon={Zap} title="Quick Actions" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-10 gap-1.5 text-xs" onClick={() => setUploadDrawerOpen(true)}>
                <Upload className="h-3.5 w-3.5" /> Upload
              </Button>
              <Button variant="outline" size="sm" className="h-10 gap-1.5 text-xs" onClick={() => router.push(`/workspaces/${workspaceId}/projects/${projectId}/datasets/${datasetId}/analytics`)}>
                <BarChart3 className="h-3.5 w-3.5" /> Analytics
              </Button>
              <Button variant="outline" size="sm" className="h-10 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              <Button variant="outline" size="sm" className="h-10 gap-1.5 text-xs">
                <Settings className="h-3.5 w-3.5" /> Settings
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Upload Wizard Dialog Modal with Fintech Variant Integration */}
      {uploadDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  {workspace?.industry === 'financial' ? 'Fintech Document Ingestion Wizard' : 'Ingest Document Batch'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {workspace?.industry === 'financial' ? 'Automated Invoice & Ledger Pipeline' : 'Upload document files or spreadsheets to this dataset'}
                </p>
              </div>
              <button onClick={() => { setUploadDrawerOpen(false); setFintechStep(1); }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {workspace?.industry === 'financial' ? (
                // Fintech Ingestion Wizard
                <div className="space-y-4">
                  {/* Step indicators */}
                  <div className="flex items-center justify-between px-6 pb-2 border-b">
                    {[
                      { step: 1, label: 'Upload Files' },
                      { step: 2, label: 'Field Mapping' },
                      { step: 3, label: 'Queue Summary' }
                    ].map((s) => (
                      <div key={s.step} className="flex items-center gap-2">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                          fintechStep === s.step ? 'bg-blue-600 text-white' : fintechStep > s.step ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-muted-foreground'
                        )}>
                          {fintechStep > s.step ? '✓' : s.step}
                        </div>
                        <span className={cn('text-xs font-medium', fintechStep === s.step ? 'text-blue-700 font-bold' : 'text-muted-foreground')}>{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {fintechStep === 1 && (
                    <div className="space-y-4 text-center py-6">
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 bg-gray-50/50 hover:bg-blue-50/20 hover:border-blue-300 transition-all flex flex-col items-center justify-center cursor-pointer">
                        <FileSpreadsheet className="h-10 w-10 text-blue-500 mb-3" />
                        <p className="text-sm font-semibold text-gray-700">Drag and drop invoice batch here</p>
                        <p className="text-xs text-muted-foreground mt-1">Accepts CSV, XLSX, PDF, PNG formats (max 50MB)</p>
                        <Button size="sm" className="mt-4 gap-1.5 h-8 text-xs bg-blue-600 text-white">
                          <Plus className="h-3.5 w-3.5" /> Select Files
                        </Button>
                      </div>
                      
                      <div className="flex justify-end pt-4">
                        <Button onClick={() => setFintechStep(2)} className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                          Configure Mappings <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {fintechStep === 2 && (
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700 leading-normal">
                        * Map headers or text extraction fields detected in the financial documents to your standard ledger keys.
                      </div>
                      
                      <div className="border rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-bold text-gray-500 uppercase">
                              <th className="p-3">Standard Field</th>
                              <th className="p-3">Document Field (Mapped)</th>
                              <th className="p-3">Data Type</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {[
                              { label: 'Vendor Name', desc: 'vendor_name', type: 'String', mapping: 'vendor_name' },
                              { label: 'Invoice #', desc: 'invoice_number', type: 'Alphanumeric', mapping: 'invoice_number' },
                              { label: 'Amount', desc: 'total_amount', type: 'Decimal', mapping: 'total_amount' },
                              { label: 'Date', desc: 'invoice_date', type: 'Date', mapping: 'invoice_date' },
                              { label: 'Tax ID', desc: 'vat_id', type: 'Alphanumeric', mapping: 'vat_id' },
                            ].map((row) => (
                              <tr key={row.label} className="hover:bg-gray-50/50">
                                <td className="p-3 font-semibold text-gray-700">{row.label}</td>
                                <td className="p-3">
                                  <select defaultValue={row.mapping} className="bg-white border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer">
                                    <option value={row.mapping}>{row.desc}</option>
                                    <option value="issuer">issuer</option>
                                    <option value="total_due">total_due</option>
                                    <option value="ref_no">ref_no</option>
                                    <option value="custom">-- Custom String --</option>
                                  </select>
                                </td>
                                <td className="p-3 font-mono text-[10px] text-gray-500">{row.type}</td>
                                <td className="p-3">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                    ✓ Auto-Matched
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => setFintechStep(1)} className="text-xs h-9">
                          Back
                        </Button>
                        <Button onClick={() => setFintechStep(3)} className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                          Process Queue <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {fintechStep === 3 && (
                    <div className="space-y-4">
                      {/* Fintech specialized queue & error lists */}
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ingestion Pipeline Queue</p>
                      
                      <div className="space-y-2">
                        {[
                          { file: 'inv_acme_corp_8847.pdf', status: 'queued', size: '1.2 MB' },
                          { file: 'inv_globex_121.pdf', status: 'queued', size: '942 KB' },
                          { file: 'ledger_reconciliation_july.xlsx', status: 'invalid_mapping', size: '4.1 MB', error: 'Missing Required Field: Amount' },
                        ].map((qitem, i) => (
                          <div key={i} className={cn(
                            'p-3 border rounded-xl flex items-center justify-between text-xs',
                            qitem.status === 'queued' ? 'bg-blue-50/30 border-blue-100' : 'bg-red-50/30 border-red-150 text-red-700'
                          )}>
                            <div className="flex gap-2.5 items-center">
                              <FileText className={cn('h-4 w-4 flex-shrink-0', qitem.status === 'queued' ? 'text-blue-500' : 'text-red-500')} />
                              <div>
                                <p className="font-semibold text-gray-700">{qitem.file}</p>
                                <p className="text-[10px] text-muted-foreground">{qitem.size} {qitem.error && `· ${qitem.error}`}</p>
                              </div>
                            </div>
                            <div>
                              {qitem.status === 'queued' ? (
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] border border-blue-200">
                                  Ready in Queue
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px] border border-red-200 font-bold">
                                  Mapping Error
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-4 border-t">
                        <Button variant="outline" onClick={() => setFintechStep(2)} className="text-xs h-9">
                          Back
                        </Button>
                        <Button
                          onClick={() => {
                            showToast({ title: 'Ingestion Triggered', description: '2 documents submitted to extraction queue.', type: 'success' });
                            setUploadDrawerOpen(false);
                            setFintechStep(1);
                            load();
                          }}
                          className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          ✓ Confirm & Execute
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Regular Uploader
                <div className="space-y-4 text-center py-8">
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 bg-gray-50/50 hover:bg-blue-50/20 hover:border-blue-300 transition-all flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="h-12 w-12 text-blue-500 mb-3" />
                    <p className="text-sm font-semibold text-gray-700">Drag and drop file batch here</p>
                    <p className="text-xs text-muted-foreground mt-1">Accepts PDF, DOCX, XLSX, TXT, JSON (max 100MB)</p>
                    <Button size="sm" className="mt-4 gap-1.5 h-8 text-xs bg-blue-600 text-white">
                      <Plus className="h-3.5 w-3.5" /> Select Files
                    </Button>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => {
                        showToast({ title: 'Ingestion Triggered', description: 'Batch submitted successfully.', type: 'success' });
                        setUploadDrawerOpen(false);
                        load();
                      }}
                      className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Upload Files
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}