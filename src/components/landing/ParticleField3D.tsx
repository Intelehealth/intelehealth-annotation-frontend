'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  z: number
  baseX: number
  baseY: number
}

export function ParticleField3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / width - 0.5) * 2
      mouseRef.current.targetY = (e.clientY / height - 0.5) * 2
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Generate 3D particles in a sphere distribution
    const particleCount = 200
    const particles: Particle[] = []
    const radius = Math.max(width, height) * 0.6

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (0.5 + Math.random() * 0.5)
      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        baseX: 0,
        baseY: 0
      })
    }

    // Project 3D to 2D
    const fov = 800
    const project = (p: Particle) => {
      // Rotate around Y axis based on time, and tilt based on mouse
      const rotY = timeRef.current * 0.0003 + mouseRef.current.x * 0.5
      const rotX = mouseRef.current.y * 0.3

      const cosY = Math.cos(rotY)
      const sinY = Math.sin(rotY)
      const cosX = Math.cos(rotX)
      const sinX = Math.sin(rotX)

      // Rotate Y
      let x = p.x * cosY - p.z * sinY
      let z = p.x * sinY + p.z * cosY
      // Rotate X
      let y = p.y * cosX - z * sinX
      z = p.y * sinX + z * cosX

      const scale = fov / (fov + z)
      return {
        x: width / 2 + x * scale,
        y: height / 2 + y * scale,
        scale,
        z
      }
    }

    const timeRef = { current: 0 }
    let animId: number

    const render = () => {
      timeRef.current += 16

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05

      // Fade trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
      ctx.fillRect(0, 0, width, height)

      // Sort particles by z for depth (painter's algorithm)
      const projected = particles
        .map((p) => ({ p, proj: project(p) }))
        .sort((a, b) => b.proj.z - a.proj.z)

      // Draw connection lines between nearby particles
      ctx.lineWidth = 0.5
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i].proj
          const b = projected[j].proj
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.15 * Math.min(a.scale, b.scale)
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      projected.forEach(({ proj }) => {
        const size = Math.max(0.5, proj.scale * 2.5)
        const alpha = Math.min(1, proj.scale * 0.8)

        // Color based on depth (closer = brighter blue, farther = dimmer)
        const blueIntensity = Math.floor(100 + proj.scale * 155)
        ctx.fillStyle = `rgba(59, ${blueIntensity}, 246, ${alpha})`
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2)
        ctx.fill()

        // Glow for closer particles
        if (proj.scale > 0.8) {
          ctx.fillStyle = `rgba(96, 165, 250, ${alpha * 0.3})`
          ctx.beginPath()
          ctx.arc(proj.x, proj.y, size * 3, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}
