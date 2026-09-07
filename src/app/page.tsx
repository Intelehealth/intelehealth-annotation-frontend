'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { SmoothScrollProvider } from '@/components/landing/providers/SmoothScrollProvider'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { HeroSection } from '@/components/landing/sections/HeroSection'
import { ValueProposition } from '@/components/landing/sections/ValueProposition'
import { ClientMarquee } from '@/components/landing/sections/ClientMarquee'
import { Services } from '@/components/landing/sections/Services'
import { FaqSection } from '@/components/landing/sections/FaqSection'
import { FinalCTA } from '@/components/landing/sections/FinalCTA'
import { Footer } from '@/components/landing/sections/Footer'

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard')
    }
  }, [isLoading, user, router])

  if (!isLoading && user) return null

  return (
    <SmoothScrollProvider>
      <div className="landing-page min-h-screen bg-black">
        <LandingHeader />
        <main>
          <HeroSection />
          <ValueProposition />
          <Services />
          <ClientMarquee />
          <FaqSection />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </SmoothScrollProvider>
  )
}
