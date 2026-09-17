'use client';

import { useState, Suspense } from 'react';
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
  CheckCircle,
  ArrowRight,
  Shield,
  Cpu,
  AlertCircle,
} from 'lucide-react';
import { authAPI } from '@/lib/api';
import Link from 'next/link';
import { PASSWORD_CHECKS } from '@/schemas/auth';

const resetPasswordSchema = z
  .object({
    password: z.string().min(1).superRefine((val, ctx) => {
      if (!val) return;
      PASSWORD_CHECKS.forEach((c) => {
        if (!c.test(val)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: c.error });
      });
    }),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function PasswordChecks({ password }: { password: string }) {
  if (!password) {
    return (
      <p className="text-xs text-gray-400 mt-1">
        Must be at least 8 characters with uppercase, lowercase, number &amp; special character
      </p>
    );
  }
  return (
    <div className="mt-2 space-y-1.5">
      {PASSWORD_CHECKS.map((rule, i) => {
        const passed = rule.test(password);
        return passed ? (
          <div key={i} className="text-xs text-green-600 flex items-center gap-1.5">
            <span>✓</span> {rule.label}
          </div>
        ) : (
          <div key={i} className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1 flex items-center gap-1.5">
            <span>✕</span> {rule.error}
          </div>
        );
      })}
    </div>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
  });

  const pwd = watch('password', '');

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Password reset token is missing or invalid. Please request a new link.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const resData = await authAPI.resetPassword(token, data.password);

      if (resData._isError) {
        if (resData.message?.includes('invalid') || resData.message?.includes('expired')) {
          throw new Error('This reset link has expired or is invalid. Please request a new one.');
        }
        throw new Error(resData.message || 'Failed to reset password');
      }

      setSuccess(true);
      // Auto-redirect to login after 3 seconds
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // No token guard
  if (!token) {
    return (
      <div className="h-screen w-full relative overflow-hidden bg-[#0f2347]">
        <video className="absolute inset-0 w-full h-full object-cover z-0" autoPlay loop muted playsInline>
          <source src="/login-page.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1d3a]/70 via-[#1a427b]/30 to-[#15335e]/50 z-0" />
        <div className="relative z-10 h-full w-full flex items-center justify-center px-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-8">
              This password reset link is invalid, incomplete, or has already been used. Please request a new one.
            </p>
            <Link href="/forgot-password">
              <Button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base shadow-lg h-auto cursor-pointer">
                <span className="flex items-center justify-center gap-2">
                  Request New Link <ArrowRight className="h-5 w-5" />
                </span>
              </Button>
            </Link>
            <p className="mt-4 text-sm text-gray-600">
              <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                Back to Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative overflow-hidden bg-[#0f2347]">
      <video className="absolute inset-0 w-full h-full object-cover z-0" autoPlay loop muted playsInline>
        <source src="/login-page.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1d3a]/70 via-[#1a427b]/30 to-[#15335e]/50 z-0" />

      <div className="relative z-10 h-full w-full flex">
        <div className="hidden lg:flex lg:w-[55%] flex-col justify-center px-24">
          <div className="absolute top-12 left-24 flex items-center gap-2">
            <Cpu className="text-blue-400 text-3xl" />
            <h1 className="text-2xl font-bold text-white">DataAnnotate</h1>
          </div>
          <div className="text-white pl-4">
            <div className="mb-8">
              <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                Reset Your Password
                <span className="block text-blue-100">Secure Your Account</span>
              </h1>
              <p className="text-lg text-blue-100 leading-relaxed max-w-md">
                Choose a strong password that you haven&apos;t used before to keep your account secure.
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-blue-100" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg mb-1">Secure Encryption</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    Your password is encrypted using industry-standard protocols.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[45%] h-full flex flex-col justify-center relative">
          <div className="lg:hidden absolute top-12 left-6 flex items-center gap-2">
            <Cpu className="text-blue-400 text-3xl" />
            <h1 className="text-2xl font-bold text-white">DataAnnotate</h1>
          </div>

          <div className="flex justify-center lg:translate-x-10 px-6 w-full">
            <div className="w-full max-w-[450px] bg-white/85 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl shadow-black/30 p-10 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60" />

              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                  <Cpu className="text-white text-2xl" />
                </div>
                <h2 className="text-2xl font-bold text-[#111827] mb-2">Set New Password</h2>
                <p className="text-base text-[#6b7280] font-medium">Must be at least 8 characters with uppercase, lowercase, number, and special character.</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                    {error}
                  </p>
                </div>
              )}

              {success ? (
                <div className="space-y-5 text-center">
                  <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-7 h-7 text-green-600" />
                    </div>
                    <p className="text-green-800 font-semibold text-lg">Password Reset!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Your password has been updated. Redirecting you to sign in...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 justify-center text-xs text-gray-400">
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400" />
                    Redirecting automatically in 3 seconds...
                  </div>
                  <Link href="/login">
                    <Button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base shadow-lg h-auto cursor-pointer">
                      <span className="flex items-center justify-center gap-2">
                        Sign In Now <ArrowRight className="h-5 w-5" />
                      </span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-[#374151]">New Password</Label>
                    <div className="relative border border-gray-200 bg-[#f9fafb] rounded-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        {...register('password')}
                        className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-11 pr-11 text-[#111827] placeholder:text-gray-400 shadow-none"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordChecks password={pwd} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-[#374151]">Confirm Password</Label>
                    <div className="relative border border-gray-200 bg-[#f9fafb] rounded-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        {...register('confirmPassword')}
                        className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-11 pr-11 text-[#111827] placeholder:text-gray-400 shadow-none"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all hover:scale-[1.01] active:scale-[0.99] h-auto cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Resetting Password...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Reset Password <ArrowRight className="h-5 w-5" />
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {!success && (
                <p className="text-center text-sm text-[#6b7280] mt-6">
                  Remember your password?{' '}
                  <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full relative overflow-hidden bg-[#0f2347] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}