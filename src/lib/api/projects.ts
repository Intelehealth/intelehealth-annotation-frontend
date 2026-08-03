import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders() {
  return { ...authHeaders(), "Content-Type": "application/json" };
}

export interface ProjectResponse {
  _id: string;
  name: string;
  description?: string;
  workspaceId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  workspaceId: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export const projectsAPI = {
  async getProjects(): Promise<ProjectResponse[] | { _isError: true; message: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`, {
        headers: authHeaders(),
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to fetch projects" };
    }
  },

  async getWorkspaceProjects(workspaceId: string): Promise<ProjectResponse[] | { _isError: true; message: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/workspace/${workspaceId}`, {
        headers: authHeaders(),
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to fetch workspace projects" };
    }
  },

  async getProject(id: string): Promise<ProjectResponse | { _isError: true; message: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${id}`, {
        headers: authHeaders(),
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to fetch project" };
    }
  },

  async createProject(data: CreateProjectRequest): Promise<ProjectResponse | { _isError: true; message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/projects`, data, {
        headers: jsonHeaders(),
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to create project" };
    }
  },

  async updateProject(id: string, data: UpdateProjectRequest): Promise<ProjectResponse | { _isError: true; message: string }> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/projects/${id}`, data, {
        headers: jsonHeaders(),
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to update project" };
    }
  },

  async deleteProject(id: string): Promise<void | { _isError: true; message: string }> {
    try {
      await axios.delete(`${API_BASE_URL}/projects/${id}`, {
        headers: authHeaders(),
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return { _isError: true as const, message: error?.response?.data?.message || error?.message || "Failed to delete project" };
    }
  },
};