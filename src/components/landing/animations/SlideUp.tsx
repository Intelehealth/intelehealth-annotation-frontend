'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { slideUp, EASE_OUT_EXPO } from '@/lib/landing-animations'
import { useInView } from '@/hooks/useInView'

interface SlideUpProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function SlideUp({ children, className, delay = 0 }: SlideUpProps) {
  const { ref, isInView } = useInView({ once: false, margin: '0px 0px -15% 0px', amount: 0.2 })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={slideUp}
      transition={{ delay, duration: 0.8, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
