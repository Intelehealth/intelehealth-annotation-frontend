import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsShell } from './_docs/DocsShell'
import { navPages } from './_docs/registry'

export const metadata: Metadata = {
  title: 'Documentation · Latent Verify',
  description: 'Set up datasets and schemas, assign annotators, annotate, review for consensus, and read the agreement statistics.'
}

// Index: same shell as the articles (sidebar, graph with no current page,
// global search), with a grouped list of pages in the centre column.
export default function DocsIndex() {
  const groups = new Map<string, typeof navPages>()
  for (const p of navPages) groups.set(p.group, [...(groups.get(p.group) ?? []), p])

  return (
    <DocsShell pages={navPages}>
      <div className="docs-index">
        <h1 className="docs-h1">Documentation</h1>
        <p className="docs-lede">
          How to set up a dataset and its questions, assign annotators, label, resolve disagreement and read
          the agreement numbers.
        </p>
        {[...groups.entries()].map(([group, list]) => (
          <section key={group} className="docs-index-group">
            <h2 className="docs-nav-label">{group}</h2>
            <ul>
              {list.map((p) => (
                <li key={p.slug}>
                  <Link href={`/documentation/${p.slug}`} className="docs-index-link">
                    <strong>{p.title}</strong>
                    <span>{p.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DocsShell>
  )
}
