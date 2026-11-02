/**
 * Mirror of the backend rule (src/mismatch/review-rules.ts in the backend repo):
 * when an annotation may be marked done (ticket V2). Keep the two in sync; the
 * API is the enforcement point, this only drives the button state and hint.
 */
export const DDX_VERDICTS = ['doctor_correct', 'ai_correct', 'both_acceptable', 'neither', 'insufficient'] as const;
export const TTX_VERDICTS = ['doctor_correct', 'ai_correct', 'both_acceptable', 'neither'] as const;
// "AI was right", "both acceptable / agree" and "note too thin to judge" (it is the reason) need no reason; every other verdict does.
export const NO_REASON_VERDICTS = new Set<string>(['ai_correct', 'both_acceptable', 'insufficient']);

/** The analysis fields the rule reads. */
export type RuleAnalysis = { ddxMismatch?: boolean; doctorAddedDx?: unknown[]; ttxAvailable?: boolean; ttxMismatch?: boolean; followUpOnly?: boolean } | null | undefined;

// The doctor's "Follow-up visit" placeholder is not a diagnosis (same rule as analysis.followUpOnly).
const isFollowUpName = (x: unknown) => /follow[\s-]*up/i.test(String(x ?? ''));

/**
 * Which verdicts the form asks for: the same conditions that show the Dx / TTx questions.
 * Dx: never on a follow-up-only visit; otherwise on a DDx mismatch or a real doctor-added Dx.
 * TTx: on an AI TTx mismatch, except on follow-up-only visits (follow-ups are left out of every AI
 * metric, so there the treatment verdict is optional: offeredSections still shows it).
 */
export function requiredSections(a: RuleAnalysis): { dx: boolean; ttx: boolean } {
  return {
    dx: !a?.followUpOnly && !!(a?.ddxMismatch || (a?.doctorAddedDx ?? []).some((x) => !isFollowUpName(x))),
    ttx: !!(a?.ttxAvailable && a?.ttxMismatch && !a?.followUpOnly),
  };
}

/** Which questions the page shows: the required ones, plus the optional TTx verdict on a follow-up with an AI TTx mismatch. */
export function offeredSections(a: RuleAnalysis): { dx: boolean; ttx: boolean; ttxOptional: boolean } {
  const need = requiredSections(a);
  const ttx = !!(a?.ttxAvailable && a?.ttxMismatch);
  return { dx: need.dx, ttx, ttxOptional: ttx && !need.ttx };
}

export type MissingField = 'ddxVerdict' | 'ddxReason' | 'ttxVerdict' | 'ttxReason';

const filled = (v: unknown) => typeof v === 'string' && v.trim() !== '';

/** Fields still needed before this review can be marked done (empty = ready). */
export function missingForDone(a: RuleAnalysis, r: { ddxVerdict?: string; ddxReason?: string; ttxVerdict?: string; ttxReason?: string }): MissingField[] {
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
