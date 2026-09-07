'use client'

import { Fragment, ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { textRevealContainer, textRevealChild } from '@/lib/landing-animations'
import { useInView } from '@/hooks/useInView'

// The hero doubles as a sample of the product. Anything inside <HeroAnnotator>
// with data-annot="text" is a target: hovering (or tapping) it draws an
// annotation box around it, with a label tag on top. One box
// is shared and springs between targets, so it glides rather than pops. Until
// the visitor interacts, the box tours the targets on its own — which is also
// how it shows up on touch screens, where there is no hover.

type Box = { x: number; y: number; w: number; h: number; label: string }

const PAD = 6

export function HeroAnnotator({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Box | null>(null)
  const userDriven = useRef(false)
  const reduce = useReducedMotion()

  const boxFor = useCallback((el: HTMLElement): Box | null => {
    const wrap = wrapRef.current
    if (!wrap) return null
    const r = el.getBoundingClientRect()
    const w = wrap.getBoundingClientRect()
    return {
      x: r.left - w.left - PAD,
      y: r.top - w.top - PAD + 2,
      w: r.width + PAD * 2,
      h: r.height + PAD * 2 - 4,
      label: el.dataset.label ?? el.textContent?.trim() ?? ''
    }
  }, [])

  const target = (e: React.SyntheticEvent) =>
    (e.target as HTMLElement).closest<HTMLElement>('[data-annot]')

  // hover (desktop) and tap (touch) both drive the box; either ends the tour
  const onOver = (e: React.MouseEvent) => {
    const el = target(e)
    if (!el) return
    userDriven.current = true
    setBox(boxFor(el))
  }
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    userDriven.current = true
    const el = target(e)
    setBox(el ? boxFor(el) : null)
  }

  // autoplay tour until first interaction
  useEffect(() => {
    if (reduce) return
    const wrap = wrapRef.current
    if (!wrap) return
    let i = 0
    let timer = 0
    const step = () => {
      if (userDriven.current) return
      const targets = Array.from(wrap.querySelectorAll<HTMLElement>('[data-annot]'))
      if (!targets.length) return
      setBox(boxFor(targets[i % targets.length]))
      i++
      timer = window.setTimeout(step, 1700)
    }
    // wait for the text reveal to finish before the first box lands
    timer = window.setTimeout(step, 1600)
    // a resize invalidates measured rects; clear and let the next event redraw
    const onResize = () => setBox(null)
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', onResize)
    }
  }, [boxFor, reduce])

  const spring = reduce
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.6 }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseOver={onOver}
      onMouseLeave={() => setBox(null)}
      onPointerDown={onPointerDown}
    >
      {children}

      <AnimatePresence>
        {box && (
          <motion.span
            aria-hidden="true"
            className="lp-annot pointer-events-none absolute left-0 top-0"
            initial={{ opacity: 0, x: box.x, y: box.y, width: box.w, height: box.h }}
            animate={{ opacity: 1, x: box.x, y: box.y, width: box.w, height: box.h }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            transition={{ ...spring, opacity: { duration: 0.16 } }}
          >
            <i className="lp-annot-h -left-[3px] -top-[3px]" />
            <i className="lp-annot-h -right-[3px] -top-[3px]" />
            <i className="lp-annot-h -left-[3px] -bottom-[3px]" />
            <i className="lp-annot-h -right-[3px] -bottom-[3px]" />
            <span className="lp-annot-tag">
              <span className="opacity-75">text</span>
              <span className="mx-1.5 opacity-40">&middot;</span>
              <motion.span
                key={box.label}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                {box.label}
              </motion.span>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Headline whose every word is a `text` target, with the word-wipe reveal. */
export function AnnotatedWords({ text, className }: { text: string; className?: string }) {
  const { ref, isInView } = useInView()
  const words = text.split(' ')
  return (
    <motion.h1
      ref={ref}
      variants={textRevealContainer}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {words.map((word, i) => (
        <Fragment key={i}>
          {/* the target is the outer, static span; the inner one moves during
              the reveal and would measure a line too low mid-animation */}
          <span data-annot="text" className="inline-block overflow-hidden align-bottom pb-[0.1em] cursor-default">
            <motion.span variants={textRevealChild} className="inline-block">
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </motion.h1>
  )
}
