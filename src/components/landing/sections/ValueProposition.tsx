'use client'

import { motion } from 'framer-motion'
import { SlideUp } from '../animations/SlideUp'
import { TextReveal } from '../animations/TextReveal'
import { EASE_OUT_EXPO } from '@/lib/landing-animations'
import { Timeline } from '../Timeline'

// Each modality gets a small, purpose-built drawing of what the annotation
// actually looks like, instead of a stock photo of a dog or a microphone. They
// are plain SVG so they cost nothing to load; each loops via CSS keyframes.

function ImageDemo() {
  return (
    <svg viewBox="0 0 160 100" className="lp-demo" aria-hidden="true">
      <rect x="1" y="1" width="158" height="98" rx="3" className="lp-frame" />
      {/* abstract subject */}
      <circle cx="58" cy="52" r="22" className="lp-shape" />
      <rect x="96" y="38" width="42" height="36" rx="4" className="lp-shape" />
      {/* bounding boxes draw themselves */}
      <rect x="30" y="24" width="56" height="56" className="lp-box" pathLength={100} />
      <rect x="90" y="32" width="54" height="48" className="lp-box lp-box-2" pathLength={100} />
      <rect x="30" y="16" width="26" height="8" rx="1" className="lp-tag" />
      <rect x="90" y="24" width="20" height="8" rx="1" className="lp-tag lp-tag-2" />
    </svg>
  )
}

function VideoDemo() {
  return (
    <svg viewBox="0 0 160 100" className="lp-demo" aria-hidden="true">
      <rect x="1" y="1" width="158" height="98" rx="3" className="lp-frame" />
      {/* keyframe track */}
      <line x1="14" y1="76" x2="146" y2="76" className="lp-rule" />
      {[14, 47, 80, 113, 146].map((x) => (
        <line key={x} x1={x} y1="72" x2={x} y2="80" className="lp-rule" />
      ))}
      {/* tracked object moves along the track */}
      <g className="lp-track">
        <rect x="8" y="30" width="30" height="24" className="lp-box" pathLength={100} />
        <rect x="8" y="22" width="18" height="8" rx="1" className="lp-tag" />
      </g>
      <circle cx="14" cy="76" r="3" className="lp-playhead" />
    </svg>
  )
}

function AudioDemo() {
  // deterministic pseudo-waveform so SSR and client render identical markup
  const bars = Array.from({ length: 34 }, (_, i) => 6 + ((i * 37) % 23))
  return (
    <svg viewBox="0 0 160 100" className="lp-demo" aria-hidden="true">
      <rect x="1" y="1" width="158" height="98" rx="3" className="lp-frame" />
      {/* two speaker segments */}
      <rect x="12" y="24" width="64" height="52" rx="2" className="lp-segment" />
      <rect x="84" y="24" width="64" height="52" rx="2" className="lp-segment lp-segment-2" />
      {bars.map((h, i) => (
        <rect key={i} x={14 + i * 4} y={50 - h / 2} width="2" height={h} rx="1" className="lp-bar" />
      ))}
      <rect x="12" y="14" width="22" height="7" rx="1" className="lp-tag" />
      <rect x="84" y="14" width="22" height="7" rx="1" className="lp-tag lp-tag-2" />
      {/* playhead sweeping the waveform */}
      <line x1="12" y1="22" x2="12" y2="78" className="lp-scan" />
    </svg>
  )
}

function TextDemo() {
  // lines of "text" as rules, with highlighted entity spans
  return (
    <svg viewBox="0 0 160 100" className="lp-demo" aria-hidden="true">
      <rect x="1" y="1" width="158" height="98" rx="3" className="lp-frame" />
      <line x1="14" y1="28" x2="146" y2="28" className="lp-text" />
      <line x1="14" y1="44" x2="128" y2="44" className="lp-text" />
      <line x1="14" y1="60" x2="146" y2="60" className="lp-text" />
      <line x1="14" y1="76" x2="96" y2="76" className="lp-text" />
      <rect x="40" y="23" width="34" height="10" rx="2" className="lp-span" />
      <rect x="90" y="39" width="26" height="10" rx="2" className="lp-span lp-span-2" style={{ animationDelay: '0.6s' }} />
      <rect x="20" y="71" width="44" height="10" rx="2" className="lp-span" style={{ animationDelay: '1.2s' }} />
    </svg>
  )
}

