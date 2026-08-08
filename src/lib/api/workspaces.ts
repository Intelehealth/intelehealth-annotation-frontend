import { jsonApi } from '../api';

export interface WorkspaceInfo {
  _id: string;
  name: string;
  domain?: string;
  icon?: string;
  chatModel?: string;
  embedModel?: string;
  ocrModel?: string;
  systemPrompt?: string;
}

export const workspacesAPI = {
  async list(): Promise<WorkspaceInfo[]> {
    const res = await jsonApi.get(`/workspaces`);
    return res.data;
  },

  async get(id: string): Promise<WorkspaceInfo> {
    const res = await jsonApi.get(`/workspaces/${id}`);
    return res.data;
  },

  async create(data: Partial<WorkspaceInfo> & { name: string }): Promise<WorkspaceInfo> {
    const res = await jsonApi.post(`/workspaces`, data);
    return res.data;
  },

  async update(id: string, data: Partial<WorkspaceInfo>): Promise<WorkspaceInfo> {
    const res = await jsonApi.put(`/workspaces/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await jsonApi.delete(`/workspaces/${id}`);
  },
};