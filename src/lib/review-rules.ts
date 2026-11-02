/**
 * Mirror of the backend rule (src/mismatch/review-rules.ts in the backend repo):
 * when an annotation may be marked done (ticket V2). Keep the two in sync; the
 * API is the enforcement point, this only drives the button state and hint.
 */
export const DDX_VERDICTS = ['doctor_correct', 'ai_correct', 'both_acceptable', 'neither', 'insufficient'] as const;
export const TTX_VERDICTS = ['doctor_correct', 'ai_correct', 'both_acceptable', 'neither'] as const;
// "AI was right" and "both acceptable / agree" need no reason; every other verdict does.
export const NO_REASON_VERDICTS = new Set<string>(['ai_correct', 'both_acceptable']);

/** Which verdicts the form asks for: the same conditions that show the Dx / TTx questions. */
export function requiredSections(a: any): { dx: boolean; ttx: boolean } {
  return {
    dx: !!(a?.ddxMismatch || (a?.doctorAddedDx?.length ?? 0) > 0),
    ttx: !!(a?.ttxAvailable && a?.ttxMismatch),
  };
}

export type MissingField = 'ddxVerdict' | 'ddxReason' | 'ttxVerdict' | 'ttxReason';

const filled = (v: unknown) => typeof v === 'string' && v.trim() !== '';

/** Fields still needed before this review can be marked done (empty = ready). */
export function missingForDone(a: any, r: { ddxVerdict?: string; ddxReason?: string; ttxVerdict?: string; ttxReason?: string }): MissingField[] {
  const need = requiredSections(a);
  const out: MissingField[] = [];
  if (need.dx) {
    if (!filled(r.ddxVerdict) || !(DDX_VERDICTS as readonly string[]).includes(r.ddxVerdict!)) out.push('ddxVerdict');
    else if (!NO_REASON_VERDICTS.has(r.ddxVerdict!) && !filled(r.ddxReason)) out.push('ddxReason');
  }
  if (need.ttx) {
    if (!filled(r.ttxVerdict) || !(TTX_VERDICTS as readonly string[]).includes(r.ttxVerdict!)) out.push('ttxVerdict');
    else if (!NO_REASON_VERDICTS.has(r.ttxVerdict!) && !filled(r.ttxReason)) out.push('ttxReason');
  }
  return out;
}
