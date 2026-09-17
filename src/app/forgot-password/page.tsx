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
  Mail,
  ArrowLeft,
  ArrowRight,
  Cpu,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { authAPI } from '@/lib/api';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get('email') || '';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [countdown, setCountdown] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: emailParam,
    },
  });

  useEffect(() => {
    if (emailParam) {
      setValue('email', emailParam);
    }
  }, [emailParam, setValue]);

  // Countdown for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess(false);
    setResetLink('');

    try {
      const resData = await authAPI.forgotPassword(data.email);

      if (resData._isError) {
        // Server down / unreachable
        if (resData.statusCode === 0) {
          setError(resData.message);
        } else if (resData.statusCode === 500) {
          // SMTP failure - show actual error instead of fake success
          setError(resData.message || 'Unable to send email. Please contact administrator.');
        } else {
          // Show the actual backend message for other errors
          setError(resData.message || 'Failed to request password reset. Please try again.');
        }
        return;
      }

      setSuccess(true);
      setCountdown(60); // 60s before user can re-send
      if (resData.resetLink) {
        setResetLink(resData.resetLink);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    const currentEmail = getValues('email');
    setSuccess(false);
    setResetLink('');
    setError('');
    // Auto-submit after a tick
    setTimeout(() => {
      handleSubmit(onSubmit)();
    }, 50);
  };

  return (
    <div className="h-screen w-full relative overflow-hidden bg-[#0f2347]">
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay loop muted playsInline
      >
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
                Forgot Your Password?
                <span className="block text-blue-100">Reset It Quickly</span>
              </h1>
              <p className="text-lg text-blue-100 leading-relaxed max-w-md">
                No worries! We&apos;ll help you get back into your account quickly and securely.
              </p>
            </div>
            <div className="space-y-3">
              {[
                'Enter your email address',
                'Get a secure reset link',
                'Create a new password',
                'Sign in and continue',
              ].map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-blue-100 text-sm">{step}</span>
                </div>
              ))}
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

              <div className="flex flex-col items-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                  <Cpu className="text-white text-2xl" />
                </div>
                <h3 className="text-2xl font-semibold text-[#111827] mb-1">Forgot password?</h3>
                <p className="text-base text-[#6b7280] font-medium">We&apos;ll send you a reset link</p>
              </div>

              {error && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-700 font-medium">Something went wrong</p>
                    <p className="text-sm text-red-600 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {success ? (
                <div className="space-y-5">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-800 font-semibold">Check your email</p>
                      <p className="text-sm text-green-700 mt-0.5">
                        If an account exists with that email, a password reset link has been sent. It expires in 1 hour.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <span>Didn&apos;t receive it?{' '}
                      {countdown > 0 ? (
                        <span className="text-gray-400">Resend in {countdown}s</span>
                      ) : (
                        <button
                          onClick={handleResend}
                          className="text-blue-600 hover:text-blue-700 font-medium underline"
                          disabled={isLoading}
                        >
                          Resend link
                        </button>
                      )}
                    </span>
                  </div>

                  <Link href="/login">
                    <Button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base shadow-lg h-auto cursor-pointer">
                      <span className="flex items-center justify-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Sign In
                      </span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <Label htmlFor="reset-email" className="block text-sm font-semibold text-[#374151] mb-1.5">
                      Email Address
                    </Label>
                    <div className="relative border border-gray-200 bg-[#f9fafb] rounded-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="name@company.com"
                        {...register('email')}
                        className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-11 pr-4 text-[#111827] placeholder:text-gray-400 shadow-none"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all hover:scale-[1.01] active:scale-[0.99] h-auto cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Sending...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Send Reset Link <ArrowRight className="h-5 w-5" />
                      </span>
                    )}
                  </Button>

                  <p className="text-center text-sm text-[#6b7280] pt-1">
                    <button
                      type="button"
                      onClick={() => router.push('/login')}
                      className="text-blue-600 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Login
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full relative overflow-hidden bg-[#0f2347] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}