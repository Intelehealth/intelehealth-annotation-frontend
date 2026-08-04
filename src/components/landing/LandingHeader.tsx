'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { HiChevronDown, HiX } from 'react-icons/hi'
import { navigationData } from '@/data/navigation'
import { MagneticButton } from './MagneticButton'

interface MobileNavItem {
  label: string
  href: string
  children?: { label: string; href: string }[]
}

const mobileNavData: MobileNavItem[] = [
  {
    label: 'Products',
    href: '/dashboard',
    children: [
      { label: 'Data Engine', href: '/dashboard' },
      { label: 'Consensus Engine', href: '/dashboard' },
      { label: 'Annotation Tools', href: '/documentation' },
      { label: 'Export Studio', href: '/dashboard' }
    ]
  },
  {
    label: 'Solutions',
    href: '/dashboard',
    children: [
      { label: 'AI Training', href: '/dashboard' },
      { label: 'Enterprise', href: '/dashboard' },
      { label: 'Healthcare', href: '/landing#healthcare' },
      { label: 'Finance', href: '/dashboard' }
    ]
  },
  {
    label: 'Resources',
    href: '/documentation',
    children: [
      { label: 'Documentation', href: '/documentation' },
      { label: 'API Reference', href: '/documentation' },
      { label: 'Blog', href: '/documentation' },
      { label: 'Contact', href: '/contact' }
    ]
  }
]

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [canHover, setCanHover] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openAccordionRef = useRef<string | null>(null)

  useEffect(() => {
    openAccordionRef.current = openAccordion
  }, [openAccordion])

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setCanHover(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Escape closes the open submenu first, then the whole menu
        if (openAccordionRef.current) {
          setOpenAccordion(null)
        } else {
          setIsOpen(false)
          hamburgerRef.current?.focus()
        }
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Arrow keys move between menu links (incl. submenu items)
        if (!openAccordionRef.current) return
        const menu = menuRef.current
        if (!menu) return
        const links = Array.from(menu.querySelectorAll<HTMLElement>('a[href]'))
        if (links.length === 0) return
        const current = document.activeElement as HTMLElement | null
        const currentIdx = current ? links.indexOf(current) : -1
        let next: number
        if (e.key === 'ArrowDown') {
          next = currentIdx === -1 ? 0 : Math.min(currentIdx + 1, links.length - 1)
        } else {
          next = currentIdx === -1 ? links.length - 1 : Math.max(currentIdx - 1, 0)
        }
        e.preventDefault()
        links[next].focus()
        return
      }
      if (e.key === 'Tab') {
        const menu = menuRef.current
        if (!menu) return
        const focusables = Array.from(
          menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)

    menuRef.current
      ?.querySelectorAll<HTMLElement>('a[href], button')
      ?.[0]
      ?.focus()

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current)
    }
  }, [])

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => setOpenAccordion(null), 200)
  }

  const handleHoverOpen = () => {
    if (!canHover) return
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = null
    }
    setIsOpen(true)
  }

  const handleHoverClose = () => {
    if (!canHover) return
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current)
    hoverCloseTimerRef.current = setTimeout(() => {
      setIsOpen(false)
      setOpenAccordion(null)
    }, 200)
  }

  const closeMenu = () => {
    setIsOpen(false)
    setOpenAccordion(null)
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = null
    }
    hamburgerRef.current?.focus()
  }

  const toggleAccordion = (label: string) => {
    clearCloseTimer()
    setOpenAccordion((current) => (current === label ? null : label))
  }

  const handlePointerEnter =
    (label: string) => (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return
      clearCloseTimer()
      setOpenAccordion(label)
    }

  const handlePointerLeave = () => (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    scheduleClose()
  }

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{
          opacity: 1,
          y: 0,
          backgroundColor: isScrolled ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0)',
          backdropFilter: isScrolled ? 'blur(16px)' : 'blur(0px)',
          boxShadow: isScrolled ? '0 4px 30px rgba(0, 0, 0, 0.4)' : '0 0 0 rgba(0, 0, 0, 0)'
        }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 border-b ${
          isScrolled ? 'border-white/10' : 'border-transparent'
        }`}
        onMouseLeave={() => setActiveDropdown(null)}
      >
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              onClick={closeMenu}
              className="text-2xl font-bold text-white hover:text-blue-400 transition-colors whitespace-nowrap flex items-center gap-2"
              onMouseEnter={() => setActiveDropdown(null)}
            >
              <img src="/logo.png" alt="Logo" className="h-[38px] w-auto inline-block" />
              Latent Verify
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navigationData.map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setActiveDropdown(item.children ? item.label : null)}
                >
                  <Link
                    href={item.href}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-300 flex items-center gap-1.5 group font-medium"
                  >
                    <span className="transition-transform duration-300 group-hover:scale-95">
                      {item.label}
                    </span>
                  </Link>
                </div>
              ))}
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="text-gray-300 hover:text-white transition-colors duration-300 group font-medium"
                onMouseEnter={() => setActiveDropdown(null)}
              >
                <span className="transition-transform duration-300 group-hover:scale-95 inline-block">
                  Log in
                </span>
              </Link>
              <div onMouseEnter={() => setActiveDropdown(null)}>
                <MagneticButton href="/dashboard" strength={0.4}>
                  <span className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium rounded-lg bg-white text-black hover:bg-gray-200 transition-all duration-300 group cursor-pointer">
                    <span className="transition-transform duration-300 group-hover:scale-95">
                      Get Started
                    </span>
                  </span>
                </MagneticButton>
              </div>
            </div>

            {/* Mobile Hamburger — opener only; hidden while the menu's own header is shown */}
            <button
              ref={hamburgerRef}
              onClick={() => setIsOpen(!isOpen)}
              onMouseEnter={handleHoverOpen}
              onMouseLeave={handleHoverClose}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              className={`md:hidden relative z-[70] flex flex-col items-center justify-center gap-[6px] w-11 h-11 p-2 -mr-2 transition-opacity duration-200 ${
                isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <span
                className={`block h-[2px] w-6 bg-white transition-all duration-300 ${
                  isOpen ? 'translate-y-[8px] rotate-45' : ''
                }`}
              />
              <span
                className={`block h-[2px] w-6 bg-white transition-all duration-300 ${
                  isOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`block h-[2px] w-6 bg-white transition-all duration-300 ${
                  isOpen ? '-translate-y-[8px] -rotate-45' : ''
                }`}
              />
            </button>
          </div>
        </nav>

        {/* Animated Dropdown Panel (dark glassmorphic) — desktop only */}
        <AnimatePresence>
          {activeDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="hidden md:block absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-2 gap-4 max-w-4xl">
                  {navigationData
                    .find((item) => item.label === activeDropdown)
                    ?.children?.map((child, i) => (
                      <motion.div
                        key={child.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
                      >
                        <Link
                          href={child.href}
                          className="group/card block p-4 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-white font-semibold mb-1 group-hover/card:text-blue-400 transition-colors duration-300">
                                {child.label}
                              </h4>
                              {child.description && (
                                <p className="text-sm text-gray-400">{child.description}</p>
                              )}
                            </div>
                            <motion.svg
                              className="w-5 h-5 text-gray-500 opacity-0 -translate-x-2 group-hover/card:opacity-100 group-hover/card:translate-x-0 group-hover/card:text-blue-400 transition-all duration-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </motion.svg>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Mobile Menu — full-width black panel attached under the navbar.
          Mirrors the desktop mega menu. Rendered as a sibling of the header
          so fixed positioning stays viewport-relative. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-black md:hidden overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            onClick={() => setOpenAccordion(null)}
            onMouseEnter={handleHoverOpen}
            onMouseLeave={handleHoverClose}
          >
            <div
              ref={menuRef}
              id="mobile-menu"
              className="pt-[76px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed header inside the menu: logo (left) + close ✕ (right) */}
              <div className="fixed inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black">
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="text-2xl font-bold text-white hover:text-blue-400 transition-colors whitespace-nowrap flex items-center gap-2"
                >
                  <img src="/logo.png" alt="Logo" className="h-[38px] w-auto inline-block" />
                  Latent Verify
                </Link>
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Close menu"
                  className="text-white hover:opacity-70 hover:scale-110 transition-all duration-200 cursor-pointer p-1 -mr-1"
                >
                  <HiX className="h-7 w-7" />
                </button>
              </div>
              <div className="border-b border-white/10">
                <nav className="container mx-auto px-6 py-2">
                  <ul className="flex flex-col">
                    {mobileNavData.map((item) => {
                      const expanded = openAccordion === item.label
                      return (
                        <li
                          key={item.label}
                          onPointerEnter={handlePointerEnter(item.label)}
                          onPointerLeave={handlePointerLeave()}
                          className="relative"
                        >
                          <button
                            type="button"
                            onClick={() => toggleAccordion(item.label)}
                            aria-expanded={expanded}
                            aria-controls={`submenu-${item.label}`}
                            className="w-full flex items-center justify-between px-4 py-3 text-left font-medium text-gray-300 hover:text-white transition-colors duration-300 group"
                          >
                            <span className="transition-transform duration-300 group-hover:scale-95">
                              {item.label}
                            </span>
                            <motion.span
                              animate={{ rotate: expanded ? 180 : 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              className="text-gray-500 group-hover:text-white transition-colors"
                            >
                              <HiChevronDown className="h-5 w-5" />
                            </motion.span>
                          </button>
                          <AnimatePresence initial={false}>
                            {expanded && item.children && (
                              <motion.div
                                key="submenu"
                                id={`submenu-${item.label}`}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                              >
                                <ul className="pb-3">
                                  {item.children.map((child) => (
                                    <li key={child.label}>
                                      <Link
                                        href={child.href}
                                        onClick={closeMenu}
                                        className="block px-4 pl-10 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                      >
                                        {child.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              </div>

              {/* Auth actions — mobile version of the desktop Log in / Get Started */}
              <div className="flex flex-col items-center mt-10 mb-10 px-6">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="w-[220px] h-[50px] flex items-center justify-center text-base font-semibold rounded-full border border-white bg-transparent text-white hover:bg-white/10 transition-colors duration-300"
                >
                  Log in
                </Link>
                <MagneticButton
                  href="/dashboard"
                  strength={0.4}
                  className="w-[220px] h-[50px] mt-4"
                >
                  <span className="inline-flex items-center justify-center w-full h-full text-base font-semibold rounded-full bg-white text-black hover:bg-gray-200 transition-colors duration-300 group cursor-pointer">
                    <span className="transition-transform duration-300 group-hover:scale-95">
                      Get Started
                    </span>
                  </span>
                </MagneticButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
