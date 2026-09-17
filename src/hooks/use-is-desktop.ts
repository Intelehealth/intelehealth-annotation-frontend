"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the viewport is at or above the `lg` Tailwind
 * breakpoint (1024px).
 *
 * Hydration-safe: the initial state is always `false` (matching SSR output),
 * then resolves to the real value in an effect after mount. This guarantees
 * server and first client render agree, so a desktop-only inline panel and a
 * mobile-only sheet never both stay mounted.
 */
export function useIsDesktop(query = "(min-width: 1024px)"): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
