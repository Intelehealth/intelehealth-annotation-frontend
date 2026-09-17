'use client'

import { ReactNode, useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => {
        // cubic-bezier(0.25, 0.1, 0.25, 1) — custom ease-out
        const p = 1 - t
        return 1 - p * p * p * p * p
      },
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false
    })

    // Lenis owns the scroll position, so ScrollTrigger must be told when it
    // changes — otherwise GSAP reads native scroll, the two desync, and pinned
    // sections leave gaps / mispositioned content behind.
    lenis.on('scroll', ScrollTrigger.update)

    // Drive Lenis from GSAP's ticker instead of a private RAF loop, so both run
    // on one frame in a deterministic order (and stop together on unmount).
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // Pinned triggers are measured from element heights; images finishing later
    // change those heights, so re-measure once everything has loaded.
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)

    return () => {
      window.removeEventListener('load', refresh)
      gsap.ticker.remove(tick)
      lenis.off('scroll', ScrollTrigger.update)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
