'use client'

import { motion } from 'framer-motion'
import { customersData } from '@/data/customers'
import { TextReveal } from '../animations/TextReveal'
import { useState } from 'react'

export function CustomerCarousel() {
  const rows = [
    customersData.slice(0, 4),
    customersData.slice(4, 8)
  ]

  const speeds = [50, -40]
  const [isPaused, setIsPaused] = useState(false)

  return (
    <section className="py-32 px-6 bg-black overflow-hidden">
      <div className="mb-16 text-center">
        <TextReveal
          text="Trusted by industry leaders"
          className="text-4xl md:text-5xl font-bold text-white"
          as="h2"
        />
      </div>

      <div className="space-y-8">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="relative overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <motion.div
              animate={{
                x: speeds[rowIndex] > 0 ? [0, -1000] : [0, 1000]
              }}
              transition={{
                duration: isPaused ? 100 : Math.abs(50 / speeds[rowIndex]) * 20,
                repeat: Infinity,
                ease: 'linear'
              }}
              className="flex gap-6"
            >
              {[...row, ...row, ...row].map((customer, i) => (
                <motion.div
                  key={`${customer.id}-${i}`}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="flex-shrink-0 w-80 bg-gray-900 border border-gray-800 rounded-xl p-6 group hover:border-gray-700 transition-all duration-500 ease-out cursor-pointer"
                  data-cursor="pointer"
                >
                  {/* mix-blend-multiply overlay like Scale.com */}
                  <div className="pointer-events-none absolute inset-0 z-[1] rounded-xl bg-black opacity-0 mix-blend-multiply transition-opacity duration-300 ease-out group-hover:opacity-[0.18]" />

                  <div className="h-12 mb-4 flex items-center justify-center relative z-10">
                    {customer.logo.includes('placeholder.com') ? (
                      <div className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-sm tracking-wider uppercase font-bold group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300">
                        {customer.name}
                      </div>
                    ) : (
                      <img
                        src={customer.logo}
                        alt={customer.name}
                        className="h-full w-auto object-contain transition-transform duration-1000 ease-out group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="text-gray-400 group-hover:text-white transition-colors duration-500 ease-out text-center relative z-10">
                    {customer.description}
                  </p>
                  <p className="text-sm text-gray-600 mt-4 text-center relative z-10 group-hover:text-gray-400 transition-colors duration-500">
                    {customer.name}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  )
}
