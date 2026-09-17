"use client"

import type React from "react"
import { useMemo, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { Brand } from "@/components/brand"
import { loginSchema, signupSchema, type LoginFormData, type SignupFormData } from "@/schemas/auth"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

type Mode = "login" | "signup"

function scorePassword(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: "Too weak", color: "bg-red-500" },
    { label: "Weak", color: "bg-red-400" },
    { label: "Fair", color: "bg-yellow-400" },
    { label: "Good", color: "bg-blue-400" },
    { label: "Strong", color: "bg-emerald-500" },
  ]
  return { score, ...map[score] }
}

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, signup } = useAuth()

  const [mode, setMode] = useState<Mode>("login")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  const [email, setEmail] = useState("")

  useEffect(() => {
    const modeParam = searchParams.get("mode")
    if (modeParam === "signup") setMode("signup")
    if (modeParam === "login") setMode("login")
    const errorParam = searchParams.get("error")
    if (errorParam === "oauth_failed") setError("Google OAuth authentication failed. Please try again.")
    if (errorParam === "no_account") setError("No account found. Please create your account.")
    const emailParam = searchParams.get("email")
    if (emailParam) setEmail(emailParam)
  }, [searchParams])

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setDone(false)
    setError("")
  }

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    shouldUnregister: false,
  })

  const {
    register: signupRegister,
    handleSubmit: handleSignupSubmit,
    watch: watchSignup,
    formState: { errors: signupErrors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
    shouldUnregister: false,
  })

  const signupPassword = watchSignup("password")
  const strength = useMemo(() => scorePassword(signupPassword || ""), [signupPassword])

  async function onLogin(data: LoginFormData) {
    setSubmitting(true)
    setError("")
    const result = await login(data.email, data.password)
    if (!result.success) {
      if (result.error === "PENDING_ACTIVATION") {
        router.push(`/create-password?email=${encodeURIComponent(data.email)}`)
        return
      }
      if (result.code === "USER_NOT_FOUND") {
        router.push(`/login?mode=signup&email=${encodeURIComponent(data.email)}&error=no_account`)
        return
      }
      if (result.code === "INVALID_PASSWORD") {
        router.push(`/forgot-password?email=${encodeURIComponent(data.email)}`)
        return
      }
      if (result.code === "GOOGLE_ACCOUNT") {
        setError("This account uses Google Sign-In.")
        setSubmitting(false)
        return
      }
      setError(result.error || "Login failed")
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setDone(true)
    setTimeout(() => setDone(false), 2200)
  }

  async function onSignup(data: SignupFormData) {
    if (!agreeToTerms) {
      setError("Please agree to the Terms and Privacy Policy")
      return
    }
    if (data.password !== data.confirmPassword) {
      setError("Passwords don't match")
      return
    }
    setSubmitting(true)
    setError("")
    const result = await signup({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    })
    if (!result.success) {
      setError(result.error || "Signup failed")
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setDone(true)
    setTimeout(() => setDone(false), 2200)
  }

  function handleGoogleAuth() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    window.location.href = `${backendUrl}/auth/google`
  }

  return (
    <div className="w-full max-w-md text-black">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-3 animate-float-up" style={{ animationDelay: "40ms" }}>
        <Brand />
      </div>

      {/* Heading */}
      <div className="mb-6 animate-float-up" style={{ animationDelay: "100ms" }}>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-gray-500">
          {mode === "login"
            ? "Sign in to continue labeling and shipping high-quality training data."
            : "Start building precise, review-ready datasets in minutes."}
        </p>
      </div>

      {/* Mode toggle */}
      <div
        className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-gray-300 bg-gray-100 p-1 animate-float-up"
        style={{ animationDelay: "160ms" }}
      >
        {(["login", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === m ? "text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {mode === m && (
              <span className="absolute inset-0 rounded-lg bg-gray-900 transition-all" aria-hidden="true" />
            )}
            <span className="relative z-10">{m === "login" ? "Sign in" : "Sign up"}</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-600 animate-float-up">
          {error}
        </div>
      )}

      {/* Social */}
      <div className="mb-5 animate-float-up" style={{ animationDelay: "220ms" }}>
        <button
          type="button"
          onClick={handleGoogleAuth}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
        >
          <GoogleMark />
          {mode === "login" ? "Sign in with Google" : "Sign up with Google"}
        </button>
      </div>

      <div className="mb-5 flex items-center gap-3 animate-float-up" style={{ animationDelay: "260ms" }}>
        <span className="h-px flex-1 bg-gray-200" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Form */}
      {mode === "login" ? (
        <form onSubmit={handleLoginSubmit(onLogin)} noValidate className="space-y-4">
          <Field
            id="login-email"
            label="Email"
            icon={<Mail className="h-4 w-4" />}
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            register={loginRegister("email")}
            error={loginErrors.email?.message}
            delay="300ms"
          />

          <div className="animate-float-up" style={{ animationDelay: "320ms" }}>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="text-sm font-medium text-gray-900">
                Password
              </label>
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-xs font-medium text-gray-600 transition-opacity hover:opacity-80"
              >
                Forgot?
              </button>
            </div>
            <div className="group relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-gray-900">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                autoComplete="current-password"
                {...loginRegister("password")}
                className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-11 text-sm text-gray-900 outline-none ring-gray-900/40 transition-all placeholder:text-gray-400 focus:border-gray-900/60 focus:ring-4"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-900"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {loginErrors.password && (
              <p className="mt-1.5 text-xs text-red-600">{loginErrors.password.message}</p>
            )}
          </div>

          <SubmitButton
            submitting={submitting}
            done={done}
            mode={mode}
            disabled={false}
            delay="400ms"
          />
        </form>
      ) : (
        <form onSubmit={handleSignupSubmit(onSignup)} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="signup-first-name"
              label="First name"
              icon={<User className="h-4 w-4" />}
              type="text"
              placeholder="Jane"
              autoComplete="given-name"
              register={signupRegister("firstName")}
              error={signupErrors.firstName?.message}
              delay="280ms"
            />
            <Field
              id="signup-last-name"
              label="Last name"
              icon={<User className="h-4 w-4" />}
              type="text"
              placeholder="Doe"
              autoComplete="family-name"
              register={signupRegister("lastName")}
              error={signupErrors.lastName?.message}
              delay="280ms"
            />
          </div>

          <Field
            id="signup-email"
            label="Email"
            icon={<Mail className="h-4 w-4" />}
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            register={signupRegister("email")}
            error={signupErrors.email?.message}
            delay="300ms"
          />

          <div className="animate-float-up" style={{ animationDelay: "320ms" }}>
            <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-gray-900">
              Password
            </label>
            <div className="group relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-gray-900">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                autoComplete="new-password"
                {...signupRegister("password")}
                className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-11 text-sm text-gray-900 outline-none ring-gray-900/40 transition-all placeholder:text-gray-400 focus:border-gray-900/60 focus:ring-4"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-900"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {signupErrors.password && (
              <p className="mt-1.5 text-xs text-red-600">{signupErrors.password.message}</p>
            )}
            {(signupPassword?.length ?? 0) > 0 && (
              <div className="mt-2.5">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < strength.score ? strength.color : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-gray-500">{strength.label}</p>
              </div>
            )}
          </div>

          <div className="animate-float-up" style={{ animationDelay: "340ms" }}>
            <label htmlFor="signup-confirm" className="mb-1.5 block text-sm font-medium text-gray-900">
              Confirm Password
            </label>
            <div className="group relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-gray-900">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="signup-confirm"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••••"
                autoComplete="new-password"
                {...signupRegister("confirmPassword")}
                className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-11 text-sm text-gray-900 outline-none ring-gray-900/40 transition-all placeholder:text-gray-400 focus:border-gray-900/60 focus:ring-4"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-900"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {signupErrors.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-600">{signupErrors.confirmPassword.message}</p>
            )}
          </div>

          <label
            className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 animate-float-up"
            style={{ animationDelay: "360ms" }}
          >
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 bg-white accent-gray-900"
            />
            <span>
              I agree to the{" "}
              <a href="#" className="text-gray-900 hover:opacity-80">Terms</a>{" "}
              and{" "}
              <a href="#" className="text-gray-900 hover:opacity-80">Privacy Policy</a>
              .
            </span>
          </label>

          <SubmitButton
            submitting={submitting}
            done={done}
            mode={mode}
            disabled={!agreeToTerms}
            delay="400ms"
          />
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-600 animate-float-up" style={{ animationDelay: "440ms" }}>
        {mode === "login" ? "New to Labelform? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => switchMode(mode === "login" ? "signup" : "login")}
          className="font-medium text-gray-900 transition-opacity hover:opacity-80"
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  )
}

