'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, usersAPI } from '@/lib/api';
import { datasetsAPI } from '@/lib/api/datasets';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  authProvider: 'local' | 'google';
  isActive: boolean;
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
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
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
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        setUser(null);
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
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });

      // Store token and user data
      localStorage.setItem('accessToken', response.accessToken);
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

      // Dynamic routing based on role and tasks
      if (currentUser && currentUser.role && currentUser.role.toUpperCase() === 'ADMIN') {
        router.push('/dashboard');
      } else {
        try {
          const tasks = await datasetsAPI.getMyTasks();
          if (tasks && tasks.length > 0) {
            router.push('/tasks');
          } else {
            router.push('/dashboard');
          }
        } catch (taskError) {
          console.error('Error fetching my tasks on redirect:', taskError);
          router.push('/dashboard');
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed';
      return { success: false, error: errorMessage };
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

      // Store token and user data
      localStorage.setItem('accessToken', response.accessToken);
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

      // Dynamic routing based on role and tasks
      if (currentUser && currentUser.role && currentUser.role.toUpperCase() === 'ADMIN') {
        router.push('/dashboard');
      } else {
        try {
          const tasks = await datasetsAPI.getMyTasks();
          if (tasks && tasks.length > 0) {
            router.push('/tasks');
          } else {
            router.push('/dashboard');
          }
        } catch (taskError) {
          console.error('Error fetching my tasks on redirect:', taskError);
          router.push('/dashboard');
        }
      }

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

      // Store token and user data
      localStorage.setItem('accessToken', response.accessToken);
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
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      router.push('/dashboard');
      return { success: true };
    } catch (error: any) {
      console.error('Activation error:', error);
      const errorMessage = error.response?.data?.message || 'Activation failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
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
