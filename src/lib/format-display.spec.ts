import { describe, expect, it } from 'vitest';
import { dash, deUnderscore, displayName, niceCase, referralParts, referralText } from './format-display';

describe('format-display (G2)', () => {
  it('shows empty-ish values as a dash', () => {
    for (const v of ['Na', 'NA', 'n/a', '', '  ', '-', null, undefined, 'null', 'Remark:null']) expect(dash(v)).toBe('—');
    // recorded negative answers are not missing data
    for (const v of ['None', 'Nil', 'No']) expect(dash(v)).toBe(v);
    expect(dash('Nausea')).toBe('Nausea');
  });
  it('strips underscores', () => {
    expect(deUnderscore('Namco_Dermatology')).toBe('Namco Dermatology');
  });
  it('turns ALL-CAPS names into sentence case but keeps short acronyms', () => {
    expect(niceCase('TINEA CORPORIS')).toBe('Tinea corporis');
    expect(niceCase('INSECT BITE')).toBe('Insect bite');
    expect(niceCase('URINE R/M')).toBe('Urine R/M');
    expect(niceCase('Mixed CASE stays')).toBe('Mixed CASE stays');
    expect(niceCase('HBA1C, TSH')).toBe('HbA1c, TSH');
    expect(niceCase('EAT PLENTY OF GREEN LEAF VEGETABLES AND FRUITS')).toBe('Eat plenty of green leaf vegetables and fruits');
    expect(niceCase('CBC: HB/WBC/RBC PLATELET')).toBe('CBC: HB/WBC/RBC platelet');
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
