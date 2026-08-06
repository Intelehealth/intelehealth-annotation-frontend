'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { SmoothScrollProvider } from '@/components/landing/providers/SmoothScrollProvider'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { HeroSection } from '@/components/landing/sections/HeroSection'
import { ValueProposition } from '@/components/landing/sections/ValueProposition'
import { CategoryShowcase } from '@/components/landing/sections/CategoryShowcase'
import { CustomerCarousel } from '@/components/landing/sections/CustomerCarousel'
import { FeaturesSection } from '@/components/landing/sections/FeaturesSection'
import { FinalCTA } from '@/components/landing/sections/FinalCTA'

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
          <CategoryShowcase />
          <FeaturesSection />
          <CustomerCarousel />
          <FinalCTA />
        </main>
      </div>
    </SmoothScrollProvider>
  )
}
