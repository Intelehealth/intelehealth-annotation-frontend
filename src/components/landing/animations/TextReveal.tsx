'use client'

import { motion } from 'framer-motion'
import { textRevealContainer, textRevealChild } from '@/lib/landing-animations'
import { useInView } from '@/hooks/useInView'

interface TextRevealProps {
  text: string
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'p'
}

export function TextReveal({ text, className, as = 'h1' }: TextRevealProps) {
  const { ref, isInView } = useInView()
  const Component = motion[as]

  return (
    <Component
      ref={ref}
      variants={textRevealContainer}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {text.split(' ').map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom mr-2 pb-[0.1em]">
          <motion.span
            variants={textRevealChild}
            className="inline-block"
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Component>
  )
}
