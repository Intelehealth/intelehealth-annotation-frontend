'use client'

import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion'
import { TextReveal } from '../animations/TextReveal'
import { MagneticButton } from '../MagneticButton'
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

  const textX = useTransform(parallaxX, [-0.5, 0.5], [15, -15])
  const textY = useTransform(parallaxY, [-0.5, 0.5], [10, -10])

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
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-20">
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
        <TextReveal
          text="The world's most important decisions need reliable data annotation."
          className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-white mb-6 leading-tight"
          as="h1"
        />

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8, ease: EASE_OUT_EXPO }}
          className="text-base sm:text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto"
        >
          We work across the AI stack, from the data that trains models to the systems that put them to work.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8, ease: EASE_OUT_EXPO }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full"
        >
          <MagneticButton href="/dashboard" strength={0.4} className="w-full sm:w-auto">
            <span className="inline-flex items-center justify-center w-full sm:w-auto min-h-[44px] px-8 py-4 text-lg font-medium rounded-lg bg-white text-black hover:bg-gray-200 transition-all duration-300 group">
              <span className="transition-transform duration-300 group-hover:scale-90">
                Get Started
              </span>
            </span>
          </MagneticButton>

          <MagneticButton href="/documentation" strength={0.4} className="w-full sm:w-auto">
            <span className="inline-flex items-center justify-center w-full sm:w-auto min-h-[44px] px-8 py-4 text-lg font-medium rounded-lg border-2 border-white text-white hover:bg-white hover:text-black transition-all duration-300 group relative overflow-hidden">
              <span className="absolute inset-0 bg-black opacity-0 mix-blend-multiply transition-opacity duration-300 group-hover:opacity-0" />
              <span className="transition-transform duration-300 group-hover:scale-90">
                Learn More
              </span>
            </span>
          </MagneticButton>
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
          <HiArrowDown className="text-white text-3xl opacity-70" />
        </motion.div>
      </motion.div>

      {/* Gradient glow that follows cursor */}
      <motion.div
        style={{
          x: useTransform(parallaxX, [-0.5, 0.5], [-100, 100]),
          y: useTransform(parallaxY, [-0.5, 0.5], [-100, 100]),
        }}
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0"
      />
    </section>
  )
}
