'use client'

import { useState } from 'react'

// A video-annotation timeline that runs under an animated drawing: a rail,
// keyframe diamonds at the moments the drawing's loop does something, and a
// playhead driven by a CSS animation of the *same* duration as the drawing, so
// the two stay in sync for as long as the page is open. Clicking a keyframe
// seeks every animation inside the clip to that moment (Web Animations API on
// the CSS animations — no JS-driven frames) and names what happens there.
export type Mark = { at: number; label: string }

export function Timeline({ dur, marks, label }: { dur: number; marks: Mark[]; label?: string }) {
  const [active, setActive] = useState<Mark | null>(null)

  // Click anywhere on the rail: snap to the nearest keyframe. A click (or
  // keyboard activation) on a diamond bubbles here too and resolves to itself.
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rail = e.currentTarget
    const hit = (e.target as HTMLElement).closest<HTMLElement>('.lp-tl-key')?.dataset.at
    const r = rail.getBoundingClientRect()
    const pct = hit !== undefined ? Number(hit) : ((e.clientX - r.left) / r.width) * 100
    const m = marks.reduce((best, k) => (Math.abs(k.at - pct) < Math.abs(best.at - pct) ? k : best))
    const clip = rail.closest('.lp-clip') ?? rail.parentElement!
    for (const a of clip.getAnimations({ subtree: true })) a.currentTime = (m.at / 100) * dur * 1000
    setActive(m)
  }

  return (
    <div className="lp-tl" style={{ ['--tl-dur' as string]: `${dur}s` }}>
      <div className="lp-tl-rail" onClick={seek}>
        <span className="lp-tl-fill" />
        {marks.map((m) => (
          <button
            key={m.at}
            type="button"
            className="lp-tl-key"
            data-active={active?.at === m.at || undefined}
            data-at={m.at}
            style={{ left: `${m.at}%` }}
            title={m.label}
            aria-label={`${((m.at / 100) * dur).toFixed(1)}s: ${m.label}`}
          />
        ))}
      </div>
      <div className="lp-tl-meta">
        <span>{active ? active.label : label ?? 'keyframes'}</span>
        <span>{active ? `${((active.at / 100) * dur).toFixed(1)} / ${dur.toFixed(1)}s` : `${dur.toFixed(1)}s`}</span>
      </div>
    </div>
  )
}
