'use client'

import { useInView as useInViewFramer } from 'framer-motion'
import { useRef } from 'react'

export function useInView(options?: { once?: boolean; margin?: string; amount?: number | 'some' | 'all' }) {
  const ref = useRef(null)
  const isInView = useInViewFramer(ref, {
    once: options?.once ?? true,
    margin: (options?.margin ?? '0px 0px -100px 0px') as never,
    amount: options?.amount ?? 0.2
  })

  return { ref, isInView }
}
