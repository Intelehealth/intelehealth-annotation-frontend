'use client'

import { motion } from 'framer-motion'
import { SlideUp } from '../animations/SlideUp'
import { TextReveal } from '../animations/TextReveal'
import { FaImage, FaFileAudio, FaVideo, FaFileCsv } from 'react-icons/fa'
import { EASE_OUT_EXPO, cardEntrance } from '@/lib/landing-animations'

const annotationTypes = [
  {
    id: 'image',
    title: 'Image Annotation',
    icon: FaImage,
    color: 'from-blue-600 to-blue-800',
    accent: '#3b82f6',
    description: 'Bounding boxes, polygons & segmentation',
    image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&h=400&fit=crop'
  },
  {
    id: 'video',
    title: 'Video Annotation',
    icon: FaVideo,
    color: 'from-purple-600 to-purple-800',
    accent: '#a855f7',
    description: 'Frame-by-frame object tracking',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=400&fit=crop'
  },
  {
    id: 'audio',
    title: 'Audio Annotation',
    icon: FaFileAudio,
    color: 'from-green-600 to-green-800',
    accent: '#22c55e',
    description: 'Transcription & speaker diarization',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=400&fit=crop'
  },
  {
    id: 'csv',
    title: 'Text / CSV Annotation',
    icon: FaFileCsv,
    color: 'from-amber-600 to-amber-800',
    accent: '#f59e0b',
    description: 'Sentiment, NER & classification',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop'
  }
]

export function ValueProposition() {
  return (
    <section className="py-24 px-6 bg-white border-y border-slate-100">
      <div className="container mx-auto">
        {/* Heading */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <TextReveal
            text="Reliable AI has no shortcuts."
            className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight"
            as="h2"
          />

          <SlideUp delay={0.2}>
            <p className="text-xl md:text-2xl text-slate-600 mb-4 leading-relaxed">
              We provide precision data annotation at scale, powering the models that drive critical decisions.
            </p>
          </SlideUp>

          <SlideUp delay={0.4}>
            <p className="text-sm font-mono tracking-widest text-slate-400 uppercase">
              HUMANS IN THE LOOP • SECURE • CERTIFIED
            </p>
          </SlideUp>
        </div>

        {/* Annotation Type Showcase Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {annotationTypes.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.id}
                variants={cardEntrance}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, margin: '0px 0px -15% 0px', amount: 0.2 }}
                transition={{ delay: i * 0.1, duration: 0.7, ease: EASE_OUT_EXPO }}
                whileHover={{ scale: 1.03, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
                className="group/card relative rounded-2xl overflow-hidden border border-slate-200 bg-white hover:border-slate-300 transition-all duration-500 ease-out cursor-pointer shadow-sm hover:shadow-lg"
              >
                {/* Image with zoom on hover (Scale.com style: 1000ms) */}
                <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover opacity-80 group-hover/card:opacity-95 group-hover/card:scale-105 transition-all duration-1000 ease-out"
                  />
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Scale.com mix-blend-multiply hover overlay */}
                  <div className="pointer-events-none absolute inset-0 z-[1] bg-black opacity-0 mix-blend-multiply transition-opacity duration-300 ease-out group-hover/card:opacity-[0.12]" />

                  {/* Animated annotation overlay (SVG bounding box that draws on hover) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-500">
                    <motion.rect
                      x="15%"
                      y="20%"
                      width="40%"
                      height="45%"
                      fill={`${item.accent}20`}
                      stroke={item.accent}
                      strokeWidth={2}
                      strokeDasharray={300}
                      initial={{ strokeDashoffset: 300 }}
                      whileInView={{ strokeDashoffset: 0 }}
                      transition={{ duration: 0.8, ease: 'easeInOut' }}
                    />
                  </svg>

                  {/* Label badge on image */}
                  <div
                    className="absolute top-3 left-3 px-2 py-1 text-[10px] font-mono font-bold text-white rounded opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"
                    style={{ backgroundColor: item.accent }}
                  >
                    ANNOTATED
                  </div>
                </div>

                {/* Content below image */}
                <div className="p-5 bg-slate-50/90 border-t border-slate-100">
                  {/* Icon */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 group-hover/card:scale-110 transition-transform duration-500`}>
                    <Icon className="text-white text-lg" />
                  </motion.div>

                  <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover/card:text-slate-900 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {item.description}
                  </p>

                  </div>

                {/* Gradient glow on hover */}
                <div
                  className="absolute -inset-1 rounded-2xl opacity-0 group-hover/card:opacity-10 blur-xl transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at center, ${item.accent}, transparent 70%)` }}
                />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
