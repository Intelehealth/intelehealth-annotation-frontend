// @ts-nocheck — dead landing section; three v0.185 ships no .d.ts types.
'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger)

interface StoryStep {
  id: number
  title: string
  subtitle: string
  description: string
  steps: string[]
  color: string
}

const STORY_STEPS: StoryStep[] = [
  {
    id: 1,
    subtitle: 'STAGE 1: CHAOTIC INGEST',
    title: 'Raw Unstructured Data',
    description: 'AI starts with messy, unorganized feeds. Large point clouds, raw images, and audio directories are ingested in their native formats.',
    steps: [
      'Connect cloud buckets (S3, GCS, Azure)',
      'Parse multi-frame video & sensor data',
      'Isolate corrupted frames and anomalies'
    ],
    color: '#3b82f6' // blue
  },
  {
    id: 2,
    subtitle: 'STAGE 2: SCHEMA CONFIGURATION',
    title: 'Fields & Nesting Setup',
    description: 'Structure is established by configuring annotation forms. Define parent classes, dynamic conditional logic, and sub-attributes.',
    steps: [
      'Build conditional nested question nodes',
      'Establish taxonomy tags and labeling rules',
      'Configure value boundaries and constraints'
    ],
    color: '#10b981' // blue-green
  },
  {
    id: 3,
    subtitle: 'STAGE 3: WORKFLOW PARTITION',
    title: 'Batches & Ingestion Queues',
    description: 'Cleaned raw folders are partitioned into batches and dynamically distributed to active annotator queues based on skill levels.',
    steps: [
      'Group feeds into logical task batches',
      'Configure blind and consensus pipelines',
      'Route tasks based on performance metrics'
    ],
    color: '#22c55e' // green
  },
  {
    id: 4,
    subtitle: 'STAGE 4: PRECISION ANNOTATION',
    title: 'Human-in-the-Loop Labeling',
    description: 'Expert human labelers draw pixel-perfect 2D/3D bounding boxes, outline polygon boundaries, and tag key segments.',
    steps: [
      'Draw precision 3D LiDAR bounding cuboids',
      'Leverage AI-assisted SAM click segments',
      'Tag temporal tracking lines across frames'
    ],
    color: '#06b6d4' // cyan
  },
  {
    id: 5,
    subtitle: 'STAGE 5: CONSENSUS AGREEMENT',
    title: 'Multi-Node Quality Reviews',
    description: 'Labels from multiple annotators are routed through our consensus engine. High agreement scores unlock final output verification.',
    steps: [
      'Compare multi-annotator spatial overlaps',
      'Calculate intersection-over-union metrics',
      'Flag outliers for senior reviewer audit'
    ],
    color: '#f59e0b' // gold
  },
  {
    id: 6,
    subtitle: 'STAGE 6: NEURAL NET STREAM',
    title: 'AI Model Integration',
    description: 'High-fidelity structured annotations are exported as JSON/LiDAR files and streamed directly into deep learning training cycles.',
    steps: [
      'Export to COCO, YOLO, and TFRecord formats',
      'Trigger model re-training webhooks',
      'Feed predictions back as dynamic pre-labels'
    ],
    color: '#a855f7' // purple
  }
]

