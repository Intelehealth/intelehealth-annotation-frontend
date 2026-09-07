import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DocsShell } from '../_docs/DocsShell'
import { bySlug, navPages, pages } from '../_docs/registry'

export function generateStaticParams() {
  return pages.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = bySlug[slug]
  return page ? { title: `${page.title} · Latent Verify docs`, description: page.summary } : {}
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = bySlug[slug]
  if (!page) notFound()
  return (
    <DocsShell pages={navPages} current={slug}>
      <page.Body />
    </DocsShell>
  )
}
