'use client'

import Link from 'next/link'
import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion'
import { HeroAnnotator, AnnotatedWords } from '../HeroAnnotator'
import { ParticleField3D } from '../ParticleField3D'
import { HiArrowDown } from 'react-icons/hi'
import { useEffect, useRef } from 'react'
import { EASE_OUT_EXPO, EASE_OUT_QUART } from '@/lib/landing-animations'

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null)

  // Scroll-tied parallax for background
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const bgOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.1])

  // Parallax based on mouse movement
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 30, stiffness: 200 }
  const parallaxX = useSpring(mouseX, springConfig)
  const parallaxY = useSpring(mouseY, springConfig)

  // barely-there drift: a few px, so the text feels settled rather than tracking the cursor
  const textX = useTransform(parallaxX, [-0.5, 0.5], [3, -3])
  const textY = useTransform(parallaxY, [-0.5, 0.5], [2, -2])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return
      const { left, top, width, height } = heroRef.current.getBoundingClientRect()
      const x = (e.clientX - left) / width - 0.5
      const y = (e.clientY - top) / height - 0.5
      mouseX.set(x)
      mouseY.set(y)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <section ref={heroRef} data-nav="dark" className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* 3D Animated Particle Field Background with scroll parallax */}
      <motion.div
        style={{ y: bgY, opacity: bgOpacity, scale: bgScale }}
        className="absolute inset-0 z-0 bg-black"
      >
        <ParticleField3D />
      </motion.div>

      {/* Gradient overlay over 3D particles */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

      {/* Content with Parallax */}
      <motion.div
        style={{ x: textX, y: textY }}
        className="relative z-20 container mx-auto px-6 text-center"
      >
        {/* hover / tap a word: the headline annotates itself — a live
            sample of the tool. Tours the targets on its own until you touch it. */}
        <HeroAnnotator>
          <AnnotatedWords
            text="Reliable annotation for decisions that matter."
            className="mx-auto mb-5 max-w-[20ch] text-3xl font-semibold leading-[1.08] tracking-tight text-[var(--lp-paper)] md:text-4xl lg:text-5xl [text-wrap:balance]"
          />
        </HeroAnnotator>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8, ease: EASE_OUT_EXPO }}
          className="mx-auto mb-9 max-w-[44ch] text-sm leading-relaxed text-[var(--lp-paper)]/65 md:text-base"
        >
          Human-labelled, checked by consensus, with the agreement numbers to prove it.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8, ease: EASE_OUT_EXPO }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link href="/dataset/add-dataset" className="inline-flex items-center justify-center rounded-md bg-[var(--lp-paper)] px-6 py-3 text-sm font-medium text-[var(--lp-ink)] transition-colors duration-300 hover:bg-[var(--lp-accent-2)] hover:text-[var(--lp-paper)]">
              Upload a dataset
            </Link>

          <Link href="#annotate" className="inline-flex items-center justify-center rounded-md border border-[var(--lp-paper)]/35 px-6 py-3 text-sm font-medium text-[var(--lp-paper)] transition-colors duration-300 hover:border-[var(--lp-paper)]/70">
              See what we annotate
            </Link>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator — continuous bounce loop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.6, ease: EASE_OUT_QUART }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <HiArrowDown className="text-2xl text-[var(--lp-paper)]/60" />
        </motion.div>
      </motion.div>

      {/* Gradient glow that follows cursor */}
      <motion.div
        style={{
          x: useTransform(parallaxX, [-0.5, 0.5], [-40, 40]),
          y: useTransform(parallaxY, [-0.5, 0.5], [-40, 40]),
        }}
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-[var(--lp-accent-2)]/10 rounded-full blur-[120px] pointer-events-none z-0"
      />
    </section>
  )
}
