'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { SlideUp } from '../animations/SlideUp'
import { TextReveal } from '../animations/TextReveal'
import { EASE_OUT_EXPO } from '@/lib/landing-animations'
import { Timeline, type Mark } from '../Timeline'

// One drawing per group, each an 8-second loop of the actual workflow (CSS in
// globals.css, "Landing: service drawings"). Elements enter on numbered slots
// (`lp-s1`..`lp-s8`) so every drawing stays in sync with its own cycle.

const T = ({ x, y, children, className = '' }: { x: number; y: number; children: ReactNode; className?: string }) => (
  <text x={x} y={y} className={`lp-d-t ${className}`}>{children}</text>
)

// Produce: the workbench. Item on the left gets labelled; the schema on the
// right gets answered, and ticking a question reveals its nested follow-up.
function ProduceDrawing() {
  return (
    <svg viewBox="0 0 280 170" className="lp-draw" aria-hidden="true">
      <rect x="1" y="1" width="278" height="168" rx="4" className="lp-d-frame" />
      {/* left pane: the item */}
      <rect x="12" y="12" width="140" height="146" rx="3" className="lp-d-pane" />
      <T x={20} y={26} className="lp-d-t-dim">item 0214.jpg</T>
      <rect x="44" y="60" width="72" height="44" rx="6" className="lp-d-shape" />
      <circle cx="58" cy="108" r="7" className="lp-d-shape" />
      <circle cx="104" cy="108" r="7" className="lp-d-shape" />
      <rect x="36" y="50" width="90" height="66" className="lp-d-boxdraw" pathLength={100} />
      <g className="lp-s2">
        <rect x="36" y="40" width="34" height="10" rx="1.5" className="lp-d-tagbg" />
        <T x={40} y={47.5} className="lp-d-t-inv">vehicle</T>
      </g>
      {/* right pane: the questions */}
      <rect x="160" y="12" width="108" height="146" rx="3" className="lp-d-pane" />
      <T x={168} y={26} className="lp-d-t-dim">questions</T>
      <T x={168} y={46}>Type</T>
      <circle cx="172" cy="58" r="3.5" className="lp-d-radio" />
      <T x={180} y={61} className="lp-d-t-dim">Car</T>
      <circle cx="210" cy="58" r="3.5" className="lp-d-radio" />
      <T x={218} y={61} className="lp-d-t-dim">Truck</T>
      <circle cx="172" cy="58" r="2" className="lp-d-radio-on lp-s3" />
      <T x={168} y={84}>Damaged?</T>
      <rect x="168" y="90" width="10" height="10" rx="2" className="lp-d-box" />
      <path d="M170.5 95 l2.5 2.5 l4.5 -5" className="lp-d-check lp-s4" pathLength={100} />
      <T x={183} y={98} className="lp-d-t-dim">Yes</T>
      {/* nested follow-up, only exists once Damaged = Yes */}
      <g className="lp-s5">
        <line x1="173" y1="104" x2="173" y2="122" className="lp-d-branch" />
        <line x1="173" y1="122" x2="180" y2="122" className="lp-d-branch" />
        <T x={184} y={125}>Severity</T>
        <rect x="184" y="131" width="76" height="12" rx="2" className="lp-d-field" />
        <T x={188} y={140} className="lp-d-t-dim lp-s6">Minor - bumper</T>
      </g>
    </svg>
  )
}

