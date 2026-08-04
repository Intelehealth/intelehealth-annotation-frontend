'use client'

import { SlideUp } from '../animations/SlideUp'
import { TextReveal } from '../animations/TextReveal'
import { MagneticButton } from '../MagneticButton'

export function FinalCTA() {
  return (
    <section className="py-32 px-6 bg-gradient-to-t from-black to-gray-950">
      <div className="container mx-auto max-w-4xl text-center">
        <TextReveal
          text="Ready to power your AI?"
          className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-6"
          as="h2"
        />

        <SlideUp delay={0.2}>
          <p className="text-base sm:text-xl text-gray-400 mb-8">
            Start annotating today and join the teams building the future.
          </p>
        </SlideUp>

        <SlideUp delay={0.4}>
          <MagneticButton href="/dashboard" strength={0.5} className="w-full sm:w-auto">
            <span className="inline-flex items-center justify-center w-full sm:w-auto min-h-[48px] px-10 py-5 text-lg font-medium rounded-lg bg-white text-black hover:bg-gray-200 transition-all duration-300 group">
              <span className="transition-transform duration-300 group-hover:scale-90">
                Get Started Now
              </span>
            </span>
          </MagneticButton>
        </SlideUp>
      </div>
    </section>
  )
}
