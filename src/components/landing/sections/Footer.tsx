import Link from 'next/link'

// Only routes that exist under src/app are linked here.
const columns = [
  {
    heading: 'Platform',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Datasets', href: '/dataset' },
      { label: 'Tasks', href: '/tasks' },
      { label: 'Review assignments', href: '/assignments/review' }
    ]
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation', href: '/documentation' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Add a dataset', href: '/dataset/add-dataset' }
    ]
  },
  {
    heading: 'Account',
    links: [
      { label: 'Log in', href: '/login' },
      { label: 'Profile', href: '/profile' },
      { label: 'Team', href: '/users' }
    ]
  }
]

export function Footer() {
  return (
    <footer data-nav="dark" className="bg-[var(--lp-ink)] px-6 pb-10 pt-20 text-sm text-[var(--lp-paper)]">
      <div className="container mx-auto">
        {/* brand block takes the left third; link columns start past the
            midline, leaving a deliberate gap — same off-centre grid as the
            sections above */}
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-2xl font-semibold tracking-tight">Latent Verify</p>
            <p className="mt-4 max-w-[28ch] leading-relaxed text-[var(--lp-paper)]/55">
              Ground truth for models that make consequential decisions &mdash;
              annotated by people, checked by consensus.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            {columns.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[var(--lp-paper)]/45">
                  {col.heading}
                </h2>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[var(--lp-paper)]/75 transition-colors duration-300 hover:text-[var(--lp-paper)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--lp-paper)]/12 pt-6 font-mono text-xs uppercase tracking-[0.16em] text-[var(--lp-paper)]/40">
          <p>&copy; {new Date().getFullYear()} Latent Verify &middot; LatentSig Software</p>
          <a href="#" aria-label="Back to top" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--lp-paper)]/15 text-base transition-colors duration-300 hover:border-[var(--lp-paper)]/40 hover:text-[var(--lp-paper)]">
            &uarr;
          </a>
        </div>
      </div>
    </footer>
  )
}
