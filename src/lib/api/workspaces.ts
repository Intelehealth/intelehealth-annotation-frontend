import { jsonApi } from '@/lib/api';

// Mirrors backend src/workspace. A workspace has one owner, a member list and
// datasets attached to it. Admins see every workspace; others see the ones
// they own or belong to.

export type WorkspaceDomain = 'Invoice' | 'Healthcare' | 'Banking' | 'Manufacturing' | 'Custom';
export const WORKSPACE_DOMAINS: WorkspaceDomain[] = ['Healthcare', 'Invoice', 'Banking', 'Manufacturing', 'Custom'];

export interface WorkspaceMember {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: 'ADMIN' | 'ANNOTATOR';
  status: string;
  isOnline?: boolean;
  lastLoginAt?: string;
}

export interface WorkspaceResponse {
  _id: string;
  name: string;
  description?: string;
  ownerId: WorkspaceMember;
  members: WorkspaceMember[];
  domain: WorkspaceDomain;
  icon?: string;
  chatModel?: string;
  systemPrompt?: string;
  isActive: boolean;
  datasetCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDataset {
  _id: string;
  name: string;
  description?: string;
  datasetType: string;
  accessType?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInput {
  name: string;
  description?: string;
  domain?: WorkspaceDomain;
}

const base = '/workspaces';

export const workspacesAPI = {
  list: () => jsonApi.get<WorkspaceResponse[]>(base).then((r) => r.data),
  get: (id: string) => jsonApi.get<WorkspaceResponse>(`${base}/${id}`).then((r) => r.data),
  create: (data: WorkspaceInput) => jsonApi.post<WorkspaceResponse>(base, data).then((r) => r.data),
  update: (id: string, data: Partial<WorkspaceInput> & { isActive?: boolean }) =>
    jsonApi.put<WorkspaceResponse>(`${base}/${id}`, data).then((r) => r.data),
  remove: (id: string) => jsonApi.delete(`${base}/${id}`).then(() => undefined),

  addMember: (id: string, who: { userId?: string; email?: string }) =>
    jsonApi.post<WorkspaceResponse>(`${base}/${id}/members`, who).then((r) => r.data),
  removeMember: (id: string, memberId: string) =>
    jsonApi.delete<WorkspaceResponse>(`${base}/${id}/members/${memberId}`).then((r) => r.data),

  datasets: (id: string) => jsonApi.get<WorkspaceDataset[]>(`${base}/${id}/datasets`).then((r) => r.data),
  attachDataset: (id: string, datasetId: string) =>
    jsonApi.post<WorkspaceDataset[]>(`${base}/${id}/datasets`, { datasetId }).then((r) => r.data),
  detachDataset: (id: string, datasetId: string) =>
    jsonApi.delete<WorkspaceDataset[]>(`${base}/${id}/datasets/${datasetId}`).then((r) => r.data),
};

export const apiMessage = (e: unknown, fallback: string) => {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m.join(', ') : m) || err?.message || fallback;
};
