import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface UserResponse {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'ANNOTATOR';
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
  firstLoginCompleted: boolean;
  permissions?: {
    read: boolean;
    write: boolean;
    modify: boolean;
  };
  isActive: boolean;
  authProvider: 'local' | 'google';
  createdAt: string;
  updatedAt: string;
}

export const usersAPI = {
  // Get all users (Admin only)
  async getAll(): Promise<UserResponse[]> {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_BASE_URL}/auth/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Create/invite a new pending user (Admin only)
  async create(payload: {
    email: string;
    role: 'ADMIN' | 'ANNOTATOR';
    permissions?: {
      read: boolean;
      write: boolean;
      modify: boolean;
    };
  }): Promise<UserResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(`${API_BASE_URL}/users`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Update user permissions or details (Admin only)
  async update(
    id: string,
    payload: {
      permissions?: {
        read: boolean;
        write: boolean;
        modify: boolean;
      };
      firstName?: string;
      lastName?: string;
      role?: 'ADMIN' | 'ANNOTATOR';
    },
  ): Promise<UserResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await axios.patch(`${API_BASE_URL}/users/${id}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Update user status (Admin only)
  async updateStatus(
    id: string,
    status: 'PENDING' | 'ACTIVE' | 'DISABLED',
  ): Promise<UserResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await axios.patch(
      `${API_BASE_URL}/users/${id}/status`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  },

  // Delete user (Admin only)
  async delete(id: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    await axios.delete(`${API_BASE_URL}/users/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
