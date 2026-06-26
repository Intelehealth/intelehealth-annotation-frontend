import axios from 'axios';
import type { ConsensusReview, ResolveConsensusRequest } from '@/types/feature1';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const authHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return { Authorization: `Bearer ${token}` };
};

const jsonHeaders = () => ({
  ...authHeaders(),
  'Content-Type': 'application/json',
});

export const consensusAPI = {
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

  async exportCsv(datasetId: string, exportType: 'audit' | 'dataset' = 'audit'): Promise<void> {
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
};