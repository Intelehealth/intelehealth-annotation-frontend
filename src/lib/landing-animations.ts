import { Variants } from 'framer-motion'

// Global easing vocabulary (from motion spec)
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
export const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const
export const EASE_INOUT_CUBIC = [0.65, 0, 0.35, 1] as const
export const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const

// Reveal config — 80-85% from top, replay on re-enter
export const REVEAL_VIEWPORT = { once: false, margin: '0px 0px -15% 0px', amount: 0.2 }

// Fade in animation
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: EASE_OUT_QUART }
  }
}

// Slide up animation (text/card reveals)
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_OUT_EXPO }
  }
}

// Stagger container
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

// Text reveal — word-by-word mask wipe (overflow:hidden parent, inner translateY 110%→0%)
export const textRevealContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

export const textRevealChild: Variants = {
  hidden: { y: '110%' },
  visible: {
    y: '0%',
    transition: { duration: 0.8, ease: EASE_OUT_EXPO }
  }
}

// Card grid entrance (scale 0.96→1 + fade + translateY 40→0)
export const cardEntrance: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE_OUT_EXPO }
  }
}

// Stat count-up container
export const statEntrance: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO }
  }
}
