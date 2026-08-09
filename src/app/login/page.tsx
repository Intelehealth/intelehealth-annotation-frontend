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
    <main className="dark relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Parent card containing both panels */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-4 md:p-8">
        <div className="flex w-full max-w-[1100px] overflow-hidden rounded-2xl border border-border shadow-2xl">
          {/* Left card: aura background + marketing copy */}
          <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden border-2 border-white lg:flex lg:w-1/2">
            <AuraBackground />

            <header className="relative z-10 flex items-center justify-between p-10">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
                SYS.CORE // online
              </span>
              <span className="rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                v3.1
              </span>
            </header>

            <div className="relative z-10 max-w-lg p-10">
              <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground xl:text-5xl">
                Turn raw data into <span className="text-shimmer">precision-labeled</span> training sets.
              </h2>
              <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
                Bounding boxes, segmentation, text spans, and RLHF — one collaborative workspace with review
                queues, quality metrics, and audit-ready exports.
              </p>

              <dl className="mt-10 grid grid-cols-3 gap-6">
                {[
                  { k: "40M+", v: "labels shipped" },
                  { k: "99.2%", v: "review accuracy" },
                  { k: "12k", v: "active annotators" },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="font-mono text-2xl font-semibold text-foreground">{s.k}</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <footer className="relative z-10 p-10 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              uplink_established_
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
