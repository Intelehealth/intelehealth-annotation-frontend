'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isPointer, setIsPointer] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  // Mouse position motion values
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)

  // Spring physics for smooth following
  const springConfig = { damping: 25, stiffness: 700, mass: 0.5 }
  const cursorXSpring = useSpring(cursorX, springConfig)
  const cursorYSpring = useSpring(cursorY, springConfig)

  // Ring follows with more lag (slower spring)
  const ringSpringConfig = { damping: 30, stiffness: 200, mass: 0.8 }
  const ringXSpring = useSpring(cursorX, ringSpringConfig)
  const ringYSpring = useSpring(cursorY, ringSpringConfig)

  useEffect(() => {
    // Only enable on devices with fine pointer (desktop)
    const mediaQuery = window.matchMedia('(pointer: fine)')
    if (!mediaQuery.matches) return

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
      if (!isVisible) setIsVisible(true)
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if hovering over interactive elements
      const interactive = target.closest(
        'a, button, [role="button"], input, textarea, select, [data-cursor="pointer"]'
      )

      if (interactive) {
        setIsHovering(true)
        setIsPointer(true)
      } else {
        setIsHovering(false)
        setIsPointer(false)
      }

      // Check for data-cursor attributes
      const cursorAttr = target.closest('[data-cursor]')
      if (cursorAttr) {
        const cursorType = cursorAttr.getAttribute('data-cursor')
        if (cursorType === 'view') {
          setIsHovering(true)
        }
      }
    }

    const handleMouseLeave = () => {
      setIsHidden(true)
    }

    const handleMouseEnter = () => {
      setIsHidden(false)
    }

    const handleMouseDown = () => {
      setIsHovering(true)
    }

    const handleMouseUp = () => {
      setIsHovering(false)
    }

    document.addEventListener('mousemove', moveCursor)
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    // Hide default cursor
    document.body.style.cursor = 'none'

    return () => {
      document.removeEventListener('mousemove', moveCursor)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'auto'
    }
  }, [cursorX, cursorY, isVisible])

  // Don't render on touch devices
  if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) {
    return null
  }

  return (
    <>
      {/* Outer Ring - follows with lag */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:block"
        style={{
          x: ringXSpring,
          y: ringYSpring,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: isHovering ? 56 : 32,
          height: isHovering ? 56 : 32,
          opacity: isHidden ? 0 : isVisible ? 1 : 0,
          scale: isPointer ? 1.5 : 1,
          backgroundColor: isHovering ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0)',
          borderColor: isHovering ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
        }}
        transition={{
          width: { duration: 0.3, ease: 'easeOut' },
          height: { duration: 0.3, ease: 'easeOut' },
          opacity: { duration: 0.2 },
          scale: { duration: 0.3, ease: 'easeOut' },
          backgroundColor: { duration: 0.3 },
          borderColor: { duration: 0.3 },
        }}
      >
        <div className="w-full h-full rounded-full border-2" />
      </motion.div>

      {/* Inner Dot - follows precisely */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:block"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: isHovering ? 8 : 6,
          height: isHovering ? 8 : 6,
          opacity: isHidden ? 0 : isVisible ? 1 : 0,
          scale: isPointer ? 0 : 1,
          backgroundColor: isHovering ? '#ffffff' : '#ffffff',
        }}
        transition={{
          width: { duration: 0.2 },
          height: { duration: 0.2 },
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 },
        }}
      >
        <div className="w-full h-full rounded-full bg-white" />
      </motion.div>
    </>
  )
}
