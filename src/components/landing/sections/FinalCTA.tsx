'use client'

import Link from 'next/link'
import { SlideUp } from '../animations/SlideUp'
import { TextReveal } from '../animations/TextReveal'

export function FinalCTA() {
  return (
    <section id="start" data-nav="light" className="bg-[var(--lp-paper-peach)] px-6 py-28 text-[var(--lp-ink)] md:py-40">

      <div className="container mx-auto grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <TextReveal
            as="h2"
            text="Start with one dataset."
            className="max-w-[11ch] text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl [text-wrap:balance]"
          />
        </div>

        {/* actions sit low and to the right, under the headline's baseline */}
        <SlideUp delay={0.15} className="lg:col-span-4 lg:col-start-9 lg:self-end">
          <p className="max-w-[30ch] text-lg leading-relaxed text-[var(--lp-ink-2)]">
            Upload it, define the questions, and see the first labels and
            agreement numbers come back.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href="/dataset/add-dataset" className="inline-flex items-center justify-center rounded-md bg-[var(--lp-ink)] px-7 py-4 text-base font-medium text-[var(--lp-paper)] transition-colors duration-300 hover:bg-[var(--lp-accent-2)]">
              Upload a dataset
            </Link>
            <Link
              href="/documentation"
              className="group inline-flex items-center gap-2 text-base font-medium text-[var(--lp-ink)]"
            >
              Read the docs
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--lp-rule-peach)] pt-5 font-mono text-xs uppercase tracking-[0.18em] text-[var(--lp-muted)]">
            <li>Image</li>
            <li>Video</li>
            <li>Audio</li>
            <li>Text &amp; tabular</li>
          </ul>
        </SlideUp>
      </div>
    </section>
  )
}
