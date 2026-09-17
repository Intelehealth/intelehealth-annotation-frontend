"use client"

import { useEffect, useRef } from "react"

type Point = {
  x: number
  y: number
  z: number
  bx: number
  by: number
  bz: number
}

/**
 * A lightweight, dependency-free "3D" particle field rendered on <canvas>.
 * Points are distributed on a sphere, rotated continuously, projected to 2D,
 * and connected with faint lines to evoke a point-cloud / annotation graph.
 * The whole field reacts to pointer position with a subtle parallax tilt.
 */
export function AuraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const cv = canvas
    const c = ctx

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let width = 0
    let height = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Build a fibonacci sphere of points.
    const COUNT = 420
    const RADIUS_FACTOR = 0.42
    const points: Point[] = []
    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      const x = Math.sin(phi) * Math.cos(theta)
      const y = Math.sin(phi) * Math.sin(theta)
      const z = Math.cos(phi)
      points.push({ x, y, z, bx: x, by: y, bz: z })
    }

    function resize() {
      const rect = cv.getBoundingClientRect()
      width = rect.width
      height = rect.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = width * dpr
      cv.height = height * dpr
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    function onPointer(e: PointerEvent) {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2
      const ny = (e.clientY / window.innerHeight - 0.5) * 2
      pointer.current.tx = nx
      pointer.current.ty = ny
    }
    window.addEventListener("pointermove", onPointer)

    let raf = 0
    let angle = 0

    function render() {
      angle += prefersReduced ? 0.0008 : 0.0022
      pointer.current.x += (pointer.current.tx - pointer.current.x) * 0.05
      pointer.current.y += (pointer.current.ty - pointer.current.y) * 0.05

      const cx = width * 0.32
      const cy = height * 0.52
      const radius = Math.min(width, height) * RADIUS_FACTOR

      const tiltX = pointer.current.y * 0.5
      const tiltY = pointer.current.x * 0.6 + angle

      c.clearRect(0, 0, width, height)

      const projected: { sx: number; sy: number; scale: number; depth: number }[] = []

      const cosY = Math.cos(tiltY)
      const sinY = Math.sin(tiltY)
      const cosX = Math.cos(tiltX)
      const sinX = Math.sin(tiltX)

      for (const p of points) {
        // rotate around Y
        let x = p.bx * cosY - p.bz * sinY
        let z = p.bx * sinY + p.bz * cosY
        let y = p.by
        // rotate around X
        const y2 = y * cosX - z * sinX
        const z2 = y * sinX + z * cosX
        y = y2
        z = z2

        const perspective = 1.8 / (1.8 - z)
        const sx = cx + x * radius * perspective
        const sy = cy + y * radius * perspective
        const depth = (z + 1) / 2
        projected.push({ sx, sy, scale: perspective, depth })
      }

      // connective lines (near neighbours by screen distance)
      c.lineWidth = 1
      for (let i = 0; i < projected.length; i += 2) {
        const a = projected[i]
        for (let j = i + 1; j < projected.length; j += 6) {
          const b = projected[j]
          const dx = a.sx - b.sx
          const dy = a.sy - b.sy
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 70) {
            const alpha = (1 - dist / 70) * 0.14 * ((a.depth + b.depth) / 2)
            c.strokeStyle = `rgba(120, 165, 255, ${alpha})`
            c.beginPath()
            c.moveTo(a.sx, a.sy)
            c.lineTo(b.sx, b.sy)
            c.stroke()
          }
        }
      }

      // points
      for (const pt of projected) {
        const size = pt.depth * 2.1 + 0.3
        const alpha = 0.25 + pt.depth * 0.7
        c.beginPath()
        c.fillStyle = `rgba(${170 + pt.depth * 60}, ${200 + pt.depth * 40}, 255, ${alpha})`
        c.arc(pt.sx, pt.sy, size, 0, Math.PI * 2)
        c.fill()
      }

      raf = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onPointer)
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* soft glow behind the sphere */}
      <div className="absolute left-[10%] top-1/2 h-[70%] w-[70%] -translate-y-1/2 rounded-full bg-accent/25 blur-[120px] animate-pulse-glow" />
      <div className="absolute left-[2%] top-[20%] h-[35%] w-[35%] rounded-full bg-chart-2/20 blur-[100px]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
