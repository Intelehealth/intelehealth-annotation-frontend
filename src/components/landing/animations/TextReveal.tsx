'use client'

import { Fragment } from 'react'
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

  const words = text.split(' ')

  return (
    <Component
      ref={ref}
      variants={textRevealContainer}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {words.map((word, i) => (
        <Fragment key={i}>
          {/* overflow-hidden clips the child's 110%→0% wipe */}
          <span className="inline-block overflow-hidden align-bottom pb-[0.1em]">
            <motion.span variants={textRevealChild} className="inline-block">
              {word}
            </motion.span>
          </span>
          {/* A real space *between* the word spans — this used to be faked with
              `mr-2` on the span, which left the heading with no actual space
              characters, so screen readers, copy-paste and crawlers all saw one
              run-on token ("ReadytopoweryourAI?"). It must be a sibling rather
              than a child: whitespace trailing inside an inline-block collapses
              and would render no gap. */}
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Component>
  )
}
