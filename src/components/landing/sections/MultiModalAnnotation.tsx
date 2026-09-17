'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlideUp } from '../animations/SlideUp'
import { TextReveal } from '../animations/TextReveal'
import { FaFileAudio, FaVideo } from 'react-icons/fa'

type TabType = 'audio' | 'video'

const tabs: { id: TabType; label: string; icon: typeof FaFileAudio }[] = [
  { id: 'audio', label: 'Audio', icon: FaFileAudio },
  { id: 'video', label: 'Video', icon: FaVideo }
]

export function MultiModalAnnotation() {
  const [activeTab, setActiveTab] = useState<TabType>('audio')

  return (
    <section id="multimodal" className="py-32 px-6 bg-slate-50 border-b border-slate-100">
      <div className="container mx-auto">
        <SlideUp>
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-blue-600 mb-4 uppercase tracking-wider block font-mono">
              Multi-Modal Annotation
            </span>
          </div>
        </SlideUp>
        <TextReveal
          text="Every data type, one platform."
          className="text-5xl md:text-6xl font-bold text-slate-900 mb-4 tracking-tight text-center"
          as="h2"
        />
        <SlideUp delay={0.3}>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed text-center mb-12">
            Annotate images, audio, video, and structured data with purpose-built tools.
          </p>
        </SlideUp>

        {/* Tab Selector Container */}
        <SlideUp delay={0.2}>
          <div className="flex justify-center mb-12">
            <div className="flex bg-slate-200/60 p-1.5 rounded-full border border-slate-300/30 gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 bg-blue-600 rounded-full"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className="relative z-10 text-sm" />
                    <span className="relative z-10 text-sm">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </SlideUp>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="max-w-5xl mx-auto"
          >
            {activeTab === 'audio' && <AudioAnnotationDemo />}
            {activeTab === 'video' && <VideoAnnotationDemo />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

// ===== AUDIO ANNOTATION DEMO =====
function AudioAnnotationDemo() {
  const [waveformBars, setWaveformBars] = useState<number[]>(() =>
    Array.from({ length: 60 }, () => 0.25)
  )
  const [activeBar, setActiveBar] = useState(0)

  useEffect(() => {
    setWaveformBars(Array.from({ length: 60 }, () => Math.random() * 0.8 + 0.2))
  }, [])

  useEffect(() => {
    if (waveformBars.length === 0) return
    const interval = setInterval(() => {
      setActiveBar((b) => (b + 1) % waveformBars.length)
    }, 100)
    return () => clearInterval(interval)
  }, [waveformBars.length])

  const segments = [
    { start: 0, end: 25, label: 'Speaker 1', color: 'bg-blue-500' },
    { start: 25, end: 55, label: 'Speaker 2', color: 'bg-green-500' },
    { start: 55, end: 100, label: 'Background', color: 'bg-amber-500' }
  ]

  return (
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div className="space-y-4 order-2 md:order-1">
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Audio Transcription</h3>
        <p className="text-slate-600 leading-relaxed">
          Waveform-based annotation with speaker diarization, sentiment tagging,
          and phoneme-level labeling.
        </p>
        <div className="space-y-3 pt-4">
          {['Speaker diarization', 'Sentiment tagging', 'Phoneme alignment', 'Noise labeling'].map((feat, i) => (
            <motion.div
              key={feat}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-slate-700 font-medium">{feat}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Waveform wrapper */}
      <div className="order-1 md:order-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-end justify-center gap-0.5 h-32 mb-6">
          {waveformBars.map((h, i) => (
            <motion.div
              key={i}
              className={`w-1.5 rounded-t transition-colors duration-100 ${
                i <= activeBar ? 'bg-blue-600' : 'bg-slate-200'
              }`}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        {/* Segments timeline */}
        <div className="flex h-8 rounded-lg overflow-hidden">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className={`${seg.color} flex items-center justify-center text-xs text-white font-medium`}
              style={{ width: `${seg.end - seg.start}%` }}
            >
              {seg.label}
            </div>
          ))}
        </div>
        {/* Playhead */}
        <div className="relative mt-4">
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 h-4 bg-red-500"
            animate={{ left: `${(activeBar / waveformBars.length) * 100}%` }}
            transition={{ duration: 0.1 }}
          />
          <div className="flex justify-between text-xs text-slate-500 pt-4 font-mono">
            <span>00:00</span>
            <span>00:30</span>
            <span>01:00</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== VIDEO ANNOTATION DEMO =====
function VideoAnnotationDemo() {
  const [frame, setFrame] = useState(0)
  const totalFrames = 4
  const boxes = [
    { x: 20, y: 30, w: 25, h: 30, label: 'Person', color: '#3b82f6' },
    { x: 50, y: 40, w: 20, h: 25, label: 'Person', color: '#22c55e' },
    { x: 30, y: 20, w: 15, h: 15, label: 'Object', color: '#f59e0b' },
    { x: 60, y: 50, w: 18, h: 22, label: 'Vehicle', color: '#a855f7' }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % totalFrames)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  const scale = 1 + frame * 0.05

  return (
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video group shadow-lg bg-black">
        <motion.img
          src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&h=675&fit=crop"
          alt="Video frame"
          className="w-full h-full object-cover"
          animate={{ scale }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-black/20" />
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <AnimatePresence>
            {boxes.map((box, i) => (
              <motion.rect
                key={box.label + i}
                x={`${box.x + frame * 2}%`}
                y={`${box.y + frame}%`}
                width={`${box.w}%`}
                height={`${box.h}%`}
                fill={`${box.color}25`}
                stroke={box.color}
                strokeWidth={2}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            ))}
          </AnimatePresence>
        </svg>
        {/* Frame counter */}
        <div className="absolute top-4 right-4 bg-black/75 px-3 py-1 rounded-full text-xs font-mono text-white">
          FRAME {frame + 1}/{totalFrames}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Frame-by-Frame Tracking</h3>
        <p className="text-slate-600 leading-relaxed">
          Annotate video with object tracking across frames. Auto-propagate labels
          with interpolation and interpolation-based smoothing.
        </p>
        <div className="space-y-3 pt-4">
          {['Object tracking', 'Frame interpolation', 'Keyframe annotation', 'Timeline scrubbing'].map((feat, i) => (
            <motion.div
              key={feat}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-slate-700 font-medium">{feat}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
