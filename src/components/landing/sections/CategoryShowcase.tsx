'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Link from 'next/link'
import { categoriesData } from '@/data/categories'

gsap.registerPlugin(ScrollTrigger)

export function CategoryShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    const scrollContainer = scrollRef.current
    if (!container || !scrollContainer) return

    const panels = scrollContainer.querySelectorAll('.category-panel')

    const scrollTween = gsap.to(panels, {
      xPercent: -100 * (panels.length - 1),
      ease: 'none',
      scrollTrigger: {
        trigger: container,
        pin: true,
        scrub: 1,
        end: () => `+=${scrollContainer.offsetWidth}`,
        anticipatePin: 1,
        onUpdate: (self) => {
          const idx = Math.round(self.progress * (panels.length - 1))
          setActiveIndex(idx)
        }
      }
    })

    return () => {
      scrollTween.kill()
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [])

  return (
    <section
      ref={containerRef}
      className="h-screen overflow-hidden bg-black cursor-grab active:cursor-grabbing"
    >
      <div ref={scrollRef} className="flex h-full">
        {categoriesData.map((category, index) => (
          <div
            key={category.id}
            className="category-panel relative min-w-full h-full flex-shrink-0"
          >
            {/* Background Image with Scale.com zoom on hover */}
            <Link href={category.link} className="block h-full group/full-bleed" data-cursor="view">
              <div className="absolute inset-0 overflow-hidden">
                <motion.img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover/full-bleed:scale-105"
                />
                {/* Scale.com mix-blend-multiply overlay */}
                <div className="pointer-events-none absolute inset-0 z-[1] bg-black opacity-0 mix-blend-multiply transition-opacity duration-300 ease-out group-hover/full-bleed:opacity-[0.18]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </div>

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-end p-12 md:p-20">
                <div className="max-w-4xl group/card">
                  <p className="text-sm text-gray-400 mb-2 uppercase tracking-wider transition-colors duration-500 ease-out group-hover/card:text-white">
                    {category.subtitle}
                  </p>

                  <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 transition-transform duration-500 ease-out group-hover/card:scale-95 origin-left">
                    {category.title}
                  </h2>

                </div>

                {/* Progress Indicator */}
                <div className="absolute bottom-8 right-8 flex gap-2">
                  {categoriesData.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-500 ease-out ${
                        i === activeIndex
                          ? 'w-12 bg-white'
                          : 'w-8 bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