export function ScrollytellingSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollProgressRef = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    // --- THREE.JS SETUP ---
    const scene = new THREE.Scene()
    
    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    camera.position.set(0, 0, 30)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const blueLight = new THREE.DirectionalLight(0x3b82f6, 1.8)
    blueLight.position.set(-10, 10, 10)
    scene.add(blueLight)

    const purpleLight = new THREE.DirectionalLight(0xa855f7, 1.8)
    purpleLight.position.set(10, -10, 10)
    scene.add(purpleLight)

    // Helper: Canvas Texture for Round Glowing Points
    const createCircleTexture = () => {
      const pCanvas = document.createElement('canvas')
      pCanvas.width = 32
      pCanvas.height = 32
      const ctx = pCanvas.getContext('2d')
      if (ctx) {
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
        gradient.addColorStop(0.2, 'rgba(230, 240, 255, 0.95)')
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.55)')
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 32, 32)
      }
      return new THREE.CanvasTexture(pCanvas)
    }

    // --- GEOMETRY DATA GENERATION ---
    // Increased particle count to 1200 for a much more dense and impressive visual
    const particleCount = 1200
    const pointsGeom = new THREE.BufferGeometry()
    const currentPositions = new Float32Array(particleCount * 3)
    pointsGeom.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3))

    // 1. Stage 1 Positions: Chaos Sphere (Dense and wide)
    const posChaos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 6 + Math.random() * 7 // slightly wider radius to occupy space beautifully
      posChaos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      posChaos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      posChaos[i * 3 + 2] = r * Math.cos(phi)
    }

    // 2. Stage 2 Positions: Neat 3D Grid (12 x 10 x 10 = 1200 particles)
    const posGrid = new Float32Array(particleCount * 3)
    const spacing = 1.9
    const gridCols = 12
    const gridRows = 10
    const gridDepths = 10
    const slots: { x: number; y: number; z: number }[] = []
    
    for (let x = 0; x < gridCols; x++) {
      for (let y = 0; y < gridRows; y++) {
        for (let z = 0; z < gridDepths; z++) {
          slots.push({
            x: (x - (gridCols - 1) / 2) * spacing,
            y: (y - (gridRows - 1) / 2) * spacing,
            z: (z - (gridDepths - 1) / 2) * spacing
          })
        }
      }
    }
    // Set grid target positions directly
    for (let i = 0; i < particleCount; i++) {
      posGrid[i * 3] = slots[i].x
      posGrid[i * 3 + 1] = slots[i].y
      posGrid[i * 3 + 2] = slots[i].z
    }

    // 3. Stage 3 Positions: Labeled Clusters (Grouped nodes)
    const posLabels = new Float32Array(particleCount * 3)
    const clusters = [
      { center: new THREE.Vector3(-6, 1, -2), size: new THREE.Vector3(4.5, 4.5, 4.5) },
      { center: new THREE.Vector3(6, 2, 2), size: new THREE.Vector3(3.5, 5.5, 3.5) },
      { center: new THREE.Vector3(0, -5, 1), size: new THREE.Vector3(5.5, 3.5, 3.5) }
    ]
    for (let i = 0; i < particleCount; i++) {
      if (i < 360) {
        // Cluster 1 (360 particles)
        const c = clusters[0]
        posLabels[i * 3] = c.center.x + (Math.random() - 0.5) * c.size.x
        posLabels[i * 3 + 1] = c.center.y + (Math.random() - 0.5) * c.size.y
        posLabels[i * 3 + 2] = c.center.z + (Math.random() - 0.5) * c.size.z
      } else if (i < 720) {
        // Cluster 2 (360 particles)
        const c = clusters[1]
        posLabels[i * 3] = c.center.x + (Math.random() - 0.5) * c.size.x
        posLabels[i * 3 + 1] = c.center.y + (Math.random() - 0.5) * c.size.y
        posLabels[i * 3 + 2] = c.center.z + (Math.random() - 0.5) * c.size.z
      } else if (i < 1020) {
        // Cluster 3 (300 particles)
        const c = clusters[2]
        posLabels[i * 3] = c.center.x + (Math.random() - 0.5) * c.size.x
        posLabels[i * 3 + 1] = c.center.y + (Math.random() - 0.5) * c.size.y
        posLabels[i * 3 + 2] = c.center.z + (Math.random() - 0.5) * c.size.z
      } else {
        // Background noise (180 particles)
        const r = 10 + Math.random() * 8
        const theta = Math.random() * Math.PI * 2
        posLabels[i * 3] = r * Math.cos(theta)
        posLabels[i * 3 + 1] = (Math.random() - 0.5) * 16
        posLabels[i * 3 + 2] = (Math.random() - 0.5) * 8
      }
    }

    // 4. Stage 4 Positions: Neural Network Graph (1200 nodes distributed across layers)
    const posNeuralNet = new Float32Array(particleCount * 3)
    const layers = [-12, -4, 4, 12] // X positions
    const nodesPerLayer = [150, 450, 450, 150] // Input, Hidden 1, Hidden 2, Output
    let nodeIndex = 0

    layers.forEach((layerX, layerIdx) => {
      const count = nodesPerLayer[layerIdx]
      const spreadY = layerIdx === 1 || layerIdx === 2 ? 15 : 10
      const spreadZ = layerIdx === 1 || layerIdx === 2 ? 9 : 6
      
      for (let j = 0; j < count; j++) {
        posNeuralNet[nodeIndex * 3] = layerX + (Math.random() - 0.5) * 0.5
        const angle = (j / count) * Math.PI * 2
        const radY = spreadY * 0.42 + (Math.random() - 0.5) * 2
        const radZ = spreadZ * 0.42 + (Math.random() - 0.5) * 2
        posNeuralNet[nodeIndex * 3 + 1] = Math.sin(angle) * radY
        posNeuralNet[nodeIndex * 3 + 2] = Math.cos(angle) * radZ
        nodeIndex++
      }
    })

    // Create Points Mesh
    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.55,
      map: createCircleTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const particleSystem = new THREE.Points(pointsGeom, pointsMaterial)
    scene.add(particleSystem)

    // --- STAGE 3 SPECIFIC: BOUNDING BOXES ---
    const boxGroup = new THREE.Group()
    scene.add(boxGroup)
    
    const wireBoxes: THREE.LineSegments[] = []
    const boxColors = [0x3b82f6, 0x06b6d4, 0xa855f7]

    clusters.forEach((c, idx) => {
      const geom = new THREE.BoxGeometry(c.size.x, c.size.y, c.size.z)
      const edges = new THREE.EdgesGeometry(geom)
      const material = new THREE.LineBasicMaterial({
        color: boxColors[idx],
        transparent: true,
        opacity: 0,
        linewidth: 1.5
      })
      const wireframe = new THREE.LineSegments(edges, material)
      wireframe.position.copy(c.center)
      boxGroup.add(wireframe)
      wireBoxes.push(wireframe)
    })

    // --- STAGE 4 SPECIFIC: NEURAL NET LINES (Increased to connect 1200 nodes beautifully) ---
    const netLinesGroup = new THREE.Group()
    scene.add(netLinesGroup)

    interface Connection {
      fromIdx: number
      toIdx: number
    }
    const connections: Connection[] = []
    
    // Connections Input (0..149) -> Hidden 1 (150..599)
    for (let i = 0; i < 150; i++) {
      const fromIdx = Math.floor(Math.random() * 150)
      const toIdx = 150 + Math.floor(Math.random() * 450)
      connections.push({ fromIdx, toIdx })
    }
    // Connections Hidden 1 (150..599) -> Hidden 2 (600..1049)
    for (let i = 0; i < 250; i++) {
      const fromIdx = 150 + Math.floor(Math.random() * 450)
      const toIdx = 600 + Math.floor(Math.random() * 450)
      connections.push({ fromIdx, toIdx })
    }
    // Connections Hidden 2 (600..1049) -> Output (1050..1199)
    for (let i = 0; i < 150; i++) {
      const fromIdx = 600 + Math.floor(Math.random() * 450)
      const toIdx = 1050 + Math.floor(Math.random() * 150)
      connections.push({ fromIdx, toIdx })
    }

    const lineGeom = new THREE.BufferGeometry()
    const lineVertices = new Float32Array(connections.length * 2 * 3)
    lineGeom.setAttribute('position', new THREE.BufferAttribute(lineVertices, 3))
    
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    })
    const netLines = new THREE.LineSegments(lineGeom, lineMaterial)
    netLinesGroup.add(netLines)

    // --- GSAP SCROLL ORCHESTRATION ---
    const stepsCount = STORY_STEPS.length

    // Pinned trigger with extended viewport scrolling length (5.0x window height)
    const pinTrigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: () => `+=${window.innerHeight * 5.0}`,
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        scrollProgressRef.current = self.progress
      }
    })

    // Stagger fade-in / fade-out animations for the cards in-sync with scroll
    STORY_STEPS.forEach((_, idx) => {
      const card = cardRefs.current[idx]
      if (!card) return

      // Define scroll triggers for each specific text block to reveal/hide
      gsap.fromTo(
        card,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: container,
            start: () => idx === 0 ? 'top bottom' : `top+=${(idx * 0.8 * window.innerHeight)} top`,
            end: () => idx === 0 ? 'top top' : `top+=${((idx + 0.5) * 0.8 * window.innerHeight)} top`,
            scrub: true,
            toggleActions: 'play reverse play reverse'
          }
        }
      )

      // If it's not the last card, fade it out when the next one starts appearing
      if (idx < stepsCount - 1) {
        gsap.to(card, {
          opacity: 0,
          y: -50,
          scrollTrigger: {
            trigger: container,
            start: () => `top+=${((idx + 0.45) * 0.8 * window.innerHeight)} top`,
            end: () => `top+=${((idx + 0.8) * 0.8 * window.innerHeight)} top`,
            scrub: true
          }
        })
      }
    })

    // --- MOUSE MOVE PARALLAX ---
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handleMouseMove)

    // --- ANIMATION RENDER LOOP ---
    let animId: number
    let time = 0
    let currentMorphedProgress = 0

    const render = () => {
      time += 0.01

      // Mouse Parallax Lerping
      mouse.x += (mouse.targetX - mouse.x) * 0.05
      mouse.y += (mouse.targetY - mouse.y) * 0.05

      // Smooth progress interpolation
      currentMorphedProgress += (scrollProgressRef.current - currentMorphedProgress) * 0.08

      const p = currentMorphedProgress // progress [0, 1]

      // Spectrum color morphing
      let currentMatColor = new THREE.Color(0x3b82f6)
      if (p < 0.2) {
        const t = p / 0.2
        currentMatColor.lerpColors(new THREE.Color(0x3b82f6), new THREE.Color(0x10b981), t)
      } else if (p < 0.4) {
        const t = (p - 0.2) / 0.2
        currentMatColor.lerpColors(new THREE.Color(0x10b981), new THREE.Color(0x22c55e), t)
      } else if (p < 0.6) {
        const t = (p - 0.4) / 0.2
        currentMatColor.lerpColors(new THREE.Color(0x22c55e), new THREE.Color(0x06b6d4), t)
      } else if (p < 0.8) {
        const t = (p - 0.6) / 0.2
        currentMatColor.lerpColors(new THREE.Color(0x06b6d4), new THREE.Color(0xf59e0b), t)
      } else {
        const t = (p - 0.8) / 0.2
        currentMatColor.lerpColors(new THREE.Color(0xf59e0b), new THREE.Color(0xa855f7), t)
      }
      pointsMaterial.color.copy(currentMatColor)

      // Morph points coordinates
      const positions = pointsGeom.attributes.position.array as Float32Array
      const turbulence = p < 0.25 ? 1.0 - (p / 0.25) : 0.05
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        
        let startX = 0, startY = 0, startZ = 0
        let endX = 0, endY = 0, endZ = 0
        let localT = 0

        if (p < 0.2) {
          // Stage 1 (Chaos) settles
          startX = posChaos[i3]
          startY = posChaos[i3 + 1]
          startZ = posChaos[i3 + 2]
          endX = posChaos[i3]
          endY = posChaos[i3 + 1]
          endZ = posChaos[i3 + 2]
          localT = p / 0.2
        } else if (p < 0.4) {
          // Chaos -> Grid
          startX = posChaos[i3]
          startY = posChaos[i3 + 1]
          startZ = posChaos[i3 + 2]
          endX = posGrid[i3]
          endY = posGrid[i3 + 1]
          endZ = posGrid[i3 + 2]
          localT = (p - 0.2) / 0.2
        } else if (p < 0.6) {
          // Grid -> Labeled Clusters
          startX = posGrid[i3]
          startY = posGrid[i3 + 1]
          startZ = posGrid[i3 + 2]
          endX = posLabels[i3]
          endY = posLabels[i3 + 1]
          endZ = posLabels[i3 + 2]
          localT = (p - 0.4) / 0.2
        } else if (p < 0.8) {
          // Stay clustered
          startX = posLabels[i3]
          startY = posLabels[i3 + 1]
          startZ = posLabels[i3 + 2]
          endX = posLabels[i3]
          endY = posLabels[i3 + 1]
          endZ = posLabels[i3 + 2]
          localT = (p - 0.6) / 0.2
        } else {
          // Clusters -> Neural Net
          startX = posLabels[i3]
          startY = posLabels[i3 + 1]
          startZ = posLabels[i3 + 2]
          endX = posNeuralNet[i3]
          endY = posNeuralNet[i3 + 1]
          endZ = posNeuralNet[i3 + 2]
          localT = (p - 0.8) / 0.2
        }

        // Cubic ease-in-out
        const easeT = localT < 0.5 
          ? 4 * localT * localT * localT 
          : 1 - Math.pow(-2 * localT + 2, 3) / 2

        let targetX = startX * (1 - easeT) + endX * easeT
        let targetY = startY * (1 - easeT) + endY * easeT
        let targetZ = startZ * (1 - easeT) + endZ * easeT

        const waveX = Math.sin(time * 1.5 + i * 0.1) * 0.35 * turbulence
        const waveY = Math.cos(time * 1.2 + i * 0.1) * 0.35 * turbulence
        const waveZ = Math.sin(time * 0.8 + i * 0.2) * 0.35 * turbulence

        positions[i3] = targetX + waveX
        positions[i3 + 1] = targetY + waveY
        positions[i3 + 2] = targetZ + waveZ
      }
      pointsGeom.attributes.position.needsUpdate = true

      // Update Bounding Boxes (active range [0.55, 0.80])
      let boxOpacity = 0
      let boxScale = 0.5
      if (p >= 0.55 && p < 0.65) {
        const t = (p - 0.55) / 0.10
        boxOpacity = t
        boxScale = 0.5 + 0.5 * t
      } else if (p >= 0.65 && p < 0.78) {
        boxOpacity = 1.0
        boxScale = 1.0
      } else if (p >= 0.78 && p < 0.84) {
        const t = (p - 0.78) / 0.06
        boxOpacity = 1.0 - t
        boxScale = 1.0 - 0.2 * t
      }
      
      wireBoxes.forEach((box) => {
        const mat = box.material as THREE.LineBasicMaterial
        mat.opacity = boxOpacity * 0.7
        box.scale.setScalar(boxScale)
        box.rotation.y = time * 0.08
        box.rotation.x = time * 0.04
      })

      // Update Neural Network lines (active range [0.80, 1.0])
      let lineOpacity = 0
      if (p >= 0.80) {
        lineOpacity = (p - 0.80) / 0.15
        lineOpacity = Math.min(0.4, lineOpacity)
      }
      lineMaterial.opacity = lineOpacity

      if (lineOpacity > 0) {
        const vertices = lineGeom.attributes.position.array as Float32Array
        let vIdx = 0
        connections.forEach((conn) => {
          const fromNode3 = conn.fromIdx * 3
          const toNode3 = conn.toIdx * 3

          vertices[vIdx] = positions[fromNode3]
          vertices[vIdx + 1] = positions[fromNode3 + 1]
          vertices[vIdx + 2] = positions[fromNode3 + 2]

          vertices[vIdx + 3] = positions[toNode3]
          vertices[vIdx + 4] = positions[toNode3 + 1]
          vertices[vIdx + 5] = positions[toNode3 + 2]
          
          vIdx += 6
        })
        lineGeom.attributes.position.needsUpdate = true
      }

      particleSystem.rotation.y = time * 0.03
      netLinesGroup.rotation.y = time * 0.03
      boxGroup.rotation.y = time * 0.03

      // Rotate camera orbit based on mouse and progress
      const baseCameraX = Math.sin(p * Math.PI * 0.5) * 8
      const baseCameraZ = 30 - p * 8
      camera.position.x = baseCameraX + mouse.x * 3
      camera.position.y = mouse.y * 3
      camera.position.z = baseCameraZ

      const targetLookAt = new THREE.Vector3(window.innerWidth >= 768 ? 3.0 : 0.0, 0.0, 0)
      camera.lookAt(targetLookAt)

      renderer.render(scene, camera)
      animId = requestAnimationFrame(render)
    }

    render()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      pinTrigger.kill()
      ScrollTrigger.getAll().forEach((t) => {
        if (t !== pinTrigger) t.kill()
      })
      renderer.dispose()
      pointsMaterial.dispose()
      pointsGeom.dispose()
      lineMaterial.dispose()
      lineGeom.dispose()
      wireBoxes.forEach((box) => {
        box.geometry.dispose()
        ;(box.material as THREE.Material).dispose()
      })
    }
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden select-none animate-fadeIn"
    >
      {/* 3D WebGL Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0 block pointer-events-none"
      />

      {/* Visual background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none z-10" />

      {/* Narrative Cards Overlay Layer */}
      <div className="absolute inset-0 z-20 w-full h-full flex items-center pointer-events-none">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 flex justify-start items-center h-full">
          <div className="relative w-full max-w-lg min-h-[480px] flex items-center">
            {STORY_STEPS.map((step, idx) => (
              <div
                key={step.id}
                ref={(el) => { cardRefs.current[idx] = el }}
                className="absolute w-full p-8 md:p-10 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col pointer-events-auto"
                style={{ opacity: 0 }}
              >
                {/* Stage Badge with custom accent color */}
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: step.color }}
                  />
                  <span
                    className="text-xs font-mono font-bold tracking-widest"
                    style={{ color: step.color }}
                  >
                    {step.subtitle}
                  </span>
                </div>

                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight font-sans">
                  {step.title}
                </h3>
                
                <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-6">
                  {step.description}
                </p>

                {/* Sub-steps process checklist */}
                <div className="space-y-3 mb-6 border-l border-white/15 pl-4">
                  {step.steps.map((subStep, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2.5 text-xs md:text-sm text-gray-300 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: step.color }} />
                      <span>{subStep}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative vertical glowing line on the left edge */}
      <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-blue-500/0 via-blue-500/20 to-purple-500/0 pointer-events-none z-10 hidden md:block" />
    </section>
  )
}
