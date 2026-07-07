import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  // Removed default Content-Type header to allow browser to set it automatically
  // This is especially important for FormData uploads
});

// Helper method for JSON requests
export const jsonApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Request interceptor for JSON API to add auth token
jsonApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Bypass redirect if this is a login request or a pending activation check
      if (
        error.response?.data?.message === 'PENDING_ACTIVATION' ||
        error.config?.url?.includes('/auth/login')
      ) {
        return Promise.reject(error);
      }
      // Token expired or invalid, redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Response interceptor for JSON API to handle token expiration
jsonApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Bypass redirect if this is a login request or a pending activation check
      if (
        error.response?.data?.message === 'PENDING_ACTIVATION' ||
        error.config?.url?.includes('/auth/login')
      ) {
        return Promise.reject(error);
      }
      // Token expired or invalid, redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Auth API endpoints
export const authAPI = {
  // Activate a pending account (first login)
  activate: async (payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    try {
      const response = await jsonApi.post('/auth/activate', payload);
      return response.data;
    } catch (error: any) {
      return {
        _isError: true,
        message: error.response?.data?.message || 'Activation failed',
        code: error.response?.data?.code,
      };
    }
  },

  // Register/Activate an invited user
  register: async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    try {
      const response = await jsonApi.post('/auth/register', payload);
      return response.data;
    } catch (error: any) {
      return {
        _isError: true,
        message: error.response?.data?.message || 'Signup failed',
        code: error.response?.data?.code,
      };
    }
  },

  // Register/Activate an invited admin
  registerAdmin: async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    try {
      const response = await jsonApi.post('/auth/register', payload);
      return response.data;
    } catch (error: any) {
      return {
        _isError: true,
        message: error.response?.data?.message || 'Admin registration failed',
        code: error.response?.data?.code,
      };
    }
  },

  // Login with email/password
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await jsonApi.post('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      return {
        _isError: true,
        message: error.response?.data?.message || 'Login failed',
        code: error.response?.data?.code,
      };
    }
  },

  // Refresh token
  refreshToken: async () => {
    const response = await jsonApi.post('/auth/refresh');
    return response.data;
  },

  // Heartbeat - update lastSeen
  heartbeat: async () => {
    const response = await jsonApi.post('/auth/heartbeat');
    return response.data;
  },

  // Forgot password - request reset link
  forgotPassword: async (email: string) => {
    try {
      const response = await jsonApi.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      // Network error = server is down / unreachable
      if (!error.response) {
        return {
          _isError: true,
          message: 'Cannot connect to the server. Please make sure the backend is running and try again.',
          statusCode: 0,
        };
      }
      return {
        _isError: true,
        message: error.response?.data?.message || 'Failed to request password reset',
        statusCode: error.response?.status,
      };
    }
  },

  // Reset password with token
  resetPassword: async (token: string, password: string) => {
    try {
      const response = await jsonApi.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error: any) {
      // Network error = server is down / unreachable
      if (!error.response) {
        return {
          _isError: true,
          message: 'Cannot connect to the server. Please make sure the backend is running and try again.',
          statusCode: 0,
        };
      }
      return {
        _isError: true,
        message: error.response?.data?.message || 'Failed to reset password',
        statusCode: error.response?.status,
      };
    }
  },
};

// Users API endpoints
export const usersAPI = {
  // Get current user profile
  getProfile: async () => {
    const response = await jsonApi.get('/users/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData: {
    firstName: string;
    lastName: string;
    email: string;
  }) => {
    const response = await jsonApi.put('/users/profile', profileData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData: {
    newPassword: string;
    confirmPassword: string;
  }) => {
    const response = await jsonApi.put('/users/password', passwordData);
    return response.data;
  },
};

export default api;
