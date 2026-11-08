import { describe, expect, it } from 'vitest';
import { noteSections, splitFinding } from './note-sections';

describe('noteSections', () => {
  it('turns English note bullets into labelled rows per complaint', () => {
    const g = noteSections('►Skin disorder:\n• Type of the skin lesion - Eczematous skin, Skin rash.\n• Site - Hands.\n►Associated symptoms:\n• Patient reports - Itching');
    expect(g).toEqual([
      { title: 'Skin disorder', rows: [{ label: 'Type of the skin lesion', value: 'Eczematous skin, Skin rash' }, { label: 'Site', value: 'Hands' }] },
      { title: 'Associated symptoms', rows: [{ label: 'Patient reports', value: 'Itching' }] },
    ]);
  });
  it('pairs Marathi ● labels with the • value after them and handles "label: value"', () => {
    expect(noteSections('►त्वचा विकार::● प्रकार\n•खाज\n● जागा\n•हात')[0].rows).toEqual([{ label: 'प्रकार', value: 'खाज' }, { label: 'जागा', value: 'हात' }]);
    expect(noteSections('• Eyes: Jaundice-no jaundice seen.')[0].rows).toEqual([{ label: 'Eyes', value: 'Jaundice — no jaundice seen' }]);
    expect(noteSections('• Nails: Non-tender')[0].rows[0].value).toBe('Non-tender');
    expect(noteSections('• Prior treatment - None')[0].rows[0].value).toBe('None');
    expect(noteSections('Do you have a family history of any of the following? : • None.')[0].rows[0].value).toContain('None');
  });
});

describe('splitFinding (P2-8)', () => {
  it('splits X-y and X:-y exam lines, leaves hyphenated words alone', () => {
    expect(splitFinding('Nail abnormality-nails normal')).toEqual({ label: 'Nail abnormality', value: 'nails normal' });
    expect(splitFinding('Ankle-no pedal oedema')).toEqual({ label: 'Ankle', value: 'no pedal oedema' });
    expect(splitFinding('Skin Rash:-no rash')).toEqual({ label: 'Skin Rash', value: 'no rash' });
    expect(splitFinding('Non-tender')).toBeNull();
    expect(splitFinding('Well-built and nourished')).toBeNull();
    expect(noteSections('• Ankle-no pedal oedema')[0].rows[0]).toEqual({ label: 'Ankle', value: 'no pedal oedema' });
  });
});
