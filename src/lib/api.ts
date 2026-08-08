import axios from 'axios';

// Most API calls go directly to the backend (absolute). The multipart document
// upload is made same-origin (see processing.ts, baseURL override) and proxied
// by next.config.ts `/processing` rewrite to avoid cross-origin upload blocks.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  // Global default so no request silently hangs forever. Individual calls may
  // override with their own `timeout` (e.g. the 120s upload timeout for large
  // files). A hung request (e.g. a stuck auth refresh) now fails fast instead
  // of surfacing as a spurious "Upload timed out".
  timeout: 60000,
  // Removed default Content-Type header to allow browser to set it automatically
  // This is especially important for FormData uploads
});

// Helper method for JSON requests
export const jsonApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
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

// ─── Silent refresh-on-401 ───────────────────────────────────────────────────
// Both axios instances share one in-flight refresh promise so concurrent 401s
// (e.g. several parallel requests failing at once) only trigger a single
// POST /auth/refresh call instead of a stampede of refresh attempts.
let refreshPromise: Promise<string | null> | null = null;

function forceLogout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) return null;
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: storedRefreshToken,
        }, {
          // Hard timeout so a hanging refresh can never silently hold an
          // original request (e.g. a large upload) hostage.
          timeout: 10000,
        });
        localStorage.setItem('accessToken', res.data.accessToken);
        if (res.data.refreshToken) {
          localStorage.setItem('refreshToken', res.data.refreshToken);
        }
        return res.data.accessToken as string;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function handleUnauthorized(error: any, instance: typeof api) {
  const originalRequest = error.config;

  // Bypass refresh/redirect for login, refresh itself, and pending-activation checks
  if (
    error.response?.data?.message === 'PENDING_ACTIVATION' ||
    originalRequest?.url?.includes('/auth/login') ||
    originalRequest?.url?.includes('/auth/refresh')
  ) {
    return Promise.reject(error);
  }

  // Only attempt a silent refresh once per request to avoid infinite loops
  if (!originalRequest || originalRequest._retriedAfterRefresh) {
    forceLogout();
    return Promise.reject(error);
  }

  const newAccessToken = await refreshAccessToken();
  if (!newAccessToken) {
    // Refresh failed (expired/invalid refresh token, or the refresh call timed
    // out). Fail the original request fast and clearly so the UI can show
    // "Session expired" instead of hanging into a bogus timeout.
    forceLogout();
    const authError = new Error('Session expired. Please sign in again.');
    (authError as any).response = { status: 401, data: { message: 'Session expired. Please sign in again.' } };
    return Promise.reject(authError);
  }

  originalRequest._retriedAfterRefresh = true;
  originalRequest.headers = originalRequest.headers || {};
  originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
  return instance(originalRequest);
}

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      return handleUnauthorized(error, api);
    }
    return Promise.reject(error);
  },
);

// Response interceptor for JSON API to handle token expiration
jsonApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      return handleUnauthorized(error, jsonApi as unknown as typeof api);
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

  // Refresh token — exchanges the stored rotating refresh token for a new
  // access token + rotated refresh token. Normally you don't need to call
  // this directly; the response interceptors above do it automatically on
  // any 401. Exposed for manual/explicit refresh (e.g. app resume).
  refreshToken: async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await jsonApi.post('/auth/refresh', { refreshToken: storedRefreshToken });
    localStorage.setItem('accessToken', response.data.accessToken);
    if (response.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
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
