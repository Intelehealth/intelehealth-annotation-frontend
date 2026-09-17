'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// ponytail: there is no landing page — /login is the landing page. The
// components under components/landing/ are left in place but unreferenced.
export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    router.replace(user ? '/dashboard' : '/login')
  }, [isLoading, user, router])

  return null
}
