'use client'

import { Suspense, useState, useEffect } from "react"
import { AuraBackground } from "@/components/auth/aura-background"
import { AuthForm } from "@/components/auth/auth-form"

function LoginContent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#F5F6FF] text-[#0B1020]">
      {/* Parent card containing both panels */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-4 md:p-8">
        <div className="flex w-full max-w-[1100px] overflow-hidden rounded-2xl border border-[#DFE3F5] shadow-2xl">
          {/* Left card: Intelehealth blue -> indigo, the same gradient as the
              sign-in panel on annotation.intelehealth.org */}
          <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-[linear-gradient(135deg,#2563EB_0%,#3B4FE8_55%,#4F46E5_100%)] text-white lg:flex lg:w-1/2">
            <AuraBackground />

            <header className="relative z-10 flex items-center p-10">
              <img src="/intelehealth-logo.png" alt="Intelehealth" className="h-9 w-auto rounded-md" />
            </header>

            <div className="relative z-10 max-w-lg p-10">
              <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
                Welcome back to Intelehealth Data Annotation.
              </h2>
              <p className="mt-5 max-w-md text-pretty leading-relaxed text-white/75">
                Sign in to continue labelling, reviewing and signing off datasets with your team.
              </p>

              <ul className="mt-10 space-y-5">
                {[
                  { t: "Guided annotation", d: "Fields, options and help text configured per dataset" },
                  { t: "Review and consensus", d: "Multiple annotators per row, disagreements surfaced" },
                  { t: "Audit-ready history", d: "Every edit recorded with who changed what, and when" },
                ].map((f) => (
                  <li key={f.t} className="flex gap-4">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/70" aria-hidden="true" />
                    <span>
                      <span className="block font-medium">{f.t}</span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-white/70">{f.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="relative z-10 p-10 text-xs text-white/55">
              Intelehealth &middot; quality healthcare where there is no doctor
            </footer>
          </section>

          {/* Right card: auth form - white background */}
          <section className="flex min-h-[620px] w-full items-center justify-center bg-white px-8 py-10 lg:w-1/2 lg:px-12">
            <div className="w-full max-w-md">
              {mounted ? (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  }
                >
                  <AuthForm />
                </Suspense>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return <LoginContent />
}
