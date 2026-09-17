import { faqs } from '@/data/faq'

// Server component on purpose: the FAQPage JSON-LD has to be in the HTML that
// crawlers and AI extractors fetch, not injected after hydration. Disclosure
// uses native <details>, which is keyboard-accessible and needs no client JS.
export function FaqSection() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a }
    }))
  }

  return (
    <section
      id="faq"
      data-nav="light"
      className="border-b border-[var(--lp-rule)] bg-[var(--lp-paper)] px-6 py-24 text-[var(--lp-ink)] md:py-32"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="container mx-auto grid gap-12 lg:grid-cols-12">
        <header className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-[var(--lp-muted)]">Questions</p>
          <h2 className="max-w-[12ch] text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl [text-wrap:balance]">
            The things people ask before they start.
          </h2>
          <p className="mt-6 max-w-[30ch] leading-relaxed text-[var(--lp-ink-2)]">
            Straight answers, including the ones that are &ldquo;no&rdquo;.
          </p>
        </header>

        <div className="lg:col-span-7 lg:col-start-6 lg:mt-16">
          {faqs.map(({ q, a }) => (
            <details key={q} className="lp-faq group border-t border-[var(--lp-rule)] last:border-b">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-left">
                {/* the question is an h3 so the heading outline reads as a list
                    of questions, which is how extractors segment the page */}
                <h3 className="text-lg font-medium tracking-tight md:text-xl">{q}</h3>
                <span
                  aria-hidden="true"
                  className="lp-faq-mark mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--lp-rule)] font-mono text-sm text-[var(--lp-muted)]"
                >
                  +
                </span>
              </summary>
              <div className="lp-faq-a pb-7 pr-12">
                <p className="max-w-[62ch] leading-relaxed text-[var(--lp-ink-2)]">{a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
