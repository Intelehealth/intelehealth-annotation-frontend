'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import GoogleOAuth from '@/components/GoogleOAuth';
import { loginSchema, type LoginFormData } from '@/schemas/auth';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

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
      if (result.error === 'PENDING_ACTIVATION') {
        router.push(`/create-password?email=${encodeURIComponent(data.email)}`);
        return;
      }
      setError(result.error || 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gray-50 overflow-hidden">
      {/* Left Column */}
      <div className="lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 lg:p-12 flex flex-col justify-center relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative z-10 text-white pl-4 lg:pl-8">
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 leading-tight">
              Welcome back to
              <span className="block text-blue-100">DataAnnotate</span>
            </h1>
            <p className="text-lg text-blue-100 leading-relaxed max-w-md">
              Sign in to continue your data annotation journey.
            </p>
          </div>
          <div className="space-y-6">
            {[
              { icon: Zap, title: 'AI-Powered Intelligence', desc: 'Smart suggestions and automated workflows' },
              { icon: Users, title: 'Team Collaboration', desc: 'Real-time collaboration with role-based access' },
              { icon: Shield, title: 'Enterprise Security', desc: 'SOC 2 compliant with end-to-end encryption' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-blue-100" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg mb-1">{title}</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">{desc}</p>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
            <p className="text-gray-600">Welcome back! Please enter your details</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register('email')}
                  className={`pl-12 h-11 border-2 rounded-xl text-sm ${errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
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
                  className={`pl-12 pr-12 h-11 border-2 rounded-xl text-sm ${errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
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
              className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg text-sm"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Signing In...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In <ArrowRight className="h-4 w-4" />
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

          <GoogleOAuth mode="login" disabled={isLoading} />

          <div className="mb-4" />


        </div>
      </div>
    </div>
  );
}