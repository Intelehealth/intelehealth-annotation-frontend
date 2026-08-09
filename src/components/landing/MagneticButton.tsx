'use client'

import { useRef, useState, ReactNode } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface MagneticButtonProps {
  children: ReactNode
  href?: string
  className?: string
  strength?: number
  onClick?: () => void
}

export function MagneticButton({
  children,
  href,
  className = '',
  strength = 0.3,
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return

    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current.getBoundingClientRect()

    const x = (clientX - (left + width / 2)) * strength
    const y = (clientY - (top + height / 2)) * strength

    setPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  const content = (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.3 }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  )

  if (href) {
    return (
      <Link href={href} className={`inline-block ${className}`}>
        {content}
      </Link>
    )
  }

  return <div className={className} onClick={onClick}>{content}</div>
}
