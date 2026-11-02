/**
 * Display-only clean-up of the raw OpenMRS / API strings (ticket G2). These
 * never change stored data or metrics, only what a person reads.
 */

// Missing values only. "None" / "Nil" / "No" are recorded negative answers and are shown as written.
const EMPTY = /^(?:na|n\/a|null|undefined|remark:\s*null|-+|—)?$/i;

/** "Na" / "NA" / "N/A" / "null" / "-" / empty -> "—" (never "None" or "Nil"). */
export function dash(s: unknown): string {
  const t = String(s ?? '').trim();
  return EMPTY.test(t) ? '—' : t;
}

/** "Namco_Dermatology" -> "Namco Dermatology". */
export const deUnderscore = (s: unknown) => String(s ?? '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();

/** Medical acronyms kept upper case when ALL-CAPS text is sentence-cased (explicit list, no length rule). */
const ACRONYMS = new Map(
  [
    'CBC', 'HB', 'HGB', 'WBC', 'RBC', 'ESR', 'CRP', 'ECG', 'EKG', 'BP', 'ORS', 'RBS', 'FBS', 'PPBS', 'HBA1C', 'TSH', 'T3', 'T4', 'LFT', 'KFT', 'RFT',
    'URTI', 'UTI', 'LRTI', 'TB', 'HIV', 'HBSAG', 'HCV', 'VDRL', 'OPD', 'IPD', 'IV', 'IM', 'SC', 'SOS', 'BD', 'BID', 'TDS', 'TID', 'QID', 'OD', 'HS', 'PRN',
    'USG', 'CT', 'MRI', 'R', 'M', 'ENT', 'PHC', 'CHC', 'DH', 'SDH', 'NSAID', 'COPD', 'GERD', 'HTN', 'DM', 'T2DM', 'ANC', 'PNC', 'IFA', 'AFB', 'MP', 'RDT',
    'NS1', 'IGM', 'IGG', 'SGOT', 'SGPT', 'PCV', 'MCV',
  ].map((w) => [w, ({ HBA1C: 'HbA1c', HBSAG: 'HBsAg', IGM: 'IgM', IGG: 'IgG' } as Record<string, string>)[w] ?? w]),
);

/**
 * ALL-CAPS text ("TINEA CORPORIS", "EAT PLENTY OF GREEN LEAF VEGETABLES") becomes
 * sentence case, keeping the medical acronyms above ("CBC: HB/WBC/RBC platelet").
 * Mixed-case text is left untouched; all-lower-case text only gets a capital first letter.
 */
export function niceCase(s: unknown): string {
  const t = String(s ?? '').trim();
  if (/[a-z]/.test(t) && !/[A-Z]/.test(t)) return t.replace(/[a-z]/, (c) => c.toUpperCase());
  if (/[a-z]/.test(t) || !/[A-Z]{2}/.test(t)) return t;
  const lowered = t.toLowerCase().replace(/[a-z0-9]+/g, (w) => ACRONYMS.get(w.toUpperCase()) ?? w);
  // capitalise the first letter only if it is lower case ("HbA1c, TSH" stays)
  return lowered.replace(/^([^A-Za-z]*)([a-z])/, (_m, pre: string, c: string) => pre + c.toUpperCase());
}

/** One display string for a Dx / test / specialty name: underscores out, caps fixed, missing as "—". */
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
