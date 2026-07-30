'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { datasetsAPI } from '@/lib/api/datasets';
import { consensusAPI } from '@/lib/api/consensus';
import { Sidebar } from '@/components/sidebar';
import { TopNav } from '@/components/top-nav';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  ClipboardList,
  Loader2,
  Database,
  FileText,
  Image,
  AudioLines,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  GitBranch,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationTask, TaskStatus } from '@/types/feature1';
import { computeTaskStatus, taskStatusLabel } from '@/types/feature1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const datasetTypeIcon: Record<string, React.ElementType> = {
  text: FileText,
  image: Image,
  audio: AudioLines,
  multimodal: Database,
};

/**
 * Compute status dynamically from real annotation progress.
 *
 * Rules (from requirements):
 *   completedRows === 0                              → "not_started"
 *   completedRows > 0 AND completedRows < totalRows  → "in_progress"
 *   completedRows === totalRows                      → "completed"
 *
 * Falls back gracefully to 'not_started' when progress data is absent
 * or taskStatus is undefined (crash-safe).
 */
function resolveStatus(task: AnnotationTask): TaskStatus {
  return computeTaskStatus(task.progress, task.taskStatus);
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { cls: string; label: string; icon: React.ElementType }> = {
  PENDING:         { cls: 'bg-gray-100 text-gray-600 border border-gray-200', label: 'Pending', icon: Clock },
  IN_PROGRESS:     { cls: 'bg-blue-100 text-blue-700 border border-blue-200', label: 'In Progress', icon: Play },
  SUBMITTED:       { cls: 'bg-amber-100 text-amber-800 border border-amber-200', label: 'Submitted', icon: Clock },
  REWORK_REQUIRED: { cls: 'bg-red-100 text-red-800 border border-red-200', label: 'Rework Required', icon: AlertCircle },
  APPROVED:        { cls: 'bg-green-100 text-green-800 border border-green-200', label: 'Approved', icon: CheckCircle },
  COMPLETED:       { cls: 'bg-purple-100 text-purple-800 border border-purple-200', label: 'Completed', icon: CheckCircle },
};

function StatusPill({ status }: { status: string }) {
  const config = STATUS_STYLES[status?.toUpperCase()] ?? STATUS_STYLES.PENDING;
  const { cls, label, icon: Icon } = config;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cls)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ task }: { task: AnnotationTask }) {
  const status = resolveStatus(task);
  if (status === 'not_started' || status === 'pending') return null;

  const { totalRows = 0, completedRows = 0 } = task.progress ?? {};
  const pct = totalRows > 0 ? Math.min(100, Math.round((completedRows / totalRows) * 100)) : 0;
  const barColor = status === 'completed' ? 'bg-green-500' : 'bg-blue-500';

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{completedRows} / {totalRows} rows</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Skeleton loading card ─────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="border border-gray-100 rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-gray-200 rounded w-2/5" />
        <div className="h-6 bg-gray-200 rounded-full w-24" />
      </div>
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
      <div className="h-1.5 bg-gray-100 rounded-full" />
      <div className="mt-4 h-9 bg-gray-100 rounded-lg w-full" />
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────
interface TaskCardProps {
  task: AnnotationTask;
  onOpen: (task: AnnotationTask) => void;
  onRefresh?: () => void;
}

function TaskCard({ task, onOpen, onRefresh }: TaskCardProps) {
  const typeKey = task.datasetType || task.dataset?.datasetType || 'text';
  const TypeIcon = datasetTypeIcon[typeKey] ?? Database;

  const assignmentStatus = task.assignmentStatus || 'PENDING';
  const isSubmittedOrDone = ['SUBMITTED', 'APPROVED', 'COMPLETED'].includes(assignmentStatus.toUpperCase());
  const canSubmitForReview = (assignmentStatus === 'IN_PROGRESS' || assignmentStatus === 'REWORK_REQUIRED') && 
    task.progress && task.progress.completedRows === task.progress.totalRows && task.progress.totalRows > 0;

  const displayName = task.name || task.dataset?.name || `Clone ${task.cloneIndex ?? '?'}`;
  const parentName = task.parentName;

  const assignedDate = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const handleOpen = () => onOpen(task);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to submit this assignment for review? You will not be able to edit annotations while it is under review.')) {
      return;
    }
    try {
      await datasetsAPI.updateAssignmentStatus(task.assignmentId!, 'SUBMITTED');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit assignment');
    }
  };

  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-sm transition-all duration-200 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <TypeIcon className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                {task.pendingUpdate && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700 animate-pulse">
                    ⚠ Pending Update
                  </span>
                )}
              </div>
              {parentName && (
                <p className="text-xs text-indigo-500 flex items-center gap-1 mt-0.5">
                  <GitBranch className="h-3 w-3" />
                  from {parentName}
                </p>
              )}
              {assignedDate && <p className="text-xs text-gray-400 mt-0.5">Assigned {assignedDate}</p>}
            </div>
          </div>
          <StatusPill status={assignmentStatus} />
        </div>

        <ProgressBar task={task} />
      </div>

      <div className="mt-5 space-y-2">
        {canSubmitForReview && (
          <Button
            onClick={handleSubmit}
            size="sm"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center justify-center gap-1.5"
          >
            <ClipboardList className="h-4 w-4" />
            Submit for Review
          </Button>
        )}

        <Button
          onClick={handleOpen}
          size="sm"
          disabled={isSubmittedOrDone}
          className={cn(
            'w-full text-sm font-medium',
            isSubmittedOrDone
              ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-default hover:bg-gray-100'
              : 'bg-blue-600 hover:bg-blue-700 text-white',
          )}
        >
          {isSubmittedOrDone ? (
            <span className="flex items-center justify-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" /> Locked / Under Review
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              {assignmentStatus === 'PENDING' ? 'Start Annotating' : 'Resume Annotating'}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MyTasksPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [tasks, setTasks] = useState<AnnotationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewRequests, setReviewRequests] = useState<any[]>([]);

  const isInvited = user?.invitedByAdmin !== false;

  // Auth + role guard — admin has no tasks, redirected to dashboard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role?.toUpperCase() === 'ADMIN') { router.push('/dashboard'); return; }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role?.toUpperCase() !== 'ADMIN') {
      if (isInvited) {
        loadTasks();
      } else {
        setLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, user, isInvited]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, requests] = await Promise.all([
        datasetsAPI.getMyTasks(),
        consensusAPI.getMyReviewRequests().catch(() => []),
      ]);
      setTasks(data);
      setReviewRequests(requests);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load your tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Physical clone architecture:
   * task._id = clone Dataset _id → navigate to /dataset/:cloneId/annotation
   */
  const handleOpenTask = async (task: AnnotationTask) => {
    const assignmentId = task.assignmentId;
    const currentStatus = task.assignmentStatus;
    if (assignmentId && currentStatus === 'PENDING') {
      try {
        await datasetsAPI.updateAssignmentStatus(assignmentId, 'IN_PROGRESS');
      } catch (err) {
        console.error('Failed to transition assignment to IN_PROGRESS:', err);
      }
    }
    router.push(`/dataset/${task._id}/annotation?taskId=${task.taskId || ''}`);
  };

  const handleOpenReviewRequest = (request: any) => {
    if (!request.cloneDatasetId) return;
    const task = tasks.find((candidate) => candidate._id === request.cloneDatasetId);
    router.push(`/dataset/${request.cloneDatasetId}/annotation?taskId=${task?.taskId || ''}&reviewRequestId=${request.reviewRequestId}&rowIndex=${request.rowIndex}`);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role?.toUpperCase() === 'ADMIN') return null;

  if (!isInvited) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                  <h1 className="text-2xl font-semibold text-gray-900">My Tasks</h1>
                </div>
                <p className="text-gray-500 text-sm">
                  Datasets assigned to you for annotation
                </p>
              </div>
            </div>

            <Card className="border-amber-100 bg-amber-50/10">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-950 mb-2">Waiting for admin approval</h3>
                <p className="text-sm text-gray-650 max-w-md">
                  Your account has not yet been approved.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Stats — all computed from real progress, never from stored taskStatus
  const notStarted = tasks.filter((t) => {
    const s = t.assignmentStatus || 'PENDING';
    return s === 'PENDING';
  }).length;
  const inProgress = tasks.filter((t) => t.assignmentStatus === 'IN_PROGRESS' || t.assignmentStatus === 'REWORK_REQUIRED').length;
  const completed  = tasks.filter((t) => ['SUBMITTED', 'APPROVED', 'COMPLETED'].includes(t.assignmentStatus || '')).length;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopNav />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-4 md:p-6 max-w-5xl mx-auto"
        >

          {/* Stats row — computed from real progress */}
          {!loading && !error && tasks.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Not Started', value: notStarted, color: 'text-gray-700', bg: 'bg-gray-50' },
                { label: 'In Progress/Rework', value: inProgress, color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'Submitted/Done',   value: completed,  color: 'text-green-700', bg: 'bg-green-50' },
              ].map((s) => (
                <div key={s.label} className={cn('p-4 rounded-xl border border-gray-200 text-center', s.bg)}>
                  <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
            </div>
          )}

          {!loading && !error && reviewRequests.length > 0 && (
            <section className="mb-6 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Review Requests</h2>
                  <p className="mt-1 text-xs text-gray-500">Rows returned by an admin for re-annotation.</p>
                </div>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">{reviewRequests.length} pending</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {reviewRequests.map((request) => (
                  <div key={request.reviewRequestId} className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">Review Requested</span>
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">{request.datasetName || 'Dataset'} · Row {Number(request.rowIndex) + 1}</h3>
                      </div>
                      <span className="text-[10px] font-medium text-gray-500">Due {new Date(request.deadlineAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2"><div><span className="block text-[10px] font-semibold uppercase text-gray-400">Reason</span>{request.reason}</div><div><span className="block text-[10px] font-semibold uppercase text-gray-400">Status</span>{request.status}</div></div>
                    <p className="mt-3 rounded-lg bg-white/80 p-2.5 text-xs text-gray-700">{request.comment}</p>
                    <div className="mt-3 flex justify-end"><Button size="sm" onClick={() => handleOpenReviewRequest(request)} className="bg-violet-600 text-white hover:bg-violet-700">Open Review</Button></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Error state */}
          {!loading && error && (
            <Card className="border-red-100">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-300 mb-4" />
                <p className="text-gray-700 mb-4">{error}</p>
                <Button onClick={loadTasks} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" /> Try again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!loading && !error && tasks.length === 0 && (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList className="h-8 w-8 text-blue-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No tasks assigned yet</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Your admin hasn&apos;t assigned any datasets to you yet. Check back later or
                  contact your admin to get started.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Task grid */}
          {!loading && !error && tasks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <TaskCard key={task._id} task={task} onOpen={handleOpenTask} onRefresh={loadTasks} />
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