function Field({
  id,
  label,
  icon,
  type,
  placeholder,
  autoComplete,
  register,
  error,
  delay,
}: {
  id: string
  label: string
  icon: React.ReactNode
  type: string
  placeholder: string
  autoComplete: string
  register: ReturnType<typeof Object>
  error?: string
  delay: string
}) {
  return (
    <div className="animate-float-up" style={{ animationDelay: delay }}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-900">
        {label}
      </label>
      <div className="group relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-gray-900">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          {...register}
          className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none ring-gray-900/40 transition-all placeholder:text-gray-400 focus:border-gray-900/60 focus:ring-4"
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function SubmitButton({
  submitting,
  done,
  mode,
  disabled,
  delay,
}: {
  submitting: boolean
  done: boolean
  mode: Mode
  disabled: boolean
  delay: string
}) {
  return (
    <button
      type="submit"
      disabled={submitting || disabled}
      className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gray-900 text-sm font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-80 animate-float-up"
      style={{ animationDelay: delay }}
    >
      {submitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Authenticating…
        </>
      ) : done ? (
        <>
          <Check className="h-4 w-4" />
          {mode === "login" ? "Signed in" : "Account created"}
        </>
      ) : (
        <>
          {mode === "login" ? "Sign in" : "Create account"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-.96 2.6-2.05 3.4l3.3 2.6c1.93-1.8 3.05-4.4 3.05-7.6 0-.7-.06-1.4-.18-2.1H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.75.6-2.6 2c1.66 3.3 5.06 5.6 9 5.6 2.7 0 4.96-.9 6.6-2.4l-3.3-2.6c-.9.6-2.05 1-3.3 1-2.55 0-4.7-1.7-5.47-4l-.68.2z"
      />
      <path fill="#FBBC05" d="M3.25 7.1A9.9 9.9 0 0 0 2.2 12c0 1.75.42 3.4 1.05 4.9l3.35-2.6c-.2-.6-.32-1.25-.32-1.9s.12-1.3.32-1.9L3.25 7.1z" />
      <path
        fill="#4285F4"
        d="M12 5.8c1.47 0 2.78.5 3.82 1.5l2.85-2.85C16.96 2.8 14.7 1.9 12 1.9c-3.94 0-7.34 2.3-9 5.6l3.53 2.5C7.3 7.5 9.45 5.8 12 5.8z"
      />
    </svg>
  )
}
