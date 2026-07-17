import axios from 'axios';
import type { ConsensusReview, ResolveConsensusRequest } from '@/types/feature1';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const authHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return { Authorization: `Bearer ${token}` };
};

const jsonHeaders = () => ({
  ...authHeaders(),
  'Content-Type': 'application/json',
});

export const consensusAPI = {
  async debug(datasetId: string): Promise<any> {
    const res = await axios.get(`${API_BASE_URL}/consensus/${datasetId}/debug`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async getReviews(datasetId: string, filters?: { isAgreement?: string; status?: string; search?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.isAgreement) params.set('isAgreement', filters.isAgreement);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await axios.get(`${API_BASE_URL}/consensus/${datasetId}${qs}`, { headers: authHeaders() });
    return res.data;
  },

  async getProgress(datasetId: string): Promise<any> {
    const res = await axios.get(`${API_BASE_URL}/consensus/${datasetId}/progress`, { headers: authHeaders() });
    return res.data;
  },

  async generate(datasetId: string): Promise<{ message: string; reviewsCreated: number; stats: any }> {
    const res = await axios.post(`${API_BASE_URL}/consensus/${datasetId}/generate`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async resolveField(datasetId: string, reviewId: string, fieldName: string, finalDecision: string, resolvedBy: string): Promise<any> {
    const res = await axios.patch(
      `${API_BASE_URL}/consensus/${datasetId}/review`,
      { reviewId, fieldName, finalDecision, resolvedBy },
      { headers: jsonHeaders() },
    );
    return res.data;
  },

  async exportCsv(datasetId: string, exportType: string = 'audit'): Promise<void> {
    const res = await axios.get(`${API_BASE_URL}/consensus/${datasetId}/export`, {
      params: { exportType },
      headers: authHeaders(),
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    const disposition = res.headers['content-disposition'];
    const match = disposition?.match(/filename="(.+)"/);
    link.download = match ? match[1] : `consensus-${exportType}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ─── Round-based review (Phase 2 Items 6-9) ──────────────────────────────────

  async requestReview(datasetId: string): Promise<{ message: string; roundNumber: number }> {
    const res = await axios.post(`${API_BASE_URL}/consensus/${datasetId}/request-review`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async getAnnotatorView(datasetId: string): Promise<any> {
    const res = await axios.get(`${API_BASE_URL}/consensus/${datasetId}/annotator-view`, { headers: authHeaders() });
    return res.data;
  },

  async closeRound(datasetId: string): Promise<{ message: string; roundNumber: number }> {
    const res = await axios.post(`${API_BASE_URL}/consensus/${datasetId}/close-round`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  // ─── Flat paginated grid (Phase 2 Item 8 redesign) ──────────────────────────

  async getConsensusGrid(datasetId: string, params: {
    page?: number; pageSize?: number; status?: string; search?: string;
    sortField?: string; sortDir?: 'asc' | 'desc';
  }): Promise<{
    rows: any[]; totalRows: number; totalPages: number;
    currentPage: number; pageSize: number; fieldColumns: string[];
  }> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    if (params.sortField) qs.set('sortField', params.sortField);
    if (params.sortDir) qs.set('sortDir', params.sortDir);
    const res = await axios.get(`${API_BASE_URL}/consensus/${datasetId}/grid?${qs.toString()}`, { headers: authHeaders() });
    return res.data;
  },

  async bulkUpdateStatus(datasetId: string, body: { rowIndexes: number[]; fieldName?: string; status: string }): Promise<any> {
    const res = await axios.patch(`${API_BASE_URL}/consensus/${datasetId}/bulk-status`, body, { headers: jsonHeaders() });
    return res.data;
  },

  // ── Phase 4: Consensus Clone / Review Session ──────────────────────────────

  async createSnapshot(datasetId: string): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/${datasetId}/snapshot`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async createReviewSession(datasetId: string, body: { snapshotId: string; title: string; participantIds: string[]; fromTiesOnly?: boolean }): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/${datasetId}/review-session`, body, { headers: jsonHeaders() });
    return res.data;
  },

  async joinSession(shareCode: string): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/session/join/${shareCode}`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async submitVote(sessionId: string, body: { rowIndex: number; fieldName: string; value: string }): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/session/${sessionId}/vote`, body, { headers: jsonHeaders() });
    return res.data;
  },

  async getSession(sessionId: string): Promise<any> {
    const res = await axios.get(`${API_BASE_URL}/consensus/session/${sessionId}`, { headers: authHeaders() });
    return res.data;
  },

  async getSessionByShareCode(shareCode: string): Promise<any> {
    const res = await axios.get(`${API_BASE_URL}/consensus/session/share/${shareCode}`, { headers: authHeaders() });
    return res.data;
  },

  async getSessionResults(sessionId: string): Promise<any> {
    const res = await axios.get(`${API_BASE_URL}/consensus/session/${sessionId}/results`, { headers: authHeaders() });
    return res.data;
  },

  async mergeSession(datasetId: string, sessionId: string): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/${datasetId}/merge-session/${sessionId}`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async finalizeSession(datasetId: string, sessionId: string): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/${datasetId}/finalize-session/${sessionId}`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async listSessions(datasetId: string): Promise<any[]> {
    const res = await axios.get(`${API_BASE_URL}/consensus/${datasetId}/sessions`, { headers: authHeaders() });
    return res.data;
  },

  async getStatistics(sessionId: string): Promise<any> {
    const res = await axios.get(`${API_BASE_URL}/consensus/sessions/${sessionId}/statistics`, { headers: authHeaders() });
    return res.data;
  },

  async computeStatistics(sessionId: string): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/sessions/${sessionId}/statistics/compute`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async exportReport(sessionId: string, format: string): Promise<any> {
    return axios.get(`${API_BASE_URL}/consensus/sessions/${sessionId}/export`, {
      params: { format },
      headers: authHeaders(),
      responseType: 'blob',
    });
  },

  // ── Phase 6.7: Collaborative Review (comments, locks, presence, discussion, ties) ──

  async addComment(sessionId: string, body: { text: string; rowIndex?: number; fieldName?: string; parentId?: string; mentions?: string[] }): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/sessions/${sessionId}/comments`, body, { headers: jsonHeaders() });
    return res.data;
  },

  async lockField(sessionId: string, body: { fieldName: string; rowIndex: number }): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/sessions/${sessionId}/lock`, body, { headers: jsonHeaders() });
    return res.data;
  },

  async releaseField(sessionId: string, body: { fieldName: string; rowIndex: number }): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/sessions/${sessionId}/release`, body, { headers: jsonHeaders() });
    return res.data;
  },

  async updatePresence(sessionId: string): Promise<{ ok: boolean }> {
    const res = await axios.post(`${API_BASE_URL}/consensus/sessions/${sessionId}/presence`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async startDiscussion(sessionId: string): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/sessions/${sessionId}/discussion`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async resolveTie(sessionId: string, body: { fieldName: string; rowIndex: number; chosenValue: string }): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/sessions/${sessionId}/resolve-tie`, body, { headers: jsonHeaders() });
    return res.data;
  },

  async archiveSession(sessionId: string): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/sessions/${sessionId}/archive`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async reopenSession(sessionId: string): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/consensus/sessions/${sessionId}/reopen`, {}, { headers: jsonHeaders() });
    return res.data;
  },

  async getResolvedDataset(sessionId: string): Promise<{ rows: any[]; totalRows: number; resolvedCount: number }> {
    const res = await axios.get(`${API_BASE_URL}/consensus/sessions/${sessionId}/resolved-dataset`, { headers: authHeaders() });
    return res.data;
  },
};
