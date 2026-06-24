'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const activateSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string().min(6, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ActivateFormData = z.infer<typeof activateSchema>;

function CreatePasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activate } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (!emailParam) {
      router.push('/login');
    } else {
      setEmail(emailParam);
    }
  }, [searchParams, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivateFormData>({
    resolver: zodResolver(activateSchema),
  });

  const onSubmit = async (data: ActivateFormData) => {
    setIsLoading(true);
    setError('');

    const result = await activate({
      email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    if (!result.success) {
      setError(result.error || 'Activation failed');
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
            <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
              Activate Your Account
              <span className="block text-blue-100">Start Annotating</span>
            </h1>
            <p className="text-lg text-blue-100 leading-relaxed max-w-md">
              Complete your profile and set a secure password to activate your account.
            </p>
          </div>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-blue-100" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg mb-1">Personal Workspace</h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Access your assigned datasets and annotate with ease.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-blue-100" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg mb-1">Secure Sign In</h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Your credentials are encrypted using industry-standard protocols.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:w-1/2 bg-white p-6 lg:p-12 flex flex-col justify-center overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Complete Activation</h2>
            <p className="text-gray-600">Setting up account for <span className="font-semibold text-blue-600">{email}</span></p>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    {...register('firstName')}
                    className={`pl-12 h-11 border-2 rounded-xl text-sm ${errors.firstName ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    {...register('lastName')}
                    className="pl-12 h-11 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Create Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter secure password"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  {...register('confirmPassword')}
                  className={`pl-12 pr-12 h-11 border-2 rounded-xl text-sm ${errors.confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg text-sm"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Activating Account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Activate & Log In <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CreatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading activation...</p>
        </div>
      </div>
    }>
      <CreatePasswordContent />
    </Suspense>
  );
}
