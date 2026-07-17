'use client';

import { useState, useEffect, Suspense } from 'react';
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
  Github,
  Cpu,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, signupSchema, type LoginFormData, type SignupFormData } from '@/schemas/auth';
import GoogleOAuth from '@/components/GoogleOAuth';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error') || '';
  const modeParam = searchParams.get('mode') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState('');
  const { login, signup } = useAuth();

  useEffect(() => {
    if (modeParam === 'signup') {
      setIsSignupMode(true);
    }
    if (errorParam === 'oauth_failed') {
      setError('Google OAuth authentication failed. Please try again.');
    }
    if (errorParam === 'no_account') {
      setError('No account found. Please create your account.');
    }
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setPrefillEmail(emailParam);
    }
  }, [modeParam, errorParam, searchParams]);

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: signupRegister,
    handleSubmit: handleSignupSubmit,
    setValue: setSignupValue,
    formState: { errors: signupErrors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    if (prefillEmail) {
      setSignupValue('email', prefillEmail);
    }
  }, [prefillEmail, setSignupValue]);

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');
    setErrorCode(null);
    const result = await login(data.email, data.password);
    if (!result.success) {
      if (result.error === 'PENDING_ACTIVATION') {
        router.push(`/create-password?email=${encodeURIComponent(data.email)}`);
        return;
      }
      if (result.code === 'USER_NOT_FOUND') {
        router.push(`/login?mode=signup&email=${encodeURIComponent(data.email)}&error=no_account`);
        return;
      }
      if (result.code === 'INVALID_PASSWORD') {
        router.push(`/forgot-password?email=${encodeURIComponent(data.email)}`);
        return;
      }
      if (result.code === 'GOOGLE_ACCOUNT') {
        setError('This account uses Google Sign-In.');
        setErrorCode(result.code);
        setIsLoading(false);
        return;
      }
      setError(result.error || 'Login failed');
      setErrorCode(result.code || null);
      setIsLoading(false);
    }
  };

  const onSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    setError('');
    const result = await signup({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    if (!result.success) {
      setError(result.error || 'Signup failed');
      setIsLoading(false);
    }
  };

  const handleGithubAuth = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    window.location.href = `${backendUrl}/auth/github`;
  };

  return (
    <div className="h-screen w-full relative overflow-hidden bg-[#0f2347]">
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
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
        </div>

        <div className="w-full lg:w-[45%] h-full flex flex-col justify-center relative">
          <div className="lg:hidden absolute top-12 left-6 flex items-center gap-2">
            <Cpu className="text-blue-400 text-3xl" />
            <h1 className="text-2xl font-bold text-white">DataAnnotate</h1>
          </div>

          <div className="flex justify-center lg:translate-x-10 px-6 w-full">
            <div className="w-full max-w-[450px] bg-white/85 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl shadow-black/30 p-10 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60" />

            <div className="flex flex-col items-center mb-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                <Cpu className="text-white text-2xl" />
              </div>
              {isSignupMode ? (
                <>
                  <h3 className="text-2xl font-semibold text-[#111827] mb-1">Create your account</h3>
                  <p className="text-base text-[#6b7280] font-medium">Get started with your free account</p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-semibold text-[#111827] mb-1">Welcome Back</h3>
                  <p className="text-base text-[#6b7280] font-medium">Sign in to your account</p>
                </>
              )}
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                  {error}
                </p>
                {errorCode === 'GOOGLE_ACCOUNT' && (
                  <p className="text-xs text-blue-600 font-medium pl-4 mt-1">
                    Please sign in with Google instead.
                  </p>
                )}
              </div>
            )}

              {isSignupMode ? (
                <form onSubmit={handleSignupSubmit(onSignup)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-semibold text-[#374151] mb-1.5">First name</Label>
                    <div className="relative border border-gray-200 bg-[#f9fafb] rounded-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        {...signupRegister('firstName')}
                        className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-11 pr-4 text-[#111827] placeholder:text-gray-400 shadow-none"
                        disabled={isLoading}
                      />
                    </div>
                    {signupErrors.firstName && <p className="text-xs text-red-500 mt-1">{signupErrors.firstName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-semibold text-[#374151] mb-1.5">Last name</Label>
                    <div className="relative border border-gray-200 bg-[#f9fafb] rounded-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        {...signupRegister('lastName')}
                        className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-11 pr-4 text-[#111827] placeholder:text-gray-400 shadow-none"
                        disabled={isLoading}
                      />
                    </div>
                    {signupErrors.lastName && <p className="text-xs text-red-500 mt-1">{signupErrors.lastName.message}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="signup-email" className="text-sm font-semibold text-[#374151] mb-1.5">Email Address</Label>
                  <div className="relative border border-gray-200 bg-[#f9fafb] rounded-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="name@company.com"
                      {...signupRegister('email')}
                      className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-11 pr-4 text-[#111827] placeholder:text-gray-400 shadow-none"
                      disabled={isLoading}
                    />
                  </div>
                  {signupErrors.email && <p className="text-xs text-red-500 mt-1">{signupErrors.email.message}</p>}
                </div>

                <div>
                  <Label htmlFor="signup-password" className="text-sm font-semibold text-[#374151] mb-1.5">Password</Label>
                  <div className="relative border border-gray-200 bg-[#f9fafb] rounded-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      {...signupRegister('password')}
                      className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-11 pr-11 text-[#111827] placeholder:text-gray-400 shadow-none"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                      disabled={isLoading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupErrors.password && <p className="text-xs text-red-500 mt-1">{signupErrors.password.message}</p>}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-[#374151] mb-1.5">Confirm Password</Label>
                  <div className="relative border border-gray-200 bg-[#f9fafb] rounded-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      {...signupRegister('confirmPassword')}
                      className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-11 pr-11 text-[#111827] placeholder:text-gray-400 shadow-none"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                      disabled={isLoading}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{signupErrors.confirmPassword.message}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all hover:scale-[1.01] active:scale-[0.99] h-auto cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Creating Account...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Create Account <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200" />
                  <span className="flex-shrink mx-4 text-xs text-gray-400 uppercase tracking-widest font-semibold">or</span>
                  <div className="flex-grow border-t border-gray-200" />
                </div>

                <GoogleOAuth mode="signup" disabled={isLoading} />

                <p className="text-center text-sm text-[#6b7280] pt-1">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsSignupMode(false); setError(''); setErrorCode(null); }}
                    className="text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    Sign in here
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="block text-sm font-semibold text-[#374151] mb-1.5">Email Address</Label>
                  <div className="relative border border-gray-200 bg-[#f9fafb] rounded-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      {...loginRegister('email')}
                      className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-11 pr-4 text-[#111827] placeholder:text-gray-400 shadow-none"
                      disabled={isLoading}
                    />
                  </div>
                  {loginErrors.email && <p className="text-xs text-red-500 mt-1">{loginErrors.email.message}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="password" className="text-sm font-semibold text-[#374151]">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >Forgot password?</Link>
                  </div>
                  <div className="relative border border-gray-200 bg-[#f9fafb] rounded-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      {...loginRegister('password')}
                      className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-11 pr-11 text-[#111827] placeholder:text-gray-400 shadow-none"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                      disabled={isLoading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginErrors.password && <p className="text-xs text-red-500 mt-1">{loginErrors.password.message}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all hover:scale-[1.01] active:scale-[0.99] h-auto cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200" />
                  <span className="flex-shrink mx-4 text-xs text-gray-400 uppercase tracking-widest font-semibold">or</span>
                  <div className="flex-grow border-t border-gray-200" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <GoogleOAuth mode="login" disabled={isLoading} />
                  <button
                    type="button"
                    onClick={handleGithubAuth}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2.5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <Github className="w-[18px] h-[18px] text-[#374151]" />
                    <span className="text-sm font-semibold text-[#374151]">GitHub</span>
                  </button>
                </div>

                <p className="text-center text-sm text-[#6b7280] pt-1">
                  New to DataAnnotate?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsSignupMode(true); setError(''); setErrorCode(null); }}
                    className="text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    Create Account
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full relative overflow-hidden bg-[#0f2347] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}