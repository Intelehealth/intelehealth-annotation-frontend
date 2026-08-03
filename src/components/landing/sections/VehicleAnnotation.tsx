'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { SlideUp } from '../animations/SlideUp'
import { TextReveal } from '../animations/TextReveal'
import { EASE_OUT_EXPO } from '@/lib/landing-animations'

// Animated bounding boxes that appear over the "vehicle video"
interface BBox {
  id: string
  label: string
  color: string
  x: number // percent
  y: number
  w: number
  h: number
}

// Sequence of annotation states that cycle automatically
const annotationStates: BBox[][] = [
  // State 0: first detection
  [
    { id: 'car', label: 'Vehicle', color: '#3b82f6', x: 30, y: 38, w: 28, h: 22 }
  ],
  // State 1: add pedestrian
  [
    { id: 'car', label: 'Vehicle', color: '#3b82f6', x: 30, y: 38, w: 28, h: 22 },
    { id: 'person', label: 'Pedestrian', color: '#22c55e', x: 62, y: 42, w: 8, h: 18 }
  ],
  // State 2: add lane + traffic light
  [
    { id: 'car', label: 'Vehicle', color: '#3b82f6', x: 30, y: 38, w: 28, h: 22 },
    { id: 'person', label: 'Pedestrian', color: '#22c55e', x: 62, y: 42, w: 8, h: 18 },
    { id: 'lane', label: 'Lane', color: '#f59e0b', x: 5, y: 55, w: 90, h: 4 },
    { id: 'light', label: 'Traffic Light', color: '#ef4444', x: 48, y: 10, w: 6, h: 12 }
  ],
  // State 3: full scene
  [
    { id: 'car', label: 'Vehicle', color: '#3b82f6', x: 30, y: 38, w: 28, h: 22 },
    { id: 'person', label: 'Pedestrian', color: '#22c55e', x: 62, y: 42, w: 8, h: 18 },
    { id: 'lane', label: 'Lane', color: '#f59e0b', x: 5, y: 55, w: 90, h: 4 },
    { id: 'light', label: 'Traffic Light', color: '#ef4444', x: 48, y: 10, w: 6, h: 12 },
    { id: 'sign', label: 'Sign', color: '#a855f7', x: 78, y: 14, w: 8, h: 10 }
  ]
]

interface Stat {
  label: string
  display: (val: number) => string
  target: number
  color: string
}

const stats: Stat[] = [
  { label: 'Frames Annotated', target: 2.4, display: (v) => `${v.toFixed(1)}M+`, color: 'text-blue-600' },
  { label: 'Label Accuracy', target: 99.2, display: (v) => `${v.toFixed(1)}%`, color: 'text-green-600' },
  { label: 'Avg Latency', target: 120, display: (v) => `${Math.round(v)}ms`, color: 'text-purple-600' },
  { label: 'Active Projects', target: 450, display: (v) => `${Math.round(v)}+`, color: 'text-cyan-600' }
]

function CountUpStat({ stat, delay }: { stat: Stat; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '0px 0px -15% 0px', amount: 0.3 })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 1500
    const start = performance.now()
    let raf: number

    const tick = (now: number) => {
      const elapsed = now - start - delay
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(elapsed / duration, 1)
      // easeOutExpo: fast start, slow settle
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setValue(stat.target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isInView, stat.target, delay])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: delay / 1000, duration: 0.6, ease: EASE_OUT_EXPO }}
      className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all duration-300 group text-center shadow-sm hover:shadow-md"
    >
      <div className={`text-3xl md:text-4xl font-bold ${stat.color} mb-2`}>
        {stat.display(value)}
      </div>
      <div className="text-sm text-slate-600">{stat.label}</div>
    </motion.div>
  )
}

export function VehicleAnnotation() {
  const [stateIndex, setStateIndex] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout>(null as unknown as NodeJS.Timeout)

  // Auto-cycle through annotation states
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setStateIndex((prev) => (prev + 1) % annotationStates.length)
    }, 2000)

    return () => clearInterval(intervalRef.current)
  }, [])

  const currentBoxes = annotationStates[stateIndex]

  return (
    <section id="vehicles" className="py-32 px-6 bg-white border-b border-slate-100">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <SlideUp>
            <span className="text-sm font-semibold text-blue-600 mb-3 uppercase tracking-wider block font-mono">
              COMPUTER VISION & SENSOR FUSION
            </span>
          </SlideUp>
          <TextReveal
            text="Autonomous Systems & Spatial AI"
            className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight"
            as="h2"
          />
          <SlideUp delay={0.2}>
            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              From 2D video sequences to complex 3D LiDAR point clouds, our smart labeling tools automate detection tracking with sub-pixel precision.
            </p>
          </SlideUp>
        </div>

        <div className="space-y-12">
          {/* Vehicle "Video" with animated annotation overlay */}
          <SlideUp delay={0.2}>
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xl group">
              {/* "Video" background (driving POV image) */}
              <div className="relative aspect-video bg-black">
                <img
                  src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1600&h=900&fit=crop"
                  alt="Autonomous vehicle POV"
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000 ease-out"
                />
                {/* Scan line animation overlay */}
                <motion.div
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent pointer-events-none"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Grid overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                  }}
                />

                {/* Animated bounding boxes */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <AnimatePresence>
                    {currentBoxes.map((box) => (
                      <motion.g
                        key={box.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      >
                        {/* Draw the box with stroke-dash animation */}
                        <motion.rect
                          x={`${box.x}%`}
                          y={`${box.y}%`}
                          width={`${box.w}%`}
                          height={`${box.h}%`}
                          fill={`${box.color}20`}
                          stroke={box.color}
                          strokeWidth={2}
                          strokeDasharray={300}
                          initial={{ strokeDashoffset: 300 }}
                          animate={{ strokeDashoffset: 0 }}
                          transition={{ duration: 0.6, ease: 'easeInOut' }}
                        />
                        {/* Corner accents */}
                        {[
                          [box.x, box.y],
                          [box.x + box.w, box.y],
                          [box.x, box.y + box.h],
                          [box.x + box.w, box.y + box.h]
                        ].map(([cx, cy], i) => (
                          <motion.circle
                            key={i}
                            cx={`${cx}%`}
                            cy={`${cy}%`}
                            r={3}
                            fill={box.color}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.05, duration: 0.2 }}
                          />
                        ))}
                      </motion.g>
                    ))}
                  </AnimatePresence>
                </svg>

                {/* Labels for bounding boxes */}
                <AnimatePresence>
                  {currentBoxes.map((box) => (
                    <motion.div
                      key={`label-${box.id}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="absolute px-2 py-0.5 text-xs font-mono font-bold text-white rounded pointer-events-none whitespace-nowrap"
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y - 5}%`,
                        backgroundColor: box.color,
                        transform: 'translateY(-100%)'
                      }}
                    >
                      {box.label}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* HUD top bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-red-500"
                    />
                    <span className="text-xs font-mono text-white/80 uppercase tracking-wider">
                      Live Annotation
                    </span>
                  </div>
                  <span className="text-xs font-mono text-white/60">
                    FRAME {String(stateIndex + 1).padStart(4, '0')} / {annotationStates.length}
                  </span>
                </div>

                {/* HUD bottom bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white/60">
                      {currentBoxes.length} OBJECTS DETECTED
                    </span>
                    <div className="flex gap-1">
                      {annotationStates.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            i === stateIndex ? 'w-8 bg-blue-500' : 'w-3 bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SlideUp>

          {/* Stats panel - count-up on scroll-in */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <CountUpStat key={stat.label} stat={stat} delay={i * 120} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