// Verify: one item, three annotators. Two agree, one conflicts and is flagged;
// the reviewer resolves it, agreement moves 67% -> 100%, the dataset bar grows.
function VerifyDrawing() {
  const rows = [
    { y: 46, name: 'Annotator A', answer: 'Car' },
    { y: 70, name: 'Annotator B', answer: 'Car' }
  ]
  return (
    <svg viewBox="0 0 280 170" className="lp-draw" aria-hidden="true">
      <rect x="1" y="1" width="278" height="168" rx="4" className="lp-d-frame" />
      <T x={14} y={22} className="lp-d-t-dim">item 0214 / Type</T>
      <line x1="14" y1="30" x2="176" y2="30" className="lp-d-rule" />
      {rows.map(({ y, name, answer }, i) => (
        <g key={name} className={`lp-s${i + 1}`}>
          <T x={14} y={y + 4}>{name}</T>
          <rect x="112" y={y - 6} width="34" height="14" rx="2" className="lp-d-chip" />
          <T x={118} y={y + 4} className="lp-d-t-inv">{answer}</T>
        </g>
      ))}
      <g className="lp-s3">
        <T x={14} y={98}>Annotator C</T>
        {/* the conflicting answer, replaced once resolved */}
        <g className="lp-x6">
          <rect x="112" y="88" width="34" height="14" rx="2" className="lp-d-chip-2" />
          <T x={116} y={98} className="lp-d-t-inv">Truck</T>
          <T x={152} y={98} className="lp-d-t-warn">conflict</T>
        </g>
        <g className="lp-s6">
          <rect x="112" y="88" width="34" height="14" rx="2" className="lp-d-chip" />
          <T x={118} y={98} className="lp-d-t-inv">Car</T>
          <T x={152} y={98} className="lp-d-t-dim">resolved</T>
        </g>
      </g>
      <line x1="14" y1="112" x2="176" y2="112" className="lp-d-rule" />
      <T x={14} y={130} className="lp-d-t-dim">agreement</T>
      <T x={70} y={130} className="lp-d-t-big lp-x6">67%</T>
      <T x={70} y={130} className="lp-d-t-big lp-s6">100%</T>
      {/* analytics: per-dataset agreement, latest bar grows on resolve */}
      <rect x="192" y="12" width="76" height="146" rx="3" className="lp-d-pane" />
      <T x={200} y={26} className="lp-d-t-dim">this week</T>
      {[0.55, 0.7, 0.62, 0.8].map((h, i) => (
        <rect key={i} x={200 + i * 14} y={140 - 90 * h} width="9" height={90 * h} rx="1" className="lp-d-bar" />
      ))}
      <rect x="256" y="56" width="9" height="84" rx="1" className="lp-d-bar lp-d-bar-live" />
      <line x1="200" y1="140" x2="265" y2="140" className="lp-d-rule" />
    </svg>
  )
}

// Evaluate: an agent transcript builds step by step; a human grader and an LLM
// judge score it independently, and their agreement is recorded.
function EvaluateDrawing() {
  const steps = [
    { y: 40, label: 'user', text: 'Find the refund policy', cls: '' },
    { y: 62, label: 'agent', text: '-> search("refund policy")', cls: 'lp-d-t-acc' },
    { y: 84, label: 'tool', text: '<- 3 results', cls: '' },
    { y: 106, label: 'agent', text: 'Refunds within 30 days...', cls: '' }
  ]
  const dots = (x: number, y: number, on: number, cls: string) =>
    [0, 1, 2, 3, 4].map((i) => (
      <circle key={i} cx={x + i * 10} cy={y} r="3" className={`lp-d-dot ${i < on ? `lp-d-dot-on ${cls}` : ''}`} />
    ))
  return (
    <svg viewBox="0 0 280 170" className="lp-draw" aria-hidden="true">
      <rect x="1" y="1" width="278" height="168" rx="4" className="lp-d-frame" />
      <rect x="12" y="12" width="150" height="146" rx="3" className="lp-d-pane" />
      <T x={20} y={26} className="lp-d-t-dim">trajectory #88</T>
      {steps.map(({ y, label, text, cls }, i) => (
        <g key={y} className={`lp-s${i + 1}`}>
          <T x={20} y={y} className="lp-d-t-dim">{label}</T>
          <T x={50} y={y} className={cls}>{text}</T>
        </g>
      ))}
      <g className="lp-s4">
        <line x1="20" y1="118" x2="154" y2="118" className="lp-d-rule" />
        <T x={20} y={134} className="lp-d-t-dim">task complete</T>
        <path d="M100 133 l3 3 l6 -6" className="lp-d-check" pathLength={100} />
      </g>
      {/* graders */}
      <rect x="170" y="12" width="98" height="66" rx="3" className="lp-d-pane" />
      <T x={178} y={26} className="lp-d-t-dim">human grader</T>
      <g className="lp-s5">{dots(182, 44, 4, 'lp-d-dot-h')}</g>
      <T x={178} y={66} className="lp-s5">4 / 5 - correct</T>
      <rect x="170" y="86" width="98" height="66" rx="3" className="lp-d-pane" />
      <T x={178} y={100} className="lp-d-t-dim">LLM judge</T>
      <g className="lp-s6">{dots(182, 118, 4, 'lp-d-dot-j')}</g>
      <T x={178} y={140} className="lp-s6">4 / 5 - correct</T>
      <g className="lp-s7">
        <line x1="219" y1="78" x2="219" y2="86" className="lp-d-link" />
        <T x={224} y={85} className="lp-d-t-warn">agree</T>
      </g>
    </svg>
  )
}

type Item = { title: string; line: string }
type Group = {
  index: string
  label: string
  items: [Item, Item]
  Drawing: () => ReactNode
  marks: Mark[]
  // which of the three asymmetric arrangements this group uses
  layout: 'a' | 'b' | 'c'
}

