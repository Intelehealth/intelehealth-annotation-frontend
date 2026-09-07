import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { pages } from '../_docs/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Full-text index for the docs search. Each page body is rendered to static
// markup once (cached for the life of the process) and split at its <h2 id>
// markers, giving one entry per section with the plain text under it. No build
// step, no dependency: the content is React, so React renders it.
//
// `react-dom/server` is loaded at runtime via a webpack-ignored import: Next
// refuses a static import of it inside the app router graph, but this is a Node
// route handler and react-dom ships in the standalone bundle regardless.
type Entry = { slug: string; title: string; section: string; sectionTitle: string; text: string }

let cache: Entry[] | null = null

function strip(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
}

async function build(): Promise<Entry[]> {
  const { renderToStaticMarkup } = (await import(/* webpackIgnore: true */ 'react-dom/server')) as typeof import('react-dom/server')
  const out: Entry[] = []
  for (const p of pages) {
    const html = renderToStaticMarkup(createElement(p.Body))
    // split on section headings; the first chunk (before any h2) is intro text
    const parts = html.split(/(?=<h2 id=")/)
    for (const part of parts) {
      const m = part.match(/^<h2 id="([^"]+)"/)
      const id = m?.[1] ?? ''
      const sec = p.sections.find((s) => s.id === id)
      const text = strip(part.replace(/^<h2[^>]*>.*?<\/h2>/, ''))
      if (!text) continue
      out.push({ slug: p.slug, title: p.title, section: id, sectionTitle: sec?.title ?? p.title, text })
    }
  }
  return out
}

export async function GET() {
  cache ??= await build()
  return NextResponse.json(cache, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
