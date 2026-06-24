import axios from 'axios';
import type {
  CloneAssignRequest,
  CloneAssignResponse,
  AnnotationTask,
  ConsensusReview,
  ResolveConsensusRequest,
  CloneGroup,
} from '@/types/feature1';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Existing types (unchanged) ────────────────────────────────────────────────

export interface DatasetResponse {
  _id: string;
  userId:
    | string
    | { _id: string; firstName: string; lastName: string; email: string };
  name: string;
  description: string;
  datasetType: string;
  accessType: 'private' | 'public' | 'shared';
  sharedWith: { userId: string; email: string }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDatasetRequest {
  name: string;
  description: string;
  datasetType: string;
  accessType?: 'private' | 'public' | 'shared';
}

export interface UpdateDatasetRequest {
  name?: string;
  description?: string;
  datasetType?: string;
  accessType?: 'private' | 'public' | 'shared';
  sharedWith?: { userId: string; email: string }[];
}

// ─── Shared header helpers ─────────────────────────────────────────────────────

function authHeaders() {
  const token = localStorage.getItem('accessToken');
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders() {
  return { ...authHeaders(), 'Content-Type': 'application/json' };
}

// ─── datasetsAPI ───────────────────────────────────────────────────────────────

export const datasetsAPI = {
  // ── Existing methods — logic preserved exactly ─────────────────────────────

  async getAll(): Promise<DatasetResponse[]> {
    const response = await axios.get(`${API_BASE_URL}/datasets`, {
      headers: authHeaders(),
    });
    return response.data;
  },

  async search(query: string): Promise<DatasetResponse[]> {
    const response = await axios.get(
      `${API_BASE_URL}/datasets/search?q=${encodeURIComponent(query)}`,
      { headers: authHeaders() },
    );
    return response.data;
  },

  async getById(id: string): Promise<DatasetResponse> {
    const response = await axios.get(`${API_BASE_URL}/datasets/${id}`, {
      headers: authHeaders(),
    });
    return response.data;
  },

  async create(data: CreateDatasetRequest): Promise<DatasetResponse> {
    const response = await axios.post(`${API_BASE_URL}/datasets`, data, {
      headers: jsonHeaders(),
    });
    return response.data;
  },

  async update(id: string, data: UpdateDatasetRequest): Promise<DatasetResponse> {
    const response = await axios.patch(`${API_BASE_URL}/datasets/${id}`, data, {
      headers: jsonHeaders(),
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/datasets/${id}`, {
      headers: authHeaders(),
    });
  },

  async uploadAssets(datasetId: string, files: File[]): Promise<any[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await axios.post(
      `${API_BASE_URL}/datasets/${datasetId}/assets`,
      formData,
      { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async shareWithUsers(datasetId: string, userIds: string[]): Promise<DatasetResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/datasets/${datasetId}/share`,
      { userIds },
      { headers: jsonHeaders() },
    );
    return response.data;
  },

  async makePublic(datasetId: string): Promise<DatasetResponse> {
    const response = await axios.patch(
      `${API_BASE_URL}/datasets/${datasetId}/make-public`,
      {},
      { headers: jsonHeaders() },
    );
    return response.data;
  },

  async makePrivate(datasetId: string): Promise<DatasetResponse> {
    const response = await axios.patch(
      `${API_BASE_URL}/datasets/${datasetId}/make-private`,
      {},
      { headers: jsonHeaders() },
    );
    return response.data;
  },

  // ── Feature 1: New methods ─────────────────────────────────────────────────

  /**
   * Admin clones a dataset and assigns it to 2–5 annotators for consensus annotation.
   *
   * Backend creates one DatasetAnnotationTask per annotator.
   * Unique index {datasetId, annotatorUserId} prevents duplicate assignments
   * and returns HTTP 409 / MongoDB E11000 if attempted.
   *
   * POST /datasets/:id/clone-assign
   */
  async cloneAndAssign(
    datasetId: string,
    annotatorUserIds: string[],
    permissions?: { read: boolean; write: boolean; modify: boolean },
  ): Promise<CloneAssignResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/datasets/${datasetId}/clone-assign`,
      { annotatorUserIds, permissions },
      { headers: jsonHeaders() },
    );
    return response.data;
  },

  /**
   * Annotator fetches their own assigned tasks.
   * Backend scopes to the currently authenticated user via JWT.
   * Each task includes the dataset details and progress stats.
   *
   * GET /datasets/my-tasks
   */
  async getMyTasks(): Promise<AnnotationTask[]> {
    const response = await axios.get(`${API_BASE_URL}/datasets/my-tasks`, {
      headers: authHeaders(),
    });
    return response.data;
  },

  /**
   * Get consensus review records for a dataset (admin only).
   * Backend compares all annotators' answers row by row and returns ConsensusReview docs.
   *
   * GET /datasets/:id/consensus-reviews
   * GET /datasets/:id/consensus-reviews?isAgreement=false  → only disagreements
   */
  async getConsensusReviews(
    datasetId: string,
    onlyDisagreements = false,
  ): Promise<ConsensusReview[]> {
    const qs = onlyDisagreements ? '?isAgreement=false' : '';
    const response = await axios.get(
      `${API_BASE_URL}/datasets/${datasetId}/consensus-reviews${qs}`,
      { headers: authHeaders() },
    );
    return response.data;
  },

  /**
   * Admin sets the final decision on a disagreed row.
   * resolvedBy must be the admin's userId string.
   *
   * PATCH /datasets/:datasetId/consensus-reviews/:reviewId
   */
  async resolveConsensus(
    datasetId: string,
    reviewId: string,
    data: ResolveConsensusRequest,
  ): Promise<ConsensusReview> {
    const response = await axios.patch(
      `${API_BASE_URL}/datasets/${datasetId}/consensus-reviews/${reviewId}`,
      data,
      { headers: jsonHeaders() },
    );
    return response.data;
  },

  /**
   * Admin manually triggers consensus generation.
   * Backend reads all completed DatasetAnnotationTasks for this dataset,
   * compares answers row by row, and writes ConsensusReview documents.
   * Backend owns all comparison logic — frontend never computes consensus itself.
   *
   * POST /datasets/:id/generate-consensus
   */
  async generateConsensus(
    datasetId: string,
  ): Promise<{ message: string; reviewsCreated: number }> {
    const response = await axios.post(
      `${API_BASE_URL}/datasets/${datasetId}/generate-consensus`,
      {},
      { headers: jsonHeaders() },
    );
    return response.data;
  },

  /**
   * Downloads the merged consensus CSV for a dataset.
   * Triggers a browser file-save dialog automatically.
   */
  async exportConsensusCsv(datasetId: string, exportType?: 'audit' | 'dataset'): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const query = exportType ? `?exportType=${exportType}` : '';
    const response = await fetch(
      `${API_BASE_URL}/datasets/${datasetId}/export-consensus-csv${query}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || 'Failed to export CSV');
    }
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch ? filenameMatch[1] : 'consensus.csv';
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Admin fetches original dataset plus all its clone datasets with annotator info and progress.
   *
   * bg-clone: GET /datasets/:id/clone-group
   */
  async getCloneGroup(datasetId: string): Promise<CloneGroup> {
    const response = await axios.get(
      `${API_BASE_URL}/datasets/${datasetId}/clone-group`,
      { headers: authHeaders() },
    );
    return response.data;
  },

  /**
   * Admin fetches all assignments for a parent dataset.
   * 
   * GET /datasets/:id/assignments
   */
  async getAssignments(datasetId: string): Promise<any[]> {
    const response = await axios.get(
      `${API_BASE_URL}/datasets/${datasetId}/assignments`,
      { headers: authHeaders() },
    );
    return response.data;
  },

  /**
   * Transition assignment status.
   * 
   * PATCH /assignments/:id/status
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED',
  ): Promise<any> {
    const response = await axios.patch(
      `${API_BASE_URL}/assignments/${assignmentId}/status`,
      { status },
      { headers: authHeaders() },
    );
    return response.data;
  },
};