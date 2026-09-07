'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Graph } from './Graph'
import type { NavPage } from './registry'

type Hit = { slug: string; title: string; section: string; sectionTitle: string; text: string }

// Without `current` the shell is in index mode: same top bar, sidebar and
// graph, but the centre column is whatever the index page passes in.
export function DocsShell({ pages, current, children }: { pages: NavPage[]; current?: string; children: ReactNode }) {
  const page = current ? pages.find((p) => p.slug === current) : undefined
  const idx = page ? pages.indexOf(page) : -1
  const prev = page ? pages[idx - 1] : undefined
  const next = page ? pages[idx + 1] : undefined
  const groups = useMemo(() => {
    const m = new Map<string, NavPage[]>()
    for (const p of pages) m.set(p.group, [...(m.get(p.group) ?? []), p])
    return [...m.entries()]
  }, [pages])
  const [active, setActive] = useState<string>(page?.sections[0]?.id ?? '')
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (!page) return
    const els = page.sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: '-80px 0px -65% 0px', threshold: 0 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [page])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true) }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="docs">
      <TopBar onSearch={() => setSearchOpen(true)} />

      <div className="docs-frame">
        {/* left: nav, with the connection graph pinned to the bottom corner */}
        <aside className="docs-side">
          <nav aria-label="Documentation" className="docs-nav">
            {groups.map(([group, list]) => (
              <div key={group} className="docs-nav-group">
                <p className="docs-nav-label">{group}</p>
                {list.map((p) => (
                  <Link key={p.slug} href={`/documentation/${p.slug}`} className="nav-link" aria-current={p.slug === current ? 'page' : undefined}>
                    {p.title}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="docs-graph">
            <Graph pages={pages} current={current} />
          </div>
        </aside>

        {/* centre */}
        <main className="docs-main">
          {/* small screens: the sidebar is hidden, so the page list folds in here */}
          <details className="docs-mobile-nav">
            <summary>Pages</summary>
            {groups.map(([group, list]) => (
              <div key={group} className="docs-nav-group">
                <p className="docs-nav-label">{group}</p>
                {list.map((p) => (
                  <Link key={p.slug} href={`/documentation/${p.slug}`} className="nav-link" aria-current={p.slug === current ? 'page' : undefined}>
                    {p.title}
                  </Link>
                ))}
              </div>
            ))}
          </details>
          {!page ? children : (<>
          <nav aria-label="Breadcrumb" className="docs-crumbs">
            <Link href="/documentation">Docs</Link>
            <span aria-hidden="true">/</span>
            <span>{page!.group}</span>
            <span aria-hidden="true">/</span>
            <span className="text-[var(--doc-ink)]">{page!.title}</span>
          </nav>
          <h1 className="docs-h1">{page!.title}</h1>
          <p className="docs-lede">{page!.summary}</p>

          <article className="prose">{children}</article>

          <footer className="docs-foot">
            {page!.related.length > 0 && (
              <p className="docs-related">
                <span>Related</span>
                {page!.related.map((slug) => {
                  const r = pages.find((p) => p.slug === slug)
                  return r ? <Link key={slug} href={`/documentation/${slug}`}>{r.title}</Link> : null
                })}
              </p>
            )}
            <div className="docs-pager">
              {prev ? (
                <Link href={`/documentation/${prev.slug}`} className="docs-pager-link">
                  <span>Previous</span>
                  <strong>{prev.title}</strong>
                </Link>
              ) : <span />}
              {next ? (
                <Link href={`/documentation/${next.slug}`} className="docs-pager-link docs-pager-next">
                  <span>Next</span>
                  <strong>{next.title}</strong>
                </Link>
              ) : <span />}
            </div>
          </footer>
          </>)}
        </main>

        {/* right: on this page (articles only) */}
        <aside className="docs-toc">
          {page && (
            <>
              <p className="docs-nav-label">On this page</p>
              <nav aria-label="On this page">
                {page.sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="toc-link" data-active={active === s.id}>{s.title}</a>
                ))}
              </nav>
            </>
          )}
        </aside>
      </div>

      {searchOpen && <Search pages={pages} onClose={() => setSearchOpen(false)} />}
    </div>
  )
}

export function TopBar({ onSearch }: { onSearch: () => void }) {
  return (
    <header className="docs-top">
      <div className="docs-top-inner">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
            <img src="/logo.png" alt="" className="h-5 w-5 rounded" />
            Latent Verify
          </Link>
          <span className="text-[var(--doc-rule)]">/</span>
          <Link href="/documentation" className="text-[13px] text-[var(--doc-ink-2)]">Docs</Link>
        </div>
        <button type="button" onClick={onSearch} className="docs-search-btn" aria-label="Search documentation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span>Search documentation</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="flex items-center gap-4 text-[13px]">
          <Link href="/login" className="text-[var(--doc-ink-2)] hover:text-[var(--doc-ink)]">Log in</Link>
          <Link href="/dashboard" className="docs-top-cta">Open the app</Link>
        </div>
      </div>
    </header>
  )
}

// Global full-text search over the server-built index (../search-index/route.ts).
export function Search({ pages, onClose }: { pages: NavPage[]; onClose: () => void }) {
  const router = useRouter()
  const [index, setIndex] = useState<Hit[] | null>(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    fetch('/documentation/search-index').then((r) => r.json()).then(setIndex).catch(() => setIndex([]))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const hits = useMemo<Hit[]>(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return pages.map((p) => ({ slug: p.slug, title: p.title, section: '', sectionTitle: p.summary, text: '' }))
    if (!index) return []
    return index
      .map((h) => {
        const hay = `${h.title} ${h.sectionTitle} ${h.text}`.toLowerCase()
        const score = terms.reduce((s, t) => s + (h.sectionTitle.toLowerCase().includes(t) ? 3 : 0) + (h.title.toLowerCase().includes(t) ? 2 : 0) + (hay.includes(t) ? 1 : 0), 0)
        return { h, score, ok: terms.every((t) => hay.includes(t)) }
      })
      .filter((x) => x.ok)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.h)
  }, [q, index, pages])

  useEffect(() => setSel(0), [q])

  const go = (h: Hit) => {
    router.push(`/documentation/${h.slug}${h.section ? `#${h.section}` : ''}`)
    onClose()
  }

  const snippet = (h: Hit) => {
    if (!q || !h.text) return h.sectionTitle
    const t = q.toLowerCase().split(/\s+/).filter(Boolean)[0]
    const i = h.text.toLowerCase().indexOf(t)
    if (i < 0) return h.text.slice(0, 120)
    const s = Math.max(0, i - 50)
    const raw = h.text.slice(s, i + 80)
    const j = raw.toLowerCase().indexOf(t)
    return <>{s > 0 ? '…' : ''}{raw.slice(0, j)}<mark>{raw.slice(j, j + t.length)}</mark>{raw.slice(j + t.length)}…</>
  }

  return (
    <>
      <div className="search-backdrop" onClick={onClose} />
      <div className="search-panel" role="dialog" aria-label="Search documentation">
        <div className="search-input-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
              if (e.key === 'Enter' && hits[sel]) go(hits[sel])
            }}
            placeholder="Search documentation"
          />
          <kbd>esc</kbd>
        </div>
        <div className="search-results">
          {q && index && hits.length === 0 && <p className="search-empty">No results for “{q}”.</p>}
          {hits.map((h, i) => (
            <a
              key={`${h.slug}-${h.section}`}
              href={`/documentation/${h.slug}${h.section ? `#${h.section}` : ''}`}
              onClick={(e) => { e.preventDefault(); go(h) }}
              onMouseEnter={() => setSel(i)}
              className="search-hit"
              data-active={i === sel}
            >
              <span className="search-hit-title">{h.section ? h.sectionTitle : h.title}</span>
              <span className="search-hit-crumb">{h.section ? h.title : 'Page'}</span>
              <span className="search-hit-text">{snippet(h)}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  )
}
