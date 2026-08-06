'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { navigationData } from '@/data/navigation'
import { HiMenu, HiX } from 'react-icons/hi'
import { MagneticButton } from './MagneticButton'

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
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

          {/* CTA Buttons */}
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white text-2xl cursor-pointer"
          >
            {isMobileMenuOpen ? <HiX /> : <HiMenu />}
          </button>
        </div>
      </nav>

      {/* Animated Dropdown Panel (Dark Glassmorphic) */}
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

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 overflow-hidden"
          >
            <div className="px-6 py-4">
              {navigationData.map((item) => (
                <div key={item.label} className="py-2">
                  <Link
                    href={item.href}
                    className="block text-gray-300 hover:text-white transition-colors font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.children && (
                    <div className="pl-4 mt-2 space-y-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className="block text-gray-400 hover:text-white transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-4 space-y-2">
                <Link
                  href="/login"
                  className="block text-gray-300 hover:text-white transition-colors font-medium text-center py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/dashboard"
                  className="block px-6 py-2.5 text-sm font-medium rounded-lg bg-white text-black hover:bg-gray-200 transition-all text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
