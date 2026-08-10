'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SlideUp } from '../animations/SlideUp'
import { MagneticButton } from '../MagneticButton'
import { TextReveal } from '../animations/TextReveal'
import { HiArrowRight } from 'react-icons/hi'
import { EASE_OUT_EXPO, EASE_INOUT_CUBIC, cardEntrance } from '@/lib/landing-animations'

const features = [
  {
    title: 'High-Quality Annotations',
    description: 'Expert annotators with domain knowledge deliver precision labels for your AI models.',
    icon: '🎯',
    color: 'from-blue-600 to-blue-800'
  },
  {
    title: 'Scalable Platform',
    description: 'Handle projects of any size with our robust annotation platform and workflow management.',
    icon: '📈',
    color: 'from-purple-600 to-purple-800'
  },
  {
    title: 'Multi-Modal Support',
    description: 'Text, image, video, audio - we support all data types for comprehensive AI training.',
    icon: '🔄',
    color: 'from-cyan-600 to-cyan-800'
  }
]

export function FeaturesSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section className="py-32 px-6 bg-gradient-to-b from-black to-gray-950">
      <div className="container mx-auto">
        <TextReveal
          text="Built for the future of AI"
          className="text-5xl md:text-6xl font-bold text-white mb-16 text-center"
          as="h2"
        />

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={cardEntrance}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: '0px 0px -15% 0px', amount: 0.2 }}
              transition={{ delay: i * 0.1, duration: 0.7, ease: EASE_OUT_EXPO }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="group/card relative bg-gray-900 border border-gray-800 rounded-2xl p-8 overflow-hidden cursor-pointer"
              style={{
                transition: `background-color 0.4s ${EASE_INOUT_CUBIC}, opacity 0.4s ${EASE_INOUT_CUBIC}`,
                opacity: hoveredIndex !== null && hoveredIndex !== i ? 0.4 : 1,
              }}
            >
              {/* Flip-up background on focus/active */}
              <div
                className={`bg-gradient-to-br ${feature.color} w-full h-full absolute origin-bottom transition-transform duration-500 ease-out top-0 left-0 rounded-2xl ${
                  hoveredIndex === i ? 'scale-y-100' : 'scale-y-0'
                }`}
              />

              {/* mix-blend-multiply overlay */}
              <div className="pointer-events-none absolute inset-0 z-[1] rounded-2xl bg-black opacity-0 mix-blend-multiply transition-opacity duration-300 ease-out group-hover/card:opacity-[0.18]" />

              <div className="relative z-10 transition-colors duration-500 ease-out text-white">
                <div
                  className="text-6xl mb-4 transition-transform duration-500 ease-out group-hover/card:scale-110"
                  style={{ transform: hoveredIndex === i ? 'scale(1.1)' : 'scale(1)' }}
                >
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-300 group-hover:text-white/90 mb-6">
                  {feature.description}
                </p>

                {/* Arrow slide-in from left */}
                <div
                  className="flex items-center gap-2 transition-opacity duration-500 text-gray-400 group-hover:text-white"
                  style={{ opacity: hoveredIndex === i ? 1 : 0.4 }}
                >
                  <div className="transform-gpu gap-2 will-change-transform transition-transform duration-500 ease-out group-hover/card:translate-x-0 -translate-x-[calc(20px+8px)] group-hover/card:transition-transform group-hover/card:ease-out">
                    <HiArrowRight className="text-2xl" />
                  </div>
                  <span className="text-sm font-medium">Learn more</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <SlideUp delay={0.4}>
          <div className="mt-16 text-center">
            <MagneticButton href="/dashboard" strength={0.4}>
              <span className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 group">
                <span className="transition-transform duration-300 group-hover:scale-90">
                  Start Annotating
                </span>
              </span>
            </MagneticButton>
          </div>
        </SlideUp>
      </div>
    </section>
  )
}