const groups: Group[] = [
  {
    index: '01',
    label: 'Produce',
    layout: 'a',
    Drawing: ProduceDrawing,
    marks: [
      { at: 10, label: "bounding box drawn" },
      { at: 20, label: "tagged: vehicle" },
      { at: 30, label: "Type = Car" },
      { at: 40, label: "Damaged = Yes" },
      { at: 50, label: "nested Severity question appears" },
      { at: 60, label: "Severity: minor, bumper" }
    ],
    items: [
      { title: 'Annotation workspace', line: 'Every modality, one workbench, nested and conditional schemas.' },
      { title: 'Document intelligence', line: 'Annotate long documents against the source, retrieval-backed.' }
    ]
  },
  {
    index: '02',
    label: 'Verify',
    layout: 'b',
    Drawing: VerifyDrawing,
    marks: [
      { at: 10, label: "Annotator A: Car" },
      { at: 20, label: "Annotator B: Car" },
      { at: 30, label: "Annotator C: Truck, conflict flagged" },
      { at: 60, label: "resolved to Car, agreement 100%" },
      { at: 78, label: "weekly agreement bar updates" }
    ],
    items: [
      { title: 'Consensus & QA review', line: 'Several annotators per item; disagreement resolved, not averaged.' },
      { title: 'Analytics', line: 'Agreement, throughput and quality per dataset, over time.' }
    ]
  },
  {
    index: '03',
    label: 'Evaluate',
    layout: 'c',
    Drawing: EvaluateDrawing,
    marks: [
      { at: 10, label: "user asks for refund policy" },
      { at: 20, label: "agent calls search tool" },
      { at: 30, label: "tool returns 3 results" },
      { at: 40, label: "agent answers, task complete" },
      { at: 50, label: "human grader: 4 / 5" },
      { at: 60, label: "LLM judge: 4 / 5" },
      { at: 70, label: "graders agree" }
    ],
    items: [
      { title: 'Agentic evaluation', line: 'Human graders score whole agent trajectories, step by step.' },
      { title: 'Certified LLM judges', line: 'Judges calibrated on human labels, agreement reported per task.' }
    ]
  }
]

// Three arrangements on a 12-col grid. Reading top to bottom the drawing
// goes left → right → wide, and the text block goes dropped → lifted → tucked.
const layouts = {
  a: { drawing: 'lg:col-span-6', items: 'lg:col-span-4 lg:col-start-9 lg:mt-20' },
  b: { drawing: 'lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:-mt-10', items: 'lg:col-span-5 lg:row-start-1 lg:mt-8' },
  c: { drawing: 'lg:col-span-7 lg:col-start-2', items: 'lg:col-span-3 lg:col-start-10 lg:self-end' }
} as const

function ItemList({ items }: { items: Item[] }) {
  return (
    <ul className="space-y-8">
      {items.map(({ title, line }) => (
        <li key={title} className="border-t border-[var(--lp-paper)]/15 pt-5">
          <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h3>
          <p className="mt-2 max-w-[30ch] text-[var(--lp-paper)]/60">{line}</p>
        </li>
      ))}
    </ul>
  )
}

export function Services() {
  return (
    <section id="deliver" data-nav="dark" className="bg-[var(--lp-ink)] px-6 py-24 text-[var(--lp-paper)] md:py-32">
      <div className="container mx-auto">
        {/* Intro: headline left, standfirst pushed right and down. */}
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SlideUp>
              <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-[var(--lp-paper)]/50">
                What we deliver
              </p>
            </SlideUp>
            <TextReveal
              as="h2"
              text="Ground truth, and the machinery to trust it."
              className="max-w-[16ch] text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl [text-wrap:balance]"
            />
          </div>
          <SlideUp delay={0.15} className="lg:col-span-4 lg:col-start-9 lg:mt-24">
            <p className="max-w-[30ch] text-lg leading-relaxed text-[var(--lp-paper)]/70">
              Labels are half of it. Knowing how far to trust them is the other half.
            </p>
          </SlideUp>
        </div>

        <div className="mt-24 space-y-28 md:mt-32 md:space-y-36">
          {groups.map(({ index, label, items, Drawing, layout, marks }) => {
            const l = layouts[layout]
            return (
              <motion.div
                key={index}
                id={label.toLowerCase()}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -12% 0px' }}
                transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
                className="grid gap-10 lg:grid-cols-12"
              >
                <div className={l.drawing}>
                  <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[var(--lp-paper)]/45">
                    {label}
                  </p>
                  <div className="lp-clip lp-clip-dark">
                    <Drawing />
                    <Timeline dur={8} marks={marks} label={label.toLowerCase()} />
                  </div>
                </div>
                <div className={l.items}>
                  <ItemList items={items} />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
