import { jsonApi } from '../api';
import { datasetsAPI, DatasetResponse } from './datasets';
import { usersAPI, UserResponse } from './users';
import { notificationsAPI, NotificationResponse } from './notifications';

// Data the dashboard needs that no other module wraps yet, plus one aggregate
// loader. Endpoint shapes are taken from the backend on feature/rag-agent.

export interface ConsensusHealth {
  status: string;
  reviews: { total: number; agreed: number; conflict: number; tie: number; pending: number };
  sessions: { total: number; active: number; completed: number };
  cache?: { lastCompute?: string };
}

export interface ConsensusProgress {
  totalRows: number;
  agreedRows: number;
  conflictRows: number;
  tieRows: number;
  resolved: number;
  pending: number;
}

export interface ReliabilityScore {
  key: string;
  label: string;
  score: number;
  percentage: number;
  interpretation: string;
  supported: boolean;
  itemsUsed: number;
}

export interface Reliability {
  selectedMetric: string;
  selectedOverall?: ReliabilityScore;
  overall: ReliabilityScore[];
  perField: { fieldName: string; displayName: string; selected?: ReliabilityScore }[];
}

export interface Assignment {
  _id: string;
  datasetId: string;
  cloneDatasetId?: { _id: string; name: string } | string;
  assignedTo?: { _id: string; email: string; firstName?: string; lastName?: string } | string;
  status: string;
  totalRows: number;
  completedRows: number;
  progressPercentage: number;
  submittedAt?: string;
  updatedAt: string;
  createdAt: string;
}

export interface SchemaChangeRequest {
  _id: string;
  datasetId: string | { _id: string; name: string };
  requestedBy?: { firstName?: string; lastName?: string; email?: string } | string;
  status: string;
  createdAt: string;
  message?: string;
  description?: string;
}

export type AgentTool =
  | 'get_dataset_summary'
  | 'get_processing_failures'
  | 'get_low_confidence_fields'
  | 'get_pending_reviews'
  | 'get_annotation_progress'
  | 'get_consensus_conflicts'
  | 'find_duplicate_candidates'
  | 'find_rows_by_field_value';

/** One parent dataset with everything the health table shows. */
export interface DatasetHealthRow {
  dataset: DatasetResponse;
  annotators: number;
  assignments: Assignment[];
  progress: number; // mean % across assignments
  submitted: number; // assignments awaiting review
  health?: ConsensusHealth;
  consensus?: ConsensusProgress;
  reliability?: Reliability;
}

export interface AdminOverview {
  datasets: DatasetResponse[];
  users: UserResponse[];
  reviewQueue: Assignment[];
  schemaRequests: SchemaChangeRequest[];
  notifications: NotificationResponse[];
  rows: DatasetHealthRow[];
}

const settled = async <T,>(p: Promise<T>): Promise<T | undefined> => {
  try { return await p; } catch { return undefined; }
};

// Bounded parallelism: a workspace can have dozens of parent datasets, and each
// needs 3-4 requests. Four in flight keeps the dashboard responsive without
// hammering the API.
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
    }),
  );
  return out;
}

export const dashboardDataAPI = {
  async health(datasetId: string): Promise<ConsensusHealth> {
    return (await jsonApi.get(`/consensus/${datasetId}/health`)).data;
  },
  async consensusProgress(datasetId: string): Promise<ConsensusProgress> {
    return (await jsonApi.get(`/consensus/${datasetId}/progress`)).data;
  },
  async reliability(datasetId: string): Promise<Reliability> {
    return (await jsonApi.get(`/consensus/${datasetId}/reliability`)).data;
  },
  async queryAgent(datasetId: string, tool: AgentTool, params?: Record<string, unknown>): Promise<{ tool: string; result: string }> {
    return (await jsonApi.post('/analytics/agent/query', { datasetId, tool, params })).data;
  },

  /** Everything the admin dashboard renders, loaded together. */
  async adminOverview(): Promise<AdminOverview> {
    const [datasets, users, reviewQueue, schemaRequests, notifications] = await Promise.all([
      datasetsAPI.getAll(),
      usersAPI.getAll().catch(() => [] as UserResponse[]),
      datasetsAPI.getReviewQueue().catch(() => [] as Assignment[]),
      datasetsAPI.getPendingChangeRequests().catch(() => [] as SchemaChangeRequest[]),
      notificationsAPI.getAll().catch(() => [] as NotificationResponse[]),
    ]);

    const parents = datasets.filter((d) => !d.isClone);
    const cloneCount = (id: string) => datasets.filter((c) => c.isClone && String(c.cloneParentId) === String(id)).length;

    const rows = await mapLimit(parents, 4, async (dataset): Promise<DatasetHealthRow> => {
      const hasClones = cloneCount(dataset._id) > 0;
      const [assignments, health, consensus, reliability] = await Promise.all([
        settled(datasetsAPI.getAssignments(dataset._id) as Promise<Assignment[]>),
        hasClones ? settled(dashboardDataAPI.health(dataset._id)) : undefined,
        hasClones ? settled(dashboardDataAPI.consensusProgress(dataset._id)) : undefined,
        hasClones ? settled(dashboardDataAPI.reliability(dataset._id)) : undefined,
      ]);
      const a = assignments ?? [];
      const progress = a.length ? Math.round(a.reduce((s, x) => s + (x.progressPercentage ?? 0), 0) / a.length) : 0;
      return {
        dataset,
        annotators: a.length || cloneCount(dataset._id),
        assignments: a,
        progress,
        submitted: a.filter((x) => x.status === 'SUBMITTED').length,
        health,
        consensus,
        reliability: reliability && (reliability.selectedOverall?.supported ?? true) ? reliability : undefined,
      };
    });

    return { datasets, users, reviewQueue, schemaRequests, notifications, rows };
  },
};
