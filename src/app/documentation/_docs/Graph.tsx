'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { NavPage } from './registry'

// Connection map for the bottom of the sidebar. No graph library: nine nodes on
// a radial layout — current page at the centre, pages linked to/from it on the
// inner ring, everything else on the outer ring — drawn as plain SVG. Edges are
// the `related` lists in the registry. Every node is labelled so the map reads
// without hovering; hovering a node (generous hit area, label included) lights
// its edges and neighbours and dims the rest. Click a node to go there.

const W = 220, H = 196, CX = W / 2, CY = H / 2, R1 = 46, R2 = 80

// `current` is optional: on the docs index there is no current page, so every
// page sits on one ring and nothing is highlighted until hovered.
export function Graph({ pages, current }: { pages: NavPage[]; current?: string }) {
  const [hover, setHover] = useState<string | null>(null)

  const { nodes, edges, adj } = useMemo(() => {
    const cur = current ? pages.find((p) => p.slug === current) : undefined
    const linked = new Set<string>(cur ? [...cur.related, ...pages.filter((p) => p.related.includes(cur.slug)).map((p) => p.slug)] : [])
    const inner = cur ? pages.filter((p) => p.slug !== cur.slug && linked.has(p.slug)) : []
    const outer = cur ? pages.filter((p) => p.slug !== cur.slug && !linked.has(p.slug)) : pages
    const ring = (list: NavPage[], r: number, off: number, ringNo: 1 | 2) =>
      list.map((p, i) => {
        const a = off + (i / Math.max(list.length, 1)) * Math.PI * 2
        return { slug: p.slug, title: p.title, short: p.short, x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), ring: ringNo }
      })
    const nodes = cur
      ? [
          { slug: cur.slug, title: cur.title, short: cur.short, x: CX, y: CY, ring: 0 as const },
          ...ring(inner, R1, -Math.PI / 2, 1),
          ...ring(outer, R2, -Math.PI / 2 + Math.PI / Math.max(outer.length, 1), 2)
        ]
      : ring(outer, 66, -Math.PI / 2, 2)
    const pos = Object.fromEntries(nodes.map((n) => [n.slug, n]))
    const seen = new Set<string>()
    const edges: { a: string; b: string }[] = []
    const adj: Record<string, Set<string>> = Object.fromEntries(nodes.map((n) => [n.slug, new Set<string>()]))
    for (const p of pages) for (const r of p.related) {
      const key = [p.slug, r].sort().join('|')
      if (seen.has(key) || !pos[r] || !pos[p.slug]) continue
      seen.add(key)
      edges.push({ a: p.slug, b: r })
      adj[p.slug].add(r); adj[r].add(p.slug)
    }
    return { nodes, edges, adj }
  }, [pages, current])

  const pos = Object.fromEntries(nodes.map((n) => [n.slug, n]))
  const focus = hover ?? current ?? null
  const shown = focus ? pos[focus] : null

  return (
    <div className="graph-wrap" data-hovering={hover ? '' : undefined} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="How this page connects to the other pages">
        {/* ring guides: make the inner/outer structure legible at a glance */}
        {current ? (
          <>
            <circle className="graph-ring" cx={CX} cy={CY} r={R1} />
            <circle className="graph-ring" cx={CX} cy={CY} r={R2} />
          </>
        ) : (
          <circle className="graph-ring" cx={CX} cy={CY} r={66} />
        )}

        {edges.map((e) => {
          const touches = focus !== null && (e.a === focus || e.b === focus)
          return (
            <line key={`${e.a}-${e.b}`} className="graph-edge"
              data-focus={touches || undefined}
              x1={pos[e.a].x} y1={pos[e.a].y} x2={pos[e.b].x} y2={pos[e.b].y} />
          )
        })}

        {/* halo behind the current page */}
        {current && <circle className="graph-halo" cx={CX} cy={CY} r={11} />}

        {nodes.map((n) => {
          const dx = n.x - CX, dy = n.y - CY
          const len = Math.hypot(dx, dy) || 1
          const r = n.ring === 0 ? 5 : n.ring === 1 ? 3.5 : 2.5
          const lx = n.ring === 0 ? n.x : n.x + (dx / len) * (r + 5)
          const ly = n.ring === 0 ? n.y + 15 : n.y + (dy / len) * (r + 5) + 3
          const anchor = n.ring === 0 ? 'middle' : Math.abs(dx) < 12 ? 'middle' : dx > 0 ? 'start' : 'end'
          const near = focus !== null && (n.slug === focus || adj[focus]?.has(n.slug))
          return (
            <Link key={n.slug} href={`/documentation/${n.slug}`} className="graph-node"
              data-current={n.ring === 0 || undefined} data-ring={n.ring}
              data-hover={hover === n.slug || undefined} data-near={near || undefined}
              onMouseEnter={() => setHover(n.slug)} onFocus={() => setHover(n.slug)} onBlur={() => setHover(null)}>
              {/* generous, invisible hit area: hovering near the dot is enough */}
              <circle className="graph-hit" cx={n.x} cy={n.y} r={14} />
              <circle className="graph-dot" cx={n.x} cy={n.y} r={r} />
              <text x={lx} y={ly} textAnchor={anchor}>{n.short}</text>
              <title>{n.title}</title>
            </Link>
          )
        })}
      </svg>

      <p className="graph-label">
        {shown ? (
          <>
            <span className="graph-label-kind">
              {shown.ring === 0 ? 'You are here' : !current ? 'Page' : shown.ring === 1 ? 'Linked from this page' : 'Elsewhere in the docs'}
            </span>
            <span>{shown.title}</span>
          </>
        ) : (
          <>
            <span className="graph-label-kind">Map of the docs</span>
            <span>Hover a page to see its title; lines join related pages.</span>
          </>
        )}
      </p>

      {current && (
        <ul className="graph-legend" aria-label="Legend">
          <li><i data-ring="0" /> current page</li>
          <li><i data-ring="1" /> linked page</li>
          <li><i data-ring="2" /> other page</li>
        </ul>
      )}
    </div>
  )
}
