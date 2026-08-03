import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders() {
  return { ...authHeaders(), "Content-Type": "application/json" };
}

export interface AiModule {
  name: string;
  enabled: boolean;
  description?: string;
}

export interface WorkflowStage {
  name: string;
  order: number;
  status?: string;
}

export interface WorkspaceResponse {
  _id: string;
  name: string;
  description?: string;
  logo?: string;
  themeColor?: string;
  visibility?: string;
  industry?: string;
  supportedDocTypes?: string[];
  enabledAiModules?: AiModule[];
  workflowStages?: WorkflowStage[];
  complianceTags?: string[];
  status?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  logo?: string;
  themeColor?: string;
  visibility?: string;
  industry?: string;
  templateId?: string;
  supportedDocTypes?: string[];
  enabledAiModules?: AiModule[];
  workflowStages?: WorkflowStage[];
  complianceTags?: string[];
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  logo?: string;
  themeColor?: string;
  visibility?: string;
  industry?: string;
  supportedDocTypes?: string[];
  enabledAiModules?: AiModule[];
  workflowStages?: WorkflowStage[];
  complianceTags?: string[];
}

export const workspacesAPI = {
  async getWorkspaces(): Promise<WorkspaceResponse[] | { _isError: true; message: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/workspaces`, {
        headers: authHeaders(),
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to fetch workspaces" };
    }
  },

  async getMyWorkspaces(): Promise<WorkspaceResponse[] | { _isError: true; message: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/workspaces/my`, {
        headers: authHeaders(),
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to fetch my workspaces" };
    }
  },

  async getWorkspace(id: string): Promise<WorkspaceResponse | { _isError: true; message: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/workspaces/${id}`, {
        headers: authHeaders(),
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to fetch workspace" };
    }
  },

  async createWorkspace(data: CreateWorkspaceRequest): Promise<WorkspaceResponse | { _isError: true; message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/workspaces`, data, {
        headers: jsonHeaders(),
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to create workspace" };
    }
  },

  async updateWorkspace(id: string, data: UpdateWorkspaceRequest): Promise<WorkspaceResponse | { _isError: true; message: string }> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/workspaces/${id}`, data, {
        headers: jsonHeaders(),
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to update workspace" };
    }
  },

  async deleteWorkspace(id: string): Promise<void | { _isError: true; message: string }> {
    try {
      await axios.delete(`${API_BASE_URL}/workspaces/${id}`, {
        headers: authHeaders(),
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to delete workspace" };
    }
  },
};