const modalities = [
  {
    index: '01',
    title: 'Image',
    tasks: 'Bounding boxes, polygons, segmentation masks',
    note: 'Pixel-accurate labels with reviewer consensus on every frame.',
    Demo: ImageDemo,
    dur: 4,
    marks: [
      { at: 8, label: "boxes start drawing" },
      { at: 40, label: "boxes closed, labels attached" },
      { at: 85, label: "hold ends, next frame" }
    ]
  },
  {
    index: '02',
    title: 'Video',
    tasks: 'Object tracking, event tagging, frame-level classes',
    note: 'Identities persist across frames; drift is caught in review.',
    Demo: VideoDemo,
    dur: 5,
    marks: [
      { at: 5, label: "track starts, identity assigned" },
      { at: 45, label: "object reaches far edge" },
      { at: 55, label: "returns, same identity" },
      { at: 95, label: "back at origin, loop closes" }
    ]
  },
  {
    index: '03',
    title: 'Audio',
    tasks: 'Transcription, speaker diarization, event detection',
    note: 'Time-aligned segments, verified against the source waveform.',
    Demo: AudioDemo,
    dur: 3.6,
    marks: [
      { at: 0, label: "speaker A segment begins" },
      { at: 50, label: "speaker change, B takes over" },
      { at: 100, label: "end of clip" }
    ]
  },
  {
    index: '04',
    title: 'Text & tabular',
    tasks: 'Entity recognition, sentiment, classification, CSV fields',
    note: 'Nested and conditional questions for structured schemas.',
    Demo: TextDemo,
    dur: 4.5,
    marks: [
      { at: 10, label: "first entity selected" },
      { at: 23, label: "second entity selected" },
      { at: 37, label: "third entity selected" },
      { at: 85, label: "pass complete, reset" }
    ]
  }
]

export function ValueProposition() {
  return (
    <section id="annotate" data-nav="light" className="bg-[var(--lp-paper)] px-6 py-24 text-[var(--lp-ink)] md:py-32">
      {/* 12-col grid, split 5/7. The headline column is sticky and the list
          starts one beat lower, so the two columns never share a baseline —
          the asymmetry is the point. */}
      <div className="container mx-auto grid gap-16 lg:grid-cols-12 lg:gap-12">
        <header className="lg:col-span-5 lg:self-start lg:sticky lg:top-32">
          <SlideUp>
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-[var(--lp-muted)]">
              What we annotate
            </p>
          </SlideUp>

          <TextReveal
            as="h2"
            text="Reliable AI has no shortcuts."
            className="max-w-[12ch] text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl [text-wrap:balance]"
          />

          <SlideUp delay={0.15}>
            <p className="mt-8 max-w-[36ch] text-lg leading-relaxed text-[var(--lp-ink-2)]">
              Precision labels at scale, produced by people with domain knowledge
              and checked by consensus &mdash; the ground truth behind models
              that make consequential decisions.
            </p>
          </SlideUp>

          <SlideUp delay={0.3}>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--lp-rule)] pt-5 font-mono text-xs uppercase tracking-[0.18em] text-[var(--lp-muted)]">
              <li>Humans in the loop</li>
              <li>Secure</li>
              <li>Certified</li>
            </ul>
          </SlideUp>
        </header>

        <ul className="lg:col-span-7 lg:mt-28 border-t border-[var(--lp-rule)]">
          {modalities.map(({ index, title, tasks, note, Demo, dur, marks }, i) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -10% 0px' }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: EASE_OUT_EXPO }}
              className="lp-row group grid grid-cols-[2.5rem_1fr] items-start gap-x-4 gap-y-6 border-b border-[var(--lp-rule)] py-8 sm:grid-cols-[3rem_1fr_11rem] sm:gap-x-8"
            >
              <span className="pt-1 font-mono text-sm text-[var(--lp-muted)]">{index}</span>

              <div>
                <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h3>
                <p className="mt-2 text-base text-[var(--lp-ink-2)]">{tasks}</p>
                <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-[var(--lp-muted)]">
                  {note}
                </p>
              </div>

              <div className="lp-clip col-span-2 sm:col-span-1 sm:justify-self-end">
                <Demo />
                <Timeline dur={dur} marks={marks} />
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
