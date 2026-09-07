'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { HiMenu, HiX } from 'react-icons/hi'
import { navigationData } from '@/data/navigation'
import { EASE_OUT_EXPO } from '@/lib/landing-animations'

type Theme = 'dark' | 'light'

// The bar is fixed over sections that alternate charcoal/beige, so it reads
// which section is under it (each root carries data-nav="dark|light") and
// flips its own ink/paper to match. That flip, the shrink on scroll and the
// hide-on-scroll-down are the bar's motion; nothing else moves on its own.
function useBarState() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [compact, setCompact] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const sections = () => Array.from(document.querySelectorAll<HTMLElement>('[data-nav]'))
    let raf = 0
    const update = () => {
      raf = 0
      const y = window.scrollY
      setCompact(y > 24)
      // hide when scrolling down past the hero, reveal on any upward scroll
      setHidden(y > lastY.current + 4 && y > 240)
      lastY.current = y
      const probe = 36 // px from the top: roughly the bar's vertical centre
      const under = sections().find((s) => {
        const r = s.getBoundingClientRect()
        return r.top <= probe && r.bottom > probe
      })
      if (under) setTheme((under.dataset.nav as Theme) ?? 'dark')
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return { theme, compact, hidden }
}

export function LandingHeader() {
  const { theme, compact, hidden } = useBarState()
  const [open, setOpen] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [mobile, setMobile] = useState(false)
  const closeTimer = useRef<number | null>(null)

  // small grace period so moving from a link down into its panel doesn't
  // close the panel on the way
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(null), 120)
  }
  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }

  useEffect(() => {
    if (!mobile) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobile(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobile])

  const panel = navigationData.find((i) => i.label === open)

  return (
    <motion.header
      data-theme={theme}
      data-compact={compact || undefined}
      animate={{ y: hidden && !open && !mobile ? '-100%' : '0%' }}
      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
      className="lp-bar fixed inset-x-0 top-0 z-50"
      onMouseLeave={scheduleClose}
    >
      <nav className="lp-bar-inner container mx-auto flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight" onMouseEnter={scheduleClose}>
          <img src="/logo.png" alt="" className="lp-bar-logo h-8 w-8 rounded-md" />
          <span>Latent Verify</span>
        </Link>

        {/* desktop links with a pill that slides between hovered items */}
        <ul className="relative hidden items-center gap-1 md:flex" onMouseLeave={() => setHovered(null)}>
          {navigationData.map((item) => {
            const active = hovered === item.label || open === item.label
            return (
              <li
                key={item.label}
                className="relative"
                onMouseEnter={() => {
                  cancelClose()
                  setHovered(item.label)
                  setOpen(item.children ? item.label : null)
                }}
              >
                {active && (
                  <motion.span
                    layoutId="lp-bar-pill"
                    className="lp-bar-pill absolute inset-0 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Link
                  href={item.href}
                  className="relative z-10 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
                  aria-haspopup={item.children ? 'menu' : undefined}
                  aria-expanded={item.children ? open === item.label : undefined}
                >
                  {item.label}
                  {item.children && (
                    <motion.span
                      aria-hidden="true"
                      animate={{ rotate: open === item.label ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                      className="text-[10px] opacity-60"
                    >
                      &#9662;
                    </motion.span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="hidden items-center gap-5 md:flex" onMouseEnter={scheduleClose}>
          <Link href="/login" className="text-sm font-medium opacity-75 transition-opacity duration-300 hover:opacity-100">
            Log in
          </Link>
          <Link href="/dataset/add-dataset" className="lp-bar-cta rounded-full px-5 py-2 text-sm font-medium">
            Upload a dataset
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobile((m) => !m)}
          className="grid h-11 w-11 place-items-center rounded-full text-2xl md:hidden"
          aria-label={mobile ? 'Close menu' : 'Open menu'}
          aria-expanded={mobile}
        >
          {mobile ? <HiX /> : <HiMenu />}
        </button>
      </nav>

      {/* anchored dropdown: slides down from under the bar, items stagger in */}
      <AnimatePresence>
        {panel?.children && (
          <motion.div
            key={panel.label}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="lp-bar-panel absolute left-1/2 top-full hidden w-[34rem] -translate-x-1/2 rounded-2xl p-2 md:block"
          >
            <ul className="grid grid-cols-2 gap-1">
              {panel.children.map((child, i) => (
                <motion.li
                  key={child.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.35, ease: EASE_OUT_EXPO }}
                >
                  <Link
                    href={child.href}
                    onClick={() => setOpen(null)}
                    className="lp-bar-item block rounded-xl px-4 py-3"
                  >
                    <span>
                      <span className="block text-sm font-medium">{child.label}</span>
                      <span className="mt-0.5 block text-xs opacity-60">{child.description}</span>
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* mobile: full-screen sheet, links stagger up */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="lp-bar-sheet fixed inset-0 top-[var(--lp-bar-h)] flex flex-col px-6 pb-10 pt-8 md:hidden"
          >
            <ul className="space-y-6">
              {navigationData.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <Link href={item.href} onClick={() => setMobile(false)} className="text-3xl font-semibold tracking-tight">
                    {item.label}
                  </Link>
                  {item.children && (
                    <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm opacity-70">
                      {item.children.map((c) => (
                        <li key={c.label}>
                          <Link href={c.href} onClick={() => setMobile(false)}>{c.label}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.li>
              ))}
            </ul>
            <div className="mt-auto flex items-center gap-4">
              <Link href="/dataset/add-dataset" onClick={() => setMobile(false)} className="lp-bar-cta flex-1 rounded-full px-5 py-3 text-center text-sm font-medium">
                Upload a dataset
              </Link>
              <Link href="/login" onClick={() => setMobile(false)} className="px-4 py-3 text-sm font-medium opacity-75">
                Log in
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
