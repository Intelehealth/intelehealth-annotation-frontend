import { describe, expect, it } from 'vitest';
import { missingForDone, offeredSections, requiredSections } from './review-rules';

// Mirror of the backend rule tests (src/mismatch/__tests__/review-rules.spec.ts).
describe('review rules (frontend mirror)', () => {
  it('follow-up-only: no Dx verdict; the TTx verdict is offered but optional', () => {
    const a = { followUpOnly: true, ttxAvailable: true, ttxMismatch: true, doctorAddedDx: ['Follow-up visit'] };
    expect(requiredSections(a)).toEqual({ dx: false, ttx: false });
    expect(offeredSections(a)).toEqual({ dx: false, ttx: true, ttxOptional: true });
    expect(missingForDone(a, {})).toEqual([]);
  });
  it('a real added Dx or a mismatch still requires its verdict', () => {
    expect(requiredSections({ doctorAddedDx: ['Follow-up visit', 'Acidity'] }).dx).toBe(true);
    expect(missingForDone({ ddxMismatch: true, ttxAvailable: true, ttxMismatch: true }, {})).toEqual(['ddxVerdict', 'ttxVerdict']);
  });
});

describe('note too thin to judge (mirror)', () => {
  it('needs no extra reason', () => {
    expect(missingForDone({ ddxMismatch: true }, { ddxVerdict: 'insufficient' })).toEqual([]);
  });
});
