'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authAPI, usersAPI } from '@/lib/api';
import { datasetsAPI } from '@/lib/api/datasets';
import { workspacesAPI } from '@/lib/api/workspaces';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  authProvider: 'local' | 'google';
  isActive: boolean;
  invitedByAdmin?: boolean;
  /** Admin, or owner of at least one workspace: may create datasets, configure them and assign people. */
  canManage?: boolean;
  createdAt: string;
  updatedAt: string;
  googleProfile?: {
    picture?: string;
    locale?: string;
    verifiedEmail?: boolean;
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInvited: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; code?: string }>;
  signup: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signupAdmin: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (profileData: {
    firstName: string;
    lastName: string;
    email: string;
  }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (passwordData: {
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ success: boolean; error?: string }>;
  activate: (payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Heartbeat every 60 seconds
  const startHeartbeat = () => {
    if (heartbeatRef.current) return;
    heartbeatRef.current = setInterval(async () => {
      try {
        await authAPI.heartbeat();
      } catch {
        // Silently fail
      }
    }, 60000);
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  useEffect(() => {
    // Check if user is already logged in on app start
    const checkAuthState = () => {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          // Handle case where userData might be an array
          const user = Array.isArray(parsedUser) ? parsedUser[0] : parsedUser;
          setUser(user);
          startHeartbeat();
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        setUser(null);
        stopHeartbeat();
      }
      setIsLoading(false);
    };

    checkAuthState();

    // Listen for custom auth events (when OAuth callback completes)
    const handleAuthUpdate = () => {
      checkAuthState();
    };

    window.addEventListener('auth-updated', handleAuthUpdate);

    return () => {
      window.removeEventListener('auth-updated', handleAuthUpdate);
      stopHeartbeat();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      if (response && response._isError) {
        return { success: false, error: response.message, code: response.code };
      }

      // Store token and user data
      localStorage.setItem('accessToken', response.accessToken);
      if (response.refreshToken) localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Fetch complete profile with authProvider info
      let currentUser = response.user;
      try {
        const profileResponse = await usersAPI.getProfile();
        localStorage.setItem('user', JSON.stringify(profileResponse));
        setUser(profileResponse);
        currentUser = profileResponse;
      } catch (profileError) {
        // Fallback to basic user data if profile fetch fails
        setUser(response.user);
      }

      startHeartbeat();

      // Everyone lands on the dashboard; it renders the admin or annotator view
      // by role. (Annotators used to be sent to /documentation, which hid their
      // task view entirely.)
      router.push('/dashboard');

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed';
      const errorCode = error.response?.data?.code;
      return { success: false, error: errorMessage, code: errorCode };
    }
  };

  const signup = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    try {
      const response = await authAPI.register(userData);
      if (response && response._isError) {
        return { success: false, error: response.message };
      }

      // Store token and user data
      localStorage.setItem('accessToken', response.accessToken);
      if (response.refreshToken) localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Fetch complete profile with authProvider info
      let currentUser = response.user;
      try {
        const profileResponse = await usersAPI.getProfile();
        localStorage.setItem('user', JSON.stringify(profileResponse));
        setUser(profileResponse);
        currentUser = profileResponse;
      } catch (profileError) {
        // Fallback to basic user data if profile fetch fails
        setUser(response.user);
      }

      startHeartbeat();

      // Everyone lands on the dashboard; it renders the admin or annotator view
      // by role. (Annotators used to be sent to /documentation, which hid their
      // task view entirely.)
      router.push('/dashboard');

      return { success: true };
    } catch (error: any) {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.message || 'Signup failed';
      return { success: false, error: errorMessage };
    }
  };

  const signupAdmin = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    try {
      const response = await authAPI.registerAdmin(userData);
      if (response && response._isError) {
        return { success: false, error: response.message };
      }

      // Store token and user data
      localStorage.setItem('accessToken', response.accessToken);
      if (response.refreshToken) localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Fetch complete profile with authProvider info
      try {
        const profileResponse = await usersAPI.getProfile();
        localStorage.setItem('user', JSON.stringify(profileResponse));
        setUser(profileResponse);
      } catch (profileError) {
        // Fallback to basic user data if profile fetch fails
        setUser(response.user);
      }

      startHeartbeat();

      // Admin always goes to dashboard
      router.push('/dashboard');

      return { success: true };
    } catch (error: any) {
      console.error('Admin signup error:', error);
      const errorMessage = error.response?.data?.message || 'Admin signup failed';
      return { success: false, error: errorMessage };
    }
  };

  const updateProfile = async (profileData: {
    firstName: string;
    lastName: string;
    email: string;
  }) => {
    try {
      const response = await usersAPI.updateProfile(profileData);
      
      // Update local user data
      localStorage.setItem('user', JSON.stringify(response));
      setUser(response);

      return { success: true };
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  };

  const changePassword = async (passwordData: {
    newPassword: string;
    confirmPassword: string;
  }) => {
    try {
      await usersAPI.changePassword(passwordData);
      return { success: true };
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.message || 'Password change failed';
      return { success: false, error: errorMessage };
    }
  };

  const activate = async (payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    try {
      const response = await authAPI.activate(payload);
      if (response && response._isError) {
        return { success: false, error: response.message };
      }
      localStorage.setItem('accessToken', response.accessToken);
      if (response.refreshToken) localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      startHeartbeat();
      router.push('/dashboard');
      return { success: true };
    } catch (error: any) {
      console.error('Activation error:', error);
      const errorMessage = error.response?.data?.message || 'Activation failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    stopHeartbeat();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const isInvited = user?.invitedByAdmin !== false;

  // Workspace owners get admin-level UI inside the product. Re-checked on
  // every navigation, so someone who creates their first workspace mid-session
  // gets owner rights without signing in again.
  const pathname = usePathname();
  const [ownsWorkspace, setOwnsWorkspace] = useState(false);
  useEffect(() => {
    if (!user?._id || user.role?.toUpperCase() === 'ADMIN') { setOwnsWorkspace(false); return; }
    let live = true;
    workspacesAPI.list()
      .then((ws) => { if (live) setOwnsWorkspace(ws.some((w) => w.ownerId?._id === user._id)); })
      .catch(() => { if (live) setOwnsWorkspace(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.role, pathname]);
  const userWithRights = useMemo<User | null>(
    () => (user ? { ...user, canManage: user.role?.toUpperCase() === 'ADMIN' || ownsWorkspace } : null),
    [user, ownsWorkspace],
  );

  const value: AuthContextType = {
    user: userWithRights,
    isLoading,
    isAuthenticated: !!user,
    isInvited,
    login,
    signup,
    signupAdmin,
    updateProfile,
    changePassword,
    activate,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
