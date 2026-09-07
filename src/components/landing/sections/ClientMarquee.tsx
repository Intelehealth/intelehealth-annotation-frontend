// Thin band between "what we deliver" and the closing CTA: clients as
// wordmarks rolling in a seamless marquee (CSS only — see globals.css,
// "Landing: client marquee"). Names are set in text until logo files exist;
// swap a name for an <img> in the same slot when they arrive.
const clients = ['Intelehealth', 'Sarvam', 'Soket.ai', 'Tensoic', 'Google', 'Yotta']

export function ClientMarquee() {
  // rendered twice so the strip can translate by exactly half its width and
  // loop with no visible seam
  const track = [...clients, ...clients]
  return (
    <section data-nav="dark"
      aria-label="Clients we have worked with"
      className="border-y border-[var(--lp-paper)]/10 bg-[var(--lp-ink)] py-8 text-[var(--lp-paper)]"
    >
      <div className="container mx-auto flex flex-col gap-5 md:flex-row md:items-center md:gap-12">
        <p className="shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-[var(--lp-paper)]/45">
          Worked with
        </p>
        <div className="lp-marquee min-w-0 flex-1">
          <ul className="lp-marquee-track">
            {track.map((name, i) => (
              <li
                key={`${name}-${i}`}
                className="text-2xl font-semibold tracking-tight md:text-3xl"
                aria-hidden={i >= clients.length || undefined}
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
