'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Users, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import GoogleOAuthAdmin from '@/components/GoogleOAuthAdmin';
import { loginSchema, type LoginFormData } from '@/schemas/auth';

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // login() is the shared endpoint — role is embedded in the JWT.
  // After login(), AuthContext sets user state AND writes to localStorage.
  // We read user.role from AuthContext state via the returned value, then check.
  const { login, logout, user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    const result = await login(data.email, data.password);

    if (!result.success) {
      setError(result.error || 'Login failed. Please check your credentials.');
      setIsLoading(false);
      return;
    }

    // login() sets user in localStorage and AuthContext state, then navigates to /dashboard.
    // We check role from localStorage immediately (AuthContext reads from it on load).
    // If not admin: clear session and show error before the dashboard redirect completes.
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw);
        const resolved = Array.isArray(parsed) ? parsed[0] : parsed;
        if (resolved?.role?.toUpperCase() !== 'ADMIN') {
          logout(); // Clears token + user, redirects to /login
          setError(
            'This account does not have admin privileges. Use the regular sign in page instead.',
          );
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // If localStorage parse fails, the dashboard auth guard will handle it
    }

    // Role confirmed as admin — login() already called router.push('/dashboard')
    setIsLoading(false);
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gray-50 overflow-hidden">
      {/* Left Column */}
      <div className="lg:w-1/2 bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 p-8 lg:p-12 flex flex-col justify-center relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative z-10 text-white pl-4 lg:pl-8">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
            <Shield className="w-4 h-4 text-indigo-200" />
            <span className="text-sm font-medium text-indigo-100">Admin Portal</span>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 leading-tight">
              Admin Control
              <span className="block text-indigo-200">Centre</span>
            </h1>
            <p className="text-lg text-indigo-100 leading-relaxed max-w-md">
              Manage datasets, assign annotators, and review consensus results.
            </p>
          </div>
          <div className="space-y-6">
            {[
              { icon: Users, title: 'Manage Annotators', desc: 'Clone datasets and assign to multiple annotators for independent consensus annotation' },
              { icon: Settings, title: 'Consensus Review', desc: 'Resolve annotation disagreements row by row and set final ground-truth decisions' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-indigo-100" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg mb-1">{title}</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:w-1/2 bg-white p-6 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-2xl mb-4">
              <Shield className="w-7 h-7 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Sign In</h2>
            <p className="text-gray-600">Access restricted to admin accounts only</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600 flex items-start gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Admin Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your admin email"
                  {...register('email')}
                  className={`pl-12 h-11 border-2 rounded-xl text-sm ${errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'}`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                  className={`pl-12 pr-12 h-11 border-2 rounded-xl text-sm ${errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg text-sm"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In as Admin <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <GoogleOAuthAdmin disabled={isLoading} />

          <div className="mb-4" />

          <div className="space-y-2 text-center">
            <p className="text-gray-600 text-sm">
              Need an admin account?{' '}
              <Link href="/admin-signup" className="text-indigo-600 hover:text-indigo-700 font-medium underline">
                Register here
              </Link>
            </p>
            <p className="text-gray-400 text-xs">
              Not an admin?{' '}
              <Link href="/login" className="text-gray-600 hover:text-gray-700 underline">
                Regular sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}