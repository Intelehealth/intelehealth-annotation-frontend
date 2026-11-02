/**
 * Display-only clean-up of the raw OpenMRS / API strings (ticket G2). These
 * never change stored data or metrics, only what a person reads.
 */

const EMPTY = /^(?:na|n\/a|nil|none|null|undefined|-+|—)?$/i;

/** "Na" / "NA" / "N/A" / "-" / empty -> "—". */
export function dash(s: unknown): string {
  const t = String(s ?? '').trim();
  return EMPTY.test(t) ? '—' : t;
}

/** "Namco_Dermatology" -> "Namco Dermatology". */
export const deUnderscore = (s: unknown) => String(s ?? '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * ALL-CAPS names ("TINEA CORPORIS", "INSECT BITE") -> sentence case
 * ("Tinea corporis"); short all-caps tokens (CBC, HB, UTI, R/M) stay as they
 * are. Anything already in mixed case is left alone.
 */
export function niceCase(s: unknown): string {
  const t = String(s ?? '').trim();
  if (!/[A-Z]/.test(t) || /[a-z]/.test(t) || t.replace(/[^A-Z]/g, '').length <= 4) return t;
  let first = true;
  return t.replace(/[A-Z][A-Z0-9'’/.-]*/g, (w) => {
    const keep = w.replace(/[^A-Z]/g, '').length <= 3;
    const out = keep ? w : first ? w[0] + w.slice(1).toLowerCase() : w.toLowerCase();
    first = false;
    return out;
  });
}

/** One display string for a Dx / test / specialty name: underscores out, caps fixed, empties as "—". */
export const displayName = (s: unknown) => dash(niceCase(deUnderscore(s)));

export interface ReferralParts { specialist: string; facility: string; urgency: string; reason: string }

/** "Specialist:Facility:Elective:reason" -> labelled parts ("" when a part is missing). */
export function referralParts(s: unknown): ReferralParts {
  const [specialist = '', facility = '', urgency = '', ...rest] = String(s ?? '').split(':');
  const clean = (x: string) => (dash(x) === '—' ? '' : deUnderscore(x));
  return { specialist: clean(specialist), facility: clean(facility), urgency: clean(urgency), reason: clean(rest.join(':')) };
}

/** A referral as one readable line: "General Physician · PHC · Elective · If fever persists". */
export function referralText(s: unknown): string {
  const p = referralParts(s);
  return [p.specialist, p.facility, p.urgency, p.reason].filter(Boolean).join(' · ') || '—';
}
