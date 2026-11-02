import { describe, expect, it } from 'vitest';
import { dash, deUnderscore, displayName, niceCase, referralParts, referralText } from './format-display';

describe('format-display (G2)', () => {
  it('shows empty-ish values as a dash', () => {
    for (const v of ['Na', 'NA', 'n/a', '', '  ', '-', null, undefined]) expect(dash(v)).toBe('—');
    expect(dash('Nausea')).toBe('Nausea');
  });
  it('strips underscores', () => {
    expect(deUnderscore('Namco_Dermatology')).toBe('Namco Dermatology');
  });
  it('turns ALL-CAPS names into sentence case but keeps short acronyms', () => {
    expect(niceCase('TINEA CORPORIS')).toBe('Tinea corporis');
    expect(niceCase('INSECT BITE')).toBe('Insect bite');
    expect(niceCase('URINE R/M')).toBe('Urine R/M');
    expect(niceCase('CBC')).toBe('CBC');
    expect(niceCase('Acute rhinitis')).toBe('Acute rhinitis');
    expect(niceCase('acute gastritis')).toBe('Acute gastritis');
    expect(displayName('SCABIES')).toBe('Scabies');
  });
  it('splits a referral into labelled parts', () => {
    expect(referralParts('General Physician:PHC:Elective:If fever persist')).toEqual({ specialist: 'General Physician', facility: 'PHC', urgency: 'Elective', reason: 'If fever persist' });
    expect(referralParts('Orthopedic Specialist::Elective:')).toEqual({ specialist: 'Orthopedic Specialist', facility: '', urgency: 'Elective', reason: '' });
    expect(referralText('Namco_Dermatology:NA:Urgent:rash: spreading')).toBe('Namco Dermatology · Urgent · rash: spreading');
  });
});
